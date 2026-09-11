# ADR 0013: Multi-Platform Package Distribution: Homebrew and Winget

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-11 |
| **Domain** | Package Distribution |

---

## Context & Decision

Open Omni is a terminal media downloader packaged as a Node.js CLI on npm (`open-omni`). To reach users on macOS, Linux, and Windows without forcing them to manually manage npm global installations or path permissions, Open Omni adopts a two-platform distribution strategy:

1. **Homebrew Tap (`OpenSelena/homebrew-tap`)**: For macOS and Linux users. Installs via `brew install OpenSelena/tap/open-omni` using Homebrew's native `Language::Node` ruby formula.
2. **Winget Package Registry (`microsoft/winget-pkgs`)**: For Windows users. Provides `winget install OpenSelena.OpenOmni` using a standalone portable executable package (`open-omni-windows-x64.zip`) hosted on GitHub Releases, requiring zero Node.js prerequisites on the client system.

## Considered Options & Trade-offs

### 1. Homebrew Tap vs Homebrew Core
* **Homebrew Core**: Requires submitting a PR to `Homebrew/homebrew-core`. Core maintainers enforce strict community traction metrics (typically 75+ forks, 150+ stars, and extensive release history) and long review turnaround times.
* **Homebrew Tap (`OpenSelena/homebrew-tap`)**: An organization-owned public repository providing immediate, zero-friction availability on day one. Users can install via `brew install OpenSelena/tap/open-omni` or add the tap permanently.
* **Decision**: Launch initially on `OpenSelena/homebrew-tap`. Submit to `homebrew-core` once star/fork thresholds are reached.

### 2. Winget Package Architecture (Portable vs Installer)
* **Inno/WiX Setup Installer**: Creates an `.exe`/`.msi` setup wizard that modifies Windows Add/Remove Programs. Unnecessary overhead for a pure terminal CLI application.
* **Winget Portable Package**: Packages `open-omni.exe` inside a `.zip` archive. Winget automatically extracts the binary into `%LOCALAPPDATA%\Microsoft\WinGet\Packages` and creates clean symlinks in the user PATH.
* **Decision**: Standardize on `InstallerType: portable` for Winget.

### 3. Windows Standalone Executable Packaging
* Node.js applications cannot be directly executed by Winget without Node on the host machine.
* Open Omni packages a standalone Windows binary bundling the Node runtime and the compiled `dist/cli.js` entrypoint, attached as a verified release asset on GitHub (`https://github.com/OpenSelena/openomni/releases/download/v1.0.0/open-omni-windows-x64.zip`).

## Maintenance & Release Lifecycle

1. **npm Publish**: `open-omni` published to npm registry on each release.
2. **Checksum Verification**: Compute the SHA256 of the npm tarball and update `Formula/open-omni.rb` in `OpenSelena/homebrew-tap`.
3. **Windows Binary Build**: Compile `open-omni.exe`, zip to `open-omni-windows-x64.zip`, and attach to the corresponding GitHub Release tag.
4. **Winget Manifest Dispatch**: Generate v1.6.0 YAML manifests and submit via pull request to `microsoft/winget-pkgs`.
