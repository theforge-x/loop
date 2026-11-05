import { writeFileSync } from 'node:fs';
import { createFixture } from './database/fixtures.mjs';
const fixture = await createFixture('development');
const accounts = Object.fromEntries(Object.entries(fixture.accounts).map(([role, { id, email, password }]) => [role, { id, email, password }]));
writeFileSync('.local-dev-accounts.json', JSON.stringify({ weddingA: fixture.weddingA, weddingB: fixture.weddingB, accounts }, null, 2), { mode: 0o600 });
console.log('Created two local development weddings and role fixtures. Credentials are in ignored .local-dev-accounts.json; no passwords displayed.');
