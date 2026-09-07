/**
 * Click hit-testing against the rendered frame. Ink has no absolute-position
 * API, so instead of re-deriving each widget's cell rectangle from layout
 * math (fragile — it broke whenever the layout changed), we keep a copy of
 * the last frame ink wrote and find clickable text in it by content.
 */

// covers the CSI/OSC sequences ink emits (colors, cursor moves, erase lines)
const ANSI_PATTERN = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  ].join('|'),
  'g',
)
const stripAnsi = (text: string) => text.replace(ANSI_PATTERN, '')

// frame line i ↔ terminal row i+1: the app draws from the top of the
// alternate screen and rewrites the whole screen every frame
let frameLines: string[] = []

/**
 * Wrap the stdout handed to ink's render() so every frame it writes is
 * kept for hit-testing. Cursor-only updates carry no printable text and
 * are ignored, so the last real frame stays around.
 */
export function captureFrames<T extends NodeJS.WriteStream>(stream: T): T {
  return new Proxy(stream, {
    get(target, prop) {
      if (prop === 'write') {
        return (chunk: unknown, ...rest: unknown[]) => {
          const lines = String(chunk).split('\n').map(stripAnsi)
          if (lines.some(line => line.trim() !== '')) frameLines = lines
          return (target.write as (...args: unknown[]) => boolean)(chunk, ...rest)
        }
      }
      const value = Reflect.get(target, prop)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
}

export type ClickTarget = {
  /** exact text to find in the frame (colors are stripped before matching) */
  match: string
  action: () => void
  /** extra cells left/right of the match that still count as a hit */
  padX?: number
  /** extra rows above/below the match that still count as a hit (e.g. box borders) */
  padY?: number
}

/** First target whose text sits under the click. x/y are 1-based terminal cells. */
export function clickTargetAt(x: number, y: number, targets: ClickTarget[]): ClickTarget | undefined {
  for (const target of targets) {
    const {match, padX = 1, padY = 0} = target
    for (let row = y - 1 - padY; row <= y - 1 + padY; row++) {
      const line = frameLines[row]
      if (!line) continue
      let index = line.indexOf(match)
      while (index !== -1) {
        if (x - 1 >= index - padX && x - 1 <= index + match.length - 1 + padX) return target
        index = line.indexOf(match, index + 1)
      }
    }
  }
  return undefined
}

/** Frame line index of the first row containing `text`, or -1. */
export function findFrameRow(text: string): number {
  return frameLines.findIndex(line => line.includes(text))
}

/** 1-based [first, last] columns of the visible text on a frame row. */
export function frameRowSpan(row: number): [number, number] | undefined {
  const line = frameLines[row]
  if (!line) return undefined
  const first = line.search(/\S/)
  if (first === -1) return undefined
  return [first + 1, line.trimEnd().length]
}
