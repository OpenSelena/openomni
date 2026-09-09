<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo-light.svg" alt="Open Omni" width="240">
  </picture>
</p>

<h1 align="center">Open Omni</h1>

<p align="center">
  <b>Fast terminal media downloader and TUI for 1,800+ sites.</b><br/>
  Download videos, music, and photo galleries from YouTube, Instagram, X, TikTok, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/open-omni"><img src="https://img.shields.io/npm/v/open-omni.svg?color=C15F3C" alt="npm version"></a>
  <a href="https://github.com/OpenSelena/openomni/actions/workflows/ci.yml"><img src="https://github.com/OpenSelena/openomni/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/OpenSelena/openomni/stargazers"><img src="https://img.shields.io/github/stars/OpenSelena/openomni" alt="GitHub stars"></a>
</p>

<p align="center">
  <img src="assets/home.png" alt="Open Omni Interface" width="100%">
</p>

---

## Contents

- [Why Open Omni](#why-open-omni)
- [How It Compares](#how-it-compares)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Interactive Interface](#interactive-interface)
- [CLI Reference](#cli-reference)
- [Configuration](#configuration)
- [Shell Autocompletion](#shell-autocompletion)
- [Privacy & Local First](#privacy--local-first)
- [Fair Use Notice](#fair-use-notice)
- [License](#license)

---

## Why Open Omni

You want to download a video, an audio track, or a photo set without clicking through suspicious popups, fake download buttons, or ad-laden web converters. You also don't want to memorize dozens of complicated command-line flags.

Open Omni combines the flexibility of an interactive terminal interface with scriptable command-line speed. Paste a link from your clipboard with one key, preview available formats, and download directly to your machine. 

Under the hood, Open Omni automatically provisions and manages [`yt-dlp`](https://github.com/yt-dlp/yt-dlp), [`gallery-dl`](https://github.com/mikf/gallery-dl), and `ffmpeg` binaries so you never have to manually configure external dependencies.

---

## How It Compares

| Feature | Open Omni | Raw `yt-dlp` | Web Downloaders |
| :--- | :---: | :---: | :---: |
| **Interactive TUI** | Yes (keyboard-driven) | No | Web UI only |
| **Single-binary auto-setup** | Yes (auto-provisions engines) | Manual install | Hosted |
| **Social photo & carousel galleries** | Yes (`gallery-dl` unified) | Video only | Unreliable |
| **Ad-free & Tracker-free** | 100% clean | 100% clean | Heavy ads / malware risks |
| **Direct scriptable CLI** | Yes | Yes | No |
| **Cross-platform** | macOS, Linux, Windows | macOS, Linux, Windows | Web |

---

## Installation

### One-liner (macOS & Linux)

```sh
curl -fsSL https://mint.dev.cv | sh
```

### Via npm (Global)

```sh
npm install -g open-omni
```

### Run Directly via npx

```sh
npx open-omni [url]
```

> **Requirements**: Node 20+. Extraction engines (`yt-dlp`, `gallery-dl`, and `ffmpeg`) are downloaded automatically to `~/.open-omni/bin` on demand.

---

## Quick Start

Launch interactive mode:

```sh
open-omni
```

Or pass a URL directly to inspect available media formats:

```sh
open-omni https://youtu.be/dQw4w9WgXcQ
```

Direct scriptable downloads:

```sh
# Download highest resolution video directly
open-omni <url> --best

# Extract audio to MP3 in a specific directory
open-omni <url> --mp3 -o ~/Music

# Download with subtitles embedded
open-omni <url> --embed-subs --subs=en,es

# Download thumbnail artwork
open-omni <url> --thumb --embed-thumb

# Download only photos from an Instagram or X gallery
open-omni <url> --photos-only

# Update bundled extraction engines (yt-dlp and gallery-dl)
open-omni -U
```

---

## Interactive Interface

<p align="center">
  <img src="assets/download-options.png" alt="Format and quality picker" width="100%">
</p>

- **URL Input**: Paste URLs directly or press `Tab` to insert the current clipboard contents.
- **Format Picker**: Select from highest quality video, optimized 1080p/720p tiers, or audio-only extraction.
- **Playlists & Carousels**: Toggle individual tracks with `Space` or select all with `A`.
- **Themes**: Switch between `dark`, `light`, and `auto` terminal palette integration.

---

## CLI Reference

| Flag | Description |
| :--- | :--- |
| `[url]` | Video, playlist, or gallery URL |
| `--best` | Download highest available video quality directly |
| `--mp3` | Extract audio track as MP3 directly |
| `--subs [langs]` | Download subtitles (e.g. `--subs=en,es`) |
| `--embed-subs` | Mux subtitles into the video container |
| `--thumb` | Save video thumbnail image |
| `--embed-thumb` | Embed thumbnail artwork into media container |
| `--photos-only` | Download only images from social post or carousel |
| `--videos-only` | Download only videos from social post or carousel |
| `-o, --output <dir>` | Destination folder (default: Downloads or `$OPEN_OMNI_DIR`) |
| `-U, --update` | Update bundled `yt-dlp` and `gallery-dl` binaries |
| `--update-ytdlp` | Update only bundled `yt-dlp` binary |
| `--update-gallerydl` | Update only bundled `gallery-dl` binary |
| `--force` | Force clean re-download of binaries |
| `--theme <mode>` | Color theme: `auto`, `light`, or `dark` |
| `--completion <shell>` | Generate completions (`bash`, `zsh`, `fish`, `powershell`) |
| `-h, --help` | Show help screen |
| `-v, --version` | Show version number |

---

## Configuration

Settings can be customized in `~/.config/open-omni/config.json`:

```json
{
  "outputDir": "~/Downloads",
  "theme": "auto",
  "format": "best",
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

*Precedence*: Command-line flags > `$OPEN_OMNI_DIR` > `config.json` > OS default Downloads.

---

## Shell Autocompletion

Add autocomplete support to your shell profile:

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

## Privacy & Local First

Open Omni runs entirely on your local machine:

- **No Remote Telemetry**: No tracking, metrics, analytics, or third-party servers.
- **Direct Fetch**: Network connections are established exclusively between your computer and the target media platform.
- **Local Storage**: All media, metadata, and engine binaries remain under your local user directory.

---

## Fair Use Notice

Open Omni is an open-source educational utility intended for personal archiving, local backup, research, and fair use analysis under applicable copyright laws (including Section 107 of the U.S. Copyright Act). 

Open Omni does not bypass DRM encryption, defeat digital paywalls, or distribute protected media. Users are responsible for ensuring that their downloads comply with local copyright regulations and the terms of service of the respective platforms.

---

## License

[MIT](LICENSE)
