# ADR 0006: User Configuration and Precedence Waterfall

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-07 |
| **Domain** | Runtime Configuration |

---

## Context

Users frequently have personal preferences for their media downloads — such as a preferred download folder (e.g. `~/Videos` or an external volume), a preferred default theme (e.g. `dark`), preferred subtitle languages, or default thumbnail archival. Requiring users to specify CLI flags or environment variables on every invocation creates repetitive overhead. A persistent configuration file provides a natural home for personal defaults.

## Decision

1. **Configuration File Location**:
   - Resolve config location following standard XDG specifications:
     - `$XDG_CONFIG_HOME/open-omni/config.json` if `$XDG_CONFIG_HOME` is set.
     - `~/.config/open-omni/config.json` as standard cross-platform default.
     - On Windows, also check `%APPDATA%/open-omni/config.json` if `~/.config/open-omni/config.json` does not exist.
2. **Configuration Schema**:
   - Support the following optional settings:
     ```json
     {
       "outputDir": "~/Videos",
       "theme": "dark",
       "format": "best",
       "subtitles": {
         "enabled": true,
         "languages": "en,ja",
         "embed": false
       },
       "thumbnail": {
         "enabled": true,
         "embed": true
       }
     }
     ```
   - Support shorthand boolean values for `subtitles` and `thumbnail` (e.g. `"subtitles": true`).
3. **Precedence Waterfall**:
   - Operational parameters resolve according to strict precedence:
     1. Explicit CLI arguments (`-o`, `--theme`, `--best`/`--mp3`, `--subs`, `--thumb`)
     2. Environment variables (`OPEN_OMNI_DIR`)
     3. User configuration file (`config.json`)
     4. Platform Known Folder (Windows Registry / Linux XDG user-dirs)
     5. Built-in defaults (`~/Downloads`, `auto` theme, subtitles off, thumbnail off)
4. **Resilience**:
   - If `config.json` cannot be read or parsed due to invalid JSON syntax, output a non-blocking warning to `stderr` and proceed with default configuration.

## Consequences & Trade-offs

- Users can customize persistent settings once without modifying shell profiles.
- One-off CLI arguments always override persistent config options.
- The CLI remains resilient against corrupt or malformed configuration files.
