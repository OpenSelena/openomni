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

**Thumbnail**:
The preview poster or cover artwork associated with a media item or playlist entry.
_Avoid_: Snapshot, frame grab, cover image, poster art

**Thumbnail Embedding**:
The process of muxing thumbnail images directly into media container tags (e.g. ID3 APIC for audio or atomic art for MP4) as embedded cover art.
_Avoid_: Inlining, burn-in, stamp

### User Configuration

**User Configuration**:
The persistent user preference file (`config.json`) stored under the user's config directory (`$XDG_CONFIG_HOME/open-omni/config.json` or `~/.config/open-omni/config.json`).
_Avoid_: Registry, settings store, profile, ini file

**Precedence Waterfall**:
The strict hierarchy for resolving operational settings: CLI arguments > Environment variables (`OPEN_OMNI_DIR`) > User configuration > Built-in defaults.
_Avoid_: Fallback chain, override cascade

### Shell Autocompletion

**Shell Autocompletion**:
The dynamic completion script generator that outputs native tab-completion specifications for supported shells (`bash`, `zsh`, `fish`, `powershell`).
_Avoid_: Tab snippet, auto-suggest, shell macro

**Completion Target**:
A supported shell environment (`bash`, `zsh`, `fish`, `powershell`) recognized by the `--completion` flag generator.
_Avoid_: Target console, terminal type, CLI interpreter

### Photo & Mixed-Media Posts

**Media Engine**:
A specialized backend CLI executable (`yt-dlp` for video/audio, `gallery-dl` for photos/galleries) orchestrating media extraction.
_Avoid_: Helper script, downloader tool, subprocess driver

**Photo Post**:
A social media post or gallery hosting one or more static image assets without primary video content.
_Avoid_: Image tweet, picture card, photo upload

**Mixed Post**:
A multi-asset social post or carousel containing a combination of both video clips and static photos.
_Avoid_: Hybrid gallery, combo post, mixed album

**Engine Dispatcher**:
The routing module in Open Omni that inspects probed URLs and items, assigning video items to `yt-dlp` and photo items to `gallery-dl`.
_Avoid_: Router, handler switch, format delegator

**Original Quality Asset**:
The uncompressed, full-resolution source image file directly extracted from a platform's CDN endpoint.
_Avoid_: Raw image, high-res photo, max pic

