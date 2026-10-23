import {execFile, execFileSync} from 'node:child_process'
import {promisify} from 'node:util'

const pExecFile = promisify(execFile)

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

export function readClipboard(execFn: typeof execFileSync = execFileSync): string {
  for (const [command, args] of COMMANDS) {
    try {
      return execFn(command, args, {encoding: 'utf8', timeout: 500, stdio: ['ignore', 'pipe', 'ignore']})
    } catch {
      // tool missing or clipboard empty — try the next one
    }
  }
  return ''
}

export type AsyncExecFileLike = (
  cmd: string,
  args: string[],
  options: {encoding: string; timeout: number; windowsHide?: boolean},
) => Promise<{stdout: string | Buffer}>

export async function readClipboardAsync(
  execAsyncFn: AsyncExecFileLike = pExecFile as unknown as AsyncExecFileLike,
): Promise<string> {
  for (const [command, args] of COMMANDS) {
    try {
      const res = await execAsyncFn(command, args, {
        encoding: 'utf8',
        timeout: 1500,
        windowsHide: true,
      })
      const text = typeof res.stdout === 'string' ? res.stdout : res.stdout?.toString('utf8') ?? ''
      if (text) return text
    } catch {
      // tool missing or clipboard empty — try the next one
    }
  }
  return ''
}
