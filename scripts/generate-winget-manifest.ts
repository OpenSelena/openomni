import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateWingetManifests, validateWingetManifests, type WingetManifestOptions } from '../src/distribution.js';

function parseArgs(): { version: string; sha256: string; url?: string; outDir?: string } {
  const args = process.argv.slice(2);
  let version = '1.0.0';
  let sha256 = '';
  let url = '';
  let outDir = 'manifests/o/OpenSelena/OpenOmni';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' && args[i + 1]) {
      version = args[++i];
    } else if (arg === '--sha256' && args[i + 1]) {
      sha256 = args[++i];
    } else if (arg === '--url' && args[i + 1]) {
      url = args[++i];
    } else if (arg === '--out' && args[i + 1]) {
      outDir = args[++i];
    }
  }

  if (!sha256) {
    console.error('Error: --sha256 <SHA256_HEX> is required');
    process.exit(1);
  }

  const installerUrl = url || `https://github.com/OpenSelena/openomni/releases/download/v${version}/open-omni-windows-x64.zip`;

  return { version, sha256, url: installerUrl, outDir };
}

const config = parseArgs();

const options: WingetManifestOptions = {
  packageIdentifier: 'OpenSelena.OpenOmni',
  packageVersion: config.version,
  packageLocale: 'en-US',
  publisher: 'OpenSelena',
  publisherUrl: 'https://openselena.org',
  packageUrl: 'https://github.com/OpenSelena/openomni',
  license: 'MIT',
  licenseUrl: 'https://github.com/OpenSelena/openomni/blob/main/LICENSE',
  shortDescription: 'Fast terminal media downloader and TUI for 1,800+ sites',
  installerUrl: config.url,
  installerSha256: config.sha256,
  commands: ['open-omni', 'openomni', 'omni'],
  tags: ['video-downloader', 'yt-dlp', 'cli', 'tui', 'terminal', 'audio-downloader'],
};

const manifests = generateWingetManifests(options);
const validation = validateWingetManifests(manifests);

if (!validation.valid) {
  console.error('Manifest validation failed:', validation.errors.join('\n'));
  process.exit(1);
}

const targetDir = join(process.cwd(), config.outDir, config.version);
mkdirSync(targetDir, { recursive: true });

writeFileSync(join(targetDir, 'OpenSelena.OpenOmni.yaml'), manifests.versionManifest, 'utf8');
writeFileSync(join(targetDir, 'OpenSelena.OpenOmni.installer.yaml'), manifests.installerManifest, 'utf8');
writeFileSync(join(targetDir, 'OpenSelena.OpenOmni.locale.en-US.yaml'), manifests.localeManifest, 'utf8');

console.log(`✓ Winget manifests successfully generated in: ${targetDir}`);
console.log(`  PackageIdentifier: ${options.packageIdentifier}`);
console.log(`  PackageVersion:    ${options.packageVersion}`);
console.log(`  InstallerSha256:   ${options.installerSha256.toUpperCase()}`);
console.log(`  InstallerUrl:      ${options.installerUrl}`);
