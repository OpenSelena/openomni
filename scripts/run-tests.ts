import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function findTestFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

const testFiles = findTestFiles('src');
if (testFiles.length === 0) {
  console.error('No test files found in src');
  process.exit(1);
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCmd, ['tsx', '--test', ...testFiles], {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 0);
