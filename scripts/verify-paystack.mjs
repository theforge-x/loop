import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createFixture, must } from './database/fixtures.mjs';
import { verifyTransaction, requirePaymentMatch } from '../src/lib/payments/paystack.ts';
const secret = process.env.PAYSTACK_SECRET_KEY;
assert.ok(secret?.startsWith('sk_test_'), 'Configure a Paystack TEST secret in .env.local. This verifier refuses live keys.');
const origin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
assert.ok((await fetch(origin, { signal: AbortSignal.timeout(10000) })).ok, 'Start the application at NEXT_PUBLIC_APP_URL first.');
const fixture = await createFixture('paystack-verification');
must(await fixture.service.from('site_settings').insert({ wedding_id: fixture.weddingA, is_published: true, content: { contributions_enabled: true } }));
const response = await fetch(`${origin}/api/weddings/${fixture.tag}-a/contributions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '100.00', email: process.env.PAYSTACK_TEST_EMAIL || 'loop-test@example.com', name: 'Controlled sandbox verification' }), signal: AbortSignal.timeout(30000) });
const checkout = await response.json();
assert.equal(response.status, 200, checkout.error ?? 'Checkout initialization failed');
writeFileSync('.local-paystack-verification.json', JSON.stringify({ wedding_id: fixture.weddingA, reference: checkout.reference, checkout_url: checkout.authorization_url, webhook_url: `${origin}/api/payments/paystack/webhook` }, null, 2), { mode: 0o600 });
console.log(`Open the TEST checkout: ${checkout.authorization_url}`);
console.log(`Paystack TEST webhook URL must be: ${origin}/api/payments/paystack/webhook`);
console.log('Complete a sandbox payment. Waiting up to ten minutes for independent verification and the actual webhook record; no payment status will be forged.');
let complete = false;
for (let attempt = 0; attempt < 120; attempt++) {
  const row = must(await fixture.service.from('contributions').select('id,status,reference,amount_minor,currency,provider_transaction_id').eq('reference', checkout.reference).single());
  if (row.status === 'successful') {
    const verified = await verifyTransaction(secret, checkout.reference);
    requirePaymentMatch(verified, row, row.provider_transaction_id);
    const events = must(await fixture.service.from('payment_webhook_events').select('id').eq('contribution_id', row.id).eq('provider_event_id', `charge.success:${verified.id}`));
    assert.equal(events.length, 1, 'Expected exactly one committed webhook event.');
    console.log('PASS actual Paystack verification matches amount, currency, reference and transaction ID; webhook committed exactly once.');
    complete = true;
    break;
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
}
assert.ok(complete, 'No verified webhook completed within ten minutes. Check signing keys, public HTTPS webhook reachability, provider logs and docs/manual-resolution.md. The contribution was not marked successful by this script.');
