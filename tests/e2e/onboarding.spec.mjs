import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {localClients,must} from '../../scripts/database/fixtures.mjs';
process.loadEnvFile('.env.local');
test('new user registers, creates a private wedding and becomes its owner',async({page})=>{
 test.setTimeout(300000);
 const tag=randomUUID().slice(0,8);const email=`signup-${tag}@example.test`;const password=`Demo-${randomUUID()}`;
 await page.goto('/');await page.getByRole('link',{name:'Create your account',exact:true}).click();
 await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByLabel('Confirm password').fill('Different-password-123');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'matching passwords'})).toBeVisible({timeout:60000});
 await page.getByLabel('Confirm password').fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page).toHaveURL(/\/admin\/new$/,{timeout:60000});
 await page.getByLabel('Workspace title').fill('Our new wedding');await page.getByLabel('First partner’s name').fill('Ada');await page.getByLabel('Second partner’s name').fill('Tunde');await page.getByLabel('Wedding URL').fill(`ada-tunde-${tag}`);await page.getByRole('button',{name:'Create wedding',exact:true}).click();await expect(page).toHaveURL(/\/admin\/[0-9a-f-]+\/website$/,{timeout:60000});
 const id=page.url().split('/').at(-2);const {service,newUserClient}=localClients();const client=newUserClient();const auth=must(await client.auth.signInWithPassword({email,password}));
 const wedding=must(await service.from('weddings').select('is_published,partner_one_name').eq('id',id).single());expect(wedding.is_published).toBe(false);expect(wedding.partner_one_name).toBe('Ada');const member=must(await service.from('wedding_members').select('role').eq('wedding_id',id).eq('profile_id',auth.user.id).single());expect(member.role).toBe('owner');expect(must(await service.from('site_settings').select('id').eq('wedding_id',id))).toHaveLength(1);
 await page.goto('/admin');await expect(page.getByRole('link',{name:'Our new wedding',exact:true})).toBeVisible();await page.getByRole('link',{name:'Create wedding',exact:true}).click();await page.getByLabel('Workspace title').fill('Duplicate');await page.getByLabel('First partner’s name').fill('Ada');await page.getByLabel('Second partner’s name').fill('Tunde');await page.getByLabel('Wedding URL').fill(`ada-tunde-${tag}`);await page.getByRole('button',{name:'Create wedding',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'already taken'})).toBeVisible();
 await page.getByLabel('Wedding URL').fill('admin');await page.getByRole('button',{name:'Create wedding',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'reserved names'})).toBeVisible();expect(must(await service.from('wedding_members').select('id').eq('profile_id',auth.user.id))).toHaveLength(1);
});
test('confirmation establishes a session; invalid/replayed links fail without external redirects',async({page})=>{
 const {service}=localClients();const email=`confirm-${randomUUID()}@example.test`;
 const generated=must(await service.auth.admin.generateLink({type:'signup',email,password:`Demo-${randomUUID()}`}));
 const query=new URLSearchParams({token_hash:generated.properties.hashed_token,type:'email',next:'https://example.org'});
 const confirmation=await page.request.get(`/auth/confirm?${query}`,{maxRedirects:0});expect(confirmation.status()).toBe(307);expect(confirmation.headers().location).toBe(new URL("/admin/new",process.env.NEXT_PUBLIC_APP_URL).toString());await page.goto("/admin/new");await expect(page).toHaveURL(/\/admin\/new$/,{timeout:60000});await expect(page.getByRole('heading',{name:'Create your wedding',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();const replay=await page.request.get(`/auth/confirm?${query}`,{maxRedirects:0});expect(replay.headers().location).toBe(new URL("/sign-up?confirmation=failed",process.env.NEXT_PUBLIC_APP_URL).toString());await page.goto("/sign-up?confirmation=failed");await expect(page.getByRole('alert').filter({hasText:'invalid or has expired'})).toBeVisible();
 await page.goto('/admin/new');await expect(page).toHaveURL(/\/sign-in$/);
});
