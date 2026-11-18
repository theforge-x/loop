import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { configurationChecks, deployedChecks, manualGates } from './release-checks.mjs';

const args = process.argv.slice(2);
let mode = 'live', smoke = false, report;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode' && ['test', 'live'].includes(args[i + 1])) mode = args[++i];
  else if (args[i] === '--smoke') smoke = true;
  else if (args[i] === '--report' && args[i + 1] && !args[i + 1].startsWith('--')) report = args[++i];
  else { console.error('Usage: verify-release.mjs [--mode test|live] [--smoke] [--report NEW_PRIVATE_FILE]'); process.exit(2); }
}
const checks = configurationChecks(process.env, mode);
if (smoke) checks.push(...await deployedChecks(process.env.NEXT_PUBLIC_APP_URL));
for (const item of checks) console.log(`${item.passes ? 'PASS' : 'MANUAL REQUIRED'} ${item.name}`);
let revision = 'unknown', dirty = true;
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
} catch { /* An unpacked source archive may have no Git metadata. */ }
const evidence = { generatedAt: new Date().toISOString(), revision, dirty, mode, smokeRequested: smoke,
  automatedChecksPassed: checks.every(c => c.passes), productionReady: false, checks, manualGates };
if (report) {
  try { writeFileSync(report, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); console.log('Private readiness report created; manual gates remain OPEN.'); }
  catch { console.error('Could not create report. Use a new path in an existing private directory; existing evidence is never overwritten.'); process.exitCode = 1; }
}
console.log('Still requires recorded real checkout/webhook/email, production deployment, HTTPS/domain, monitoring and backup-restore evidence. Configuration presence alone does not prove production readiness.');
if (checks.some(c => !c.passes)) process.exitCode = 1;
