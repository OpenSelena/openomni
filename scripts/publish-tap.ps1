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

$readmeContent = @"
# OpenSelena Homebrew Tap

Official Homebrew tap for OpenSelena utilities.

## Installation

Add this tap and install Open Omni:

```sh
brew install OpenSelena/tap/open-omni
```

Or tap first:

```sh
brew tap OpenSelena/tap
brew install open-omni
```

## Available Formulae

- **`open-omni`**: Fast terminal media downloader and TUI for 1,800+ sites.
"@

Set-Content -Path "$tapDir\README.md" -Value $readmeContent -Encoding utf8

Push-Location $tapDir
try {
    git add .
    git commit -m "feat: add open-omni 1.0.0 formula"
    git push origin main
    Write-Host "Pushed to OpenSelena/homebrew-tap successfully!"
} finally {
    Pop-Location
}
