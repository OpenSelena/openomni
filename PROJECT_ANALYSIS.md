# Open Omni: Full End-to-End Project Analysis & Code Audit

## 1. Executive Summary

Open Omni is a terminal-first video, audio, and photo downloader and keyboard-driven TUI supporting 1,800+ sites, powered by `yt-dlp`, `gallery-dl`, and Ink.
Overall Health Score: 8.5 / 10. The codebase demonstrates high engineering craftsmanship, comprehensive architectural records (18 ADRs), strict security sanitization, and robust cross-platform abstractions.
Top 5 Risks:
1. Bluesky HLS video download writes corrupt `.m3u8` text manifests when `ffmpeg` is available on system PATH (`src/lib/bluesky.ts:271`).
2. Ephemeral browser cookie jars written to shared `/tmp` with default file creation mode, risking local session token exposure on multi-user systems (`src/lib/cookies.ts:248`).
3. GitHub Actions WinGet release step condition `if: env.WINGET_TOKEN != ''` evaluates against an empty job environment, skipping automated WinGet package distribution (`.github/workflows/release.yml:123`).
4. Shell autocompletion scripts in `src/lib/completion.ts` lack definitions for 10+ modern CLI options added in v1.4.0/v1.5.0.
5. Clipboard watcher daemon does not propagate cancellation `signal` into in-flight media probe and download subprocesses (`src/lib/watcher.ts:105`).

---

## 2. Architecture Overview & Component Diagram

### Architecture Description
Open Omni is organized into four core layers:
1. **Presentation & CLI Layer**: `src/cli.tsx` handles raw command-line flag parsing, config subcommands, and TUI lifecycle. When running interactively, it mounts `src/app.tsx` via `ink`. UI views (`src/components/views/*`), custom input frames (`FramedInput`), and terminal mouse tracking (`src/lib/use-mouse-click.ts`, `src/lib/click-map.ts`) provide an interactive experience with zero external terminal UI dependencies.
2. **Orchestration & Workflow Hooks**: Decomposed in v1.5.0 into specialized React hooks (`src/hooks/`): `useEngineProbe` (probe orchestration, format discovery, auto-recovery), `useSingleDownload` (single media item execution), and `useBatchQueue` (playlist/carousel multi-worker batch processing).
3. **Engine Routing & Dispatcher**: `src/lib/dispatcher.ts` analyzes target URLs and routes media extraction dynamically across four engines:
   - `yt-dlp` (`src/lib/ytdlp.ts`): Video and audio extraction with automatic binary self-update and fallback provisioning.
   - `gallery-dl` (`src/lib/gallerydl.ts`): Multi-image carousels and photo galleries with macOS package manager delegation.
   - Native Instagram Embed Resolver (`src/lib/instagram.ts`): Unauthenticated `/embed/captioned/` iframe scraping and direct CDN HTTP streaming.
   - Native Bluesky Resolver (`src/lib/bluesky.ts`): High-speed public AT Protocol AppView REST API queries (`public.api.bsky.app`) and direct CDN/HLS streaming.
4. **Data Model & Infrastructure**:
   - `Download Ledger` (`src/lib/ledger.ts`): Persistent FIFO record (`ledger.json`) tracking up to 1,000 completed media items with serialized atomic writes.
   - `User Configuration` (`src/lib/config.ts`): Strict precedence waterfall (CLI args > Env vars > Config file > Platform Known Folders > Built-in defaults).
   - `Credential Sanitizer` (`src/lib/sanitizer.ts`): Centralized redaction stripping proxy credentials, access tokens, auth headers, and session cookies from logs.
   - `Clipboard Watcher Daemon` (`src/lib/watcher.ts`): Continuous background clipboard monitoring with pre-seed caching and deduplication.

### Text Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interaction                                │
│       CLI Command ($ open-omni)   |   Clipboard Daemon (--watch)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         CLI & TUI Router                               │
│       src/cli.tsx                 |   src/app.tsx (Ink TUI)            │
│       ├── Argument Parser (args)  ├── UI Views (components/views)      │
│       └── Precedence Waterfall    └── Terminal Virtual Frame Buffer    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Orchestration & Hooks                             │
│       useEngineProbe.ts  |  useSingleDownload.ts  |  useBatchQueue.ts  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Unified Engine Dispatcher                           │
│                      (src/lib/dispatcher.ts)                           │
│     Routes URL based on platform domain, media filter, and post type   │
└───────┬───────────────────┬───────────────────┬──────────────────┬─────┘
        │                   │                   │                  │
        ▼                   ▼                   ▼                  ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐   ┌─────────────┐
