<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/OpenSelena/open-omni/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/OpenSelena/open-omni/main/assets/logo-light.svg" alt="Open Omni" width="280" />
  </picture>
</p>

<p align="center">
  <b>Terminal-first video, audio, and photo downloader for 1,800+ supported sites.<br/>Paste a link, get the file. Local on your machine, no telemetry.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/open-omni"><img src="https://img.shields.io/npm/v/open-omni?style=for-the-badge&color=C15F3C" alt="npm version" /></a>
  <a href="https://github.com/OpenSelena/open-omni/releases/latest"><img src="https://img.shields.io/github/v/release/OpenSelena/open-omni?style=for-the-badge&label=release&color=F28500" alt="Latest release" /></a>
  <a href="https://github.com/OpenSelena/open-omni/releases"><img src="https://img.shields.io/github/downloads/OpenSelena/open-omni/total?style=for-the-badge&label=downloads&color=1E6FE8" alt="Total downloads" /></a>
  <a href="https://github.com/OpenSelena/open-omni/stargazers"><img src="https://img.shields.io/github/stars/OpenSelena/open-omni?style=for-the-badge&color=FFD426" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2AA845?style=for-the-badge" alt="License MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-2AA845?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 20+" /></a>
  <a href="https://github.com/OpenSelena/open-omni/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenSelena/open-omni/ci.yml?style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI status" /></a>
  <a href="https://t.me/OpenSelena"><img src="https://img.shields.io/badge/Telegram-channel-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram channel" /></a>
</p>

<p align="center">
  <a href="#download-and-install"><img src="https://img.shields.io/badge/Install_for_Windows,_macOS_or_Linux-→-C15F3C?style=for-the-badge" alt="Download and install Open Omni" height="40" /></a>
  &nbsp;
  <a href="#cli-reference"><img src="https://img.shields.io/badge/CLI_reference-→-1E6FE8?style=for-the-badge" alt="CLI reference" height="40" /></a>
</p>

---

## Contents

