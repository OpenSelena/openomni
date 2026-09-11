# ADR 0005: Thumbnail Archival and Cover Art Embedding

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-07 |
| **Domain** | Media Streams & Metadata |

---

## Context

Users archiving videos or extracting music tracks often require the original cover art or video thumbnail for local media libraries (Plex, Kodi, Jellyfin, Apple Music, Windows Media Player). Media platforms serve thumbnails in differing, often modern web formats (such as .webp or .jfif), which may not render in standard OS file managers or legacy players. Furthermore, audio collectors require cover art embedded directly inside .mp3 / .m4a metadata tags for player artwork display.

## Decision

1. **CLI Flag Syntax**:
   - Provide a `--thumb` boolean flag to write the video/track thumbnail to disk adjacent to the downloaded media file.
   - Provide an `--embed-thumb` boolean flag to embed the thumbnail image directly into the media container (e.g. ID3 tags for audio or atomic tags for MP4 containers).
2. **Format Normalization**:
   - Normalize external thumbnails to `.jpg` using yt-dlp's `--convert-thumbnails jpg` flag when ffmpeg is available, maximizing compatibility across operating systems and image viewers.
3. **Interactive TUI Integration**:
   - During interactive picker phases (single video format picker and playlist quality picker), provide a keyboard shortcut (`t`) and clickable footer hint (`t thumb:off` / `t thumb:on`) enabling users to toggle thumbnail archival.
4. **Batch & Playlist Placement**:
   - For batch downloads, output thumbnails directly into the playlist directory matching the media filename scheme (`01 - Title.jpg` alongside `01 - Title.mp4`).

## Consequences & Trade-offs

- Standalone thumbnails are cleanly written with matched basenames (`video.jpg` for `video.mp4`).
- Cover art can be embedded without manual post-processing.
- Existing download pipeline and progress events remain unchanged.
