# 0011. Session Cookie Authentication & Browser Session Delegation

## Context & Decision

Accessing age-restricted videos on YouTube, private/follower-only posts on Instagram, and subscriber feeds on supported media platforms requires authenticated HTTP sessions. Traditional headless CLI login prompts (username and password inputs) consistently fail due to multi-factor authentication (2FA), CAPTCHAs, and platform-level bot detection algorithms.

To provide seamless access to authenticated media while preserving a non-interactive and scriptable architecture, Open Omni adopts session cookie delegation:
1. **Cookie Jar Path (`--cookies <path>`)**: Accepts a standard Netscape/Mozilla formatted cookies text file exported from the user's browser.
2. **Browser Session Extraction (`--cookies-from-browser <browser[:profile]>`)**: Automatically extracts session cookies from supported installed browsers (`chrome`, `firefox`, `brave`, `edge`, `safari`, `chromium`, `vivaldi`, `opera`).

## Dual-Engine Dispatch Architecture

Both underlying media engines (`yt-dlp` and `gallery-dl`) support passing Netscape cookie files via `--cookies <path>`. However, native browser cookie extraction behaves inconsistently across different operating systems and engine versions.

To ensure uniform behavior across both video (`yt-dlp`) and photo/carousel (`gallery-dl`) pipelines:
1. When `--cookies <path>` is supplied, the path is verified for existence and forwarded directly to the selected extraction engine.
2. When `--cookies-from-browser <browser>` is supplied, Open Omni utilizes `yt-dlp`'s extraction backend to export the session to a temporary cookie jar in `~/.open-omni/temp/cookies-<hash>.txt` with strict file permissions (`0o600`).
3. The generated cookie jar path is passed as `--cookies <jar>` to the routed engine (`yt-dlp` or `gallery-dl`).
4. On process completion, error exit, or termination signal (`SIGINT`/`SIGTERM`), the ephemeral cookie jar is deleted from disk to prevent credential remnants.

## Configuration & Precedence Waterfall

Authentication settings integrate with Open Omni's existing configuration precedence hierarchy:
- Command-line flags (`--cookies`, `--cookies-from-browser`)
- Environment variables (`OPEN_OMNI_COOKIES`, `OPEN_OMNI_COOKIES_FROM_BROWSER`)
- User configuration file (`~/.config/open-omni/config.json`)
- Default (unauthenticated public access)

Raw session tokens or credentials are never stored directly in `config.json`. Only file paths or browser identifier strings are recorded.

## TUI Visibility

When an authenticated session is active, the interactive terminal interface displays a passive session indicator in the header (e.g., `Auth: cookies.txt` or `Auth: firefox`). No sensitive authentication tokens or cookie contents are rendered.
