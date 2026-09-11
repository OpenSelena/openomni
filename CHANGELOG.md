# Changelog

All notable changes to Open Omni are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-11

[Diff: v1.0.0...v1.1.0](https://github.com/OpenSelena/openomni/compare/v1.0.0...v1.1.0)

### Added

- **Universal Zero-Config Browser Detection (`--cookies-from-browser auto`)** ([ADR 0011](docs/adr/0011-session-cookie-authentication.md)):
  - Probes installed browser profile directories on host machine without requiring flags.
  - Supported browsers: Firefox, Chrome, Brave, Edge, Safari, Zen, Helium, Floorp, Waterfox.
  - Windows prioritization: Prefers Gecko-family browsers (Firefox, Zen, Floorp, Waterfox) to bypass Windows Chromium 127+ App-Bound DPAPI encryption blocks by reading unencrypted `cookies.sqlite`.
  - Fallback: Gracefully falls back to unauthenticated public guest mode when no browser or profiles exist.
- **Browser Spec Normalization (`normalizeBrowserSpec`)**:
  - Resolves custom browser aliases (e.g. `zen`, `floorp`) to engine-compatible targets (`firefox:<profile_dir>`) by parsing active profile in `profiles.ini`.
  - Fixes `yt-dlp` rejection error: `unsupported browser specified for cookies: "zen"`.
- **Login-Wall Auto-Recovery in Engine Dispatcher**:
  - Intercepts unauthenticated login redirect errors (`HTTP redirect to login page (https://www.instagram.com/accounts/login/)` and `401 Unauthorized`).
  - Automatically invokes browser session extraction and retries media probe transparently.
- **Native Instagram Embed Resolver** ([ADR 0014](docs/adr/0014-native-instagram-embed-resolver.md)):
  - Probes `/embed/captioned/` endpoint for public Instagram posts, reels, and carousels before falling back to `gallery-dl`.
  - Implements direct CDN streaming for image and video assets.
- **Session Delegation Flags**:
  - `--cookies <path>`: Accepts user-exported Netscape/Mozilla formatted cookie jar.
  - `--cookies-from-browser <browser[:profile]>`: Extracts session directly from specified browser.
- **Package Distribution Infrastructure** ([ADR 0013](docs/adr/0013-package-distribution-homebrew-and-winget.md)):
  - Homebrew formula (`Formula/open-omni.rb`) and tap synchronization script (`scripts/publish-tap.ps1`).
  - WinGet package manifest generator (`scripts/generate-winget-manifest.ts`) and submission script (`scripts/submit-winget-pr.ts`).
  - C# native launcher shim (`scripts/shim.cs`) compiled with `csc.exe` for Windows execution without console window flicker.

### Changed

- **Upstream Repository Migration for gallery-dl** ([ADR 0010](docs/adr/0010-dual-engine-self-update.md)):
  - Migrated `gallery-dl` binary releases and self-update endpoints from deprecated GitHub releases to Codeberg (`https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases/latest`).
  - Eliminates GitHub unauthenticated API rate limits (`403 Forbidden`).
- **CLI Default Authentication**:
  - Defaults `runtimeConfig.cookies` to `{ browser: 'auto' }` across headless and interactive CLI entrypoints.

### Fixed

- **Windows NTFS `MAX_PATH` & Trailing Dot Crash**:
  - Fixed `ENOENT` filesystem crash when downloading posts with long paragraph captions or titles ending with periods (`...`).
  - `sanitizeFilename` now truncates title basenames to 100 characters and strips trailing dots and spaces via regex (`/[.\s]+$/`).
- **Missing Ephemeral Cleanup**:
  - Fixed credential remnant risk by binding ephemeral cookie jars to process `exit`, `SIGINT`, and `SIGTERM` handlers with `0o600` file permissions.

### Distribution & Assets

- **Standalone Windows x64**: `open-omni-windows-x64.zip`
  - SHA256: `2c418070428527b5a886e2d28f6b4c5075fcf917deba326424dcb1569e1010d1`
- **npm Package**: `open-omni@1.1.0`
  - Tarball SHA256: `3415f0c47a8f02e1589ab0170a5fcd5cba5d4403df977d98fc73f2e4f8dd013c`
- **Homebrew Formula**: `OpenSelena/tap/open-omni` (v1.1.0)
- **WinGet Identifier**: `OpenSelena.OpenOmni` (v1.1.0)

## [1.0.0] - 2026-09-08

### Added

- Initial production release of Open Omni.
- Dual-engine architecture orchestrating `yt-dlp` for video/audio and `gallery-dl` for photos/galleries.
- Interactive terminal UI powered by Ink and React with theme support (`--theme`).
- Direct single video, playlist, and multi-video post downloads.
- Subtitle extraction and embedding (`--subs`, `--embed-subs`).
- Thumbnail extraction and embedding (`--thumb`, `--embed-thumb`).
- Automatic binary self-update (`open-omni -U`).
- Shell autocompletion script generation for bash, zsh, fish, and PowerShell (`--completion <shell>`).
- Platform known folder resolution for automatic Downloads directory routing across Windows, macOS, and Linux.
