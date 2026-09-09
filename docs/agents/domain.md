Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-batch-download-architecture.md
│   ├── 0002-ytdlp-self-update.md
│   ├── 0003-posix-installer.md
│   ├── 0004-subtitles-download.md
│   ├── 0005-thumbnail-archival.md
│   ├── 0006-user-configuration.md
│   ├── 0007-shell-autocompletion.md
│   ├── 0008-photo-and-mixed-post-downloading.md
│   ├── 0009-platform-known-folders.md
│   ├── 0010-dual-engine-self-update.md
│   └── 0011-session-cookie-authentication.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

ADRs are immutable historical records. Don't edit an existing ADR to match new thinking: if a decision is superseded, record a *new* ADR that explicitly supersedes the old one, and mark the old one superseded.

When an issue asks for something that directly contradicts an existing ADR without mentioning it, raise that before writing code: the author may have forgotten the trade-off that led there.
