# ADR 0002: yt-dlp Binary Self-Update Architecture

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-06 |
| **Domain** | Upstream Binary Lifecycle |

---

## Context & Decision

YouTube and other media platforms continuously alter their cipher signatures and web player APIs, requiring frequent updates to `yt-dlp`. Open Omni provides a dedicated self-update facility (`open-omni -U`, `--update`, `--update-ytdlp`, and optional `--force`) with hybrid resilience.

## Considered Options & Trade-offs

1. **Hybrid Update Strategy vs Pure `yt-dlp -U`**: While `yt-dlp -U` is the native self-update command for standalone builds, users with package-managed installations (pip, homebrew, apt) receive refusal errors when invoking `-U`. Open Omni tries `yt-dlp -U` first; if it fails or is un-updatable, it falls back to downloading the latest standalone binary directly from GitHub releases into `~/.open-omni/bin`.
2. **Headless Maintenance vs Startup Auto-check**: Checking for updates on every application start introduces 200–500ms network latency to the critical path. We keep startup instantaneous and expose self-update as a fast, headless CLI flag and offer contextual hints when extraction errors occur in the interactive TUI.
3. **Atomic Replacement**: Direct binary downloads write to a temporary `.download` file, set executable permissions, and rename atomically into place to prevent corruption during aborted connections.
4. **Force Flag (`--force`)**: Allows users to bypass version checks and unconditionally install a fresh standalone binary into `~/.open-omni/bin` to recover from corrupted installations.
