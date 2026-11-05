import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export function localClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.ok(url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Database fixtures only run against local Supabase.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    service: createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options),
    anon: createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options),
    newUserClient: () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options),
  };
}
export function must(result, label = 'Supabase operation') {
  assert.equal(result.error, null, `${label}: ${result.error?.message}`);
  return result.data;
}
export async function createFixture(prefix = 'integration') {
  const clients = localClients();
  const tag = `${prefix}-${randomUUID().slice(0, 8)}`;
  const accounts = {};
  for (const role of ['ownerA', 'ownerB', 'admin', 'coordinator', 'viewer', 'outsider']) {
    const email = `${tag}-${role.toLowerCase()}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const { user } = must(await clients.service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `${prefix} ${role}` } }), 'Create local account');
    const client = clients.newUserClient();
    must(await client.auth.signInWithPassword({ email, password }), 'Authenticate local account');
    accounts[role] = { id: user.id, email, password, client };
  }
  const weddingA = must(await accounts.ownerA.client.rpc('create_wedding', { p_slug: `${tag}-a`, p_title: 'Development wedding A', p_partner_one: 'Sample partner one', p_partner_two: 'Sample partner two' }));
  const weddingB = must(await accounts.ownerB.client.rpc('create_wedding', { p_slug: `${tag}-b`, p_title: 'Development wedding B', p_partner_one: 'Sample partner three', p_partner_two: 'Sample partner four' }));
  must(await clients.service.from('weddings').update({ is_published: true }).eq('id', weddingA));
  for (const role of ['admin', 'coordinator', 'viewer']) {
    must(await accounts.ownerA.client.from('wedding_members').insert({ wedding_id: weddingA, profile_id: accounts[role].id, role }));
  }
  const groupA = must(await clients.service.from('invitation_groups').insert({ wedding_id: weddingA, name: 'Development group A', guest_allowance: 2 }).select().single());
  const groupB = must(await clients.service.from('invitation_groups').insert({ wedding_id: weddingB, name: 'Development group B', guest_allowance: 2 }).select().single());
  const guestA = must(await clients.service.from('guests').insert({ wedding_id: weddingA, invitation_group_id: groupA.id, name: 'Development primary guest', is_primary: true }).select().single());
  const guestB = must(await clients.service.from('guests').insert({ wedding_id: weddingB, invitation_group_id: groupB.id, name: 'Other tenant guest' }).select().single());
  const eventA = must(await clients.service.from('events').insert({ wedding_id: weddingA, title: 'Development ceremony', starts_at: '2030-06-01T12:00:00Z', is_published: true }).select().single());
  const privateEvent = must(await clients.service.from('events').insert({ wedding_id: weddingA, title: 'Private development event', starts_at: '2030-06-01T17:00:00Z', is_private: true, is_published: true }).select().single());
  const item = must(await clients.service.from('wishlist_items').insert({ wedding_id: weddingA, title: 'Development gift', quantity_required: 1, is_published: true }).select().single());
  const token = must(await accounts.ownerA.client.rpc('issue_invitation', { p_wedding_id: weddingA, p_group_id: groupA.id, p_expires_at: new Date(Date.now() + 86400000).toISOString() }));
  return { ...clients, accounts, tag, weddingA, weddingB, groupA, groupB, guestA, guestB, eventA, privateEvent, item, token };
}
