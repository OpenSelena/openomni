import React from 'react'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {render} from 'ink'
import {App, type Outcome} from './app.js'
import {captureFrames} from './lib/click-map.js'
import {parseArgs, resolveOutputDir} from './lib/args.js'
import {readClipboard} from './lib/clipboard.js'
import {isProbablyUrl} from './lib/platforms.js'
import {buildChoices, download, ensureYtDlp, findFfmpeg, probe, updateYtDlp, type DownloadChoice} from './lib/ytdlp.js'
import {
  buildQualityTierArgs,
  formatTrackFilename,
  getQualityTierExt,
  resolvePlaylistDir,
  type QualityTier,
} from './lib/playlist.js'

// read at runtime from the shipped package.json so npm version bumps
// can't drift from a hardcoded constant
const VERSION: string = createRequire(import.meta.url)('../package.json').version

const HELP = `
  Open Omni — grab any video. paste. download. done.

  Usage
    $ open-omni [url] [options]

  Examples
    $ open-omni https://youtu.be/dQw4w9WgXcQ
    $ open-omni https://youtu.be/dQw4w9WgXcQ --best
    $ open-omni https://youtu.be/dQw4w9WgXcQ --mp3 -o ~/Music
    $ open-omni -U              (updates bundled yt-dlp)
    $ open-omni                 (prompts for a url)

  Options
    --best          skip picker and download highest video resolution
    --mp3           skip picker and extract audio as mp3
    -o, --output    output directory (default: ~/Downloads, or $OPEN_OMNI_DIR)
    -U, --update    update bundled yt-dlp to latest version (--update-ytdlp)
    --force         force re-download clean yt-dlp binary (with -U)
    --theme <mode>  use auto, light, or dark for this run
    -h, --help      show this help
    -v, --version   show version

  Downloads are saved to ~/Downloads (or custom output directory).
  Powered by yt-dlp — YouTube, X, Instagram, Threads, TikTok & 1800+ sites.
`

const args = parseArgs(process.argv.slice(2))

if (args.error) {
  console.error(`open-omni: ${args.error}\nTry “open-omni --help” for usage.`)
  process.exit(1)
}

if (args.help) {
  console.log(HELP)
  process.exit(0)
}

if (args.version) {
  console.log(VERSION)
  process.exit(0)
}

if (args.updateYtDlp) {
  try {
    const result = await updateYtDlp({
      force: args.force,
      onStatus: status => console.error(`[open-omni] ${status}`),
    })
    if (result.updated) {
      if (result.previousVersion && result.previousVersion !== result.currentVersion) {
        console.log(`✓ yt-dlp updated: ${result.previousVersion} → ${result.currentVersion}`)
      } else {
        console.log(`✓ yt-dlp updated to version ${result.currentVersion}`)
      }
    } else {
      console.log(`✓ yt-dlp is already up to date (version ${result.currentVersion})`)
    }
    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`open-omni: update failed: ${msg}`)
    process.exit(1)
  }
}

const initialUrl = args.initialUrl
const initialThemeMode = args.themeMode ?? 'auto'
const outDir = resolveOutputDir(args.outputDir)
const isTTY = Boolean(process.stdout.isTTY)

