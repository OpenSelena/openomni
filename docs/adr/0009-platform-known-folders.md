# 9. Platform-Native Known Folder Auto-Detection

Date: 2026-09-07

## Status

Accepted

## Context

By default, Open Omni resolved its download destination to `path.join(os.homedir(), 'Downloads')`.
On Windows and Linux, users frequently relocate their special folders (such as moving the Downloads folder from `C:\\Users\\<username>\\Downloads` to a secondary physical drive such as `X:\\Downloads`, a dedicated partition, or a cloud drive like OneDrive).

Because Node's `os.homedir()` points to the user's home profile root (`C:\\Users\\<username>`), Open Omni was unaware of the user's relocated Windows Known Folders and created a new, unwanted `C:\\Users\\<username>\\Downloads` directory instead of using the user's active Downloads location.

## Decision

1. **Zero-Dependency Windows Known Folder Discovery**:
   - On Windows (`process.platform === 'win32'`), invoke Windows' built-in `reg.exe` utility to query:
     `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders`
     for the Known Folder GUID `{374DE290-123F-4565-9164-39C4925E467B}` (and fallback to value `Downloads`).
   - `reg.exe` is native to all Windows NT versions (Windows 7/10/11), executes in <10ms, and requires no external npm packages or slow PowerShell subprocesses.
   - Automatically expand Windows environment variables (e.g. `%USERPROFILE%\\Downloads` or `%SYSTEMDRIVE%`).

2. **Linux XDG User Dirs Discovery**:
   - On Linux (`process.platform === 'linux'`), inspect `~/.config/user-dirs.dirs` for `XDG_DOWNLOAD_DIR="..."`.
   - Expand `$HOME` or `${HOME}` variables against the user's home directory.

3. **Resilience & Fallback**:
   - If the registered path points to a drive or volume that is currently unmounted or inaccessible (e.g. an unplugged external USB drive), gracefully fall back to `~/Downloads` (`path.join(os.homedir(), 'Downloads')`) to prevent download failures.
   - On macOS and other Unix environments, default to `~/Downloads`.

4. **Updated Precedence Waterfall**:
   Open Omni's destination resolution adheres to this strict 5-tier waterfall:
   1. CLI Argument: `-o <path>` or `--output <path>` (Highest priority).
   2. Environment Variable: `OPEN_OMNI_DIR`.
   3. User Configuration: `~/.config/open-omni/config.json` (`outputDir` or `outDir`).
   4. **Platform Known Folder**: Windows Registry / Linux XDG user-dirs (New).
   5. Home Default: `path.join(os.homedir(), 'Downloads')` (Final safety fallback).

## Consequences

- Open Omni automatically honors the user's real Windows Downloads folder (e.g. `X:\\Downloads`) with zero manual configuration required.
- Maintains 100% backward compatibility with CLI flags, environment variables, and user configuration.
- Introduces zero third-party dependencies, keeping bundle size lean and startup time instantaneous.
