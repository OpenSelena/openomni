# ADR 0017: Background Clipboard Watcher Daemon Mode

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-10-23 |
| **Domain** | Automation & Terminal UX |

---

## Context & Problem

In Open Omni v1.0 through v1.4, clipboard inspection was strictly one-shot during interactive CLI boot (`src/lib/clipboard.ts`). Users wanting to download several media items had to repeatedly switch between their browser and terminal window, paste the link, and trigger execution manually for each individual URL.

This introduces operational friction when browsing video feeds, social media threads, or photo carousels.

## Decision

1. **Dedicated Watcher Daemon Mode (`--watch` / `-w`)**:
   - Provide an autonomous background watcher daemon via `open-omni --watch` (or `open-omni -w`).
   - Allow chaining scriptable preferences (`--best`, `--mp3`, `--audio-format <f>`, `-o <dir>`, `--output-template <t>`).
   - Graceful termination on `SIGINT` (Ctrl+C) and `SIGTERM`.

2. **Non-Blocking Asynchronous Polling**:
   - Implement `readClipboardAsync` using child process `execFile` with promisified asynchronous execution.
   - Employ an adaptive polling timer (default 1500ms) that only schedules the next poll after the active clipboard check completes, preventing overlapping process invocation and reducing CPU usage to near 0%.

3. **URL Extraction & Deduplication Pipeline**:
   - Extract URLs from clipboard text via regex and platform validation (`isProbablyUrl`).
   - Maintain an in-memory LRU ring buffer (`seenUrls: Set<string>`) capped at 500 entries to prevent re-triggering while a link remains copied in the system clipboard.
   - On daemon startup, pre-seed `seenUrls` with the active clipboard content so stale pre-existing clipboard text is not inadvertently downloaded.
   - Check the Download Ledger (`ledger.json`) via `getCompletedDownload`: if the item is already recorded and verified physically present on disk, skip the download unless `--force` is supplied.

4. **Queue Serialization & Terminal Feedback**:
   - Multiple URLs copied in rapid succession queue cleanly in a FIFO worker loop.
   - Real-time timestamped terminal log output for detected links, progress, completions, and skips.
   - Ring the standard terminal bell (`\x07`) on download completion for audio notification.
