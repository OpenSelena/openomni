# Open Omni Agent Instructions

## Commands

- `npm test`: Run unit tests via `tsx --test src/**/*.test.ts`.
- `npm run typecheck`: Check TypeScript types (`tsc --noEmit`).
- `npm run build`: Bundle to `dist/` with `tsup`.
- `npm run dev`: Rebuild on change (`tsup --watch`).

## Architecture

Terminal-first video, audio, and photo downloader powered by `yt-dlp`, `gallery-dl`, and Ink.
Refer to `CONTEXT.md` for domain terminology and `docs/adr/` for architecture decisions.

## Agent skills

### Issue tracker

Track issues on GitHub via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository. See `docs/agents/domain.md`.
