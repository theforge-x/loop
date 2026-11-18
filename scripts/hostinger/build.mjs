import { spawnSync } from 'node:child_process';
import { preflight } from './preflight.mjs';
const problems = preflight();
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
// Run the checked-in package-manager version through pnpm's own command context.
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'check'], { stdio: 'inherit' });
if (result.error) console.error('Unable to run pnpm check. Invoke this build with pnpm build:hostinger.');
process.exit(result.status ?? 1);
