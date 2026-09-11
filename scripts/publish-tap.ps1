$ErrorActionPreference = "Stop"

$tapDir = "$env:TEMP\homebrew-tap"
if (Test-Path $tapDir) {
    Remove-Item -Recurse -Force $tapDir
}

Write-Host "Cloning OpenSelena/homebrew-tap..."
gh repo clone OpenSelena/homebrew-tap $tapDir

$formulaDir = "$tapDir\Formula"
if (-not (Test-Path $formulaDir)) {
    New-Item -ItemType Directory -Path $formulaDir -Force | Out-Null
}

Copy-Item "x:\Open Omni\Formula\open-omni.rb" "$formulaDir\open-omni.rb" -Force

$readmeContent = @'
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/logo-dark.svg">
    <img src="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/logo-light.svg" alt="Open Selena" width="240">
  </picture>
</p>

<p align="center">
  <b>Official Homebrew tap for OpenSelena tools and terminal utilities.</b><br/>
  Install and manage Open Omni and related software natively on macOS and Linux.
</p>

<p align="center">
  <a href="https://github.com/OpenSelena/homebrew-tap/actions"><img src="https://img.shields.io/badge/Homebrew-Tap-FBB040.svg?logo=homebrew&logoColor=white" alt="Homebrew Tap"></a>
  <a href="https://github.com/OpenSelena/openomni"><img src="https://img.shields.io/badge/Open%20Omni-v1.0.0-C15F3C.svg" alt="Open Omni Version"></a>
  <a href="https://github.com/OpenSelena/openomni/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="mailto:igect@vk.com"><img src="https://img.shields.io/badge/contact-igect%40vk.com-blue.svg" alt="Contact Email"></a>
</p>

---

## What is This Repository?

This is the official [Homebrew](https://brew.sh/) tap provided by the **[OpenSelena](https://github.com/OpenSelena)** organization. It enables macOS and Linux users to install, run, and update Open Omni directly through `brew`.

### Available Formulae

| Formula | Version | Description | Command |
| :--- | :--- | :--- | :--- |
| **`open-omni`** | `1.0.0` | Fast terminal media downloader & TUI for 1,800+ sites (YouTube, X, Instagram, TikTok, Threads, etc.) | `brew install OpenSelena/tap/open-omni` |

---

## Installation

### One-Step Install (Recommended)

You can install Open Omni directly without tapping the repository explicitly:

```bash
brew install OpenSelena/tap/open-omni
```

### Two-Step Install (Add Tap First)

If you prefer keeping the tap registered in your Homebrew repository index:

```bash
# 1. Tap the repository
brew tap OpenSelena/tap

# 2. Install the formula
brew install open-omni
```

Once installed, the following CLI commands are immediately available in your terminal `$PATH`:
- `open-omni`
- `openomni`
- `omni`

Verify your installation:

```bash
open-omni --version
```

---

## Updating & Upgrading

To update the tap index and upgrade Open Omni to the latest version:

```bash
brew update
brew upgrade open-omni
```

To update the internal media extraction engines (`yt-dlp` and `gallery-dl`) managed by Open Omni:

```bash
open-omni -U
```

---

## Quick Start & CLI Examples

### Launch Interactive Terminal Interface
Run without arguments to open the interactive format and playlist picker:

```bash
open-omni
```

### Download Highest Quality Video
```bash
open-omni https://youtu.be/dQw4w9WgXcQ --best
```

### Extract Audio as MP3 to a Specific Directory
```bash
open-omni https://youtu.be/dQw4w9WgXcQ --mp3 -o ~/Music
```

### Download Subtitles and Embed into Container
```bash
open-omni https://youtu.be/dQw4w9WgXcQ --embed-subs --subs=en,es
```

### Download Photo Posts / Carousels
```bash
open-omni https://www.instagram.com/p/... --photos-only
```

---

## Shell Autocompletion

Enable tab completions in your preferred shell environment:

```bash
# Bash (~/.bashrc)
eval "$(open-omni --completion bash)"

# Zsh (~/.zshrc)
eval "$(open-omni --completion zsh)"

# Fish (~/.config/fish/config.fish)
open-omni --completion fish | source
```

---

## Troubleshooting

### Conflicting Links
If Homebrew warns about existing symlinks or unlinked binaries:
```bash
brew link --overwrite open-omni
```

### Auditing the Formula
To inspect or test the formula definition locally:
```bash
brew audit --strict OpenSelena/tap/open-omni
brew test OpenSelena/tap/open-omni
```

### Uninstalling
To completely remove Open Omni:
```bash
brew uninstall open-omni
brew untap OpenSelena/tap
```

---

## Purpose of Usage & Fair Use Notice

Open Omni is an open-source educational utility intended for personal archiving, local offline study, and fair-use research.

### Copyright and Tool Purpose
The software functions as an automated terminal interface to established media extraction backends (`yt-dlp` and `gallery-dl`). Analogous to a standard web browser or media player, Open Omni retrieves publicly available media streams strictly at the direct instruction of the user. Open Omni does not operate remote media servers, store or index content, bypass digital rights management (DRM) encryption, or circumvent technical access controls or digital paywalls.

### Fair Use Principles
Applicable copyright laws (such as Section 107 of the U.S. Copyright Act and comparable fair-dealing statutes internationally) permit the use of copyrighted works without express authorization under specific circumstances, including:
- Non-commercial personal archiving and format shifting for offline viewing
- Criticism, commentary, parody, and transformative research
- News reporting, classroom teaching, scholarship, and academic analysis

### User Responsibility & Disclaimers
- **No Grant of Ownership or Rights**: Open Omni is an open-source tool and does not grant users copyright ownership, licenses, or authorization to reproduce, distribute, publicly display, or monetize protected content unlawfully.
- **User Responsibility**: Users are solely responsible for ensuring that their capture and subsequent use of any media complies with applicable local copyright laws, intellectual property rights, and third-party terms of service.
- **Not Legal Advice**: This notice is provided for informational and educational purposes only and does not constitute formal legal counsel.

---

## Links & Community

- **Source Code Repository**: [https://github.com/OpenSelena/openomni](https://github.com/OpenSelena/openomni)
- **Issue Tracker & Bug Reports**: [https://github.com/OpenSelena/openomni/issues](https://github.com/OpenSelena/openomni/issues)
- **npm Package**: [https://www.npmjs.com/package/open-omni](https://www.npmjs.com/package/open-omni)

---

## License & Inquiries

Open Omni and this tap formula are released under the [MIT License](https://github.com/OpenSelena/openomni/blob/main/LICENSE).

### Contact, DMCA & Legal Inquiries
For copyright concerns, DMCA takedown requests, legal inquiries, bug reports, security disclosures, or general questions regarding this project, please reach out directly:

- **Email**: [igect@vk.com](mailto:igect@vk.com)
'@

Set-Content -Path "$tapDir\README.md" -Value $readmeContent -Encoding utf8

Push-Location $tapDir
try {
    git add README.md
    git commit -m "docs: add fair use notice, DMCA contact email, and remove inactive website reference"
    git push origin main
    Write-Host "Updated README on OpenSelena/homebrew-tap successfully!"
} finally {
    Pop-Location
}