│    yt-dlp    │    │  gallery-dl  │    │  Instagram   │   │   Bluesky   │
│ Video/Audio  │    │  Photo/Sets  │    │    Embed     │   │ AT Protocol │
│   Subprocess │    │  Subprocess  │    │ Direct Stream│   │Direct Stream│
└───────┬──────┘    └───────┬──────┘    └───────┬──────┘   └──────┬──────┘
        │                   │                   │                 │
        └───────────────────┼───────────────────┴─────────────────┘
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Infrastructure & Persistence                         │
│  ├── Download Ledger (ledger.json: deduplication, batch resume)        │
│  ├── User Config (config.json: format, theme, proxy, rate limit)       │
│  ├── Sanitizer (sanitizer.ts: proxy, token, cookie redaction)          │
│  └── Platform Folders (Windows Registry GUID / Linux XDG user-dirs)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Design Patterns
- **Precedence Waterfall Pattern**: Strict hierarchical configuration resolution across CLI, environment, config file, OS paths, and defaults. Applied consistently in `src/lib/config.ts`.
- **Dispatcher / Strategy Pattern**: URL inspect-and-delegate routing across extraction engines in `src/lib/dispatcher.ts`.
- **Serialized Promise Queue**: In `src/lib/ledger.ts:139-142`, file writes are chained onto an in-memory `ledgerWriteQueue` Promise to guarantee atomic persistence under concurrent batch downloads.
- **Worker Pool / Bounded Concurrency**: `src/lib/pool.ts` provides `asyncPool` preserving output index ordering while enforcing concurrency limits.
- **Virtual Frame Hit-Testing**: `src/lib/click-map.ts` captures ANSI-stripped frame buffers to achieve coordinate-based mouse click routing without layout coupling.

---

## 3. Findings Table

