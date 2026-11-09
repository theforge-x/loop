import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { pixelPng as png } from '../../scripts/database/image.mjs';
import { createServerClient } from '@supabase/ssr';
import { createFixture, must } from '../../scripts/database/fixtures.mjs';
const origin = 'http://127.0.0.1:3100';

describe('Phase 3 production HTTP routes with real Supabase', { timeout: 240000 }, () => {
  let f; let server; let logs = ''; let slug; let secret; let imagePath;
  before(async () => {
    f = await createFixture('public'); slug = `${f.tag}-a`; secret = `PRIVATE_DRAFT_${randomUUID()}`;
    must(await f.service.from('weddings').update({ wedding_date: '2030-06-01T12:00:00Z' }).eq('id', f.weddingA));
    imagePath = `${f.weddingA}/${randomUUID()}.png`;
    const image = png();
    must(await f.accounts.ownerA.client.storage.from('wedding-media').upload(imagePath, image, { contentType: 'image/png' }));
    must(await f.service.from('media_assets').insert({ wedding_id: f.weddingA, object_path: imagePath, mime_type: 'image/png', size_bytes: image.length, is_published: true }));
    must(await f.service.from('site_settings').update({ content: { welcome_text: secret } }).eq('wedding_id', f.weddingA));
    must(await f.service.from('site_settings').insert({ wedding_id: f.weddingA, is_published: true, content: { hero_image_path: imagePath, welcome_heading: 'A published welcome', welcome_text: 'A welcome saved in Supabase.', seo_description: 'Published wedding description from Supabase.' }, theme: { primary: '#344b3d' } }));
    must(await f.service.from('story_sections').insert([{ wedding_id: f.weddingA, title: 'Published story chapter', content: 'A story saved in Supabase.', image_path: imagePath, is_published: true }, { wedding_id: f.weddingA, title: secret, is_published: false }]));
    must(await f.service.from('faqs').insert([{ wedding_id: f.weddingA, question: 'Published question?', answer: 'A published answer.', is_published: true }, { wedding_id: f.weddingA, question: secret, answer: secret, is_published: false }]));
    must(await f.service.from('travel_information').insert({ wedding_id: f.weddingA, title: 'Published travel notes', content: 'Directions saved in Supabase.', is_published: true }));
    must(await f.service.from('guestbook_messages').insert([{ wedding_id: f.weddingA, name: 'Approved guest', message: 'Approved wishes from Supabase.', moderation_status: 'approved' }, { wedding_id: f.weddingA, name: secret, message: secret, moderation_status: 'pending' }]));
    const album = must(await f.service.from('gallery_albums').insert({ wedding_id: f.weddingA, title: 'Published album', is_published: true }).select().single());
    must(await f.service.from('gallery_images').insert({ wedding_id: f.weddingA, album_id: album.id, image_path: imagePath, alt_text: 'Approved test photograph', is_published: true }));
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', value => { logs = (logs + value).slice(-32000); });
    server.stderr.on('data', value => { logs = (logs + value).slice(-32000); });
    let ready = false;
    for (let index = 0; index < 100; index++) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    assert.ok(ready, `Production server did not start: ${logs}`);
  });
  after(() => { server?.kill('SIGTERM'); });

  test('all public routes render database content and canonical dynamic metadata', async () => {
    const routes = [['', 'A published welcome'], ['/story', 'Published story chapter'], ['/events', f.eventA.title], ['/rsvp', 'Your personal invitation'], ['/wishlist', f.item.title], ['/gallery', 'Published album'], ['/faq', 'Published question?'], ['/travel', 'Published travel notes'], ['/guestbook', 'Approved wishes from Supabase.']];
    for (const [path, expected] of routes) {
      const response = await fetch(`${origin}/${slug}${path}`);
      assert.equal(response.status, 200, path);
      const body = await response.text();
      assert.ok(body.includes(expected), `${path} should render its Supabase record`);
      assert.ok(!body.includes(secret), `${path} must not include unpublished content`);
      assert.match(body, /<title>[^<]+<\/title>/);
      assert.ok(body.includes(`href="${process.env.NEXT_PUBLIC_APP_URL}/${slug}${path}"`), `${path} canonical URL`);
      assert.ok(body.includes('Published wedding description from Supabase.'));
    }
    const changed = `Updated-${randomUUID().slice(0, 8)}`;
    must(await f.service.from('weddings').update({ partner_one_name: changed }).eq('id', f.weddingA));
    const updated = await (await fetch(`${origin}/${slug}`)).text();
    assert.ok(updated.includes(changed), 'Subsequent requests must use current Supabase content');
    assert.ok(!updated.includes(f.privateEvent.title), 'Private events stay out of public pages');
  });

  test('approved private-bucket photographs can be signed and optimized', async () => {
    const signed = must(await f.anon.storage.from('wedding-media').createSignedUrl(imagePath, 3600));
    const response = await fetch(`${origin}/_next/image?url=${encodeURIComponent(signed.signedUrl)}&w=640&q=75`);
    assert.equal(response.status, 200, await response.clone().text().catch(() => 'image response'));
    assert.match(response.headers.get('content-type'), /^image\//);
  });

  test('private invitations validate tokens and disclose only the intended group', async () => {
    const response = await fetch(`${origin}/invitation/${f.token}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    const body = await response.text();
    assert.ok(body.includes(f.groupA.name));
    assert.ok(!body.includes(f.groupB.name));
    assert.ok(!body.includes(createHash('sha256').update(f.token).digest('hex')));
    assert.ok(body.includes('noindex'));
    const invalid = await fetch(`${origin}/invitation/${'x'.repeat(64)}`);
    const invalidBody = await invalid.text();
    assert.ok([200,404].includes(invalid.status));
    assert.ok(invalidBody.includes('A little out of the way.'));
    assert.ok(!invalidBody.includes(f.groupA.name));
    assert.ok(invalidBody.includes('noindex'));
  });

  test('cookie-aware admin works and public rendering never inherits draft permissions', async () => {
    const anonymous = await fetch(`${origin}/admin`, { redirect: 'manual' });
    assert.ok([303,307].includes(anonymous.status));
    assert.equal(new URL(anonymous.headers.get('location'), origin).pathname, '/sign-in');
    const cookies = new Map();
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...cookies].map(([name,value]) => ({name,value})), setAll: values => values.forEach(({name,value}) => cookies.set(name,value)) } });
    must(await client.auth.signInWithPassword({ email: f.accounts.ownerA.email, password: f.accounts.ownerA.password }));
    const headers = { Cookie: [...cookies].map(([name,value]) => `${name}=${value}`).join('; ') };
    const admin = await fetch(`${origin}/admin`, { headers });
    assert.equal(admin.status, 200);
    assert.ok((await admin.text()).includes('A place for every detail.'));
    const publicBody = await (await fetch(`${origin}/${slug}/story`, { headers })).text();
    assert.ok(publicBody.includes('Published story chapter'));
    assert.ok(!publicBody.includes(secret), 'Administrator cookies must not widen public queries');
  });
});
