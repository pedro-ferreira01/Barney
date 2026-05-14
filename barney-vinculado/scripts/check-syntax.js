import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

function listJsFiles(dir) {
  const files = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...listJsFiles(full));
    if (stat.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

const files = [...listJsFiles('src'), ...listJsFiles('prisma')];
let failed = false;
for (const file of files) {
  const result = spawnSync('node', ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`Sintaxe OK em ${files.length} arquivo(s).`);