| ID | Phase | Severity | Title | Evidence (file:line) | Why it matters | Recommended fix | Effort |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FIND-01** | Phase 5 | **Critical** | Bluesky HLS video download writes corrupt `.m3u8` manifest text when ffmpeg is on system PATH | `src/lib/bluesky.ts:271` & `src/lib/ytdlp.ts:186` | When `ffmpeg` is available on system PATH, `findFfmpeg()` returns `undefined` (delegating to yt-dlp). In `downloadBlueskyItem()`, `if (ffmpegLocation)` evaluates to false, falling through to HTTP stream fetch which saves the raw text playlist (`.m3u8`) as an `.mp4` video. | Check both `ffmpegLocation` and `'ffmpeg'` on system PATH, and throw an explicit error if neither is available. | S |
| **FIND-02** | Phase 6 | **High** | Ephemeral cookie jar written with default file permissions in shared temp directory | `src/lib/cookies.ts:248-264` & `src/cli.tsx:258` | Default execution mode enables `{browser: 'auto'}`. `yt-dlp` writes exported session cookies to `/tmp` with default umask (`0644`), leaving active authentication cookies readable by other users on shared systems. Violates ADR 0011 `0o600` requirement. | Pre-create `tempPath` with `0o600` mode or invoke `fs.chmodSync(tempPath, 0o600)` immediately upon creation. | S |
| **FIND-03** | Phase 9 | **High** | WinGet release automation step condition fails due to unpopulated step-level `env` | `.github/workflows/release.yml:123` | Step condition `if: env.WINGET_TOKEN != ''` evaluates against job/workflow environment, not the step's own `env:` declaration. The step will unconditionally evaluate to false and skip WinGet publication. | Replace step condition with `if: ${{ secrets.WINGET_TOKEN != '' }}`. | S |
| **FIND-04** | Phase 2 | **Medium** | Shell autocompletion scripts missing 10+ modern CLI options added in v1.4.0/v1.5.0 | `src/lib/completion.ts:31` | Flags including `--skip-existing`, `--time`, `--section`, `--cookies`, `--cookies-from-browser`, `--proxy`, `--geo-bypass`, `--geo-country`, `--limit-rate`, `--sponsorblock`, `--output-template`, and `--concurrency` are omitted from shell completions. | Update `generateBashCompletion()`, `generateZshCompletion()`, `generateFishCompletion()`, and `generatePowerShellCompletion()`. | M |
| **FIND-05** | Phase 7 | **Medium** | Watcher daemon background downloads ignore abort cancellation signal | `src/lib/watcher.ts:105, 173` | When stopping the watcher via `SIGINT` or `AbortSignal`, `defaultWatchDownload` does not forward `opts.signal` down to `probeUnified` or `downloadUnifiedItem`, leaving subprocesses running in background. | Forward `signal: opts.signal` in `defaultWatchDownload` calls. | S |
| **FIND-06** | Phase 7 | **Medium** | Uncleaned probe metadata files accumulate in system temporary directory | `src/lib/ytdlp.ts:316-317` | `probe()` writes `open-omni-info-*.json` files for `--load-info-json` reuse, but neither `useSingleDownload.ts` nor `cli.tsx` unlinks the temporary file after download completes or errors. | Add `fs.unlink(infoJsonPath).catch(() => {})` cleanup upon completion and error handling. | S |
| **FIND-07** | Phase 3 | **Low** | Node.js minimum version discrepancy between installer script, build config, and package metadata | `install.sh:40`, `tsup.config.ts:6`, `package.json:16`, `README.md:116` | `package.json` specifies Node `>=20`, while `install.sh` permits Node 18 (`NODE_MAJOR -ge 18`) and `tsup.config.ts` targets `node18`. Users on Node 18/19 may encounter installation warnings. | Enforce `NODE_MAJOR -ge 20` in `install.sh` and set `target: 'node20'` in `tsup.config.ts`. | S |
| **FIND-08** | Phase 10 | **Low** | Misleading error message for `theme` configuration validation | `src/lib/config.ts:510` | CLI command `open-omni config set theme <val>` reports `"Expected system, dark, light, or a named theme."` when validation only allows `auto`, `dark`, or `light`. Passing `system` is rejected. | Update error message to specify `auto, dark, or light`. | S |
| **FIND-09** | Phase 5 | **Low** | Unchecked non-null assertions on empty format choices in headless download | `src/cli.tsx:498-499` | In headless CLI mode, `choices[choices.length - 1]!` and `choices[0]!` are accessed with non-null assertions. If extractor returns formats without valid audio/video codecs, this throws an unhandled TypeError. | Check `choices.length === 0` and display a clear extractor error message before indexing. | S |
| **FIND-10** | Phase 8 | **Info** | Workspace lacks installed `node_modules` in repository root | Workspace root / `package.json` | Running `npm test` or `npm run typecheck` in the current working directory fails due to missing local dependencies (`node_modules`). Ground Rule 1 prohibits package installations. | Run `npm ci` before running tests and builds. Status marked UNVERIFIED. | S |

---

## 4. Environment Variables Table

