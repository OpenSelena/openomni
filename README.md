<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/logo-light.svg" alt="Open Omni" width="240">
  </picture>
</p>

<p align="center">
  <b>Fast terminal media downloader and TUI for 1,800+ sites.</b><br/>
  Download videos, music, and photo galleries from YouTube, Instagram, X, TikTok, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/open-omni"><img src="https://img.shields.io/npm/v/open-omni.svg?color=C15F3C" alt="npm version"></a>
  <a href="https://github.com/OpenSelena/openomni/actions/workflows/ci.yml"><img src="https://github.com/OpenSelena/openomni/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/home.png" alt="Open Omni Interface" width="100%">
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
- [License & Inquiries](#license--inquiries)

---

## Why Open Omni

You want to download a video, an audio track, or a photo set without clicking through suspicious popups, fake download buttons, or ad-laden web converters. You also don't want to memorize dozens of complicated command-line flags.

Open Omni combines the flexibility of an interactive terminal interface with scriptable command-line speed. Paste a link from your clipboard with one key, preview available formats, and download directly to your machine. 

Under the hood, Open Omni automatically provisions and manages [`yt-dlp`](https://github.com/yt-dlp/yt-dlp), [`gallery-dl`](https://codeberg.org/mikf/gallery-dl), and `ffmpeg` binaries so you never have to manually configure external dependencies.

---

## How It Compares

| | Open Omni | yt-dlp | Web converters |
| :--- | :--- | :--- | :--- |
| **Interface** | Keyboard-driven terminal TUI | Command-line flags | Browser UI with ads |
| **Engines** | Auto-provisions `yt-dlp`, `gallery-dl`, `ffmpeg` | Manual binary or Python setup | Hosted / unknown backends |
| **Media** | Video, audio, photos & carousels | Video & audio | Inconsistent / compressed |
| **Selection** | Interactive checklist (`Space` / `A` keys) | Index ranges (`--playlist-items`) | Single URL at a time |
| **Workflow** | `Tab` clipboard paste → pick format → Enter | Build flags manually | Paste → wait → download |
| **Local-first** | 100% local, zero telemetry | 100% local, open-source | Remote servers & ad trackers |

---

## Installation

### One-liner (macOS & Linux)

```sh
curl -fsSL https://mint.dev.cv | sh
```

### Via Homebrew (macOS & Linux)

```sh
brew install OpenSelena/tap/open-omni
```

### Via Winget (Windows)

```powershell
winget install OpenSelena.OpenOmni
```

### Via npm (Global)

```sh
npm install -g open-omni
```

### Run Directly via npx

```sh
npx open-omni [url]
```

> **Requirements**: Node 20+ (when using npm or Homebrew; standalone Windows package bundles its own runtime). Extraction engines (`yt-dlp`, `gallery-dl`, and `ffmpeg`) are downloaded automatically to `~/.open-omni/bin` on demand.

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

# Zero-config: auto-detects browser session (Firefox, Zen, Chrome, Brave, Edge, Safari)
open-omni <url> --best

# Target a specific browser or profile explicitly
open-omni <url> --cookies-from-browser firefox

# Download using an exported Netscape cookie file
open-omni <url> --cookies ~/cookies.txt

# Update bundled extraction engines (yt-dlp and gallery-dl)
open-omni -U
```

---

## Interactive Interface

<p align="center">
  <img src="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/download-options.png" alt="Format and quality picker" width="100%">
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
| `--skip-existing` | Skip download if recorded in ledger and present on disk |
| `--time <range>` | Download specific time range (e.g. `01:00-02:30` or `60-150`) |
| `--section <range>` | Alias for `--time` |
| `--cookies <path>` | Load session cookies from a Netscape format file |
| `--cookies-from-browser <spec>` | Extract cookies from browser (`auto`, `firefox`, `chrome`, `zen`, etc.) |
| `-o, --output <dir>` | Destination folder (default: Downloads or `$OPEN_OMNI_DIR`) |
| `-U, --update` | Update bundled `yt-dlp` and `gallery-dl` binaries |
| `--update-ytdlp` | Update only bundled `yt-dlp` binary |
| `--update-gallerydl` | Update only bundled `gallery-dl` binary |
| `--force` | Force overwrite existing downloads or re-fetch binaries |
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

Open Omni is an open-source educational utility intended for personal archiving, local offline study, and fair-use research.

### Copyright and Tool Purpose
The software functions as an automated terminal interface to established media extraction backends (`yt-dlp` and `gallery-dl`). Analogous to a standard web browser or media player, Open Omni retrieves publicly available media streams strictly at the direct instruction of the user. Open Omni does not operate remote media servers, store or index content, bypass digital rights management (DRM) encryption, or circumvent technical access controls or digital paywalls.

### Fair Use Principles
Applicable copyright laws (such as Section 107 of the U.S. Copyright Act and comparable fair-dealing statutes internationally) permit the use of copyrighted works without express authorization under specific circumstances, including:
- Non-commercial personal archiving and format shifting for offline viewing
- Criticism, commentary, parody, and transformative research
- News reporting, classroom teaching, scholarship, and academic analysis

Whether a specific download or utilization qualifies as fair use depends on jurisdictional statutory factors, including the purpose and character of the use, the nature of the copyrighted work, the amount and substantiality of the portion used, and the effect upon the potential market or value of the work.

### User Responsibility & Disclaimers
- **No Grant of Ownership or Rights**: Open Omni is an open-source tool and does not grant users copyright ownership, licenses, or authorization to reproduce, distribute, publicly display, or monetize protected content unlawfully.
- **User Responsibility**: Users are solely responsible for ensuring that their capture and subsequent use of any media complies with applicable local copyright laws, intellectual property rights, and third-party terms of service.
- **Not Legal Advice**: This notice is provided for informational and educational purposes only and does not constitute formal legal counsel.

---

## License & Inquiries

Open Omni is released under the [MIT License](LICENSE).

### Contact & Inquiries
For copyright concerns, legal inquiries, bug reports, security reports, or general questions regarding this project, please reach out directly:

- **Email**: [igect@vk.com](mailto:igect@vk.com)
