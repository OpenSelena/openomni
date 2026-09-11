# ADR 0014: Native Instagram Embed Resolution & Login Wall Bypass

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-11 |
| **Domain** | Network & Extraction Pipeline |

---

## Context & Problem

Instagram restricts unauthenticated access to standard post and reel URLs (`instagram.com/p/{id}/`, `instagram.com/reel/{id}/`), returning HTTP 302 redirects to `/accounts/login/`. Consequently, upstream CLI engines (`gallery-dl` and `yt-dlp`) without configured cookies abort extraction with `AbortExtraction: HTTP redirect to login page` or HTTP 403 Forbidden errors.

However, Instagram exposes an unauthenticated public embed endpoint (`/p/{id}/embed/captioned/`) designed for third-party websites and iframe embedding. This endpoint does not require user login and embeds the full post payload—including direct CDN URLs for photos, videos, and multi-asset carousels—directly into the initial HTML response.

## Decision

Open Omni implements a native **Instagram Embed Resolver** (`src/lib/instagram.ts`) as a pre-resolution interceptor in the **Engine Dispatcher** (`src/lib/dispatcher.ts`):

1. **Dispatcher Interception**: When `probeUnified()` detects an Instagram URL (`/p/`, `/reel/`, `/reels/`, `/tv/`, `/share/`), it routes to the native embed resolver prior to spawning `gallery-dl` or `yt-dlp`.
2. **Iframe Scraping**: Queries `https://www.instagram.com/p/{postId}/embed/captioned/` using Node's native `fetch` with browser-like iframe navigation headers (`Sec-Fetch-Dest: iframe`, `Referer: https://www.instagram.com/`).
3. **Payload Extraction**: Parses embedded JSON payloads (`init` contextJSON or `__additionalDataLoaded('extra', ...)`) to extract media objects:
   - Single videos and reels (`video_url`)
   - Single photos (`display_url`)
   - Multi-asset carousels (`edge_sidecar_to_children`)
4. **Direct CDN Streaming**: `downloadUnifiedItem()` streams media bytes directly from the Instagram/Meta CDN (`scontent.cdninstagram.com`) to disk via native HTTP streams, bypassing CLI engine subprocesses entirely.
5. **Graceful Fallback**: If the embed endpoint fails (e.g. private posts, stories, or platform rate limiting), the dispatcher transparently falls back to `gallery-dl` and `yt-dlp`.

## Consequences & Trade-offs

- **Instantaneous Resolution**: Eliminates the 2–4 second subprocess startup and teardown latency of running `gallery-dl` or `yt-dlp` for public Instagram posts.
- **Zero-Dependency Footprint**: Implemented entirely via Node.js standard runtime primitives (`fetch`, `stream.Readable.fromWeb()`, `fs/promises`).
- **Reliability for Public Media**: Allows public Instagram posts and reels to download out of the box without requiring manual cookie export or browser profile harvesting.
- **Private Post Boundary**: Stories and private/follower-only posts remain inaccessible via embeds and continue to rely on cookie jar delegation (ADR 0011).
