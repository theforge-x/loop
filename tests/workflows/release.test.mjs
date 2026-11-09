import {before,after,describe,test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createFixture,must} from '../../scripts/database/fixtures.mjs';
const origin='http://127.0.0.1:3104';
describe('Phase 8 release security and SEO checks',{timeout:240000},()=>{
 let f,server;let logs='';
 before(async()=>{f=await createFixture('release');must(await f.service.from('weddings').update({wedding_date:'2030-06-01T12:00:00Z'}).eq('id',f.weddingA));server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{stdio:['ignore','pipe','pipe']});for(const stream of [server.stdout,server.stderr])stream.on('data',b=>logs=(logs+b).slice(-16000));for(let i=0;i<100;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,300));}throw new Error(logs);});
 after(()=>server?.kill('SIGTERM'));
 test('sitemap/robots include published routes and exclude private tenants and token routes',async()=>{
  const response=await fetch(`${origin}/sitemap.xml`);assert.equal(response.status,200);const xml=await response.text();assert.ok(xml.includes(`/${f.tag}-a/story`));assert.ok(!xml.includes(`/${f.tag}-b`));assert.ok(!xml.includes('/invitation/'));assert.ok(!xml.includes('/gift-reservations/'));assert.ok(!xml.includes('/admin/'));
  const robots=await(await fetch(`${origin}/robots.txt`)).text();for(const path of ['/admin','/api/','/sign-in','/invitation/','/gift-reservations/'])assert.ok(robots.includes(`Disallow: ${path}`));assert.ok(robots.includes('/sitemap.xml'));
 });
 test('public metadata has canonical/structured data/Open Graph image; security headers protect private entry points',async()=>{
  const response=await fetch(`${origin}/${f.tag}-a`);const html=await response.text();assert.equal(response.status,200);assert.ok(html.includes('rel="canonical"'));const match=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);assert.ok(match);assert.equal(JSON.parse(match[1])['@type'],'SocialEvent');
  const og=html.match(/<meta property="og:image" content="([^"]+)"/);assert.ok(og,'Generated Open Graph metadata');const imageUrl=new URL(og[1].replaceAll('&amp;','&'));const image=await fetch(`${origin}${imageUrl.pathname}${imageUrl.search}`);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\/png/);assert.ok((await image.arrayBuffer()).byteLength>1000);
  for(const path of ['/',`/${f.tag}-a`,'/admin']){const r=await fetch(`${origin}${path}`,{redirect:'manual'});assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);}
  const invitation=await fetch(`${origin}/invitation/${f.token}`);assert.equal(invitation.headers.get('referrer-policy'),'no-referrer');assert.match(invitation.headers.get('x-robots-tag'),/noindex/);
 });
 test('generated browser JavaScript contains no configured private service/provider credentials',()=>{
  const secrets=['SUPABASE_SERVICE_ROLE_KEY','PAYSTACK_SECRET_KEY','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','CRON_SECRET'].map(key=>process.env[key]).filter(v=>v&&v.length>=16);
  function scan(path){for(const file of readdirSync(path,{withFileTypes:true})){const target=join(path,file.name);if(file.isDirectory())scan(target);else if(file.name.endsWith('.js')){const source=readFileSync(target,'utf8');assert.ok(!secrets.some(value=>source.includes(value)),`Private credential leaked into ${target}`);}}}scan('.next/static');
 });
 test('bulk publication rolls back on invalid draft and immutable draft identities prevent moves',async()=>{
  const d=must(await f.accounts.ownerA.client.from('content_drafts').insert({wedding_id:f.weddingA,module:'faqs',payload:{question:'Bulk question',answer:'Bulk answer',sort_order:0}}).select().single());
  assert.ok((await f.accounts.ownerA.client.from('content_drafts').update({wedding_id:f.weddingB}).eq('id',d.id)).error);
  assert.ok((await f.accounts.ownerA.client.rpc('publish_content_batch',{p_wedding_id:f.weddingA,p_drafts:[d.id,randomUUID()]})).error);
  assert.equal(must(await f.accounts.ownerA.client.from('content_drafts').select('id').eq('id',d.id)).length,1);assert.equal(must(await f.anon.from('faqs').select('id').eq('id',d.record_id)).length,0);
  assert.equal(must(await f.accounts.ownerA.client.rpc('publish_content_batch',{p_wedding_id:f.weddingA,p_drafts:[d.id]})),1);
 });
 test('release inspection rejects local/incomplete configuration without logging secret values',()=>{
  const secret='release-inspection-'+randomUUID();const result=spawnSync(process.execPath,['scripts/verify-release.mjs'],{env:{...process.env,NEXT_PUBLIC_APP_URL:'http://localhost:3000',SUPABASE_SERVICE_ROLE_KEY:secret,CRON_SECRET:''},encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stdout,/MANUAL REQUIRED/);assert.ok(!result.stdout.includes(secret));
 });
});
