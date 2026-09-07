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
