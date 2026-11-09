import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createFixture, must } from '../../scripts/database/fixtures.mjs';
const origin = 'http://127.0.0.1:3102';
async function cookiesFor(account) {
 const cookies = new Map();
 const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookies.set(name,value))}});
 must(await client.auth.signInWithPassword({email:account.email,password:account.password}));
 return {Cookie:[...cookies].map(([name,value])=>`${name}=${value}`).join('; ')};
}
describe('Phase 6 administration acceptance', {timeout:240000},()=>{
 let f, server, headers; let logs='';
 before(async()=>{
  f=await createFixture('cms');headers=await cookiesFor(f.accounts.ownerA);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3102'],{stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',b=>logs=(logs+b).slice(-16000));
  for(let i=0;i<100;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{} await new Promise(r=>setTimeout(r,300));}throw new Error(logs);
 });
 after(()=>server?.kill('SIGTERM'));
 test('every content module persists drafts, publishes atomically, updates and deletes with role and tenant enforcement',async()=>{
  const examples={story_sections:{title:'CMS story',content:'Draft story',image_path:null,section_type:'story',sort_order:1},events:{title:'CMS event',description:null,starts_at:'2030-07-01T12:00:00Z',ends_at:null,venue_name:null,address:null,map_url:null,dress_code:null,is_private:false,sort_order:1},faqs:{question:'CMS question?',answer:'CMS answer',sort_order:1},travel_information:{title:'CMS travel',content:'Directions',information_type:'travel',link_url:null,sort_order:1},announcements:{title:'CMS announcement',content:'News',publish_at:'2020-01-01T00:00:00Z'},gallery_albums:{title:'CMS album',description:null,sort_order:1}};
  let albumId;
  for(const [module,payload]of Object.entries(examples)){
   const record_id=randomUUID();const row={wedding_id:f.weddingA,module,record_id,payload};
   assert.ok((await f.accounts.viewer.client.from('content_drafts').insert(row)).error);
   assert.ok((await f.accounts.ownerB.client.from('content_drafts').insert(row)).error);
   if(!['events','announcements','gallery_albums'].includes(module))assert.ok((await f.accounts.coordinator.client.from('content_drafts').insert(row)).error);
   const d=must(await f.accounts.ownerA.client.from('content_drafts').insert(row).select().single());
   assert.equal(must(await f.anon.from(module).select('id').eq('id',record_id)).length,0);
   assert.ok((await f.accounts.viewer.client.rpc('publish_content',{p_wedding_id:f.weddingA,p_draft_id:d.id})).error);
   assert.ok((await f.accounts.ownerB.client.rpc('publish_content',{p_wedding_id:f.weddingA,p_draft_id:d.id})).error);
   assert.equal(must(await f.accounts.ownerA.client.rpc('publish_content',{p_wedding_id:f.weddingA,p_draft_id:d.id})),record_id);
   assert.equal(must(await f.anon.from(module).select('id').eq('id',record_id)).length,1);
   if(module==='gallery_albums')albumId=record_id;
   const changed={...payload,...('title'in payload?{title:'Updated CMS content'}:{answer:'Updated CMS answer'})};
   const edit=must(await f.accounts.ownerA.client.from('content_drafts').insert({...row,payload:changed}).select().single());
   const publicRow=must(await f.anon.from(module).select('*').eq('id',record_id).single());assert.equal(publicRow.title??publicRow.answer,payload.title??payload.answer);
   must(await f.accounts.ownerA.client.rpc('publish_content',{p_wedding_id:f.weddingA,p_draft_id:edit.id,p_publish:false}));
   assert.equal(must(await f.anon.from(module).select('id').eq('id',record_id)).length,0);
   if(module!=='gallery_albums')must(await f.accounts.ownerA.client.from(module).delete().eq('id',record_id));
  }
  const image=must(await f.accounts.coordinator.client.from('content_drafts').insert({wedding_id:f.weddingA,module:'gallery_images',payload:{album_id:albumId,image_path:`${f.weddingA}/photo.png`,alt_text:'CMS photo',caption:null,sort_order:0}}).select().single());
  must(await f.accounts.coordinator.client.rpc('publish_content',{p_wedding_id:f.weddingA,p_draft_id:image.id}));
  must(await f.accounts.coordinator.client.from('gallery_images').delete().eq('id',image.record_id));must(await f.accounts.ownerA.client.from('gallery_albums').delete().eq('id',albumId));
  assert.ok((await f.anon.from('content_drafts').select('*')).error,'Draft table must not have anonymous grants');
 });
 test('website identity, theme and content stay private until publication; publish rolls back on invalid identity',async()=>{
  const content={identity:{title:'CMS workspace',partner_one_name:'Preview partner',partner_two_name:'Preview partner two',wedding_date:'2030-06-01T12:00:00Z',timezone:'Africa/Lagos'},welcome_heading:`Draft heading ${randomUUID()}`,welcome_text:'Draft preview text'};
  must(await f.accounts.ownerA.client.from('site_settings').upsert({wedding_id:f.weddingA,is_published:false,content,theme:{primary:'#123456'}},{onConflict:'wedding_id,is_published'}));
  const publicBefore=await(await fetch(`${origin}/${f.tag}-a`)).text();assert.ok(!publicBefore.includes(content.welcome_heading));
  const preview=await fetch(`${origin}/admin/${f.weddingA}/preview`,{headers});assert.equal(preview.status,200);const html=await preview.text();assert.ok(html.includes(content.welcome_heading));assert.ok(html.includes('Preview partner'));
  assert.ok((await f.accounts.coordinator.client.rpc('publish_website',{p_wedding_id:f.weddingA})).error);
  must(await f.accounts.ownerA.client.rpc('publish_website',{p_wedding_id:f.weddingA}));
  const publicAfter=await(await fetch(`${origin}/${f.tag}-a`)).text();assert.ok(publicAfter.includes(content.welcome_heading));assert.ok(publicAfter.includes('Preview partner'));
  assert.equal(must(await f.anon.from('site_settings').select('id').eq('wedding_id',f.weddingA)).length,1);
  must(await f.accounts.ownerA.client.from('site_settings').update({content:{...content,identity:{...content.identity,title:''}}}).eq('wedding_id',f.weddingA).eq('is_published',false));
  assert.ok((await f.accounts.ownerA.client.rpc('publish_website',{p_wedding_id:f.weddingA})).error);
  assert.equal(must(await f.anon.from('weddings').select('title').eq('id',f.weddingA).single()).title,'CMS workspace');
 });
 test('membership restrictions preserve the final owner and prevent admin elevation',async()=>{
  const owner=must(await f.accounts.ownerA.client.from('wedding_members').select('id').eq('profile_id',f.accounts.ownerA.id).single());
  assert.ok((await f.accounts.ownerA.client.from('wedding_members').update({role:'viewer'}).eq('id',owner.id)).error);
  assert.ok((await f.accounts.ownerA.client.from('wedding_members').delete().eq('id',owner.id)).error);
  const coordinator=must(await f.accounts.ownerA.client.from('wedding_members').select('id').eq('profile_id',f.accounts.coordinator.id).single());
  assert.ok((await f.accounts.admin.client.from('wedding_members').update({role:'owner'}).eq('id',coordinator.id)).error);
  assert.ok((await f.accounts.admin.client.from('wedding_members').insert({wedding_id:f.weddingA,profile_id:f.accounts.outsider.id,role:'admin'})).error);
  must(await f.accounts.admin.client.from('wedding_members').insert({wedding_id:f.weddingA,profile_id:f.accounts.outsider.id,role:'viewer'}));
  must(await f.accounts.admin.client.from('wedding_members').delete().eq('wedding_id',f.weddingA).eq('profile_id',f.accounts.outsider.id));
 });
 test('all administration modules render with real data and enforce server membership',async()=>{
  for(const path of ['','/website','/preview','/team','/payments','/operations',...['story','events','faq','travel','announcements','albums','images'].map(k=>`/content/${k}`)]){
   const response=await fetch(`${origin}/admin/${f.weddingA}${path}`,{headers});assert.equal(response.status,200,path);assert.ok(!(await response.text()).includes('Something went wrong'),path);
  }
  const outsider=await fetch(`${origin}/admin/${f.weddingA}/website`,{headers:await cookiesFor(f.accounts.ownerB)});assert.ok([200,404].includes(outsider.status));const denied=await outsider.text();assert.ok(denied.includes('A little out of the way.'));assert.ok(!denied.includes('Save website draft'));
  const viewer=await(await fetch(`${origin}/admin/${f.weddingA}/content/story`,{headers:await cookiesFor(f.accounts.viewer)})).text();assert.ok(!viewer.includes('Save draft'));
  const coordinator=await(await fetch(`${origin}/admin/${f.weddingA}/website`,{headers:await cookiesFor(f.accounts.coordinator)})).text();assert.ok(!coordinator.includes('Save website draft'));
  const stats=must(await f.accounts.ownerA.client.rpc('guest_overview',{p_wedding_id:f.weddingA}));assert.equal(stats.invited_allowance,2);assert.equal(stats.confirmed_attendees,0);
 });
});
