# 4. Subtitles and Closed Caption Extraction

Date: 2026-09-07

## Status

Accepted

## Context

Users downloading videos frequently require subtitles for accessibility, language comprehension, and archiving. Subtitle availability on media platforms varies widely: some videos feature creator-provided multi-language subtitle tracks, while others only feature speech-to-text auto-generated captions.

Furthermore, user preferences differ regarding file organization: many video players and editing suites prefer separate `.srt` files alongside the video file, while other workflows benefit from a single container with embedded soft subtitles.

## Decision

1. **Dual-Mode CLI Syntax**:
   - Provide a `--subs` flag that supports both bare boolean usage (`--subs`, defaulting to English/primary language `en.*,en`) and comma-separated language selectors (e.g. `--subs es,ja,en`).
   - Provide an `--embed-subs` boolean flag to mux subtitles into the target media container via ffmpeg rather than saving external `.srt` files.
2. **Auto-Generated Captions Fallback**:
   - Always supply `--write-subs --write-auto-subs` to `yt-dlp` when subtitles are enabled, ensuring fallback to auto-generated subtitles if human-uploaded captions are unavailable.
3. **Format Standardization**:
   - Pass `--convert-subs srt` so subtitle tracks are normalized to SubRip (.srt) format, maximizing compatibility across operating systems and players.
4. **Interactive TUI Integration**:
   - During the interactive picker phase, provide a keyboard shortcut (`s`) and a clickable footer hint (`s subs:off` / `s subs:on`) allowing users to toggle subtitle downloading without leaving the picker.

## Consequences

- Subtitles are downloaded cleanly adjacent to the video (e.g. `video.mp4` and `video.en.srt`) or embedded on demand.
- Audio-only downloads (`--mp3`) omit video subtitles unless explicitly requested.
- Existing download logic and progress parsing remain unaffected.
