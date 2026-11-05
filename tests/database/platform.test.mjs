import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createFixture, must } from '../../scripts/database/fixtures.mjs';

function denied(result, label) { assert.ok(result.error, `${label} must be rejected`); }
function sql(query) {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_loop', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

describe('Phase 2 real local Supabase integration', { timeout: 240000 }, () => {
  let f;
  let attendees;
  before(async () => { f = await createFixture(); });

  test('every application table has explicit RLS and privileged routines use safe grants', () => {
    const rows = JSON.parse(sql(`SELECT json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'policies',(SELECT count(*) FROM pg_policy WHERE polrelid=c.oid))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r';`));
    assert.ok(rows.length >= 29);
    assert.deepEqual(rows.filter(row => !row.rls || row.policies < 1), []);
    assert.equal(sql(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prosecdef AND NOT coalesce(p.proconfig::text,'') LIKE '%search_path%';`), '0');
    assert.equal(sql(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('public','private') AND p.prosecdef AND a.grantee=0 AND a.privilege_type='EXECUTE';`), '0');
  });

  test('public queries reveal published rows only, including draft settings and nested albums', async () => {
    must(await f.service.from('site_settings').update({ content: { headline: 'Private draft' } }).eq('wedding_id', f.weddingA));
    must(await f.service.from('site_settings').insert({ wedding_id: f.weddingA, is_published: true, content: { headline: 'Published welcome' } }));
    const settings = must(await f.anon.from('site_settings').select('*').eq('wedding_id', f.weddingA));
    assert.equal(settings.length, 1);
    assert.equal(settings[0].content.headline, 'Published welcome');
    assert.equal(must(await f.anon.from('weddings').select('id').eq('id', f.weddingB)).length, 0);
    denied(await f.anon.from('invitation_groups').select('*'), 'Anonymous invitation-table access');
    denied(await f.anon.from('guests').select('*'), 'Anonymous guest-table access');
    const album = must(await f.service.from('gallery_albums').insert({ wedding_id: f.weddingA, title: 'Draft album' }).select().single());
    must(await f.service.from('gallery_images').insert({ wedding_id: f.weddingA, album_id: album.id, image_path: `${f.weddingA}/sample.png`, alt_text: 'Development fixture', is_published: true }));
    assert.equal(must(await f.anon.from('gallery_images').select('*').eq('album_id', album.id)).length, 0);
    const message = must(await f.service.from('guestbook_messages').insert({ wedding_id: f.weddingA, name: 'Development guest', message: 'Pending moderation' }).select().single());
    assert.equal(must(await f.anon.from('guestbook_messages').select('*').eq('id', message.id)).length, 0);
  });

  test('tenant foreign keys, role restrictions, and owner retention reject cross-tenant access', async () => {
    assert.equal(must(await f.accounts.ownerB.client.from('guests').select('*').eq('wedding_id', f.weddingA)).length, 0);
    denied(await f.accounts.ownerA.client.from('guests').insert({ wedding_id: f.weddingA, invitation_group_id: f.groupB.id, name: 'Cross tenant' }), 'Cross-tenant relationship');
    const managedGuest = must(await f.accounts.coordinator.client.from('guests').insert({ wedding_id: f.weddingA, invitation_group_id: f.groupA.id, name: 'Coordinator-managed guest' }).select().single());
    must(await f.accounts.coordinator.client.from('guests').update({ name: 'Updated coordinator guest' }).eq('id', managedGuest.id));
    denied(await f.accounts.viewer.client.from('guests').insert({ wedding_id: f.weddingA, invitation_group_id: f.groupA.id, name: 'Viewer mutation' }), 'Viewer mutation');
    denied(await f.accounts.coordinator.client.from('site_settings').insert({ wedding_id: f.weddingB }), 'Coordinator branding mutation');
    const unchanged = must(await f.accounts.coordinator.client.from('site_settings').update({ content: { changed: true } }).eq('wedding_id', f.weddingA).select());
    assert.equal(unchanged.length, 0);
    denied(await f.accounts.admin.client.from('wedding_members').insert({ wedding_id: f.weddingA, profile_id: f.accounts.outsider.id, role: 'owner' }), 'Admin owner escalation');
    denied(await f.accounts.ownerA.client.from('wedding_members').delete().eq('wedding_id', f.weddingA).eq('profile_id', f.accounts.ownerA.id), 'Last owner removal');
    denied(await f.service.from('guests').update({ wedding_id: f.weddingB, invitation_group_id: f.groupB.id }).eq('id', f.guestA.id), 'Moving record identity between tenants');
    denied(await f.accounts.outsider.client.rpc('issue_invitation', { p_wedding_id: f.weddingA, p_group_id: f.groupA.id, p_expires_at: new Date(Date.now() + 86400000).toISOString() }), 'Outsider privileged operation');
  });

  test('invitation tokens are hashed and invalid, expired, revoked tokens are rejected', async () => {
    const row = must(await f.service.from('invitation_groups').select('token_hash').eq('id', f.groupA.id).single());
    assert.equal(f.token.length, 64);
    assert.equal(row.token_hash, createHash('sha256').update(f.token).digest('hex'));
    assert.notEqual(row.token_hash, f.token);
    const invitation = must(await f.service.rpc('get_invitation', { p_token: f.token }));
    assert.equal(invitation.id, f.groupA.id);
    assert.ok(!JSON.stringify(invitation).includes(row.token_hash));
    assert.equal(invitation.events.length, 1);
    denied(await f.anon.rpc('get_invitation', { p_token: f.token }), 'Public direct token RPC bypass');
    denied(await f.service.rpc('get_invitation', { p_token: 'x'.repeat(64) }), 'Invalid token');
    const tokenB = must(await f.accounts.ownerB.client.rpc('issue_invitation', { p_wedding_id: f.weddingB, p_group_id: f.groupB.id, p_expires_at: new Date(Date.now() + 86400000).toISOString() }));
    must(await f.service.from('invitation_groups').update({ token_expires_at: new Date(Date.now() - 60000).toISOString() }).eq('id', f.groupB.id));
    denied(await f.service.rpc('get_invitation', { p_token: tokenB }), 'Expired token');
    must(await f.service.from('invitation_groups').update({ token_expires_at: new Date(Date.now() + 86400000).toISOString(), token_revoked_at: new Date().toISOString() }).eq('id', f.groupB.id));
    denied(await f.service.rpc('get_invitation', { p_token: tokenB }), 'Revoked token');
  });

  test('RSVP saves atomically, enforces allowance and eligibility, and remains unique under concurrent submissions', async () => {
    const args = { p_token: f.token, p_status: 'attending', p_attendees: [{ name: 'Primary attendee', guest_id: f.guestA.id }, { name: 'Plus one', type: 'plus_one' }], p_event_ids: [f.eventA.id] };
    const ids = await Promise.all([f.service.rpc('submit_rsvp', args), f.service.rpc('submit_rsvp', args)]);
    assert.equal(must(ids[0]), must(ids[1]));
    assert.equal(must(await f.service.from('rsvps').select('*').eq('wedding_id', f.weddingA).eq('invitation_group_id', f.groupA.id)).length, 1);
    denied(await f.service.rpc('submit_rsvp', { ...args, p_attendees: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }] }), 'RSVP allowance');
    denied(await f.service.rpc('submit_rsvp', { ...args, p_event_ids: [f.privateEvent.id] }), 'Event eligibility');
    denied(await f.service.rpc('submit_rsvp', { ...args, p_attendees: [{ name: 'Wrong tenant', guest_id: f.guestB.id }] }), 'Cross-tenant attendee');
    denied(await f.service.rpc('submit_rsvp', { ...args, p_status: 'declined' }), 'Declined RSVP with attendees');
    attendees = must(await f.service.from('rsvp_attendees').select('*').eq('wedding_id', f.weddingA));
    assert.equal(attendees.length, 2);
    assert.equal(must(await f.service.from('event_attendance').select('*').eq('wedding_id', f.weddingA)).length, 2);
    denied(await f.accounts.ownerA.client.from('invitation_groups').update({ guest_allowance: 1 }).eq('id', f.groupA.id), 'Allowance reduced below confirmed attendance');
  });

  test('concurrent gift reservations cannot over-reserve and cancellation/fulfilment preserve quantities', async () => {
    const args = { p_wedding_id: f.weddingA, p_item_id: f.item.id, p_quantity: 1 };
    const results = await Promise.all(Array.from({ length: 8 }, () => f.service.rpc('reserve_gift', args)));
    assert.equal(results.filter(result => !result.error).length, 1);
    assert.equal(results.filter(result => result.error?.message.includes('Insufficient quantity')).length, 7);
    const reservation = results.find(result => !result.error).data;
    let availability = must(await f.anon.rpc('gift_availability', { p_wedding_id: f.weddingA }));
    assert.equal(availability.find(item => item.item_id === f.item.id).quantity_remaining, 0);
    denied(await f.anon.from('gift_reservations').select('*'), 'Anonymous reservation identity access');
    denied(await f.anon.rpc('reserve_gift', args), 'Direct anonymous reservation bypass');
    denied(await f.service.rpc('reserve_gift', { ...args, p_quantity: 0 }), 'Zero quantity');
    denied(await f.service.rpc('cancel_gift_reservation', { p_token: 'wrong-token' }), 'Invalid cancellation token');
    must(await f.service.rpc('cancel_gift_reservation', { p_token: reservation.cancellation_token }));
    const next = must(await f.service.rpc('reserve_gift', args));
    must(await f.accounts.coordinator.client.rpc('set_reservation_status', { p_wedding_id: f.weddingA, p_reservation_id: next.id, p_status: 'fulfilled' }));
    denied(await f.service.rpc('cancel_gift_reservation', { p_token: next.cancellation_token }), 'Cancelling fulfilled gift');
    const bigger = must(await f.service.from('wishlist_items').insert({ wedding_id: f.weddingA, title: 'Quantity guard', quantity_required: 3, is_published: true }).select().single());
    must(await f.service.rpc('reserve_gift', { ...args, p_item_id: bigger.id, p_quantity: 2 }));
    denied(await f.accounts.ownerA.client.from('wishlist_items').update({ quantity_required: 1 }).eq('id', bigger.id), 'Quantity below reserved units');
  });

  test('payment status is trusted-only, amount checked, and webhook replay cannot credit twice', async () => {
    const reference = `loop-${randomUUID()}`;
    const contribution = must(await f.service.from('contributions').insert({ wedding_id: f.weddingA, reference, amount_minor: 500000, currency: 'NGN' }).select().single());
    const args = { p_event_id: `evt-${randomUUID()}`, p_reference: reference, p_amount_minor: 500000, p_currency: 'NGN', p_transaction_id: `txn-${randomUUID()}` };
    assert.equal(must(await f.accounts.coordinator.client.from('contributions').select('*').eq('id', contribution.id)).length, 0);
    assert.equal(must(await f.accounts.ownerB.client.from('contributions').select('*').eq('id', contribution.id)).length, 0);
    assert.equal(must(await f.accounts.viewer.client.from('contributions').select('*').eq('id', contribution.id)).length, 1);
    denied(await f.accounts.ownerA.client.from('contributions').update({ status: 'successful', verified_at: new Date().toISOString() }).eq('id', contribution.id), 'Client payment mutation');
    denied(await f.accounts.ownerA.client.rpc('apply_verified_payment', args), 'Client payment RPC');
    denied(await f.service.rpc('apply_verified_payment', { ...args, p_amount_minor: 1 }), 'Payment amount mismatch');
    denied(await f.service.rpc('apply_verified_payment', { ...args, p_currency: 'USD' }), 'Payment currency mismatch');
    assert.equal(must(await f.service.rpc('apply_verified_payment', args)), true);
    const replay = await Promise.all([f.service.rpc('apply_verified_payment', args), f.service.rpc('apply_verified_payment', args)]);
    assert.deepEqual(replay.map(result => must(result)), [false, false]);
    assert.equal(must(await f.service.from('payment_webhook_events').select('*').eq('provider_event_id', args.p_event_id)).length, 1);
    const secondReference = `loop-${randomUUID()}`;
    const second = must(await f.service.from('contributions').insert({ wedding_id: f.weddingA, reference: secondReference, amount_minor: 500000 }).select().single());
    denied(await f.service.rpc('apply_verified_payment', { ...args, p_event_id: `evt-${randomUUID()}`, p_reference: secondReference }), 'Reusing provider transaction');
    assert.equal(must(await f.service.from('contributions').select('status').eq('id', second.id).single()).status, 'pending');
  });

  test('seating capacity is serialized and check-in is unique and event-scoped', async () => {
    const table = must(await f.service.from('seating_tables').insert({ wedding_id: f.weddingA, name: 'Single seat', capacity: 1 }).select().single());
    const seats = await Promise.all(attendees.map(attendee => f.accounts.coordinator.client.rpc('assign_seat', { p_wedding_id: f.weddingA, p_table_id: table.id, p_attendee_id: attendee.id })));
    assert.equal(seats.filter(result => !result.error).length, 1);
    assert.equal(seats.filter(result => result.error?.message.includes('Table is full')).length, 1);
    const larger = must(await f.service.from('seating_tables').insert({ wedding_id: f.weddingA, name: 'Two seats', capacity: 2 }).select().single());
    for (const attendee of attendees) must(await f.accounts.coordinator.client.rpc('assign_seat', { p_wedding_id: f.weddingA, p_table_id: larger.id, p_attendee_id: attendee.id }));
    denied(await f.accounts.ownerA.client.from('seating_tables').update({ capacity: 1 }).eq('id', larger.id), 'Shrinking occupied table');
    const args = { p_wedding_id: f.weddingA, p_event_id: f.eventA.id, p_attendee_id: attendees[0].id };
    const checks = await Promise.all([f.accounts.coordinator.client.rpc('check_in_attendee', args), f.accounts.coordinator.client.rpc('check_in_attendee', args)]);
    assert.equal(must(checks[0]), must(checks[1]));
    assert.equal(must(await f.service.from('check_ins').select('*').eq('wedding_id', f.weddingA)).length, 1);
    denied(await f.accounts.coordinator.client.rpc('check_in_attendee', { ...args, p_event_id: f.privateEvent.id }), 'Ineligible event check-in');
    denied(await f.accounts.viewer.client.rpc('check_in_attendee', args), 'Viewer check-in');
  });

  test('private storage enforces tenant, publication, role, and MIME restrictions', async () => {
    const bucket = 'wedding-media';
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
    const path = `${f.weddingA}/${randomUUID()}.png`;
    must(await f.accounts.ownerA.client.storage.from(bucket).upload(path, image, { contentType: 'image/png' }), 'Upload own tenant image');
    denied(await f.accounts.ownerB.client.storage.from(bucket).download(path), 'Cross-tenant private download');
    denied(await f.anon.storage.from(bucket).download(path), 'Unpublished anonymous download');
    denied(await f.accounts.viewer.client.storage.from(bucket).upload(`${f.weddingA}/${randomUUID()}.png`, image, { contentType: 'image/png' }), 'Viewer upload');
    denied(await f.accounts.ownerA.client.storage.from(bucket).upload(`${f.weddingB}/${randomUUID()}.png`, image, { contentType: 'image/png' }), 'Cross-tenant upload');
    denied(await f.accounts.ownerA.client.storage.from(bucket).upload(`${f.weddingA}/${randomUUID()}.svg`, '<svg/>', { contentType: 'image/svg+xml' }), 'Unsupported MIME');
    const asset = must(await f.service.from('media_assets').insert({ wedding_id: f.weddingA, object_path: path, mime_type: 'image/png', size_bytes: image.length, is_published: true }).select().single());
    const download = must(await f.anon.storage.from(bucket).download(path), 'Published anonymous download');
    assert.equal(download.size, image.length);
    must(await f.service.from('media_assets').update({ is_published: false }).eq('id', asset.id));
    denied(await f.anon.storage.from(bucket).download(path), 'Unpublished image after retraction');
    must(await f.accounts.ownerA.client.storage.from(bucket).remove([path]));
  });

  test('audit records exist, omit row secrets, and cannot be edited even through the service API', async () => {
    const audits = must(await f.accounts.ownerA.client.from('audit_logs').select('*').eq('wedding_id', f.weddingA));
    assert.ok(audits.length > 10);
    assert.ok(!JSON.stringify(audits).includes(f.token));
    denied(await f.accounts.ownerA.client.from('audit_logs').insert({ wedding_id: f.weddingA, action: 'forged', entity_type: 'test' }), 'Ordinary audit insert');
    denied(await f.service.from('audit_logs').update({ action: 'edited' }).eq('id', audits[0].id), 'Audit update');
    denied(await f.service.from('audit_logs').delete().eq('id', audits[0].id), 'Audit deletion');
  });
});
