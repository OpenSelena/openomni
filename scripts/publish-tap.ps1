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
    <img src="https://raw.githubusercontent.com/OpenSelena/openomni/main/assets/logo-light.svg" alt="Open Selena" width="220">
  </picture>
</p>

# OpenSelena Homebrew Tap

Official Homebrew tap for [OpenSelena](https://github.com/OpenSelena) tools.

<p align="left">
  <a href="https://github.com/OpenSelena/homebrew-tap/actions"><img src="https://img.shields.io/badge/Homebrew-Tap-FBB040.svg?logo=homebrew&logoColor=white" alt="Homebrew Tap"></a>
  <a href="https://github.com/OpenSelena/openomni"><img src="https://img.shields.io/badge/Open%20Omni-v1.0.0-C15F3C.svg" alt="Open Omni Version"></a>
  <a href="https://github.com/OpenSelena/openomni/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="mailto:igect@vk.com"><img src="https://img.shields.io/badge/contact-igect%40vk.com-blue.svg" alt="Contact Email"></a>
</p>

## Installation

```bash
brew install OpenSelena/tap/open-omni
```

Or add the tap first:

```bash
brew tap OpenSelena/tap
brew install open-omni
```

## Available Formulae

| Formula | Description |
| :--- | :--- |
| [`open-omni`](Formula/open-omni.rb) | Fast terminal media downloader & TUI for 1,800+ sites (YouTube, X, Instagram, TikTok, etc.) |

Once installed, `open-omni`, `openomni`, and `omni` are available in your `$PATH`.

```bash
open-omni --version
```

## Usage

```bash
# Launch interactive terminal UI
open-omni

# Download best quality video
open-omni "https://youtu.be/..." --best

# Extract audio as MP3
open-omni "https://youtu.be/..." --mp3 -o ~/Music

# Download with embedded subtitles
open-omni "https://youtu.be/..." --embed-subs --subs=en,es

# Photos only (carousels / image posts)
open-omni "https://www.instagram.com/p/..." --photos-only
```

## Updating

Upgrade Open Omni:

```bash
brew update && brew upgrade open-omni
```

Update internal engines (`yt-dlp` and `gallery-dl`):

```bash
open-omni -U
```

## Shell Completion

```bash
# Bash (~/.bashrc)
eval "$(open-omni --completion bash)"

# Zsh (~/.zshrc)
eval "$(open-omni --completion zsh)"

# Fish (~/.config/fish/config.fish)
open-omni --completion fish | source
```

## Uninstall

```bash
brew uninstall open-omni
brew untap OpenSelena/tap
```

---

## Fair Use Notice & Purpose of Usage

Open Omni is an open-source educational utility intended for personal archiving, local offline study, and fair-use research.

### How It Works & Copyright
Open Omni is a terminal interface for established media extraction backends (`yt-dlp` and `gallery-dl`). Similar to a web browser or media player, it fetches publicly accessible media streams strictly at the direct instruction of the user. Open Omni does not host media servers, index content, bypass DRM encryption, or circumvent digital paywalls.

### Fair Use Principles
Copyright laws (including Section 107 of the U.S. Copyright Act and international fair-dealing provisions) allow personal, non-commercial use of copyrighted material without prior authorization under specific conditions:
- Non-commercial personal archiving and format shifting for offline study
- Transformative research, criticism, and commentary
- Educational analysis, teaching, and scholarship

### User Responsibility
- **No Rights Granted**: Open Omni does not grant copyright ownership, licenses, or rights to reproduce, distribute, or monetize copyrighted media.
- **User Responsibility**: Users are solely responsible for ensuring that their downloads comply with local copyright laws, intellectual property rights, and third-party terms of service.
- **Not Legal Advice**: This notice is for informational purposes only and does not constitute formal legal counsel.

---

## Links

- **Repository**: [github.com/OpenSelena/openomni](https://github.com/OpenSelena/openomni)
- **Issues**: [github.com/OpenSelena/openomni/issues](https://github.com/OpenSelena/openomni/issues)
- **npm**: [npmjs.com/package/open-omni](https://www.npmjs.com/package/open-omni)

---

## License & Inquiries

Released under the [MIT License](https://github.com/OpenSelena/openomni/blob/main/LICENSE).

For copyright concerns, DMCA takedown requests, legal inquiries, or security disclosures:
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
