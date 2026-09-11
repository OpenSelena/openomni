# ADR 0015: Download Ledger, Deduplication, and Resumable Batches

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-11 |
| **Domain** | Queue State & Resilience |

---

## Context & Problem

Open Omni v1.0 and v1.1 handle single media downloads and playlist queues serially. However, Open Omni has no persistent memory of completed files beyond an ephemeral 50-URL history string array (`~/.config/open-omni/history.json`).

This creates two operational limitations:
1. **Redundant Downloads**: Re-pasting a previously downloaded video or carousel fetches the full media payload from the remote server again, wasting bandwidth and storage.
2. **Interrupted Batch Loss**: If a 100-video playlist or photo gallery download is cancelled, interrupted by network disconnection, or halted mid-batch, restarting the download currently forces the user to manually re-select the uncompleted items or re-download the entire batch from the beginning.

## Decision

1. **Structured Flat JSON Ledger**:
   - Store download records in `~/.config/open-omni/ledger.json` (or `$XDG_CONFIG_HOME/open-omni/ledger.json`, overrideable via `OPEN_OMNI_LEDGER_FILE` for test isolation).
   - Pure Node implementation (`fs/promises`, `JSON.stringify`) preserving zero native C-binary dependencies.
   - Separate from `history.json`: `history.json` remains dedicated to clipboard URL input suggestions, while `ledger.json` strictly tracks verified files on disk.
   - Schema per entry:
     ```json
     {
       "mediaId": "dQw4w9WgXcQ",
       "platform": "youtube",
       "url": "https://youtu.be/dQw4w9WgXcQ",
       "title": "Rick Astley - Never Gonna Give You Up",
       "outputPath": "C:\\Users\\mint\\Downloads\\Never Gonna Give You Up.mp4",
       "fileSizeBytes": 34819201,
       "format": "best",
       "completedAt": "2026-09-11T23:40:00Z"
     }
     ```
   - Capped at 1,000 entries (FIFO eviction) to guarantee sub-millisecond in-memory JSON parsing.

2. **Deduplication Check & User Control**:
   - Check candidate `url` and resolved `mediaId` against `ledger.json`.
   - **Interactive TUI**: When a file is already recorded in the ledger and confirmed present on disk, prompt the user (`"File already exists at <path>. Redownload? [y/N]"`).
   - **Headless CLI**: Require explicit `--skip-existing` flag to bypass download; otherwise perform standard fresh fetch.
   - Support `--force` to unconditionally overwrite existing files and update the ledger entry.

3. **Batch Resume**:
   - When probing playlists or multi-video posts, Open Omni maps item platform IDs against completed entries in `ledger.json`.
   - Items already downloaded to disk with verified completion are marked with a `[DONE]` badge and unchecked by default in the interactive Batch Scope Picker.
   - In headless runs, `--skip-existing` automatically filters completed items from the batch queue.

4. **Flexible Section Slicing**:
   - Provide `--time <range>` (alias `--section <range>`) CLI flags.
   - Flexible time parser accepting:
     - `MM:SS-MM:SS` (e.g. `01:30-03:45`)
     - `HH:MM:SS-HH:MM:SS` (e.g. `00:01:30-00:03:45`)
     - Raw seconds (e.g. `90-225`)
   - Normalizes to `*HH:MM:SS-HH:MM:SS` and passes `--download-sections` to `yt-dlp` / `ffmpeg`.

## Consequences & Trade-offs

- **Zero Dependency Overhead**: Avoids native SQLite C-bindings, keeping cross-platform npm, Homebrew, and Winget portable packages trivial to distribute.
- **Resilient Playlist Recovery**: Interrupted batch queues can be rerun immediately, resuming from the first uncompleted item without duplicate work.
- **Local Filesystem Coupling**: If a user moves or deletes a downloaded media file externally, the deduplication check verifies `fs.existsSync(entry.outputPath)` before skipping, gracefully falling back to re-download if the file was relocated or deleted.
