import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateHomebrewFormula,
  generateWingetManifests,
  validateWingetManifests,
  type WingetManifestOptions,
} from './distribution.js';

test('validateHomebrewFormula verifies valid formula matching package.json and npm tarball', () => {
  const formulaPath = join(process.cwd(), 'Formula', 'open-omni.rb');
  assert.equal(existsSync(formulaPath), true, 'Formula/open-omni.rb must exist');

  const formulaContent = readFileSync(formulaPath, 'utf8');
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

  const validation = validateHomebrewFormula(formulaContent, pkg.version);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.equal(validation.version, pkg.version);
  assert.ok(validation.sha256);
  assert.equal(validation.sha256.length, 64);
  assert.ok(validation.url);
  assert.match(validation.url, new RegExp(`open-omni-${pkg.version}\\.tgz`));
});

test('generateWingetManifests produces compliant v1.6.0 manifests for portable package', () => {
  const options: WingetManifestOptions = {
    packageIdentifier: 'OpenSelena.OpenOmni',
    packageVersion: '1.0.0',
    packageLocale: 'en-US',
    publisher: 'OpenSelena',
    publisherUrl: 'https://openselena.org',
    packageUrl: 'https://github.com/OpenSelena/openomni',
    license: 'MIT',
    licenseUrl: 'https://github.com/OpenSelena/openomni/blob/main/LICENSE',
    shortDescription: 'Fast terminal media downloader and TUI for 1,800+ sites',
    installerUrl: 'https://github.com/OpenSelena/openomni/releases/download/v1.0.0/open-omni-windows-x64.zip',
    installerSha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    commands: ['open-omni', 'openomni', 'omni'],
    tags: ['video-downloader', 'yt-dlp', 'cli', 'tui', 'terminal', 'audio-downloader'],
  };

  const manifests = generateWingetManifests(options);

  assert.ok(manifests.versionManifest.includes('PackageIdentifier: OpenSelena.OpenOmni'));
  assert.ok(manifests.versionManifest.includes('PackageVersion: 1.0.0'));
  assert.ok(manifests.versionManifest.includes('ManifestType: version'));
  assert.ok(manifests.versionManifest.includes('ManifestVersion: 1.6.0'));

  assert.ok(manifests.installerManifest.includes('InstallerType: portable'));
  assert.ok(manifests.installerManifest.includes('Architecture: x64'));
  assert.ok(manifests.installerManifest.includes('Commands:'));
  assert.ok(manifests.installerManifest.includes('- open-omni'));

  assert.ok(manifests.localeManifest.includes('Publisher: OpenSelena'));
  assert.ok(manifests.localeManifest.includes('PackageName: Open Omni'));
  assert.ok(manifests.localeManifest.includes('License: MIT'));

  const validation = validateWingetManifests(manifests);
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('validateWingetManifests catches invalid checksums or mismatched versions', () => {
  const invalidManifests = {
    versionManifest: 'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.0.0\nManifestType: version',
    installerManifest: 'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.0.1\nInstallerType: msi', // mismatched version & wrong type
    localeManifest: 'PackageIdentifier: OpenSelena.OpenOmni\nPackageVersion: 1.0.0\nPackageName: Open Omni',
  };

  const validation = validateWingetManifests(invalidManifests);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes('Version mismatch')));
  assert.ok(validation.errors.some((e) => e.includes('InstallerType')));
});
