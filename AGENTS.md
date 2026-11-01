# Open Omni Agent Instructions

## Commands

- `npm test`: Run unit tests via `tsx --test src/**/*.test.ts`.
- `npm run typecheck`: Check TypeScript types (`tsc --noEmit`).
- `npm run build`: Bundle to `dist/` with `tsup`.
- `npm run dev`: Rebuild on change (`tsup --watch`).

### Non-symlink and exFAT environments
When working on exFAT mounts (e.g. `/run/media/igect/Onion` without POSIX symlink support):
- Install dependencies using `npm ci --no-bin-links` to avoid `EPERM: operation not permitted, symlink` errors.
- Run commands via direct entry points:
  - Test: `node node_modules/tsx/dist/cli.mjs --test src/**/*.test.ts`
  - Typecheck: `node node_modules/typescript/bin/tsc --noEmit`
  - Build: `node node_modules/tsup/dist/cli-default.js`

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

## Anti-hallucination & verification rules

1. **Evidence before assertions**: Never claim code works, tests pass, or build succeeds without running the verification command and checking the output in the current turn.
2. **Primary sources only**: Never guess file paths, symbols, types, CLI flags, or configuration options. Check codebase files, types, or documentation first.
3. **No unilateral assumptions**: If requirements or design choices are ambiguous, stop and clarify with the user. Record agreed terms in `CONTEXT.md` and key decisions in `docs/adr/`.
4. **Reproduce before fixing**: For bug fixes, produce a reproducing test or failing command before modifying code.
5. **Context hygiene**: Keep tasks focused and compact or clear context between discrete units of work.