| Variable Name | Purpose | Required / Optional | Safe Default | Source Code Location |
| :--- | :--- | :--- | :--- | :--- |
| `OPEN_OMNI_DIR` | Custom output directory for media downloads and fallback directory for engine binaries (`gallery-dl`) | Optional | OS Known Folder (e.g. `~/Downloads`) | `src/lib/args.ts:320`, `src/lib/gallerydl.ts:50` |
| `OPEN_OMNI_LEDGER_FILE` | Explicit file path for the persistent download ledger JSON store | Optional | `~/.config/open-omni/ledger.json` | `src/lib/ledger.ts:19-25` |
| `OPEN_OMNI_HISTORY_FILE` | Explicit file path for the interactive CLI URL input history store | Optional | `~/.config/open-omni/history.json` | `src/lib/history.ts:9-15` |
| `XDG_CONFIG_HOME` | Base directory for user configuration files on POSIX operating systems | Optional | `~/.config` | `src/lib/config.ts:84`, `src/lib/ledger.ts:22`, `src/lib/history.ts:12` |
| `APPDATA` | Roaming application data path for user configuration on Windows | Optional | `%USERPROFILE%\AppData\Roaming` | `src/lib/config.ts:88`, `src/lib/cookies.ts:119` |
| `LOCALAPPDATA` | Local application data path for browser profile discovery on Windows | Optional | `%USERPROFILE%\AppData\Local` | `src/lib/cookies.ts:168` |
| `ALL_PROXY`, `all_proxy` | Universal HTTP/HTTPS/SOCKS proxy specification applied to engine network traffic | Optional | None (direct connection) | `src/lib/config.ts:402-403` |
| `HTTPS_PROXY`, `https_proxy` | HTTPS proxy specification applied to engine network traffic | Optional | None (direct connection) | `src/lib/config.ts:404-405` |
| `HTTP_PROXY`, `http_proxy` | HTTP proxy specification applied to engine network traffic | Optional | None (direct connection) | `src/lib/config.ts:406-407` |
| `PYTHONIOENCODING` | Enforces UTF-8 standard input/output streams for spawned Python engine processes | Internal / Automatic | `utf-8` | `src/lib/ytdlp.ts:300`, `src/lib/gallerydl.ts:646` |
| `GH_TOKEN`, `GITHUB_TOKEN` | GitHub API authentication token used for release asset uploads and Winget PR creation | Optional / CI only | None | `.github/workflows/release.yml:106`, `scripts/submit-winget-pr.ts` |
| `WINGET_TOKEN` | Personal access token granting write permissions to `microsoft/winget-pkgs` for automated releases | Optional / CI only | None | `.github/workflows/release.yml:126` |

---

## 5. Dependency Table

| Package Name | Declared Version | Type | Purpose | Risk / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `ffmpeg-static` | `^5.3.0` | Production | Bundled static `ffmpeg` executable for subtitle/thumbnail muxing and audio transcoding | Safe fallback when system ffmpeg is missing. Large binary footprint on disk. |
| `ink` | `^7.1.1` | Production | React component reconciler and layout engine for terminal interfaces | Core UI framework. Requires Node.js 18+. |
| `ink-select-input` | `^6.2.0` | Production | Interactive terminal menu selector component for Ink | Standard, active dependency. |
| `ink-spinner` | `^5.0.0` | Production | Terminal activity spinner component for Ink | Standard, active dependency. |
| `react` | `^19.3.0` | Production | Core UI runtime powering Ink component tree | React 19 modern runtime. |
| `@alibaba-group/open-code-review` | `^1.12.7` | Development | Automated AI-assisted code review CLI tool | Internal tooling. |
| `@types/node` | `^26.6.2` | Development | TypeScript type definitions for Node.js standard library | Active, locked. |
| `@types/react` | `^19.3.0` | Development | TypeScript type definitions for React | Active, locked. |
| `tsup` | `^8.5.1` | Development | esbuild-based bundle generator for ESM CLI executable | Production build tool. |
| `tsx` | `^4.23.13` | Development | TypeScript executor for test execution and development runner | Used by `npm test`. |
| `typescript` | `^7.0.2` | Development | TypeScript compiler used for typecheck verification (`tsc --noEmit`) | Modern TypeScript compiler. |

Lockfile Status: `package-lock.json` is present and consistent with `package.json` (zero missing dependencies).

---

## 6. How to Run This Project (Quick-Start)

> **Verification Status**: UNVERIFIED in the active container environment.
> In accordance with Ground Rule 1 ("READ ONLY... Do not run commands that change state (no installs)"), `npm install` was not executed. Because `node_modules` is not populated on this host machine, full tests and builds cannot execute locally without first running `npm ci`.

### Clean Machine Setup Guide
1. **Prerequisites**:
   - Node.js 20 or higher (`node -v`)
   - npm 10 or higher (`npm -v`)
   - `git`
   - Optional: system `ffmpeg` (recommended for stream muxing)
2. **Install Dependencies**:
   ```bash
   npm ci
   ```
3. **Typecheck & Test**:
   ```bash
   npm run typecheck
   npm test
   ```
4. **Build Production Binary**:
   ```bash
   npm run build
   ```
   Outputs executable to `dist/cli.js`.
