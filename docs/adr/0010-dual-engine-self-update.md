# 0010. Dual-Engine Self-Update Architecture (yt-dlp + gallery-dl)

## Context & Decision
With ADR 0008, Open Omni introduced `gallery-dl` alongside `yt-dlp` to extract image carousels, photo posts, and mixed social media feeds from Instagram, Twitter/X, Reddit, Threads, and other sites. However, photo and image extractors break as frequently as video scrapers due to ongoing anti-scraping and API changes on upstream social networks. Previously, only `yt-dlp` had an update pathway (`updateYtDlp()`), leaving `gallery-dl` without version detection, update commands, or fallback standalone downloads.

We unify the self-update architecture across both engines under a dual-engine model:
1. `open-omni -U` / `--update`: Triggers simultaneous update checks for both `yt-dlp` and `gallery-dl`.
2. `--update-ytdlp`: Selectively updates only the `yt-dlp` executable.
3. `--update-gallerydl`: Selectively updates only the `gallery-dl` executable.
4. `--force`: Forces fresh release downloads for selected or all engines into `~/.open-omni/bin`.

## Upstream Repository Migration & Codeberg Provisioning
Following upstream issue `#9374` (maintainer `mikf` migrating active development and releases to Codeberg), Open Omni provisions gallery-dl standalone binaries and source solely from Codeberg:
1. **Primary Release Source**: Codeberg Releases API (`https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases/latest`). Standalone asset URL is resolved dynamically from release assets (`browser_download_url`, providing `gallery-dl.exe` on Windows, `gallery-dl.bin` on Linux).
2. **Master Source Archive**: `https://codeberg.org/mikf/gallery-dl/archive/master.tar.gz` is referenced for upstream development builds and unreleased extractor patches.
3. **Decommissioned Mirrors**: GitHub releases were removed entirely due to upstream deprecation and API rate-limiting issues.

## Considered Options & Trade-offs
1. **Unified `-U` vs Separate Flags**: Having `-U` update both engines matches user expectations that `open-omni -U` updates all underlying scraper tools. Retaining `--update-ytdlp` and adding `--update-gallerydl` allows granular maintenance for scripting and CI.
2. **Hybrid Update Strategy with Fallback**: Like `yt-dlp`, `gallery-dl` standalone executables support native `--update`. If native update fails or reports package management (pip/brew/apt), Open Omni downloads the latest release into `~/.open-omni/bin` on Windows (`gallery-dl.exe`) and Linux (`gallery-dl.bin`).
3. **macOS Handling**: Upstream `mikf/gallery-dl` does not distribute pre-built standalone binaries for macOS. On Darwin, Open Omni instructs the user to update via `brew upgrade gallery-dl` instead of failing with invalid URL errors.
4. **Atomic In-Place Replacement**: Standalone downloads use `.download` staging files with `fs.chmod(0o755)` followed by atomic rename to prevent binary corruption on interrupted network connections.
