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

const STRICT_SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/

function sanitizeSingleLineYamlValue(value: string, fieldName: string): string {
  // eslint-disable-next-line no-control-regex
  if (/[\r\n\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains newline or control characters`)
  }
  return value.trim()
}

export function isValidSemver(version: string): boolean {
  return STRICT_SEMVER_RE.test(version) && !version.includes('..')
}

function validateSafeUrl(rawUrl: string, fieldName: string): string {
  const clean = sanitizeSingleLineYamlValue(rawUrl, fieldName)
  let parsed: URL
  try {
    parsed = new URL(clean)
  } catch {
    throw new Error(`Invalid ${fieldName}: malformed URL`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Invalid ${fieldName}: https URL required`)
  }
  return clean
}

/**
 * Generates official Winget v1.6.0 YAML manifests for a portable package.
 */
export function generateWingetManifests(options: WingetManifestOptions): WingetManifests {
  const pkgId = sanitizeSingleLineYamlValue(options.packageIdentifier, 'packageIdentifier')
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z0-9][A-Za-z0-9.-]*$/.test(pkgId)) {
    throw new Error(`Invalid packageIdentifier: ${pkgId}`)
  }
  const pkgVer = sanitizeSingleLineYamlValue(options.packageVersion, 'packageVersion')
  if (!isValidSemver(pkgVer)) {
    throw new Error(`Invalid packageVersion: ${pkgVer}`)
  }
  const locale = sanitizeSingleLineYamlValue(options.packageLocale ?? 'en-US', 'packageLocale')
  if (!/^[A-Za-z0-9-]+$/.test(locale)) {
    throw new Error(`Invalid packageLocale: ${locale}`)
  }
  const sha256Upper = sanitizeSingleLineYamlValue(options.installerSha256, 'installerSha256').toUpperCase()
  if (!/^[A-F0-9]{64}$/.test(sha256Upper)) {
    throw new Error('Invalid installerSha256: expected 64 hex characters')
  }
  const installerUrl = validateSafeUrl(options.installerUrl, 'installerUrl')
  const publisherUrl = validateSafeUrl(options.publisherUrl, 'publisherUrl')
  const packageUrl = validateSafeUrl(options.packageUrl, 'packageUrl')
  const licenseUrl = validateSafeUrl(options.licenseUrl, 'licenseUrl')
  const publisher = sanitizeSingleLineYamlValue(options.publisher, 'publisher')
  const license = sanitizeSingleLineYamlValue(options.license, 'license')
  const shortDescription = sanitizeSingleLineYamlValue(options.shortDescription, 'shortDescription')

  const versionManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.6.0.schema.json

