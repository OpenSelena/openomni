import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const FORK_OWNER = 'igect';
const UPSTREAM_OWNER = 'microsoft';
const REPO = 'winget-pkgs';
const BRANCH = 'add-openselena-openomni-1.0.0';
const VERSION = '1.0.0';
const MANIFEST_DIR = `manifests/o/OpenSelena/OpenOmni/${VERSION}`;

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

console.log(`1. Checking master ref on ${FORK_OWNER}/${REPO}...`);
const masterSha = run(`gh api repos/${FORK_OWNER}/${REPO}/git/ref/heads/master --jq .object.sha`);
console.log(`   Master SHA: ${masterSha}`);

console.log(`2. Creating or updating branch ${BRANCH}...`);
try {
  run(`gh api repos/${FORK_OWNER}/${REPO}/git/ref/heads/${BRANCH} --jq .object.sha`);
  console.log(`   Branch ${BRANCH} already exists`);
} catch {
  run(`gh api --method POST repos/${FORK_OWNER}/${REPO}/git/refs -f ref="refs/heads/${BRANCH}" -f sha="${masterSha}"`);
  console.log(`   Created branch ${BRANCH}`);
}

const files = [
  'OpenSelena.OpenOmni.yaml',
  'OpenSelena.OpenOmni.installer.yaml',
  'OpenSelena.OpenOmni.locale.en-US.yaml',
];

console.log(`3. Committing manifests to ${FORK_OWNER}/${REPO}:${BRANCH}...`);
for (const filename of files) {
  const localPath = join(process.cwd(), MANIFEST_DIR, filename);
  const content = readFileSync(localPath, 'utf8');
  const base64 = Buffer.from(content, 'utf8').toString('base64');
  const remotePath = `${MANIFEST_DIR}/${filename}`;

  let existingSha: string | undefined;
  try {
    existingSha = run(`gh api repos/${FORK_OWNER}/${REPO}/contents/${remotePath}?ref=${BRANCH} --jq .sha`);
  } catch {}

  const shaFlag = existingSha ? `-f sha="${existingSha}"` : '';
  run(
    `gh api --method PUT repos/${FORK_OWNER}/${REPO}/contents/${remotePath} ` +
      `-f message="Add ${filename} for OpenSelena.OpenOmni version ${VERSION}" ` +
      `-f content="${base64}" ` +
      `-f branch="${BRANCH}" ` +
      shaFlag
  );
  console.log(`   ✓ Committed ${filename}`);
}

console.log(`4. Opening Pull Request to ${UPSTREAM_OWNER}/${REPO}...`);
const title = `New package: OpenSelena.OpenOmni version ${VERSION}`;
const body = `## New Package Submission

### Package Information
- **Package Identifier**: OpenSelena.OpenOmni
- **Package Version**: ${VERSION}
- **Publisher**: OpenSelena
- **Package Name**: Open Omni
- **License**: MIT
- **Homepage**: https://github.com/OpenSelena/openomni

### Description
Fast terminal media downloader and TUI for 1,800+ sites powered by yt-dlp and gallery-dl.

### Verification
- Manifests validated locally via \`winget validate --manifest\`.
- Checksum computed directly from verified GitHub Release asset.
`;

const prUrl = run(
  `gh pr create --repo ${UPSTREAM_OWNER}/${REPO} --head ${FORK_OWNER}:${BRANCH} --base master --title "${title}" --body "${body.replace(/"/g, '\\"')}"`
);

console.log(`\n🎉 Winget PR successfully created:`);
console.log(prUrl);
