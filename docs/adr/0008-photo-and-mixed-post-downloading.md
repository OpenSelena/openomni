# ADR 0008: Photo and Mixed-Media Post Downloading

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-07 |
| **Domain** | Dual-Engine Architecture |

---

## Context

Open Omni was originally built strictly for audio and video media powered by `yt-dlp`. However, users frequently encounter social media posts (on Twitter/X, Instagram, Reddit, Facebook, etc.) that contain static images, multi-photo carousels, or mixed-media posts combining both video clips and static photos. `yt-dlp` rejects photo-only posts with errors like "No video formats found" and drops photo slides from mixed carousels.

To support image posts and mixed carousels while preserving video extraction capabilities, Open Omni integrates a dedicated photo engine alongside `yt-dlp`.

## Decision

1. **Dual-Engine Architecture**:
   - Retain `yt-dlp` for all video and audio streams (transcoding, DASH stream muxing with ffmpeg, MP3 extraction, subtitles).
   - Integrate `gallery-dl` as the specialized photo and gallery engine for static images, multi-photo albums, and social carousels.
2. **Binary Management**:
   - Manage `gallery-dl` in `~/.open-omni/bin/gallery-dl` (or `gallery-dl.exe` on Windows).
   - Resolve system PATH first; if not present, download the standalone binary from official GitHub releases (zero Python dependency required for end users).
3. **Unified Engine Dispatcher**:
   - Open Omni probes URLs through an Engine Dispatcher.
   - For platforms with mixed or photo content, inspect the post elements:
     - Assign video items to the `yt-dlp` engine.
     - Assign photo items to the `gallery-dl` engine.
4. **User Experience & Quality Tiers**:
   - **Single Photo Post**: Download the Original Quality Asset directly to `~/Downloads` without redundant picker steps.
   - **Multi-Photo / Mixed Carousel**: Present items in the Batch Scope Picker with clear `[VIDEO]` and `[PHOTO]` badges, allowing users to toggle individual slides or select all.
5. **Destination & Naming**:
   - Save multi-item downloads into a unified folder (`~/Downloads/<Post Title>/`).
   - Use sequential numbering (`01 - ...mp4`, `02 - ...jpg`) preserving author post order.
6. **Scriptable CLI Flags**:
   - Provide `--photos-only` and `--videos-only` flags to filter mixed posts in headless runs.

## Consequences & Trade-offs

- Users can paste any social media post link — whether it contains videos, photos, or both — and receive full-resolution downloads in a single unified directory.
- Video quality remains uncompromised via `yt-dlp`, and photos are fetched at original uncompressed CDN resolution via `gallery-dl`.
- Open Omni remains zero-config without requiring Python or manual package setup.