- [Overview](#overview)
- [Download and install](#download-and-install)
- [Quick start](#quick-start)
- [Engines and sources](#engines-and-sources)
- [CLI reference](#cli-reference)
- [Configuration and shell completion](#configuration-and-shell-completion)
- [Privacy and refusals](#privacy-and-refusals)
- [Fair Use Notice](#fair-use-notice)
- [Build from source](#build-from-source)
- [Credits and license](#credits-and-license)

---

## Overview

Open Omni puts `yt-dlp`, `gallery-dl`, and `ffmpeg` behind one terminal UI and four matching aliases (`open-omni`, `openomni`, `omni`, `oo`). Paste a link, pick a quality or playlist subset, and download straight to disk. Missing extraction engines download into `~/.open-omni/bin` when first used, and `ffmpeg-static` handles muxing when `ffmpeg` is not on `PATH`.

<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/open-omni/main/assets/home.png" alt="Open Omni home screen" width="900" />
</p>

| | Open Omni | `yt-dlp` alone | Web converters |
| :--- | :--- | :--- | :--- |
| **Interface** | Terminal UI and scriptable CLI | Command-line flags | Ad-supported web forms |
| **Engines** | Auto-provisions `yt-dlp`, `gallery-dl`, and `ffmpeg` | Manual binary setup | Hosted remote backends |
| **Media** | Video, audio, photo posts, and mixed carousels | Video and audio | Single URL, often re-encoded |
| **Selection** | Interactive checklist (`Space` / `A`), `--photos-only`, `--videos-only` | Index ranges (`--playlist-items`) | One link per request |
| **Workflow** | `Tab` clipboard paste, format picker, `--watch` mode | Flags typed per run | Manual link pasting |
| **Local-first** | Runs locally on your machine | Runs locally | Remote servers and tracking |

`yt-dlp`, `gallery-dl`, and `ffmpeg` do the extraction and muxing work. If you already script those tools directly in your shell, keep using them directly.

---

## Download and install

Requires **Node 20+** for npm, Homebrew, and the shell installer. The standalone Windows `.zip` bundles Node.

<table>
  <tr>
    <th align="left">Method</th>
    <th align="left">Command</th>
    <th align="left">Notes</th>
  </tr>
  <tr>
    <td><b>macOS & Linux script</b></td>
    <td><code>curl -fsSL https://mint.dev.cv | sh</code></td>
    <td>Installs into <code>~/.open-omni</code></td>
  </tr>
  <tr>
    <td><b>Windows (WinGet)</b></td>
    <td><code>winget install OpenSelena.OpenOmni</code></td>
    <td>Portable package (or download <code>open-omni-windows-x64.zip</code> from <a href="https://github.com/OpenSelena/open-omni/releases/latest">Releases</a>)</td>
  </tr>
  <tr>
    <td><b>Homebrew</b></td>
    <td><code>brew install OpenSelena/tap/open-omni</code></td>
    <td>Installs CLI aliases with <code>yt-dlp</code>, <code>gallery-dl</code>, and <code>ffmpeg</code></td>
  </tr>
  <tr>
    <td><b>npm</b></td>
    <td><code>npm install -g open-omni</code></td>
    <td>Registers <code>open-omni</code>, <code>openomni</code>, <code>omni</code>, and <code>oo</code></td>
  </tr>
  <tr>
    <td><b>npx</b></td>
    <td><code>npx open-omni [url]</code></td>
    <td>Runs without global install</td>
  </tr>
</table>

---

## Quick start

1. Run `open-omni` (or `omni`, `oo`, `openomni`).
2. Paste a URL or press **`Tab`** to use the link currently on your clipboard.
3. Choose a format, switch containers with **`a`** / **`v`**, toggle playlist items with **`Space`** / **`A`**, and press **`Enter`**. Press **`o`** on completion to open the saved file in your file manager.

<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/open-omni/main/assets/download-options.png" alt="Open Omni format picker" width="900" />
</p>

To download newly copied links automatically in the background, run `open-omni -w` (or `open-omni --watch --best`). Pre-existing clipboard contents, multi-line text, loopback/LAN addresses, and unrelated URLs are ignored.

### Common examples

```sh
open-omni https://youtu.be/dQw4w9WgXcQ
open-omni <url> --best
open-omni <url> --mp3 -o ~/Music
open-omni <url> --audio-format flac --metadata --embed-chapters
open-omni <url> --video-format mkv --embed-subs --subs=en,es
open-omni <url> --thumb --embed-thumb --time 01:00-02:30
open-omni <url> --photos-only --concurrency 4 --skip-existing
open-omni <url> --cookies-from-browser firefox --proxy http://127.0.0.1:8080
open-omni --watch --best
open-omni -U
```

### TUI hotkeys

| Key | Action |
| :--- | :--- |
| **`Tab`** | Paste URL from clipboard |
| **`↑`** | Cycle previously entered URLs |
| **`a`** / **`v`** | Cycle audio format / video container in picker |
| **`s`** / **`t`** | Toggle subtitles / thumbnail options in picker |
| **`Space`** / **`A`** | Toggle item / select or clear all in batches |
| **`Enter`** | Submit URL or start download |
| **`o`** | Reveal saved file or folder |
| **`^t`** *(Ctrl+T)* | Cycle theme (`auto` / `light` / `dark`) |
| **`Esc`** / **`^c`** | Back or cancel / quit |

---

## Engines and sources

| Area | How it works |
|---|---|
| <img src="https://img.shields.io/badge/-Video_%26_Audio-C15F3C?style=for-the-badge&labelColor=555555&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yIDR2MTZoMjBWNEgyem03LjUgMTJWOGw3IDQtNyA0eiIvPjwvc3ZnPg==" height="24" alt="Video & Audio" /> | Uses `yt-dlp` across 1,800+ sites with time slicing and SponsorBlock filtering. |
| <img src="https://img.shields.io/badge/-Photos_%26_Posts-F28500?style=for-the-badge&labelColor=555555&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yIDR2MTZoMjBWNEgyem00IDNoM3YzSDZWN3ptMTQgMTFINGw1LTYgMy41IDQgMi41LTMgNSA1eiIvPjwvc3ZnPg==" height="24" alt="Photos & Posts" /> | Resolves public Instagram `/embed/captioned/` posts and Bluesky AT Protocol (`public.api.bsky.app`) threads directly, and hands 250+ gallery sites to `gallery-dl`. |
| <img src="https://img.shields.io/badge/-FFmpeg_%26_Streams-007808?style=for-the-badge&labelColor=555555&logo=ffmpeg&logoColor=white" height="24" alt="FFmpeg & Streams" /> | Uses system `ffmpeg` (or bundled `ffmpeg-static`) to merge adaptive streams, convert audio formats, remux Bluesky HLS playlists, and embed subtitles, covers, and chapters. |
| <img src="https://img.shields.io/badge/-Batches_%26_Resume-1E6FE8?style=for-the-badge&labelColor=555555&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0zIDVoM3YzSDNWNXptNSAxaDEzdjJIOFY2em0tNSA1aDN2M0gzdi0zem01IDFoMTN2Mkg4di0yem0tNSA1aDN2M0gzdi0zem01IDFoMTN2Mkg4di0yeiIvPjwvc3ZnPg==" height="24" alt="Batches & Resume" /> | Runs bounded parallel workers and tracks finished files in `ledger.json` so interrupted queues resume cleanly. |
| <img src="https://img.shields.io/badge/-Cookies_%26_Proxies-2AA845?style=for-the-badge&labelColor=555555&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik03IDEwVjZhNSA1IDAgMCAxIDEwIDB2NGgydjExSDVWMTBoMnptMiAwaDZWNmEzIDMgMCAwIDAtNiAwdjR6bTIgNHY0aDJ2LTRoLTJ6Ii8+PC9zdmc+" height="24" alt="Cookies & Proxies" /> | Extracts local browser cookies (Firefox, Zen, Chrome, Brave, Edge, Floorp, Waterfox, Safari) only on auth walls (`401`/`403`/login redirect), or reads Netscape files. |

---

## CLI reference

| Flag / Command | Description |
| :--- | :--- |
| `[url]` | Video, playlist, or social post URL |
| `config <path\|get\|set>` | Print config path, read saved keys, or set persistent defaults |
| `--best` | Download highest video quality directly |
| `--mp3` | Extract audio as MP3 directly |
| `--audio-format <fmt>` | Audio format (`best`, `aac`, `flac`, `mp3`, `m4a`, `opus`, `vorbis`, `wav`, `alac`) |
| `--video-format <fmt>` | Video container (`mp4`, `mkv`, `webm`) |
| `--metadata`, `--add-metadata` | Embed metadata tags into output container |
| `--embed-chapters` | Embed chapter markers into output container |
| `--subs [langs]` | Download subtitles (e.g. `--subs=en,es`) |
| `--embed-subs` | Mux subtitles into video container |
| `--thumb` | Save thumbnail image alongside media |
| `--embed-thumb` | Embed thumbnail cover inside output container |
| `--photos-only` | Download only images from post or carousel |
| `--videos-only` | Download only videos from post or carousel |
| `--skip-existing` | Skip downloads recorded in `ledger.json` and present on disk |
| `--time <range>`, `--section <range>` | Slice time range (e.g. `01:00-02:30` or `60-150`) |
| `--cookies <path>` | Load cookies from Netscape text file |
| `--cookies-from-browser <spec>` | Extract browser cookies (`auto`, `firefox`, `zen`, `chrome`, etc.) |
| `--proxy <url>` | Route HTTP, HTTPS, or SOCKS proxy traffic (e.g. `socks5://127.0.0.1:1080`) |
| `--geo-bypass` | Send synthetic `X-Forwarded-For` header |
| `--geo-country <code>` | Two-letter country code for geo bypass (`US`, `DE`, etc.) |
| `--limit-rate <rate>` | Cap transfer speed (e.g. `50K`, `1.5M`, `2G`) |
| `--sponsorblock` | Strip sponsored segments via SponsorBlock |
| `--sponsorblock-remove <cats>` | SponsorBlock categories to strip (default: `all`) |
| `--output-template <pattern>` | Output filename template (e.g. `%(uploader)s/%(title)s.%(ext)s`) |
| `-c, --concurrency <N>` | Parallel workers for batch queue |
| `-w, --watch` | Watch clipboard and download copied media links |
| `-o, --output <dir>` | Destination folder (defaults to `$OPEN_OMNI_DIR` or OS Downloads) |
| `-U, --update` | Update bundled `yt-dlp` and `gallery-dl` binaries |
| `--update-ytdlp`, `--update-gallerydl` | Update only `yt-dlp` or only `gallery-dl` |
| `--force` | Overwrite existing outputs or re-fetch binaries |
| `--theme <mode>` | Color mode: `auto`, `light`, or `dark` |
| `--completion <shell>` | Output completion script (`bash`, `zsh`, `fish`, `powershell`) |
| `-h, --help`, `-v, --version` | Show CLI help or version |

---

## Configuration and shell completion

Settings live in `~/.config/open-omni/config.json` (`0700` directory, `0600` file permissions) and can be updated via `open-omni config set <key> <value>`:

```json
{
  "outputDir": "~/Downloads",
  "theme": "auto",
  "format": "best",
  "audioFormat": "mp3",
  "videoFormat": "mp4",
  "proxy": "http://127.0.0.1:8080",
  "geoBypass": true,
  "geoCountry": "US",
  "limitRate": "1.5M",
  "sponsorblock": true,
  "sponsorblockRemove": "all",
  "metadata": {
    "enabled": true,
    "embedChapters": true
  },
  "cookiesFromBrowser": "firefox",
  "subtitles": {
    "enabled": true,
    "languages": "en,es",
    "embed": false
  },
  "thumbnail": {
    "enabled": true,
    "embed": true
  }
}
```

Precedence: CLI flags > environment (`ALL_PROXY`, `HTTPS_PROXY`, `HTTP_PROXY`, `OPEN_OMNI_DIR`) > `config.json` > OS Downloads folder.

```sh
# Bash (~/.bashrc)
eval "$(open-omni --completion bash)"

# Zsh (~/.zshrc)
eval "$(open-omni --completion zsh)"

# Fish (~/.config/fish/config.fish)
open-omni --completion fish | source

# PowerShell ($PROFILE)
if (Get-Command open-omni -ErrorAction SilentlyContinue) {
    open-omni --completion powershell | Out-String | Invoke-Expression
}
```

---

## Privacy and refusals

Open Omni runs locally with no accounts or telemetry. Beyond the URLs you download, the only network calls it makes are binary updates (`-U` or first-run fetches from official GitHub and Codeberg releases).

Browser cookie extraction runs only when recovering from an authentication error, filters Netscape jars strictly by target domain, path, `secure` attribute, and expiry inside temporary `0700`/`0600` directories deleted on exit, and strips credentials across cross-origin redirects. Proxy URLs pass to child engines via environment variables, file writes stay verified inside the target folder, and Open Omni does not crack DRM or bypass paywalls.

---

## Fair Use Notice

Open Omni is an open-source interface to `yt-dlp` and `gallery-dl` for personal archiving and study under applicable copyright and fair-use laws. It does not grant copyright ownership, licenses, or permission for downloaded media. You are solely responsible for following local copyright laws and each platform's terms of service.

Contact for copyright, security, or general inquiries: [igect@vk.com](mailto:igect@vk.com).

---

## Build from source

Requires **Node 20+** and npm:

```sh
git clone https://github.com/OpenSelena/open-omni.git
cd open-omni
npm ci
npm test && npm run typecheck && npm run build
npm start
```

On filesystems without symlink support (such as exFAT), install with `npm ci --no-bin-links` as documented in [AGENTS.md](AGENTS.md).

---

## Credits and license

Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp), [gallery-dl](https://codeberg.org/mikf/gallery-dl), [FFmpeg](https://ffmpeg.org/), [React](https://react.dev/), [Ink](https://github.com/vadimdemedes/ink), [tsup](https://tsup.egoist.dev/), and [tsx](https://tsx.is/).

Bug reports and pull requests go to [Issues](https://github.com/OpenSelena/open-omni/issues) and [Pull requests](https://github.com/OpenSelena/open-omni/pulls). Questions live on [Telegram](https://t.me/OpenSelena) or via email at [igect@vk.com](mailto:igect@vk.com). Released under the [MIT License](LICENSE) by [OpenSelena](https://github.com/OpenSelena).

<p align="center">
  <a href="https://star-history.com/#OpenSelena/open-omni&Date"><img src="https://api.star-history.com/svg?repos=OpenSelena/open-omni&type=Date" alt="Star history of OpenSelena/open-omni" width="600" /></a>
</p>

<p align="center">
  <a href="https://github.com/OpenSelena/open-omni/releases/latest"><b>Download Open Omni</b></a> · <a href="https://www.npmjs.com/package/open-omni">npm</a> · <a href="LICENSE">MIT</a>
</p>
