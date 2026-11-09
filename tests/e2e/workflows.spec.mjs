import {test,expect} from '@playwright/test';
import {pixelPng} from '../../scripts/database/image.mjs';
import {randomUUID} from 'node:crypto';
import {createFixture,must} from '../../scripts/database/fixtures.mjs';
process.loadEnvFile('.env.local');
let f;
test.beforeAll(async()=>{f=await createFixture('browser');});
async function signIn(page){await page.goto('/sign-in');await page.getByLabel('Email address').fill(f.accounts.ownerA.email);await page.getByLabel('Password',{exact:true}).fill(f.accounts.ownerA.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);}
test('website draft saves through the visual editor, stays private, previews and publishes',async({page})=>{
 await signIn(page);await page.goto(`/admin/${f.weddingA}/website`);
 const heading='Browser welcome '+randomUUID().slice(0,8);await page.getByLabel('Welcome heading',{exact:true}).fill(heading);await page.getByRole('button',{name:'Save website draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved'})).toBeVisible();
 await page.goto(`/${f.tag}-a`);await expect(page.getByRole('heading',{name:heading,exact:true})).toHaveCount(0);
 await page.goto(`/admin/${f.weddingA}/preview`);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
 await page.goto(`/admin/${f.weddingA}/website`);await page.getByLabel('I reviewed the preview and confirm this change').check();await page.getByRole('button',{name:'Apply publication change'}).click();await expect(page.getByRole('status').filter({hasText:'Website publication updated'})).toBeVisible();
 await page.goto(`/${f.tag}-a`);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('event CMS validates and persists a draft before explicit publication',async({page})=>{
 await signIn(page);await page.goto(`/admin/${f.weddingA}/content/events`);await page.locator('summary').filter({hasText:'Add events'}).click();
 const form=page.locator('form').filter({has:page.getByRole('button',{name:'Save draft',exact:true})}).first();const title='Browser ceremony '+randomUUID().slice(0,8);
 await form.getByLabel('Event title').fill(title);await form.getByLabel('Starts (UTC)').fill('2030-08-01T12:00');await form.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.goto(`/${f.tag}-a/events`);await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
 await page.goto(`/admin/${f.weddingA}/content/events`);const card=page.locator('section').filter({has:page.getByRole('heading',{name:title,exact:true})}).last();await card.locator('summary').click();const publish=card.locator('form').filter({has:page.getByRole('button',{name:'Apply action',exact:true})});await publish.getByRole('combobox',{name:'Action',exact:true}).selectOption('publish');await publish.getByLabel('I confirm this action').check();await publish.getByRole('button',{name:'Apply action',exact:true}).click();await expect(card.getByText('Published',{exact:true})).toBeVisible();
 await page.goto(`/${f.tag}-a/events`);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
});
test('personal RSVP supports attendee limits, persists dietary details and reloads saved response',async({page})=>{
 await page.goto(`/invitation/${f.token}`);await page.getByLabel('Guest 1',{exact:true}).fill('Browser primary');await page.getByRole('button',{name:'Add attendee',exact:true}).click();await page.getByLabel('Guest 2',{exact:true}).fill('Browser companion');await expect(page.getByRole('button',{name:'Add attendee',exact:true})).toHaveCount(0);await page.getByLabel('Dietary requirements').fill('Vegetarian');await page.getByRole('button',{name:'Save RSVP',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Your response has been saved'})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Dietary requirements')).toHaveValue('Vegetarian');await expect(page.getByLabel('Guest 2',{exact:true})).toHaveValue('Browser companion');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('gift reservation has a private management link and cancellation restores availability',async({page})=>{
 await page.goto(`/${f.tag}-a/wishlist`);await page.getByRole('button',{name:'Reserve this gift',exact:true}).click();await page.getByLabel('Your name (optional)').fill('Browser gift guest');await page.getByRole('button',{name:'Confirm reservation',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Your gift is reserved'})).toBeVisible();await page.getByRole('link',{name:'Manage your reservation'}).click();await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();await expect(page.getByText(/Quantity: 1 · cancelled/)).toBeVisible();await page.goto(`/${f.tag}-a/wishlist`);await expect(page.getByRole('button',{name:'Reserve this gift',exact:true})).toBeEnabled();
});
test('guestbook submission stays private until an authenticated moderator approves it',async({page})=>{
 const message='Browser wishes '+randomUUID().slice(0,8);await page.goto(`/${f.tag}-a/guestbook`);await page.getByLabel('Your name',{exact:true}).fill('Browser guestbook guest');await page.getByLabel('Your message',{exact:true}).fill(message);await page.getByRole('button',{name:'Send your wishes'}).click();await expect(page.getByRole('status').filter({hasText:'will appear after approval'})).toBeVisible();await page.reload();await expect(page.locator('blockquote')).toHaveCount(0);
 await signIn(page);await page.goto(`/admin/${f.weddingA}/operations?status=pending`);const card=page.locator('section').filter({has:page.getByText(message,{exact:true})}).last();await card.getByRole('combobox',{name:'Status',exact:true}).selectOption('approved');await card.getByRole('button',{name:'Save moderation'}).click();await page.goto(`/${f.tag}-a/guestbook`);await expect(page.getByText(message,{exact:true})).toBeVisible();
});
test('mobile navigation, gallery lightbox keyboard controls and focus recovery work',async({page},testInfo)=>{
 const path=`${f.weddingA}/${randomUUID()}.png`;const bytes=pixelPng();must(await f.accounts.ownerA.client.storage.from('wedding-media').upload(path,bytes,{contentType:'image/png'}));must(await f.accounts.ownerA.client.from('media_assets').insert({wedding_id:f.weddingA,object_path:path,mime_type:'image/png',size_bytes:bytes.length,is_published:true}));const album=must(await f.accounts.ownerA.client.from('gallery_albums').insert({wedding_id:f.weddingA,title:'Browser album',is_published:true}).select().single());must(await f.accounts.ownerA.client.from('gallery_images').insert([{wedding_id:f.weddingA,album_id:album.id,image_path:path,alt_text:'Browser photo one',is_published:true},{wedding_id:f.weddingA,album_id:album.id,image_path:path,alt_text:'Browser photo two',is_published:true}]));
 await page.goto(`/${f.tag}-a`);if(testInfo.project.name==='mobile'){await page.getByText('Menu',{exact:true}).click();await page.getByRole('navigation',{name:'Mobile wedding navigation'}).getByRole('link',{name:'Gallery',exact:true}).click();}else{await page.getByRole('navigation',{name:'Wedding navigation',exact:true}).getByRole('link',{name:'Gallery',exact:true}).click();}
 const opener=page.getByRole('button',{name:'Open photograph: Browser photo one',exact:true});await opener.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('ArrowRight');await expect(page.getByRole('dialog').getByRole('heading',{name:'Browser photo two',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(opener).toBeFocused();
});
