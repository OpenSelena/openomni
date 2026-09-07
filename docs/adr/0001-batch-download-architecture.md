# 0001. Batch Download Architecture for Playlists and Multi-Video Threads

## Context & Decision
When downloading playlists (YouTube, SoundCloud) or multi-video posts (Twitter/X, Instagram, Threads), Open Omni uses flat-probing with deferred stream extraction, serial queue execution, universal quality tiers, and resilient continuation on failure.

## Considered Options & Trade-offs
1. **Flat-probing vs Full Extraction**: Probing large playlists with full format metadata takes 30-60+ seconds in yt-dlp. We use `--flat-playlist` at probe time (<2s to load titles and count into the TUI) and resolve specific stream formats on-demand per video right when downloaded.
2. **Serial vs Parallel Downloads**: Concurrent downloads risk platform IP throttling/CAPTCHA rate-limits on YouTube and Instagram and degrade terminal UI readability. We process the batch queue serially (one item at a time) with dual progress indicators (overall batch + active video).
3. **Universal Quality Tiers vs Per-Video Picking**: Prompting format selection for every video in a 50-item playlist is hostile UX. We provide universal quality tiers (Best Video MP4, 1080p max, 720p max, Audio Only MP3) applied across the chosen batch.
4. **Resilience**: Individual item failures (e.g. private or removed videos) log a warning and skip to the next item in the queue rather than halting the entire batch.