5. **Run Locally**:
   ```bash
   node dist/cli.js --help
   node dist/cli.js https://youtu.be/dQw4w9WgXcQ --best
   ```
6. **Launch Interactive TUI**:
   ```bash
   node dist/cli.js
   ```

---

## 7. Prioritized Action Plan

### Fix Now (Critical and High)
1. **Fix Bluesky HLS Video Download** (`FIND-01`):
   - Modify `src/lib/bluesky.ts:271` to inspect both `ffmpegLocation` and `'ffmpeg'` on system PATH using `commandWorks('ffmpeg', ['-version'])`.
   - If neither is found, throw an explicit error: `"ffmpeg is required to download Bluesky video streams"` instead of writing the `.m3u8` manifest text to disk.
2. **Enforce `0o600` Permissions on Ephemeral Cookie Files** (`FIND-02`):
   - In `src/lib/cookies.ts:248`, pre-create the cookie file using `fs.openSync(tempPath, 'w', 0o600)` or call `fs.chmodSync(tempPath, 0o600)` immediately after extraction to prevent credential exposure in shared `/tmp`.
3. **Repair WinGet Release Action Condition** (`FIND-03`):
   - In `.github/workflows/release.yml:123`, change `if: env.WINGET_TOKEN != ''` to `if: ${{ secrets.WINGET_TOKEN != '' }}` so that releases automatically publish to WinGet when the token secret is present.

### Fix Soon (Medium)
4. **Update Shell Autocompletion Scripts** (`FIND-04`):
   - Update `src/lib/completion.ts` to include `--skip-existing`, `--time`, `--section`, `--cookies`, `--cookies-from-browser`, `--proxy`, `--geo-bypass`, `--geo-country`, `--limit-rate`, `--sponsorblock`, `--output-template`, and `--concurrency` across Bash, Zsh, Fish, and PowerShell scripts.
5. **Propagate Cancellation Signal in Watcher Daemon** (`FIND-05`):
   - In `src/lib/watcher.ts:105, 173`, pass `signal: opts.signal` to `probeUnified` and `downloadUnifiedItem` inside `defaultWatchDownload` so running downloads terminate immediately on `Ctrl+C`.
6. **Clean Up Probe Metadata JSON Files** (`FIND-06`):
   - In `src/hooks/use-single-download.ts` and `src/cli.tsx`, ensure `infoJsonPath` is deleted via `fs.unlink()` upon completion or error.

### Nice to Have (Low)
7. **Harmonize Minimum Node Version** (`FIND-07`):
   - Update `install.sh` check to `NODE_MAJOR -ge 20` and set `target: 'node20'` in `tsup.config.ts`.
8. **Correct Config Theme Error String** (`FIND-08`):
   - In `src/lib/config.ts:510`, update the error string to `"Expected auto, dark, or light."`
9. **Guard Against Empty Format Choices** (`FIND-09`):
   - Add an explicit bounds check for `choices.length > 0` before array indexing in `src/cli.tsx:498`.

---

## 8. Open Questions & Assumptions

### Assumptions
1. **Network Engine Availability**: Assumed that when standalone binaries (`yt-dlp`, `gallery-dl`) are downloaded into `~/.open-omni/bin`, GitHub releases and Codeberg endpoints are accessible from the host network.
2. **Interactive Terminal Support**: Assumed that users running the interactive TUI have an ANSI/xterm-compatible terminal supporting alternate screen buffers (`\x1b[?1049h`) and UTF-8 box-drawing characters.
3. **Browser Cookie Encryption**: Assumed that `yt-dlp --cookies-from-browser` is able to decrypt local browser cookies on platforms with standard keyring support (DPAPI on Windows, Secret Service/KWallet on Linux, Keychain on macOS).

### Open Questions
1. **Native TikTok Slideshow Resolution**: Would the project benefit from a native unauthenticated TikTok embed parser (similar to `instagram.ts` and `bluesky.ts`) to avoid spawning `gallery-dl` for TikTok photo carousels?
2. **Audio-Only Video Conversion**: Should `--audio-format` support standalone execution when neither `ffmpeg` nor `ffmpeg-static` is installed, or should a warning prompt direct the user to install `ffmpeg`?

---

## 9. Appendix: List of Inspected Files

