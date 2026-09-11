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
The strict hierarchy for resolving operational settings: CLI arguments > Environment variables (`OPEN_OMNI_DIR`) > User configuration > Platform Known Folder > Built-in defaults.
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
The routing module in Open Omni that inspects probed URLs and items, assigning video items to `yt-dlp` and photo items to `gallery-dl``.
_Avoid_: Router, handler switch, format delegator

**Original Quality Asset**:
The uncompressed, full-resolution source image file directly extracted from a platform's CDN endpoint.
_Avoid_: Raw image, high-res photo, max pic

**Instagram Embed Resolver**:
The native unauthenticated extraction module (`src/lib/instagram.ts`) in Open Omni that queries the `/embed/captioned/` iframe endpoint to bypass login redirection on public Instagram media.
_Avoid_: Insta hack, login bypass script, custom scraper

**Direct CDN Streaming**:
The zero-subprocess download pipeline that streams raw media bytes directly from platform CDN endpoints (`scontent.cdninstagram.com`) into disk files using native Node HTTP streams.
_Avoid_: Direct fetcher, fast download, web dl

### Platform Directories

**Known Folder**:
A special operating system directory (e.g. Downloads, Documents, Videos) whose physical storage path is registered in the OS user profile and may be relocated across drives.
_Avoid_: Special folder, shell path, virtual directory

### Authentication & Access Control

**Cookie Jar**:
A standard Netscape-formatted plain-text file containing exported HTTP session cookies used to authenticate API and media extraction requests.
_Avoid_: Token file, credential store, key file

**Browser Session Extraction**:
The automated extraction of session cookies directly from an installed local browser profile without requiring manual export.
_Avoid_: Browser scraper, live hijack, chrome reader

**Ephemeral Cookie Jar**:
A short-lived, temporary cookie file written to disk with restricted permissions (`0o600`) during execution and purged on process termination.
_Avoid_: Temp token, cached cookies, scratch file

**Zero-Config Browser Discovery**:
The automated probing of host browser profile paths across Gecko (Firefox, Zen, Floorp, Waterfox) and Chromium (Chrome, Brave, Edge, Helium, Safari) ecosystems to establish authenticated sessions without flags.
_Avoid_: Auto-sniffer, cookie finder, browser detector

**Browser Spec Normalization**:
The transformation of browser aliases and uncatalogued derivatives (such as Zen Browser) into engine-compatible specifications (e.g. `firefox:<profile_dir>`).
_Avoid_: Spec hack, path override, target mapper

**Login-Wall Auto-Recovery**:
The dynamic interception of unauthenticated login redirection responses (such as Instagram 302 redirects) that retries the media probe transparently using local browser session cookies.
_Avoid_: Redirect bypass, retry hack, login retryer


### Organization Identity & Web Presence

**Canonical Domain**:
The primary authoritative web address (`openselena.org`) identifying the OpenSelena organization, documentation portal, and package distribution.
_Avoid_: Main site, home url, web link

**Defensive Domain**:
A registered secondary brand alias (`openselena.com`) maintained to prevent name squatting, brand impersonation, and typosquatting by issuing a permanent 301 redirect to the canonical domain.
_Avoid_: Parked domain, duplicate site, vanity domain

**Organization Verification Record**:
A cryptographic DNS TXT challenge record published on the canonical domain to prove domain ownership and grant the verified badge to the GitHub organization.
_Avoid_: Auth tag, ownership key, site badge

### Package Distribution & Registries

**Homebrew Tap**:
The dedicated Git repository (`OpenSelena/homebrew-tap`) housing custom third-party Homebrew package formulae for the OpenSelena ecosystem.
_Avoid_: Brew repo, formula store, package keg

**Homebrew Formula**:
The Ruby package definition (`open-omni.rb`) orchestrating npm tarball retrieval, Node runtime linkage, and binary symlinking via Homebrew.
_Avoid_: Brew script, install manifest, recipe

**Standalone Windows Binary**:
A self-contained Windows executable packaging the V8 runtime and Open Omni CLI into a zero-dependency `.exe` without requiring Node.js.
_Avoid_: Win executable, compiled bundle, native shim

**Winget Package Manifest**:
The set of versioned YAML definitions (`OpenSelena.OpenOmni.*.yaml`) submitted to `microsoft/winget-pkgs` governing metadata and installer parameters.
_Avoid_: Winget config, installer schema, submission file

**Portable Package**:
The Winget installer architecture (`portable`) that unpacks a standalone executable directly into the user's system PATH without running an installer wizard.
_Avoid_: Zip package, archive install, unzipped tool

### Queue State & Resilience

**Download Ledger**:
The persistent, structured JSON record (`ledger.json`) tracking completed media items, filesystem paths, and completion states.
_Avoid_: History list, download database, tracker, cache

**Deduplication Check**:
The validation routine comparing candidate media URLs or platform identifiers against the Download Ledger before network extraction.
_Avoid_: Duplicate blocker, skip check, exist guard

**Batch Resume**:
The queue execution routine that inspects an interrupted playlist or multi-video post against the Download Ledger, skipping previously completed items.
_Avoid_: Queue restart, pickup, retry pool

**Section Slicing**:
The remote time-bounded extraction of video or audio segments via engine section directives without downloading full media containers.
_Avoid_: Trimming, cutting, snippet, clip extraction
