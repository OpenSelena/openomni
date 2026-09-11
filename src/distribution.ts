export interface WingetManifestOptions {
  packageIdentifier: string;
  packageVersion: string;
  packageLocale?: string;
  publisher: string;
  publisherUrl: string;
  packageUrl: string;
  license: string;
  licenseUrl: string;
  shortDescription: string;
  installerUrl: string;
  installerSha256: string;
  commands: string[];
  tags: string[];
}

export interface WingetManifests {
  versionManifest: string;
  installerManifest: string;
  localeManifest: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  version?: string;
  sha256?: string;
  url?: string;
}

/**
 * Validates a Homebrew formula file against expected version and structure.
 */
export function validateHomebrewFormula(formulaContent: string, expectedVersion: string): ValidationResult {
  const errors: string[] = [];

  if (!formulaContent.includes('class OpenOmni < Formula')) {
    errors.push('Formula does not declare class OpenOmni < Formula');
  }

  const urlMatch = formulaContent.match(/url\s+"([^"]+)"/);
  const shaMatch = formulaContent.match(/sha256\s+"([a-fA-F0-9]{64})"/);

  const url = urlMatch ? urlMatch[1] : undefined;
  const sha256 = shaMatch ? shaMatch[1] : undefined;

  if (!url) {
    errors.push('Missing or invalid url in formula');
  } else if (!url.includes(`open-omni-${expectedVersion}.tgz`)) {
    errors.push(`Formula url does not match expected version ${expectedVersion}: ${url}`);
  }

  if (!sha256 || sha256.length !== 64) {
    errors.push('Missing or invalid 64-character sha256 checksum in formula');
  }

  if (!formulaContent.includes('depends_on "node"')) {
    errors.push('Formula missing depends_on "node"');
  }

  if (!formulaContent.includes('Language::Node.std_npm_install_args')) {
    errors.push('Formula missing Language::Node.std_npm_install_args helper');
  }

  return {
    valid: errors.length === 0,
    errors,
    version: expectedVersion,
    sha256,
    url,
  };
}

/**
 * Generates official Winget v1.6.0 YAML manifests for a portable package.
 */
export function generateWingetManifests(options: WingetManifestOptions): WingetManifests {
  const locale = options.packageLocale ?? 'en-US';
  const sha256Upper = options.installerSha256.toUpperCase();

  const versionManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.6.0.schema.json

PackageIdentifier: ${options.packageIdentifier}
PackageVersion: ${options.packageVersion}
DefaultLocale: ${locale}
ManifestType: version
ManifestVersion: 1.6.0
`;

  const formattedCommands = options.commands.map((cmd) => `  - ${cmd}`).join('\n');

  const installerManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.6.0.schema.json

PackageIdentifier: ${options.packageIdentifier}
PackageVersion: ${options.packageVersion}
InstallerLocale: ${locale}
InstallerType: portable
Commands:
${formattedCommands}
Installers:
  - Architecture: x64
    InstallerUrl: ${options.installerUrl}
    InstallerSha256: ${sha256Upper}
ManifestType: installer
ManifestVersion: 1.6.0
`;

  const formattedTags = options.tags.map((tag) => `  - ${tag}`).join('\n');

  const localeManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.defaultLocale.1.6.0.schema.json

PackageIdentifier: ${options.packageIdentifier}
PackageVersion: ${options.packageVersion}
PackageLocale: ${locale}
Publisher: ${options.publisher}
PublisherUrl: ${options.publisherUrl}
PublisherSupportUrl: ${options.packageUrl}/issues
PackageName: Open Omni
PackageUrl: ${options.packageUrl}
License: ${options.license}
LicenseUrl: ${options.licenseUrl}
Copyright: Copyright (c) 2026 OpenSelena
ShortDescription: ${options.shortDescription}
Description: Open Omni is a fast terminal-first media downloader and TUI for 1,800+ sites powered by yt-dlp and gallery-dl.
Tags:
${formattedTags}
ManifestType: defaultLocale
ManifestVersion: 1.6.0
`;

  return {
    versionManifest,
    installerManifest,
    localeManifest,
  };
}

/**
 * Validates Winget manifest triple for version consistency and schema rules.
 */
export function validateWingetManifests(manifests: WingetManifests): ValidationResult {
  const errors: string[] = [];

  const getFieldValue = (yaml: string, field: string): string | undefined => {
    const match = yaml.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : undefined;
  };

  const vPkgId = getFieldValue(manifests.versionManifest, 'PackageIdentifier');
  const vPkgVer = getFieldValue(manifests.versionManifest, 'PackageVersion');

  const iPkgId = getFieldValue(manifests.installerManifest, 'PackageIdentifier');
  const iPkgVer = getFieldValue(manifests.installerManifest, 'PackageVersion');
  const iType = getFieldValue(manifests.installerManifest, 'InstallerType');

  const lPkgId = getFieldValue(manifests.localeManifest, 'PackageIdentifier');
  const lPkgVer = getFieldValue(manifests.localeManifest, 'PackageVersion');

  if (!vPkgId || !iPkgId || !lPkgId || vPkgId !== iPkgId || vPkgId !== lPkgId) {
    errors.push(`PackageIdentifier mismatch across manifests: version=${vPkgId}, installer=${iPkgId}, locale=${lPkgId}`);
  }

  if (!vPkgVer || !iPkgVer || !lPkgVer || vPkgVer !== iPkgVer || vPkgVer !== lPkgVer) {
    errors.push(`Version mismatch across manifests: version=${vPkgVer}, installer=${iPkgVer}, locale=${lPkgVer}`);
  }

  if (iType !== 'portable') {
    errors.push(`Invalid InstallerType: expected 'portable', got '${iType}'`);
  }

  const shaMatch = manifests.installerManifest.match(/InstallerSha256:\s*([A-Fa-f0-9]{64})/);
  if (!shaMatch) {
    errors.push('Installer manifest missing valid 64-character SHA256');
  }

  const urlMatch = manifests.installerManifest.match(/InstallerUrl:\s*(https:\/\/[^\s]+)/);
  if (!urlMatch) {
    errors.push('Installer manifest missing valid HTTPS installer URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    version: vPkgVer,
  };
}
