# ADR 0003: POSIX Shell Installer Architecture

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-06 |
| **Domain** | Environment & Distribution |

---

## Context & Decision

To install across macOS, Linux, and WSL environments without requiring root privileges or custom npm global prefix configuration, Open Omni provides a POSIX shell installer (`install.sh`).

## Considered Options & Trade-offs

1. **Isolated Prefix (~/.open-omni) vs Global npm**: Running `npm install -g` often requires `sudo` or custom npm prefixes on default Linux distributions. Installing into an isolated `~/.open-omni` prefix ensures zero root/sudo requirements, keeps all Open Omni runtime files and bundled binaries (`yt-dlp`) unified in `~/.open-omni/bin`, and allows clean removal via `rm -rf ~/.open-omni`.
2. **Runtime Verification**: Open Omni requires Node.js >= 18. Rather than attempting invasive background system installations via package managers, `install.sh` detects the installed Node version and provides clear, copy-pasteable install instructions for the user's detected operating system if Node is missing or outdated.
3. **Shell PATH Integration**: The installer inspects `$SHELL` to locate the user's rc file (`.zshrc`, `.bashrc`, or `config.fish`), checks for existing entries to prevent duplicate paths, and cleanly appends `~/.open-omni/bin` to `PATH`.
4. **Terminal Output**: Renders installation steps and status using the Open Omni terminal style without external dependencies.
