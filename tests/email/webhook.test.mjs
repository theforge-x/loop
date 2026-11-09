import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {verifyEmailWebhook} from '../../src/lib/email/webhook.ts';
import {emailTemplate} from '../../src/lib/email/templates.ts';
import {imageMime} from '../../src/lib/media/validation.ts';
test('Svix signatures bind raw bytes, message ID and time, accept rotation, reject stale/future/forged events',()=>{
 const raw=Buffer.from('{"type":"email.delivered"}');const secret='whsec_'+randomBytes(32).toString('base64');const time=String(Math.floor(Date.now()/1000));const id='msg_test';
 const sig=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${time}.`).update(raw).digest('base64');
 const headers=new Headers({'svix-id':id,'svix-timestamp':time,'svix-signature':`v1,invalid v1,${sig}`});
 assert.equal(verifyEmailWebhook(raw,headers,secret),true);
 assert.equal(verifyEmailWebhook(Buffer.concat([raw,Buffer.from(' ')]),headers,secret),false);
 assert.equal(verifyEmailWebhook(raw,headers,'whsec_'+randomBytes(32).toString('base64')),false);
 assert.equal(verifyEmailWebhook(raw,headers,secret,Date.now()+301000),false);
 assert.equal(verifyEmailWebhook(raw,headers,secret,Date.now()-301000),false);
 headers.set('svix-id','forged');assert.equal(verifyEmailWebhook(raw,headers,secret),false);
 assert.equal(verifyEmailWebhook(raw,new Headers(),secret),false);
});
test('responsive templates escape names and content; upload signatures reject SVG and renamed scripts',()=>{
 const html=emailTemplate('<script>alert(1)</script>','<img src=x onerror=alert(1)> & wishes');assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&amp; wishes'));assert.ok(html.includes('max-width:600px'));
 assert.equal(imageMime(Buffer.from('<svg onload="alert(1)"></svg>')),null);
 assert.equal(imageMime(Buffer.from('<script>alert(1)</script>')),null);
 assert.equal(imageMime(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(16)])),'image/png');
});