if (!isTTY && args.format && initialUrl) {
  try {
    await fs.mkdir(outDir, {recursive: true})
    const ytdlp = await ensureYtDlp(status => console.error(`[open-omni] ${status}`))
    console.error(`[open-omni] fetching video info…`)
    const probeResult = await probe(ytdlp, initialUrl)

    if (probeResult.kind === 'playlist') {
      const playlist = probeResult.playlist
      const playlistDir = resolvePlaylistDir(outDir, playlist.title)
      await fs.mkdir(playlistDir, {recursive: true})
      console.error(`[open-omni] found playlist “${playlist.title}” (${playlist.validEntries.length} items)`)
      const ffmpegLocation = await findFfmpeg()
      const tier = args.format as QualityTier
      const choice: DownloadChoice = {
        label: args.format,
        kind: args.format === 'mp3' ? 'audio' : 'video',
        args: buildQualityTierArgs(tier),
      }
      let succeeded = 0
      let skipped = 0

      for (const entry of playlist.validEntries) {
        const ext = getQualityTierExt(tier)
        const filename = formatTrackFilename(entry.index, playlist.validEntries.length, entry.title, ext)
        const targetPath = path.join(playlistDir, filename)
        console.error(`[open-omni] [${entry.index}/${playlist.validEntries.length}] downloading “${entry.title}”…`)

        try {
          await download(
            {
              ytdlp,
              ffmpegLocation,
              url: entry.url,
              choice,
              outDir: playlistDir,
              outputTemplate: targetPath,
            },
            {
              onProgress: progress => {
                if (progress.totalBytes) {
                  const pct = Math.round((progress.downloadedBytes / progress.totalBytes) * 100)
                  process.stderr.write(`\r[open-omni] downloading: ${pct}%`)
                }
              },
              onProcessing: () => {
                process.stderr.write(`\r[open-omni] processing…\n`)
              },
            },
          )
          process.stderr.write('\n')
          succeeded++
        } catch (err) {
          process.stderr.write('\n')
          console.error(`[open-omni] ⚠ skipped “${entry.title}”: ${err instanceof Error ? err.message : String(err)}`)
          skipped++
        }
      }

      console.log(`✓ downloaded ${succeeded} items to ${playlistDir}${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
      process.exit(0)
    }

    const {info, infoJsonPath} = probeResult
    const choices = buildChoices(info)
    const choice =
      args.format === 'mp3'
        ? (choices.find(c => c.kind === 'audio') ?? choices[choices.length - 1]!)
        : (choices.find(c => c.kind === 'video') ?? choices[0]!)

    console.error(`[open-omni] downloading ${info.title ? `“${info.title}” ` : ''}(${choice.label})…`)
    const ffmpegLocation = await findFfmpeg()
    const filepath = await download(
      {
        ytdlp,
        ffmpegLocation,
        url: initialUrl,
        choice,
        outDir,
        infoJsonPath,
      },
      {
        onProgress: progress => {
          if (progress.totalBytes) {
            const pct = Math.round((progress.downloadedBytes / progress.totalBytes) * 100)
            process.stderr.write(`\r[open-omni] downloading: ${pct}%`)
          }
        },
        onProcessing: () => {
          process.stderr.write(`\r[open-omni] processing…\n`)
        },
      },
    )
    process.stderr.write('\n')
    console.log(`✓ downloaded → ${filepath}`)
    process.exit(0)
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

// no url given — offer the clipboard url (Tab to paste) when it already holds one
let clipboardUrl: string | undefined
if (!initialUrl && isTTY) {
  const clipped = readClipboard().trim()
  // reject multi-line clipboard content — new URL() silently strips newlines
  if (clipped && !/\s/.test(clipped) && isProbablyUrl(clipped)) clipboardUrl = clipped
}
const enterAltScreen = () => process.stdout.write('\x1b[?1049h\x1b[H')
// also switch mouse tracking off — a crash can skip React effect cleanup
const leaveAltScreen = () => process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?1049l')

if (isTTY) {
  enterAltScreen()
  process.on('exit', leaveAltScreen)
  // restore the terminal BEFORE a crash prints, or the stack trace is
  // wiped along with the alternate screen and the app looks like it
  // silently quit
  for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error: unknown) => {
      leaveAltScreen()
      console.error(error)
      process.exit(1)
    })
  }
}

let outcome: Outcome = {}
const {waitUntilExit} = render(
  <App
    initialUrl={initialUrl}
    clipboardUrl={clipboardUrl}
    initialThemeMode={initialThemeMode}
    autoSelect={args.format}
    outDir={outDir}
    version={VERSION}
    onOutcome={result => (outcome = result)}
  />,
  // keep a copy of every frame so clicks can be hit-tested against it
  {stdout: captureFrames(process.stdout)},
)

await waitUntilExit()

if (isTTY) leaveAltScreen()
if (outcome.filepath) {
  console.log(`✓ downloaded → ${outcome.filepath}`)
}
