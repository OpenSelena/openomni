# Open Omni

Open Omni is a terminal-first video and audio downloader powered by yt-dlp and Ink. It enables users to paste video links and download high-quality media with zero popups, redirects, or clutter.

## Language

### Media Resources

**Single Video**:
A standalone video media resource identified by a direct URL.
_Avoid_: Clip, track, file

**Playlist**:
An ordered collection of video entries hosted on a platform under a single playlist identifier.
_Avoid_: Collection, album, series

**Multi-Video Post**:
A social media post or thread containing multiple discrete video attachments.
_Avoid_: Carousel, gallery, video thread

### Selection & Configuration

**Batch Scope**:
The subset of video items chosen by the user to download from a playlist or multi-video post.
_Avoid_: Download set, target list, pick

**Quality Tier**:
A generalized format and resolution target applied uniformly across heterogeneous videos in a batch.
_Avoid_: Resolution preset, format option, profile

### Execution

**Batch Queue**:
The ordered sequence of video items processed serially during a multi-video download.
_Avoid_: Job list, task queue, download pool

**Dual Progress**:
A terminal display presenting both overall batch completion metrics and the active item's download stream progress.
_Avoid_: Stacked bars, multi-meter

### Lifecycle & Maintenance

**Bundled Binary**:
The standalone executable copy of `yt-dlp` managed by Open Omni in `~/.open-omni/bin`.
_Avoid_: Packaged tool, embedded helper, daemon

**Binary Self-Update**:
The maintenance routine that checks, downloads, and atomically updates the active `yt-dlp` executable via native update or GitHub release fetch.
_Avoid_: Hotpatch, auto-upgrade, sync

**Installer Script**:
The standalone POSIX shell script (`install.sh`) that validates prerequisites, installs Open Omni into an isolated user prefix (`~/.open-omni`), and configures shell PATH.
_Avoid_: Setup wizard, payload, bootstrap script

### Subtitles & Metadata

**Subtitles**:
The external text track (manual or auto-generated captions) synchronized to a media item's audio stream.
_Avoid_: Closed captions, CC, srt file, transcript

**Subtitle Embedding**:
The process of muxing subtitle streams directly into the target media container via ffmpeg rather than outputting adjacent standalone files.
_Avoid_: Inlining, burn-in, hardcoding

