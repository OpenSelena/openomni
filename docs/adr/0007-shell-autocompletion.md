# ADR 0007: Shell Autocompletion

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-07 |
| **Domain** | CLI & Interactive Shell |

---

## Context

`open-omni` provides command-line flags for quality selection, output directory, themes, subtitles, thumbnails, and updates. Manually typing these options or argument values introduces typographical errors. Native shell completion provides command discovery and parameter completion.

## Decision

1. **Invocation Interface**:
   - Provide command-line flag: `--completion <shell>` (or `--completion=<shell>`).
   - Supported shells: `bash`, `zsh`, `fish`, `powershell` (with alias `pwsh`).
   - If an invalid shell is supplied or the option value is missing, return a clean error describing the supported shells and exit with code 1.

2. **Headless Execution**:
   - Generating shell completions must NOT initialize the Ink React TUI, render terminal logos, or check `yt-dlp` updates.
   - The output must be written directly to `stdout` with clean exit code 0 so users can directly pipe or evaluate the output:
     - Bash: `eval "$(open-omni --completion bash)"`
     - Zsh: `eval "$(open-omni --completion zsh)"`
     - Fish: `open-omni --completion fish | source`
     - PowerShell: `open-omni --completion powershell | Out-String | Invoke-Expression`

3. **Context-Aware Completions**:
   - Complete long and short flags:
     - Options: `--help`, `-h`, `--version`, `-v`, `--best`, `--mp3`, `--output`, `-o`, `--theme`, `--update`, `--update-ytdlp`, `-U`, `--force`, `--subs`, `--embed-subs`, `--thumb`, `--embed-thumb`, `--completion`.
   - Complete specific values for arguments:
     - `--theme`: `auto`, `light`, `dark`
     - `--completion`: `bash`, `zsh`, `fish`, `powershell`
     - `-o` / `--output`: Directory path completion.

4. **Zero Runtime Dependencies**:
   - Generate pure shell scripts without external CLI completion dependencies or runtime IPC.

## Consequences & Trade-offs

- Users across Linux, macOS, and Windows PowerShell get immediate tab-completion for all CLI arguments and accepted values.
- Setup is simple, transparent, and can be integrated into shell profile configurations or the Open Omni installer script.
