import {execFileSync} from 'node:child_process'

const COMMANDS: Array<[string, string[]]> =
  process.platform === 'darwin'
    ? [['pbpaste', []]]
    : process.platform === 'win32'
      ? [['powershell', ['-NoProfile', '-Command', 'Get-Clipboard']]]
      : [
          ['wl-paste', ['--no-newline']],
          ['xclip', ['-selection', 'clipboard', '-o']],
          ['xsel', ['--clipboard', '--output']],
        ]

export function readClipboard(): string {
  for (const [command, args] of COMMANDS) {
    try {
      return execFileSync(command, args, {encoding: 'utf8', timeout: 500, stdio: ['ignore', 'pipe', 'ignore']})
    } catch {
      // tool missing or clipboard empty — try the next one
    }
  }
  return ''
}
