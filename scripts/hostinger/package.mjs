import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export function packageSource(root, destination) {
  const required = ['src', 'scripts/hostinger', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
    'next.config.ts', 'tsconfig.json', 'eslint.config.mjs', 'postcss.config.mjs', '.nvmrc'];
  const optional = ['public'];
  // An allowlist excludes local credentials, accounts, reports, .git and build caches.
  function validate(path) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Source archive refuses symbolic links.');
    if (stat.isDirectory()) for (const name of readdirSync(path)) {
      if (name.startsWith('.env') || /\.(pem|key)$/i.test(name)) throw new Error('Remove private files from source directories before packaging.');
      validate(join(path, name));
    }
    else if (!stat.isFile()) throw new Error('Source archive accepts regular files only.');
  }
  const paths = [...required, ...optional.filter(path => existsSync(join(root, path)))];
  for (const path of paths) validate(join(root, path));
  const staging = mkdtempSync(join(tmpdir(), 'loop-hostinger-'));
  let fd;
  try {
    for (const path of paths) {
      const target = join(staging, path);
      mkdirSync(resolve(target, '..'), { recursive: true });
      cpSync(join(root, path), target, { recursive: true });
    }
    // Exclusive creation preserves previous release artifacts.
    fd = openSync(destination, 'wx', 0o600);
    execFileSync('tar', ['-czf', '-', '-C', staging, ...paths], { stdio: ['ignore', fd, 'pipe'] });
  } finally {
    if (fd !== undefined) closeSync(fd);
    rmSync(staging, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const destination = resolve(process.argv[2] || '.local-hostinger-source.tar.gz');
  try { packageSource(root, destination); console.log('Hostinger source archive created. Review source for embedded credentials before upload.'); }
  catch { console.error('Packaging failed. Check source files, tar availability and that the destination does not already exist.'); process.exitCode = 1; }
}
