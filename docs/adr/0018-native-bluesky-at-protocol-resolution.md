# ADR 0018: Native Bluesky AT Protocol Resolver

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-10-23 |
| **Domain** | Media Engine & Protocol Extraction |

---

## Context & Problem

Previously, Bluesky post links (`https://bsky.app/profile/.../post/...`) were delegated exclusively to `gallery-dl` via subprocess invocation. 

Spawning an external Python subprocess for Bluesky media extraction incurs 1.5 to 4.0 seconds of latency, high CPU bootstrapping overhead, and requires local Python binary availability. Unlike closed platforms, Bluesky is federated and built on the open AT Protocol, which provides public AppView REST endpoints.

## Decision

1. **Native AT Protocol Resolver (`src/lib/bluesky.ts`)**:
   - Resolve Bluesky posts by querying the public, unauthenticated AppView REST API:
     `GET https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri={at_uri}&depth=0`
   - Zero login credentials or API keys required.
   - Extracts Content Identifiers (CIDs) and maps them directly to original uncompressed CDN assets (`https://cdn.bsky.app/img/feed_fullsize/plain/{did}/{cid}@{ext}`).
   - Extracts direct HLS playlist streams (`.m3u8`) for attached video records.

2. **Dispatcher Engine Integration (`src/lib/dispatcher.ts`)**:
   - `probeUnified` prioritizes native AT Protocol resolution for all `bsky.app` and `at://` URLs.
   - Falls back gracefully to `gallery-dl` if the public API is temporarily unreachable or blocked.
   - Adds `'bluesky'` to `UnifiedMediaItem.engine` and `PlaylistEntry.engine`.

3. **High-Speed Direct Streaming**:
   - Photos stream directly via native Node.js HTTP `Readable.fromWeb` pipeline, saving files in under 100ms.
   - Video streams mux cleanly via `ffmpeg` if present, or download directly via `ytdlp`.
