import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { amountMinor,verifyWebhookSignature,parseProviderJson,verifyTransaction,requirePaymentMatch,initializeTransaction,chargeEventSchema } from '../../src/lib/payments/paystack.ts';
test('money uses exact subunits and rejects floating/scientific/unsafe input',()=>{
 assert.equal(amountMinor('15000.25'),1500025);assert.equal(amountMinor('0.01'),1);
 for(const value of ['0','-1','1.001','1e5','Infinity','10000000000',' 1'])assert.throws(()=>amountMinor(value));
});
test('timestamped webhook signatures validate raw bytes, rotation and replay window without legacy downgrade',()=>{
 const raw=Buffer.from('{"event":"charge.success"}');const now=1800000000;const secret='whsec_controlled_unit_secret';
 const signature=createHmac('sha512',secret).update(`${now}.`).update(raw).digest('hex');
 const header=`t=${now},v1=whk_old:${'0'.repeat(128)},v1=whk_current:${signature}`;
 assert.equal(verifyWebhookSignature(raw,header,null,{signing:['whsec_old_test',secret]},now),true);
 assert.equal(verifyWebhookSignature(Buffer.concat([raw,Buffer.from('\n')]),header,null,{signing:[secret]},now),false);
 assert.equal(verifyWebhookSignature(raw,header,null,{signing:[secret]},now+301),false);
 assert.equal(verifyWebhookSignature(raw,header+',t='+now,null,{signing:[secret]},now),false);
 const legacy=createHmac('sha512','controlled-unit-key').update(raw).digest('hex');
 assert.equal(verifyWebhookSignature(raw,null,legacy,{signing:[],legacy:'controlled-unit-key'},now),true);
 assert.equal(verifyWebhookSignature(raw,null,legacy,{signing:[secret],legacy:'controlled-unit-key'},now),false);
 assert.equal(verifyWebhookSignature(raw,header,legacy,{signing:[],legacy:'controlled-unit-key'},now),false);
 assert.equal(verifyWebhookSignature(raw,'t=wrong,v1=whk_x:bad',null,{signing:[secret]},now),false);
});
test('provider verification preserves 64-bit IDs and rejects every mismatched payment attribute',async()=>{
 let requested;
 const transaction=await verifyTransaction('controlled-unit-key','loop-controlled-reference',async(url,init)=>{requested={url,init};return new Response('{"status":true,"data":{"id":18446744073709551615,"status":"success","reference":"loop-controlled-reference","amount":1500025,"currency":"NGN"}}',{status:200});});
 assert.equal(transaction.id,'18446744073709551615');
 assert.equal(requested.url,'https://api.paystack.co/transaction/verify/loop-controlled-reference');
 const expected={reference:'loop-controlled-reference',amount_minor:1500025,currency:'NGN'};
 assert.doesNotThrow(()=>requirePaymentMatch(transaction,expected,transaction.id));
 for(const change of [{status:'failed'},{amount:1},{currency:'USD'},{reference:'another-reference'},{id:'1'}])assert.throws(()=>requirePaymentMatch({...transaction,...change},expected,transaction.id));
 await assert.rejects(()=>verifyTransaction('controlled-unit-key','reference',async()=>new Response('unavailable',{status:503})));
 assert.equal(chargeEventSchema.parse(parseProviderJson('{"event":"charge.success","data":{"id":18446744073709551615,"status":"success","reference":"loop-controlled-reference","amount":1500025,"currency":"NGN"}}')).data.id,transaction.id);
});
test('checkout is initialized on the provider and only accepts matching trusted checkout URLs',async()=>{
 const input={reference:'loop-controlled-reference',amount:100000,email:'guest@example.test',currency:'NGN',callback_url:'https://example.test/wedding/contribution'};
 let sent;
 const checkout=await initializeTransaction('controlled-unit-key',input,async(url,init)=>{sent={url,body:JSON.parse(init.body)};return Response.json({status:true,data:{reference:input.reference,authorization_url:'https://checkout.paystack.com/test',access_code:'controlled-code'}});});
 assert.equal(sent.url,'https://api.paystack.co/transaction/initialize');assert.equal(sent.body.amount,'100000');assert.equal(checkout.reference,input.reference);
 for(const value of [{reference:'different-reference',authorization_url:'https://checkout.paystack.com/test'},{reference:input.reference,authorization_url:'https://untrusted.example/checkout'}])await assert.rejects(()=>initializeTransaction('controlled-unit-key',input,async()=>Response.json({status:true,data:{...value,access_code:'controlled-code'}})));
});
