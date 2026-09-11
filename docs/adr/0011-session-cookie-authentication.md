# 0011. Session Cookie Authentication & Browser Session Delegation

## Context & Decision

Accessing age-restricted videos on YouTube, private/follower-only posts on Instagram, and subscriber feeds on supported media platforms requires authenticated HTTP sessions. Traditional headless CLI login prompts (username and password inputs) consistently fail due to multi-factor authentication (2FA), CAPTCHAs, and platform-level bot detection algorithms.

To provide seamless access to authenticated media while preserving a non-interactive and scriptable architecture, Open Omni adopts session cookie delegation:
1. **Zero-Config Browser Auto-Detection (`--cookies-from-browser auto`)**: By default, Open Omni automatically scans installed browsers across macOS, Linux, and Windows (Chrome, Firefox, Brave, Edge, Safari, Zen, Helium, Floorp, Waterfox).
2. **Browser Session Extraction (`--cookies-from-browser <browser[:profile]>`)**: Supports explicit browser targets as well as profile path aliases (e.g. `zen` normalized to `firefox:<zen_profile_path>`).
3. **Cookie Jar Path (`--cookies <path>`)**: Accepts a standard Netscape/Mozilla formatted cookies text file exported from the user's browser.

## Dual-Engine Dispatch & Universal Detection Architecture

Both underlying media engines (`yt-dlp` and `gallery-dl`) support passing Netscape cookie files via `--cookies <path>`. However, native browser cookie extraction behaves inconsistently across different operating systems, browsers, and engine versions.

To ensure uniform behavior across both video (`yt-dlp`) and photo/carousel (`gallery-dl`) pipelines:
1. **Universal Browser Discovery**:
   - In `auto` mode, Open Omni probes candidates across Gecko (Firefox, Zen, Floorp, Waterfox) and Chromium (Chrome, Brave, Edge, Helium, Opera, Vivaldi) ecosystems.
   - On Windows, Gecko-family browsers are prioritized during auto-detection because Chromium 127+ utilizes App-Bound DPAPI encryption which prevents non-elevated CLI decryption. Gecko browsers store session cookies in standard SQLite tables (`cookies.sqlite`) readable across all engines.
   - For browsers not recognized directly by `yt-dlp` (such as Zen Browser), Open Omni normalizes the specification to `firefox:<profile_dir>` by locating the active profile in `profiles.ini`.
2. **Login-Wall Auto-Recovery**:
   - If a request is initiated without credentials and the host platform triggers an authentication redirect (`HTTP redirect to login page`), the dispatcher intercepts the error, dynamically extracts cookies from the user's default browser, and transparently retries the probe without aborting the process.
3. **Ephemeral Cookie Jar Management**:
   - When extracting from an installed browser, Open Omni creates a temporary cookie jar in `~/.open-omni/temp/cookies-<hash>.txt` with strict permissions (`0o600`).
   - The generated jar is passed to `gallery-dl` and `yt-dlp`, and parsed into an `in-memory` cookie header for native HTTP extractors (such as Instagram embed resolvers).
   - On completion, error, or exit (`SIGINT`/`SIGTERM`), ephemeral cookie jars are unlinked to protect user credentials.

## Configuration & Precedence Waterfall

Authentication settings integrate with Open Omni's configuration precedence hierarchy:
- Command-line flags (`--cookies`, `--cookies-from-browser`)
- Environment variables (`OPEN_OMNI_COOKIES`, `OPEN_OMNI_COOKIES_FROM_BROWSER`)
- User configuration file (`~/.config/open-omni/config.json`)
- Default: `--cookies-from-browser auto` (graceful fallback to public guest mode if no browser is detected)

Raw session tokens or credentials are never stored directly in `config.json`. Only file paths or browser identifier strings are recorded.

## TUI Visibility

When an authenticated session is active, the interactive terminal interface displays a passive session indicator in the header (e.g., `Auth: cookies.txt` or `Auth: zen (firefox:...)`). No sensitive authentication tokens or cookie contents are rendered.

