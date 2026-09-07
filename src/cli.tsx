import React from 'react'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {render} from 'ink'
import {App, type Outcome} from './app.js'
import {captureFrames} from './lib/click-map.js'
import {parseArgs, resolveOutputDir, toSubtitleOptions, toThumbnailOptions} from './lib/args.js'
import {readClipboard} from './lib/clipboard.js'
import {isProbablyUrl} from './lib/platforms.js'
import {buildChoices, download, ensureYtDlp, findFfmpeg, probe, updateYtDlp, type DownloadChoice} from './lib/ytdlp.js'
import {
  buildQualityTierArgs,
  formatTrackFilename,
  getQualityTierExt,
  resolvePlaylistDir,
  sanitizeFilename,
  type QualityTier,
} from './lib/playlist.js'
import {
  loadConfig,
  resolveRuntimeConfig,
} from './lib/config.js'
import {generateCompletion} from './lib/completion.js'
import {probeUnified, downloadUnifiedItem} from './lib/dispatcher.js'

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
    --subs [langs]  download subtitles (default: English, or e.g. --subs es,en)
    --embed-subs    embed subtitles into video container file
    --thumb         download thumbnail image
    --embed-thumb   embed thumbnail into audio/video container file
    --photos-only   download only photos from post or carousel
    --videos-only   download only videos from post or carousel
    -o, --output    output directory (default: ~/Downloads, or $OPEN_OMNI_DIR)
    -U, --update    update bundled yt-dlp to latest version (--update-ytdlp)
    --force         force re-download clean yt-dlp binary (with -U)
    --completion <sh> generate shell autocompletion (bash, zsh, fish, powershell)
    --theme <mode>  use auto, light, or dark for this run
    -h, --help      show this help
    -v, --version   show version

  Downloads are saved to ~/Downloads (or custom output directory).
  Powered by yt-dlp & gallery-dl — YouTube, X, Instagram, Threads, TikTok & 1800+ sites.
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

if (args.completion) {
  try {
    const script = generateCompletion(args.completion)
    process.stdout.write(script + '\n')
    process.exit(0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`open-omni: ${msg}`)
    process.exit(1)
  }
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

const userConfig = loadConfig(undefined, msg => console.error(msg))
const runtimeConfig = resolveRuntimeConfig(args, userConfig)
const initialUrl = args.initialUrl
const effectiveFormat = runtimeConfig.format
const initialThemeMode = runtimeConfig.themeMode
const outDir = runtimeConfig.outDir
const subtitles = runtimeConfig.subtitles
const thumbnail = runtimeConfig.thumbnail
const mediaFilter = args.photosOnly ? 'photos' : args.videosOnly ? 'videos' : 'all'
const isTTY = Boolean(process.stdout.isTTY)

if (!isTTY && (effectiveFormat || args.photosOnly || args.videosOnly) && initialUrl) {
  try {
    await fs.mkdir(outDir, {recursive: true})
    const ytdlp = await ensureYtDlp(status => console.error(`[open-omni] ${status}`))
    console.error(`[open-omni] fetching media info…`)
    const probeResult = await probeUnified({
      url: initialUrl,
      ytdlp,
      mediaFilter,
      onStatus: status => console.error(`[open-omni] ${status}`),
    })

    if (probeResult.kind === 'single_photo') {
      const item = probeResult.item
      const filename = `${sanitizeFilename(probeResult.postTitle)}.${item.ext || 'jpg'}`
      console.error(`[open-omni] downloading photo “${probeResult.postTitle}”…`)
      const filepath = await downloadUnifiedItem({
        item: {
          id: item.id,
          title: probeResult.postTitle,
          url: item.url,
          index: 1,
          kind: 'photo',
          ext: item.ext,
        },
        destDir: outDir,
        filename,
        ytdlp,
        choice: {
          label: 'original photo',
          kind: 'photo',
          args: [],
        },
      })
      console.log(`✓ downloaded → ${filepath}`)
      process.exit(0)
    }

    if (probeResult.kind === 'playlist' || probeResult.kind === 'mixed_post') {
      const playlist = probeResult.playlist
      const playlistDir = resolvePlaylistDir(outDir, playlist.title)
      await fs.mkdir(playlistDir, {recursive: true})
      console.error(
        `[open-omni] found ${probeResult.kind === 'mixed_post' ? 'post' : 'playlist'} “${playlist.title}” (${playlist.validEntries.length} items)`,
      )
      const ffmpegLocation = await findFfmpeg()
      const tier = (effectiveFormat ?? 'best') as QualityTier
      const choice: DownloadChoice = {
        label: tier,
        kind: tier === 'mp3' ? 'audio' : 'video',
        args: buildQualityTierArgs(tier),
      }
      let succeeded = 0
      let skipped = 0

      for (const entry of playlist.validEntries) {
        console.error(`[open-omni] [${entry.index}/${playlist.validEntries.length}] downloading “${entry.title}”…`)

        try {
          await downloadUnifiedItem({
            item: entry,
            destDir: playlistDir,
            totalCount: playlist.validEntries.length,
            ytdlp,
            ffmpegLocation,
            choice,
            subtitles,
            thumbnail,
            onProgress: progress => {
              if (progress.totalBytes) {
                const pct = Math.round((progress.downloadedBytes / progress.totalBytes) * 100)
                process.stderr.write(`\r[open-omni] downloading: ${pct}%`)
              }
            },
            onProcessing: () => {
              process.stderr.write(`\r[open-omni] processing…\n`)
            },
          })
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
      effectiveFormat === 'mp3'
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
        subtitles,
        thumbnail,
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
    autoSelect={runtimeConfig.autoSelect}
    outDir={outDir}
    version={VERSION}
    initialSubtitles={subtitles}
    initialThumbnail={thumbnail}
    mediaFilter={mediaFilter}
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
