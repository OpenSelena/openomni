import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

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

process.env.NODE_ENV = 'test';
process.env.OPEN_OMNI_TEST = '1';

const require = createRequire(import.meta.url);
const tsxCliPath = join(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');
const result = existsSync(tsxCliPath)
  ? spawnSync(process.execPath, [tsxCliPath, '--test', ...testFiles], {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        OPEN_OMNI_TEST: '1',
      },
    })
  : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', '--test', ...testFiles], {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        OPEN_OMNI_TEST: '1',
      },
    });

process.exit(result.status ?? 0);
