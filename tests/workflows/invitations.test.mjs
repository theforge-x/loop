import { before, after, describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createFixture, must } from '../../scripts/database/fixtures.mjs';
import { parseGuestCsv, exportGuestCsv } from '../../src/lib/invitations/csv.ts';
import { sendEmail, escapeHtml } from '../../src/lib/email/transport.ts';
const origin = 'http://127.0.0.1:3101';
async function cookiesFor(account) {
  const cookies = new Map();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...cookies].map(([name,value]) => ({name,value})), setAll: values => values.forEach(({name,value}) => cookies.set(name,value)) } });
  must(await client.auth.signInWithPassword({ email: account.email, password: account.password }));
  return { Cookie: [...cookies].map(([name,value]) => `${name}=${value}`).join('; ') };
}

describe('Phase 4 invitation, RSVP, CSV and delivery workflows', { timeout: 240000 }, () => {
  let f; let server; let logs = '';
  before(async () => {
    f = await createFixture('workflow');
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3101'], { env: { ...process.env, RESEND_API_KEY: '', RESEND_FROM_EMAIL: '' }, stdio: ['ignore','pipe','pipe'] });
    server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-16000); });
    server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-16000); });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve,300));
    }
    assert.ok(ready, `Production server failed to start: ${logs}`);
  });
  after(() => server?.kill('SIGTERM'));

  test('CSV supports quoted fields, IDs and nullable emails while protecting spreadsheet formulas', () => {
    const row = { guest_id: randomUUID(), group_id: randomUUID(), group_name: 'The Alis, family', group_allowance: '2', guest_name: 'Ada "A"', email: '' };
    const csv = exportGuestCsv([row]);
    assert.deepEqual(parseGuestCsv(csv), [row]);
    assert.match(csv, /"The Alis, family"/);
    assert.ok(exportGuestCsv([{ ...row, guest_name: '=1+1' }]).includes("'=1+1"));
    assert.throws(() => parseGuestCsv('group_name,guest_name,email\nFamily,Ada,invalid-email\n'));
    assert.throws(() => parseGuestCsv('group_name,guest_name,unknown\nFamily,Ada,value\n'));
    assert.throws(() => parseGuestCsv(exportGuestCsv([row,row])), /more than once/);
    assert.throws(() => parseGuestCsv('group_name,group_allowance,guest_name\nFamily,0,Ada\n'));
  });

  test('CSV import is transactional, tenant-scoped and protected by database membership', async () => {
    const groupName = `Imported ${randomUUID()}`;
    const rows = parseGuestCsv(`group_name,group_allowance,guest_name,email\n${groupName},2,Imported guest one,\n${groupName},2,Imported guest two,\n`);
    assert.deepEqual(must(await f.accounts.coordinator.client.rpc('import_guests', { p_wedding_id: f.weddingA, p_rows: rows })), { added: 2, updated: 0, groups_created: 1 });
    const group = must(await f.service.from('invitation_groups').select('id').eq('wedding_id',f.weddingA).eq('name',groupName).single());
    assert.equal(must(await f.service.from('guests').select('id').eq('invitation_group_id',group.id)).length,2);
    const rollbackName = `Rollback ${randomUUID()}`;
    const failed = await f.accounts.coordinator.client.rpc('import_guests', { p_wedding_id: f.weddingA, p_rows: [{ group_name: rollbackName, group_allowance: '2', guest_name: 'Must roll back', email: '' }, { group_id: f.groupB.id, guest_name: 'Wrong tenant', email: '' }] });
    assert.ok(failed.error);
    assert.equal(must(await f.service.from('invitation_groups').select('id').eq('wedding_id',f.weddingA).eq('name',rollbackName)).length,0);
    assert.ok((await f.accounts.viewer.client.rpc('import_guests',{p_wedding_id:f.weddingA,p_rows:rows})).error);
    assert.ok((await f.anon.rpc('import_guests',{p_wedding_id:f.weddingA,p_rows:rows})).error);
  });

  test('authenticated CSV export includes only the requested member workspace', async () => {
    const ownerHeaders = await cookiesFor(f.accounts.ownerA);
    const response = await fetch(`${origin}/admin/${f.weddingA}/guests/export`,{headers:ownerHeaders});
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/text\/csv/);
    assert.match(response.headers.get('cache-control'),/private/);
    const rows = parseGuestCsv(await response.text());
    assert.ok(rows.some(row=>row.guest_id===f.guestA.id));
    assert.ok(!rows.some(row=>row.guest_id===f.guestB.id));
    const other = await fetch(`${origin}/admin/${f.weddingA}/guests/export`,{headers:await cookiesFor(f.accounts.ownerB)});
    assert.equal(other.status,404);
    assert.ok(!(await other.text()).includes(f.guestA.name));
    const viewer = await fetch(`${origin}/admin/${f.weddingA}/guests`,{headers:await cookiesFor(f.accounts.viewer)});
    const body = await viewer.text();
    assert.equal(viewer.status,200);
    assert.ok(body.includes('Guest list'));
    assert.ok(!body.includes('Generate new link'));
    assert.ok(!body.includes('Create invitation group'));
  });

  test('RSVP endpoint validates token, allowance, eligibility, origin and saves despite email configuration failure', async () => {
    must(await f.service.from('invitation_groups').update({contact_email:`${f.tag}@example.test`}).eq('id',f.groupA.id));
    const body = {status:'attending',attendees:[{name:'Workflow attendee',guest_id:f.guestA.id,type:'guest'}],event_ids:[f.eventA.id],dietary:'Vegetarian',accessibility:'Step-free access',message:'Looking forward to it.'};
    const post = (value, token=f.token, extraHeaders={})=>fetch(`${origin}/api/invitations/${token}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json',...extraHeaders},body:JSON.stringify(value)});
    const valid = await post(body);
    assert.equal(valid.status,200);
    const saved = await valid.json(); assert.equal(saved.saved,true);
    assert.equal((await post({...body,attendees:[{name:'One'},{name:'Two'},{name:'Three'}]})).status,400);
    assert.equal((await post({...body,event_ids:[f.privateEvent.id]})).status,400);
    assert.equal((await post({...body,attendees:[{name:'  '}]})).status,400);
    assert.equal((await post(body,'x'.repeat(64))).status,404);
    const expired=must(await f.accounts.ownerB.client.rpc('issue_invitation',{p_wedding_id:f.weddingB,p_group_id:f.groupB.id,p_expires_at:new Date(Date.now()+86400000).toISOString()}));
    must(await f.service.from('invitation_groups').update({token_expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',f.groupB.id));
    assert.equal((await post(body,expired)).status,404);
    assert.equal((await post(body,f.token,{Origin:'https://untrusted.example'})).status,403);
    const replay = await post(body); assert.equal(replay.status,200); assert.equal((await replay.json()).rsvp_id,saved.rsvp_id);
    const rsvp = must(await f.service.from('rsvps').select('*').eq('id',saved.rsvp_id).single());
    assert.equal(rsvp.status,'attending'); assert.equal(rsvp.dietary_requirements,'Vegetarian');
    assert.equal(must(await f.service.from('rsvps').select('id').eq('invitation_group_id',f.groupA.id)).length,1);
    let job;
    for(let attempt=0;attempt<30;attempt++) {
      const jobs=must(await f.service.from('notifications').select('*').eq('wedding_id',f.weddingA).eq('notification_type','rsvp_confirmation').order('created_at',{ascending:false}).limit(1));
      job=jobs[0]; if(job?.status==='failed')break;
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    assert.equal(job?.status,'failed'); assert.match(job.last_error,/not configured/);
    assert.equal(must(await f.service.from('rsvps').select('status').eq('id',saved.rsvp_id).single()).status,'attending');
    let throttled=false;
    for(let attempt=0;attempt<12;attempt++){const result=await post(body);if(result.status===429){throttled=true;assert.equal(result.headers.get('retry-after'),'600');break;}}
    assert.ok(throttled,'The public RSVP endpoint must enforce its persisted per-token limit');
  });

  test('limiter is atomic/service-only and invitation jobs never persist readable tokens',async()=>{
    assert.ok((await f.accounts.ownerA.client.from('invitation_groups').update({token_hash:'a'.repeat(64)}).eq('id',f.groupA.id)).error);
    assert.ok((await f.accounts.coordinator.client.from('invitation_groups').update({delivery_status:'sent'}).eq('id',f.groupA.id)).error);
    const tokenB=must(await f.accounts.ownerB.client.rpc('issue_invitation',{p_wedding_id:f.weddingB,p_group_id:f.groupB.id,p_expires_at:new Date(Date.now()+86400000).toISOString()}));
    assert.ok((await f.accounts.ownerA.client.rpc('revoke_invitation',{p_wedding_id:f.weddingB,p_group_id:f.groupB.id})).error);
    must(await f.accounts.ownerB.client.rpc('revoke_invitation',{p_wedding_id:f.weddingB,p_group_id:f.groupB.id}));
    assert.ok((await f.service.rpc('get_invitation',{p_token:tokenB})).error);
    const key=randomBytes(32).toString('hex');
    const args={p_key_hash:key,p_limit:2,p_window_seconds:3600};
    const results=await Promise.all(Array.from({length:6},()=>f.service.rpc('consume_rate_limit',args)));
    assert.equal(results.filter(result=>must(result)).length,2);
    assert.ok((await f.anon.rpc('consume_rate_limit',args)).error);
    assert.ok((await f.accounts.viewer.client.rpc('consume_rate_limit',args)).error);
    const id=must(await f.accounts.coordinator.client.rpc('queue_invitation',{p_wedding_id:f.weddingA,p_group_id:f.groupA.id}));
    const again=must(await f.accounts.coordinator.client.rpc('queue_invitation',{p_wedding_id:f.weddingA,p_group_id:f.groupA.id}));
    assert.equal(id,again);
    const job=must(await f.service.from('notifications').select('payload,status').eq('id',id).single());
    assert.deepEqual(job.payload,{group_id:f.groupA.id});
    assert.ok(!JSON.stringify(job).includes(f.token));
    assert.equal(job.status,'pending');
    must(await f.service.from('notifications').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:'controlled-test-acceptance'}).eq('id',id));
    must(await f.service.from('invitation_groups').update({delivery_status:'sent'}).eq('id',f.groupA.id));
    assert.equal(must(await f.accounts.coordinator.client.rpc('queue_invitation',{p_wedding_id:f.weddingA,p_group_id:f.groupA.id})),id);
    assert.equal(must(await f.service.from('invitation_groups').select('delivery_status').eq('id',f.groupA.id).single()).delivery_status,'sent');
  });

  test('Resend transport handles provider rejection and escapes user content without live delivery',async()=>{
    let captured;
    const stub=mock.method(globalThis,'fetch',async(url,init)=>{captured={url,init};return Response.json({id:'test-provider-message'});});
    try {
      const email={from:'Loop <sender@example.test>',to:'guest@example.test',subject:'Test',html:'<p>Test</p>',text:'Test'};
      assert.equal(await sendEmail('not-a-real-key',email,'controlled-test-key'),'test-provider-message');
      assert.equal(captured.url,'https://api.resend.com/emails');
      assert.equal(captured.init.headers['Idempotency-Key'],'controlled-test-key');
      assert.deepEqual(JSON.parse(captured.init.body).to,['guest@example.test']);
      stub.mock.mockImplementation(async()=>new Response('Provider rejected',{status:422}));
      await assert.rejects(()=>sendEmail('not-a-real-key',email,'controlled-failure'),/422/);
      assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
    } finally {stub.mock.restore();}
  });
});
