# ADR 0016: macOS gallery-dl Package Manager Fallback and Lifecycle Delegation

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-12 |
| **Domain** | Lifecycle & Maintenance |

---

## Context & Problem

Upstream `gallery-dl` publishes standalone single-file executables for Windows (`gallery-dl.exe`) and Linux (`gallery-dl.bin`) on its official Codeberg release repository. However, upstream does not produce or distribute a precompiled standalone Mach-O binary for macOS due to Apple Gatekeeper notarization and platform build matrix constraints.

Previously, Open Omni threw a fatal exception whenever `gallery-dl` was missing from `PATH` on macOS:
```
Standalone gallery-dl binary is not distributed for macOS. Please install it via Homebrew: 'brew install gallery-dl'
```
This broke the zero-config experience for new macOS users downloading photos or mixed-media posts and caused `open-omni -U` to fail unexpectedly on Darwin systems.

## Decision

1. **Automated Package Manager Probing**:
   - When `gallery-dl` is absent from `PATH` on macOS (`process.platform === 'darwin'`), Open Omni probes candidate package managers in order of user prevalence:
     1. **Homebrew**: `brew --version`
     2. **Python 3 / pip**: `python3 -m pip --version`
   - If neither package manager is found, throw an actionable error instructing the user to install Homebrew or Python.

2. **Interactive TTY Consent Gate**:
   - Executing system-wide package managers alters software outside Open Omni's isolated sandbox (`~/.open-omni/bin`).
   - In interactive TTY sessions, Open Omni prompts the user before executing external commands:
     ```
     gallery-dl is required for photo downloads. Install via Homebrew? [Y/n]
     ```
   - If the user declines, abort cleanly and output the manual installation command.
   - In non-interactive environments (CI runners or piped stdin), fail fast with clear instructions to prevent indefinite process blocking.

3. **Lifecycle & Update Delegation**:
   - `open-omni -U` / `updateGalleryDl` delegates to the detected package manager on Darwin:
     - If `gallery-dl` is present: execute `brew upgrade gallery-dl` or `python3 -m pip install --upgrade gallery-dl`.
     - If `gallery-dl` is not yet installed: automatically trigger installation.
   - Reads executable version before and after invocation to populate `GalleryDlUpdateResult`.

4. **Testability & CI Matrix**:
   - Provide injectable seams (`probeFn`, `promptConfirmFn`, `installFn`, `upgradeFn`, `getVersionFn`) to ensure all Darwin fallback and upgrade branches run in automated unit tests regardless of host OS.
   - Run live end-to-end installation and verification on GitHub Actions `macos-latest` runners.

## Consequences & Trade-offs

- **Zero-Config Parity**: macOS users can resolve image download prerequisites seamlessly without manually exiting Open Omni.
- **System Integrity**: User consent protects the host environment against unexpected background package manager side effects.
- **No Unsigned Binaries**: Avoids downloading unverified, unsigned Mach-O binaries that trigger Gatekeeper security quarantines.