PackageIdentifier: ${pkgId}
PackageVersion: ${pkgVer}
DefaultLocale: ${locale}
ManifestType: version
ManifestVersion: 1.6.0
`;

  const rawCommands = options.commands.length > 0 ? options.commands : ['open-omni']
  const commands = rawCommands.map(cmd => {
    const clean = sanitizeSingleLineYamlValue(cmd, 'commands')
    if (!/^[A-Za-z0-9._-]+$/.test(clean)) {
      throw new Error(`Invalid command alias: ${clean}`)
    }
    return clean
  })
  const nestedFiles = commands
    .map((cmd) => `  - RelativeFilePath: ${cmd}.exe\n    PortableCommandAlias: ${cmd}`)
    .join('\n');
  const formattedCommands = commands.map((cmd) => `  - ${cmd}`).join('\n');

  const installerManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.6.0.schema.json

PackageIdentifier: ${pkgId}
PackageVersion: ${pkgVer}
InstallerLocale: ${locale}
InstallerType: zip
NestedInstallerType: portable
NestedInstallerFiles:
${nestedFiles}
Commands:
${formattedCommands}
Installers:
  - Architecture: x64
    InstallerUrl: ${installerUrl}
    InstallerSha256: ${sha256Upper}
ManifestType: installer
ManifestVersion: 1.6.0
`;

  const formattedTags = options.tags
    .map((tag) => {
      const clean = sanitizeSingleLineYamlValue(tag, 'tags')
      if (!/^[A-Za-z0-9._-]+$/.test(clean)) {
        throw new Error(`Invalid tag: ${clean}`)
      }
      return `  - ${clean}`
    })
    .join('\n');

  const localeManifest = `# Created using Open Omni Distribution Generator
# yaml-language-server: $schema=https://aka.ms/winget-manifest.defaultLocale.1.6.0.schema.json

PackageIdentifier: ${pkgId}
PackageVersion: ${pkgVer}
PackageLocale: ${locale}
Publisher: ${publisher}
PublisherUrl: ${publisherUrl}
PublisherSupportUrl: ${packageUrl}/issues
PackageName: Open Omni
PackageUrl: ${packageUrl}
License: ${license}
LicenseUrl: ${licenseUrl}
Copyright: Copyright (c) 2026 OpenSelena
ShortDescription: ${shortDescription}
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

  const getFieldValues = (yaml: string, field: string): string[] => {
    const out: string[] = [];
    const prefix = `${field}:`;
    for (const rawLine of yaml.split('\n')) {
      const trimmed = rawLine.trimStart();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (rawLine.startsWith(prefix)) {
        out.push(rawLine.slice(prefix.length).trim());
      }
    }
    return out;
  };

  const getSingleValue = (yaml: string, label: string, field: string): string | undefined => {
    const vals = getFieldValues(yaml, field);
    if (vals.length > 1) {
      errors.push(`Duplicate YAML key '${field}' in ${label} manifest`);
    }
    return vals[0];
  };

  const getUniqueYamlProperty = (yaml: string, label: string, field: string): string[] => {
    const vals: string[] = [];
    const re = new RegExp(`^\\s*-?\\s*${field}:\\s*([^#\\r\\n]+)$`, 'gm');
    for (const rawLine of yaml.split('\n')) {
      if (rawLine.trimStart().startsWith('#')) continue;
      const m = re.exec(rawLine);
      re.lastIndex = 0;
      if (m?.[1]) vals.push(m[1].trim());
    }
    if (vals.length > 1) {
      errors.push(`Duplicate YAML key '${field}' in ${label} manifest`);
    }
    return vals;
  };

  const vPkgId = getSingleValue(manifests.versionManifest, 'version', 'PackageIdentifier');
  const vPkgVer = getSingleValue(manifests.versionManifest, 'version', 'PackageVersion');

  const iPkgId = getSingleValue(manifests.installerManifest, 'installer', 'PackageIdentifier');
  const iPkgVer = getSingleValue(manifests.installerManifest, 'installer', 'PackageVersion');
  const iType = getSingleValue(manifests.installerManifest, 'installer', 'InstallerType');

  const lPkgId = getSingleValue(manifests.localeManifest, 'locale', 'PackageIdentifier');
  const lPkgVer = getSingleValue(manifests.localeManifest, 'locale', 'PackageVersion');

  if (!vPkgId || !iPkgId || !lPkgId || vPkgId !== iPkgId || vPkgId !== lPkgId) {
    errors.push(`PackageIdentifier mismatch across manifests: version=${vPkgId}, installer=${iPkgId}, locale=${lPkgId}`);
  }

  if (!vPkgVer || !iPkgVer || !lPkgVer || vPkgVer !== iPkgVer || vPkgVer !== lPkgVer || !isValidSemver(vPkgVer)) {
    errors.push(`Version mismatch across manifests: version=${vPkgVer}, installer=${iPkgVer}, locale=${lPkgVer}`);
  }

  if (iType !== 'zip' && iType !== 'portable') {
    errors.push(`Invalid InstallerType: expected 'zip' or 'portable', got '${iType}'`);
  } else if (iType === 'portable') {
    const commandsMatch = manifests.installerManifest.match(/Commands:\s*\n((\s+-\s+[^\n]+\n?)+)/);
    if (commandsMatch) {
      const commandLines = commandsMatch[1].trim().split('\n').filter((l) => l.trim().startsWith('-'));
      if (commandLines.length > 1) {
        errors.push('Only zero or one value for Commands may be specified for InstallerType portable');
      }
    }
  } else if (iType === 'zip') {
    const nestedType = getSingleValue(manifests.installerManifest, 'installer', 'NestedInstallerType');
    if (nestedType !== 'portable') {
      errors.push(`Invalid NestedInstallerType: expected 'portable', got '${nestedType}'`);
    }
    if (!manifests.installerManifest.includes('NestedInstallerFiles:')) {
      errors.push('Zip installer manifest missing NestedInstallerFiles');
    }
  }

  const shaVals = getUniqueYamlProperty(manifests.installerManifest, 'installer', 'InstallerSha256');
  if (shaVals.length !== 1 || !/^[A-Fa-f0-9]{64}$/.test(shaVals[0]!)) {
    errors.push('Installer manifest missing valid 64-character SHA256');
  }

  const urlVals = getUniqueYamlProperty(manifests.installerManifest, 'installer', 'InstallerUrl');
  if (urlVals.length !== 1 || !/^https:\/\/github\.com\/OpenSelena\/openomni\/releases\/[^\s#]+$/.test(urlVals[0]!)) {
    errors.push('Installer manifest missing valid HTTPS installer URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    version: vPkgVer,
  };
}