1. `/run/media/igect/Onion/openomni/AGENTS.md`
2. `/run/media/igect/Onion/openomni/CONTEXT.md`
3. `/run/media/igect/Onion/openomni/README.md`
4. `/run/media/igect/Onion/openomni/package.json`
5. `/run/media/igect/Onion/openomni/package-lock.json`
6. `/run/media/igect/Onion/openomni/tsconfig.json`
7. `/run/media/igect/Onion/openomni/tsup.config.ts`
8. `/run/media/igect/Onion/openomni/install.sh`
9. `/run/media/igect/Onion/openomni/Formula/open-omni.rb`
10. `/run/media/igect/Onion/openomni/workers/installer.js`
11. `/run/media/igect/Onion/openomni/scripts/clean-temp.js`
12. `/run/media/igect/Onion/openomni/scripts/generate-winget-manifest.ts`
13. `/run/media/igect/Onion/openomni/scripts/publish-tap.ps1`
14. `/run/media/igect/Onion/openomni/scripts/run-tests.ts`
15. `/run/media/igect/Onion/openomni/scripts/shim.cs`
16. `/run/media/igect/Onion/openomni/scripts/submit-winget-pr.ts`
17. `/run/media/igect/Onion/openomni/.github/workflows/ci.yml`
18. `/run/media/igect/Onion/openomni/.github/workflows/release.yml`
19. `/run/media/igect/Onion/openomni/src/cli.tsx`
20. `/run/media/igect/Onion/openomni/src/app.tsx`
21. `/run/media/igect/Onion/openomni/src/theme.ts`
22. `/run/media/igect/Onion/openomni/src/distribution.ts`
23. `/run/media/igect/Onion/openomni/src/distribution.test.ts`
24. `/run/media/igect/Onion/openomni/src/hooks/types.ts`
25. `/run/media/igect/Onion/openomni/src/hooks/use-batch-queue.ts`
26. `/run/media/igect/Onion/openomni/src/hooks/use-engine-probe.ts`
27. `/run/media/igect/Onion/openomni/src/hooks/use-single-download.ts`
28. `/run/media/igect/Onion/openomni/src/lib/args.ts`
29. `/run/media/igect/Onion/openomni/src/lib/args.test.ts`
30. `/run/media/igect/Onion/openomni/src/lib/bluesky.ts`
31. `/run/media/igect/Onion/openomni/src/lib/bluesky.test.ts`
32. `/run/media/igect/Onion/openomni/src/lib/click-map.ts`
33. `/run/media/igect/Onion/openomni/src/lib/click-map.test.ts`
34. `/run/media/igect/Onion/openomni/src/lib/clipboard.ts`
35. `/run/media/igect/Onion/openomni/src/lib/clipboard.test.ts`
36. `/run/media/igect/Onion/openomni/src/lib/completion.ts`
37. `/run/media/igect/Onion/openomni/src/lib/completion.test.ts`
38. `/run/media/igect/Onion/openomni/src/lib/config.ts`
39. `/run/media/igect/Onion/openomni/src/lib/config.test.ts`
40. `/run/media/igect/Onion/openomni/src/lib/cookies.ts`
41. `/run/media/igect/Onion/openomni/src/lib/cookies.test.ts`
42. `/run/media/igect/Onion/openomni/src/lib/dispatcher.ts`
43. `/run/media/igect/Onion/openomni/src/lib/dispatcher.test.ts`
44. `/run/media/igect/Onion/openomni/src/lib/format-cycle.ts`
45. `/run/media/igect/Onion/openomni/src/lib/format-cycle.test.ts`
46. `/run/media/igect/Onion/openomni/src/lib/format.ts`
47. `/run/media/igect/Onion/openomni/src/lib/format.test.ts`
48. `/run/media/igect/Onion/openomni/src/lib/gallerydl.ts`
49. `/run/media/igect/Onion/openomni/src/lib/gallerydl.test.ts`
50. `/run/media/igect/Onion/openomni/src/lib/history.ts`
51. `/run/media/igect/Onion/openomni/src/lib/history.test.ts`
52. `/run/media/igect/Onion/openomni/src/lib/instagram.ts`
53. `/run/media/igect/Onion/openomni/src/lib/instagram.test.ts`
54. `/run/media/igect/Onion/openomni/src/lib/known-folders.ts`
55. `/run/media/igect/Onion/openomni/src/lib/known-folders.test.ts`
56. `/run/media/igect/Onion/openomni/src/lib/ledger.ts`
57. `/run/media/igect/Onion/openomni/src/lib/ledger.test.ts`
58. `/run/media/igect/Onion/openomni/src/lib/platforms.ts`
59. `/run/media/igect/Onion/openomni/src/lib/platforms.test.ts`
60. `/run/media/igect/Onion/openomni/src/lib/playlist.ts`
61. `/run/media/igect/Onion/openomni/src/lib/playlist.test.ts`
62. `/run/media/igect/Onion/openomni/src/lib/pool.ts`
63. `/run/media/igect/Onion/openomni/src/lib/pool.test.ts`
64. `/run/media/igect/Onion/openomni/src/lib/readme.test.ts`
65. `/run/media/igect/Onion/openomni/src/lib/sanitizer.ts`
66. `/run/media/igect/Onion/openomni/src/lib/sanitizer.test.ts`
67. `/run/media/igect/Onion/openomni/src/lib/template.ts`
68. `/run/media/igect/Onion/openomni/src/lib/template.test.ts`
69. `/run/media/igect/Onion/openomni/src/lib/time.ts`
70. `/run/media/igect/Onion/openomni/src/lib/time.test.ts`
71. `/run/media/igect/Onion/openomni/src/lib/use-mouse-click.ts`
72. `/run/media/igect/Onion/openomni/src/lib/watcher.ts`
73. `/run/media/igect/Onion/openomni/src/lib/watcher.test.ts`
74. `/run/media/igect/Onion/openomni/src/lib/ytdlp.ts`
75. `/run/media/igect/Onion/openomni/src/lib/ytdlp.test.ts`
76. `/run/media/igect/Onion/openomni/src/components/framed-input.tsx`
77. `/run/media/igect/Onion/openomni/src/components/fullscreen.tsx`
78. `/run/media/igect/Onion/openomni/src/components/logo.tsx`
79. `/run/media/igect/Onion/openomni/src/components/panel.tsx`
80. `/run/media/igect/Onion/openomni/src/components/panel.test.ts`
81. `/run/media/igect/Onion/openomni/src/components/playlist-item-picker.tsx`
82. `/run/media/igect/Onion/openomni/src/components/playlist-item-picker.test.ts`
83. `/run/media/igect/Onion/openomni/src/components/playlist-progress.tsx`
84. `/run/media/igect/Onion/openomni/src/components/playlist-quality-picker.tsx`
85. `/run/media/igect/Onion/openomni/src/components/playlist-scope-picker.tsx`
86. `/run/media/igect/Onion/openomni/src/components/progress-bar.tsx`
87. `/run/media/igect/Onion/openomni/src/components/progress-bar.test.ts`
88. `/run/media/igect/Onion/openomni/src/components/shortcuts.tsx`
89. `/run/media/igect/Onion/openomni/src/components/text-input.tsx`
90. `/run/media/igect/Onion/openomni/src/components/views/completion-view.tsx`
91. `/run/media/igect/Onion/openomni/src/components/views/downloading-view.tsx`
92. `/run/media/igect/Onion/openomni/src/components/views/error-view.tsx`
93. `/run/media/igect/Onion/openomni/src/components/views/input-view.tsx`
94. `/run/media/igect/Onion/openomni/src/components/views/picking-view.tsx`
95. `/run/media/igect/Onion/openomni/src/components/views/playlist-views.tsx`
96. `/run/media/igect/Onion/openomni/src/components/views/probing-view.tsx`
97. `/run/media/igect/Onion/openomni/docs/research/v1.5.0-roadmap-and-codebase-improvements.md`
98. `/run/media/igect/Onion/openomni/docs/research/openselena-domains.md`
99. `/run/media/igect/Onion/openomni/docs/installer-domain-setup.md`
100. `/run/media/igect/Onion/openomni/docs/adr/0001-batch-download-architecture.md` through `0018-native-bluesky-at-protocol-resolution.md`
