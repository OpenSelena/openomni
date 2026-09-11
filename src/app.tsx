import React, {useCallback, useEffect, useRef, useState} from 'react'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {Box, Text, useApp, useInput, useStdout} from 'ink'
import SelectInput, {type IndicatorProps, type ItemProps} from 'ink-select-input'
import Spinner from 'ink-spinner'
import {FramedInput} from './components/framed-input.js'
import {FullScreen} from './components/fullscreen.js'
import {Logo} from './components/logo.js'
import {Panel} from './components/panel.js'
import {ProgressBar} from './components/progress-bar.js'
import {Shortcuts} from './components/shortcuts.js'
import {TextInput} from './components/text-input.js'
import {PlaylistScopePicker, type PlaylistScopeChoice} from './components/playlist-scope-picker.js'
import {PlaylistItemPicker} from './components/playlist-item-picker.js'
import {PlaylistQualityPicker} from './components/playlist-quality-picker.js'
import {PlaylistProgress} from './components/playlist-progress.js'
import {clickTargetAt, findFrameRow, frameRowSpan, type ClickTarget} from './lib/click-map.js'
import {formatBytes, formatDuration, formatEta, formatSpeed, shortenPath, terminalLink, truncate, wrapText} from './lib/format.js'
import {addToHistory, loadHistory} from './lib/history.js'
import {detectPlatform, isProbablyUrl, openBrowser, type Platform} from './lib/platforms.js'
import {useMouseClick} from './lib/use-mouse-click.js'
import {BRAND_COLOR, nextThemeMode, ThemeProvider, type ThemeMode, useTheme} from './theme.js'
import {
  buildChoices,
  buildSubtitleArgs,
  download,
  ensureYtDlp,
  findFfmpeg,
  isExtractorError,
  probe,
  type DownloadChoice,
  type DownloadProgress,
  type SubtitleOptions,
  type ThumbnailOptions,
  type VideoInfo,
} from './lib/ytdlp.js'
import {
  buildQualityTierArgs,
  formatTrackFilename,
  getQualityTierExt,
  resolvePlaylistDir,
  sanitizeFilename,
  type PlaylistEntry,
  type PlaylistMetadata,
  type QualityTier,
} from './lib/playlist.js'
import {downloadUnifiedItem, probeUnified} from './lib/dispatcher.js'
import {getCompletedDownload, recordDownloadWithStat} from './lib/ledger.js'
import {normalizeToYtdlpSection} from './lib/time.js'

const OUT_DIR = path.join(os.homedir(), 'Downloads')
const DOWNLOAD_BUTTON = 'download'
const DONE_LABEL = '↵ download another'
const TAGLINE = 'grab any video. paste. download. done.'

const choiceLabel = (choice: DownloadChoice) => {
  if (choice.kind === 'audio') return `♪ ${choice.label}`
  if (choice.kind === 'photo') return `📷 ${choice.label}`
  return `▶ ${choice.label}`
}

function ChoiceIndicator({isSelected}: IndicatorProps) {
  const theme = useTheme()
  return (
    <Box marginRight={1}>
      <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
    </Box>
  )
}

function ChoiceItem({isSelected, label}: ItemProps) {
  const theme = useTheme()
  return (
    <Text color={theme.primary} bold={isSelected}>
      {label}
    </Text>
  )
}

const Gap = ({lines = 1}: {lines?: number}) => (
  <Box flexDirection="column" flexShrink={0}>
    {Array.from({length: lines}, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

function partLabel(progress: DownloadProgress): string {
  return progress.totalParts > 1 ? `part ${progress.part + 1}/${progress.totalParts}  ` : ''
}

function downloadMeta(progress: DownloadProgress): string {
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  const eta = progress.eta ? `${formatEta(progress.eta)} left` : ''
  return `${partLabel(progress)}${speed.padStart(10)}  ${eta.padEnd(12)}`
}

function indeterminateMeta(progress: DownloadProgress): string {
  const bytes = formatBytes(progress.downloadedBytes)
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  return `${partLabel(progress)}${bytes.padStart(8)}  ${speed.padEnd(10)}`
}

export type Outcome = {filepath?: string}

type Phase =
  | {name: 'input'; warning?: string}
  | {name: 'probing'; status: string}
  | {name: 'picking'}
  | {
      name: 'downloading'
      choice: DownloadChoice
      title?: string
      progress?: DownloadProgress
      processing: boolean
      refreshing?: boolean
    }
  | {
      name: 'playlist-scope'
      playlist: PlaylistMetadata
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-items'
      playlist: PlaylistMetadata
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-quality'
      playlist: PlaylistMetadata
      selectedEntries: PlaylistEntry[]
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-downloading'
      playlist: PlaylistMetadata
      queue: PlaylistEntry[]
      tier: QualityTier
      currentIndex: number
      skippedCount: number
      lastWarning?: string
      progress?: DownloadProgress
      processing: boolean
    }
  | {
      name: 'playlist-done'
      playlistTitle: string
      downloadCount: number
      skippedCount: number
      targetDir: string
      hasPhotos?: boolean
    }
  | {
      name: 'confirm-overwrite'
      existingPath: string
      choice: DownloadChoice
    }
  | {name: 'done'; filepath: string}
  | {name: 'error'; message: string}

const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  input: [
    ['↵', 'download'],
    ['^c', 'quit'],
  ],
  probing: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  picking: [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  'confirm-overwrite': [
    ['y', 'redownload'],
    ['n', 'cancel'],
    ['^c', 'quit'],
  ],
  downloading: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  'playlist-scope': [
    ['↑↓', 'choose'],
    ['↵', 'select'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  'playlist-items': [
    ['↑↓', 'move'],
    ['space', 'toggle'],
    ['a', 'all'],
    ['↵', 'confirm'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  'playlist-quality': [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  'playlist-downloading': [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  'playlist-done': [['^c', 'quit']],
  done: [['^c', 'quit']],
  error: [
    ['↵', 'try again'],
    ['^c', 'quit'],
  ],
}

function isPickerPhase(phaseName: Phase['name']): boolean {
  return phaseName === 'picking' || phaseName === 'playlist-quality'
}

type AppProps = {
  initialUrl?: string
  clipboardUrl?: string
  initialThemeMode?: ThemeMode
  autoSelect?: 'best' | 'mp3'
  outDir?: string
  version?: string
  initialSubtitles?: SubtitleOptions
  initialThumbnail?: ThumbnailOptions
  mediaFilter?: 'all' | 'photos' | 'videos'
  cookieFile?: string
  cookieHeader?: string
  skipExisting?: boolean
  force?: boolean
  time?: string
  onOutcome: (outcome: Outcome) => void
}

export function App({initialThemeMode = 'auto', ...props}: AppProps) {
  const [themeMode, setThemeMode] = useState(initialThemeMode)
  const cycleTheme = useCallback(() => {
    setThemeMode(nextThemeMode)
  }, [])

  return (
    <ThemeProvider mode={themeMode}>
      <InnerApp {...props} cycleTheme={cycleTheme} />
    </ThemeProvider>
  )
}

function InnerApp({
  initialUrl,
  clipboardUrl,
  autoSelect,
  outDir,
  version = '1.1.0',
  initialSubtitles,
  initialThumbnail,
  mediaFilter = 'all',
  cookieFile,
  cookieHeader,
  skipExisting,
  force,
  time,
  onOutcome,
  cycleTheme,
}: {
  initialUrl?: string
  clipboardUrl?: string
  autoSelect?: 'best' | 'mp3'
  outDir?: string
  version?: string
  initialSubtitles?: SubtitleOptions
  initialThumbnail?: ThumbnailOptions
  mediaFilter?: 'all' | 'photos' | 'videos'
  cookieFile?: string
  cookieHeader?: string
  skipExisting?: boolean
  force?: boolean
  time?: string
  onOutcome: (outcome: Outcome) => void
  cycleTheme: () => void
}) {
  const theme = useTheme()
  const {exit} = useApp()
  const {stdout} = useStdout()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [platform, setPlatform] = useState<Platform>()
  const [info, setInfo] = useState<VideoInfo>()
  const [choices, setChoices] = useState<DownloadChoice[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleOptions | undefined>(initialSubtitles)
  const [thumbnail, setThumbnail] = useState<ThumbnailOptions | undefined>(initialThumbnail)
  const ytdlpRef = useRef('')
  const gallerydlRef = useRef('')
  const highlightRef = useRef(0)
  const infoJsonRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const [phase, setPhase] = useState<Phase>(initialUrl ? {name: 'probing', status: 'warming up…'} : {name: 'input'})

  const toggleSubtitles = useCallback(() => {
    setSubtitles(prev => ({
      enabled: !prev?.enabled,
      languages: prev?.languages,
      embed: prev?.embed,
    }))
  }, [])

  const toggleThumbnail = useCallback(() => {
    setThumbnail(prev => ({
      enabled: !prev?.enabled,
      write: true,
      embed: prev?.embed,
    }))
  }, [])

  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80
  const boxWidth = Math.max(14, Math.min(64, columns - 6))
  const contentWidth = Math.max(10, Math.min(columns - 4, 78))

  const executeDownload = useCallback(
    (choice: DownloadChoice, targetUrl: string, cachedInfoJsonPath?: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setPhase({name: 'downloading', choice, processing: false})
      void (async () => {
        const handlers = {
          onProgress: (progress: DownloadProgress) =>
            setPhase(prev => (prev.name === 'downloading' ? {...prev, progress, processing: false} : prev)),
          onProcessing: () =>
            setPhase(prev => (prev.name === 'downloading' ? {...prev, processing: true} : prev)),
        }
        try {
          if (skipExisting && !force) {
            const existing = getCompletedDownload({url: targetUrl, mediaId: info?.id})
            if (existing) {
              onOutcome({filepath: existing.outputPath})
              setPhase({name: 'done', filepath: existing.outputPath})
              if (autoSelect) {
                exit()
              }
              return
            }
          }

          const targetDir = outDir ?? OUT_DIR
          await fs.mkdir(targetDir, {recursive: true})
          const ffmpegLocation = await findFfmpeg()
          const section = time ? normalizeToYtdlpSection(time) ?? undefined : undefined
          const base = {
            ytdlp: ytdlpRef.current,
            ffmpegLocation,
            url: targetUrl,
            choice,
            outDir: targetDir,
            subtitles,
            thumbnail,
            cookieFile,
            section,
          }
          let filepath: string
          try {
            filepath = await download(
              {...base, infoJsonPath: cachedInfoJsonPath ?? infoJsonRef.current},
              handlers,
              controller.signal,
            )
          } catch (error) {
            if (controller.signal.aborted) throw error
            setPhase(prev =>
              prev.name === 'downloading' ? {...prev, progress: undefined, refreshing: true} : prev,
            )
            filepath = await download(base, handlers, controller.signal)
          }

          const platform = detectPlatform(targetUrl).key || info?.extractor || 'yt-dlp'
          await recordDownloadWithStat({
            mediaId: info?.id || path.basename(filepath),
            platform,
            url: targetUrl,
            title: info?.title || path.basename(filepath),
            outputPath: filepath,
            format: choice.label,
          })

          onOutcome({filepath})
          setHistory(addToHistory(targetUrl))
          setPhase({name: 'done', filepath})
          if (autoSelect) {
            exit()
          }
        } catch (error) {
          if (controller.signal.aborted) return
          setPhase({name: 'error', message: error instanceof Error ? error.message : String(error)})
          if (autoSelect) {
            exit(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })()
    },
    [outDir, onOutcome, autoSelect, exit, subtitles, thumbnail, cookieFile, skipExisting, force, time, info],
  )

  const executeBatchDownload = useCallback(
    (playlist: PlaylistMetadata, queue: PlaylistEntry[], tier: QualityTier) => {
      const controller = new AbortController()
      abortRef.current = controller
      setPhase({
        name: 'playlist-downloading',
        playlist,
        queue,
        tier,
        currentIndex: 0,
        skippedCount: 0,
        processing: false,
      })

      void (async () => {
        try {
          const baseDir = outDir ?? OUT_DIR
          const playlistDir = resolvePlaylistDir(baseDir, playlist.title)
          await fs.mkdir(playlistDir, {recursive: true})
          const ffmpegLocation = await findFfmpeg()
          const choice: DownloadChoice = {
            label: tier,
            kind: tier === 'mp3' ? 'audio' : 'video',
            args: buildQualityTierArgs(tier),
          }
          const ext = getQualityTierExt(tier)

          let succeeded = 0
          let skipped = 0

          for (let i = 0; i < queue.length; i++) {
            if (controller.signal.aborted) break
            const entry = queue[i]!

            setPhase(prev =>
              prev.name === 'playlist-downloading'
                ? {...prev, currentIndex: i, skippedCount: skipped, progress: undefined, processing: false}
                : prev,
            )

            let itemSkipped = false
            try {
              await downloadUnifiedItem({
                item: entry,
                destDir: playlistDir,
                totalCount: queue.length,
                ytdlp: ytdlpRef.current,
                gallerydl: gallerydlRef.current,
                ffmpegLocation,
                choice,
                subtitles: subtitles?.enabled ? subtitles : undefined,
                thumbnail: thumbnail?.enabled ? thumbnail : undefined,
                signal: controller.signal,
                cookieFile,
                cookieHeader,
                skipExisting,
                force,
                time,
                onSkip: () => {
                  itemSkipped = true
                },
                onProgress: progress =>
                  setPhase(prev =>
                    prev.name === 'playlist-downloading'
                      ? {
                          ...prev,
                          progress,
                          processing: false,
                        }
                      : prev,
                  ),
                onProcessing: () =>
                  setPhase(prev =>
                    prev.name === 'playlist-downloading' ? {...prev, processing: true} : prev,
                  ),
              })
              if (itemSkipped) {
                skipped++
              } else {
                succeeded++
              }
            } catch (err) {
              if (controller.signal.aborted) throw err
              skipped++
              const errMsg = err instanceof Error ? err.message : String(err)
              setPhase(prev =>
                prev.name === 'playlist-downloading'
                  ? {...prev, skippedCount: skipped, lastWarning: `${entry.title}: ${errMsg}`}
                  : prev,
              )
            }
          }

          onOutcome({filepath: playlistDir})
          setPhase({
            name: 'playlist-done',
            playlistTitle: playlist.title,
            downloadCount: succeeded,
            skippedCount: skipped,
            targetDir: playlistDir,
            hasPhotos: queue.some(e => e.kind === 'photo'),
          })
          if (autoSelect) {
            exit()
          }
        } catch (error) {
          if (controller.signal.aborted) return
          setPhase({name: 'error', message: error instanceof Error ? error.message : String(error)})
          if (autoSelect) {
            exit(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })()
    },
    [outDir, onOutcome, autoSelect, exit, subtitles, thumbnail],
  )

  const startProbe = useCallback(
    async (targetUrl: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setPlatform(detectPlatform(targetUrl))
      setPhase({name: 'probing', status: 'warming up…'})
      try {
        const ytdlp =
          ytdlpRef.current ||
          (await ensureYtDlp(status => setPhase({name: 'probing', status}), controller.signal))
        ytdlpRef.current = ytdlp
        if (controller.signal.aborted) return

        const gallerydl = gallerydlRef.current || undefined

        setPhase({name: 'probing', status: 'fetching media info…'})
        const probeResult = await probeUnified({
          url: targetUrl,
          ytdlp,
          gallerydl,
          mediaFilter,
          cookieFile,
          cookieHeader,
          signal: controller.signal,
          onStatus: status => setPhase({name: 'probing', status}),
        })
        if (controller.signal.aborted) return

        if (probeResult.kind === 'single_photo') {
          const item = probeResult.item
          const postTitle = probeResult.postTitle
          const baseDir = outDir ?? OUT_DIR
          await fs.mkdir(baseDir, {recursive: true})
          const ext = item.ext || 'jpg'
          const filename = `${sanitizeFilename(postTitle)}.${ext}`
          setPhase({
            name: 'downloading',
            choice: {
              label: 'original photo',
              kind: 'photo',
              args: [],
            },
            title: postTitle,
            processing: false,
          })
          try {
            const filepath = await downloadUnifiedItem({
              item: {
                id: item.id,
                title: postTitle,
                url: item.url,
                index: 1,
                kind: 'photo',
                ext,
              },
              destDir: baseDir,
              filename,
              ytdlp,
              gallerydl: gallerydlRef.current,
              cookieFile,
              cookieHeader,
              choice: {
                label: 'original photo',
                kind: 'photo',
                args: [],
              },
              signal: controller.signal,
              skipExisting,
              force,
              time,
              onProgress: progress => {
                setPhase(prev =>
                  prev.name === 'downloading'
                    ? {
                        ...prev,
                        progress,
                        processing: false,
                      }
                    : prev,
                )
              },
            })
            onOutcome({filepath})
            setPhase({name: 'done', filepath})
            if (autoSelect) {
              exit()
            }
          } catch (err) {
            if (controller.signal.aborted) return
            setPhase({name: 'error', message: err instanceof Error ? err.message : String(err)})
            if (autoSelect) {
              exit(err instanceof Error ? err : new Error(String(err)))
            }
          }
          return
        }

        if (probeResult.kind === 'mixed_post') {
          if (autoSelect) {
            executeBatchDownload(probeResult.playlist, probeResult.playlist.validEntries, 'best')
          } else {
            setPhase({
              name: 'playlist-items',
              playlist: probeResult.playlist,
            })
          }
          return
        }

        if (probeResult.kind === 'playlist') {
          if (autoSelect) {
            executeBatchDownload(probeResult.playlist, probeResult.playlist.validEntries, autoSelect)
          } else {
            setPhase({
              name: 'playlist-scope',
              playlist: probeResult.playlist,
              singleVideoUrl: probeResult.singleVideoUrl,
            })
          }
          return
        }

        const videoInfo = probeResult.info
        infoJsonRef.current = probeResult.infoJsonPath
        setInfo(videoInfo)
        const availableChoices = buildChoices(videoInfo)
        setChoices(availableChoices)
        highlightRef.current = 0
        if (autoSelect) {
          const picked =
            autoSelect === 'mp3'
              ? (availableChoices.find(c => c.kind === 'audio') ?? availableChoices[availableChoices.length - 1]!)
              : (availableChoices.find(c => c.kind === 'video') ?? availableChoices[0]!)
          executeDownload(picked, targetUrl, probeResult.infoJsonPath)
        } else {
          setPhase({name: 'picking'})
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setPhase({name: 'error', message: error instanceof Error ? error.message : String(error)})
        if (autoSelect) {
          exit(error instanceof Error ? error : new Error(String(error)))
        }
      }
    },
    [autoSelect, executeDownload, executeBatchDownload, exit, mediaFilter, onOutcome, outDir, cookieFile, cookieHeader, skipExisting, force, time],
  )

  useEffect(() => {
    if (initialUrl) void startProbe(initialUrl)
  }, [initialUrl, startProbe])

  const resetToInput = useCallback(() => {
    setUrl('')
    setUrlInput('')
    setPlatform(undefined)
    setInfo(undefined)
    setChoices([])
    setPhase({name: 'input'})
  }, [])

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    resetToInput()
    setUrlInput(url)
  }, [resetToInput, url])

  useInput(
    (input, key) => {
      if (key.ctrl && input === 't') {
        cycleTheme()
        return
      }
      if ((input === 's' || input === 'S') && !key.ctrl && isPickerPhase(phase.name)) {
        toggleSubtitles()
        return
      }
      if ((input === 't' || input === 'T') && !key.ctrl && isPickerPhase(phase.name)) {
        toggleThumbnail()
        return
      }
      if (phase.name === 'confirm-overwrite') {
        if (input === 'y' || input === 'Y' || key.return) {
          executeDownload(phase.choice, url, infoJsonRef.current)
          return
        }
        if (input === 'n' || input === 'N' || key.escape) {
          setPhase({name: 'picking'})
          return
        }
      }
      if (key.escape && (phase.name === 'picking' || phase.name === 'error' || phase.name === 'done' || phase.name === 'playlist-scope' || phase.name === 'playlist-done' || phase.name === 'confirm-overwrite')) resetToInput()
      if (key.escape && phase.name === 'playlist-quality') {
        setPhase({name: 'playlist-scope', playlist: phase.playlist, singleVideoUrl: phase.singleVideoUrl})
      }
      if (key.escape && (phase.name === 'probing' || phase.name === 'downloading' || phase.name === 'playlist-downloading')) cancelRun()
      if (key.return && (phase.name === 'error' || phase.name === 'done' || phase.name === 'playlist-done')) resetToInput()
    },
    {isActive: Boolean(process.stdin.isTTY)},
  )

  const handleUrlSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!isProbablyUrl(trimmed)) {
      setPhase({name: 'input', warning: 'that doesn’t look like a link — paste a full url'})
      return
    }
    setUrl(trimmed)
    void startProbe(trimmed)
  }

  const clipboardOffered = Boolean(clipboardUrl) && urlInput === ''
  const clipboardAccepted = Boolean(clipboardUrl) && urlInput === clipboardUrl

  const handlePick = (item: {value: number}) => {
    const choice = choices[item.value]
    if (!choice) return
    if (!force && !skipExisting) {
      const existing = getCompletedDownload({url, mediaId: info?.id})
      if (existing) {
        setPhase({
          name: 'confirm-overwrite',
          existingPath: existing.outputPath,
          choice,
        })
        return
      }
    }
    executeDownload(choice, url, infoJsonRef.current)
  }

  let hints: Array<[string, string]> = [...HINTS[phase.name], ['^t', `theme:${theme.mode}`]]
  if (isPickerPhase(phase.name)) {
    hints = [
      ...hints.slice(0, 1),
      ['s', subtitles?.enabled ? 'subs:on' : 'subs:off'],
      ['t', thumbnail?.enabled ? 'thumb:on' : 'thumb:off'],
      ...hints.slice(1),
    ]
  }
  if (phase.name === 'input' && history.length > 0) {
    hints = [hints[0]!, ['↑', 'history'], ...hints.slice(1)]
  }

  const hintAction = (key: string): (() => void) | undefined => {
    if (key === '^c') return () => exit()
    if (key === '^t') return cycleTheme
    if (key === 's') return toggleSubtitles
    if (key === 't') return toggleThumbnail
    if (key === 'esc') {
      if (phase.name === 'probing' || phase.name === 'downloading' || phase.name === 'playlist-downloading') return cancelRun
      if (phase.name === 'playlist-quality') return () => setPhase({name: 'playlist-scope', playlist: phase.playlist, singleVideoUrl: phase.singleVideoUrl})
      return resetToInput
    }
    if (key === '↵') {
      if (phase.name === 'input') return () => handleUrlSubmit(urlInput)
      if (phase.name === 'picking') return () => handlePick({value: highlightRef.current})
      if (phase.name === 'error' || phase.name === 'done' || phase.name === 'playlist-done') return resetToInput
    }
    return undefined
  }

  const releaseUrl = `https://github.com/OpenSelena/openomni/releases/tag/v${version}`
  const clickTargets: ClickTarget[] = []
  if (phase.name === 'input') {
    clickTargets.push({match: `v${version}`, padX: 1, action: () => openBrowser(releaseUrl)})
    clickTargets.push({match: `  ${DOWNLOAD_BUTTON}  `, padY: 1, action: () => handleUrlSubmit(urlInput)})
    if (clipboardOffered && clipboardUrl) {
      clickTargets.push({match: 'Tab to paste it', action: () => setUrlInput(clipboardUrl)})
      clickTargets.push({match: 'link in your clipboard', action: () => setUrlInput(clipboardUrl)})
    }
    if (clipboardAccepted) {
      clickTargets.push({match: 'to download it', action: () => handleUrlSubmit(urlInput)})
    }
    clickTargets.push({match: 'Igect', padX: 1, action: () => openBrowser('https://igect.link/')})
  }
  if (phase.name === 'picking') {
    for (const [index, choice] of choices.entries()) {
      clickTargets.push({match: choiceLabel(choice), action: () => handlePick({value: index})})
    }
  }
  if (phase.name === 'done' || phase.name === 'playlist-done') {
    clickTargets.push({match: DONE_LABEL, padX: 4, padY: 1, action: resetToInput})
  }
  for (const [key, label] of hints) {
    const action = hintAction(key)
    if (action) clickTargets.push({match: `${key} ${label}`, action})
  }

  useMouseClick(
    (x, y) => {
      const taglineRow = findFrameRow(TAGLINE)
      if (taglineRow > 3 && y - 1 >= taglineRow - 4 && y - 1 <= taglineRow - 2) {
        const span = frameRowSpan(y - 1)
        if (span && x >= span[0] - 1 && x <= span[1] + 1) {
          if (phase.name === 'probing' || phase.name === 'downloading' || phase.name === 'playlist-downloading') cancelRun()
          else if (phase.name !== 'input') resetToInput()
          return
        }
      }
      clickTargetAt(x, y, clickTargets)?.action()
    },
    Boolean(process.stdin.isTTY),
  )

  return (
    <FullScreen>
      <Logo />
      <Gap />
      <Text color={theme.primary}>{TAGLINE}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>youtube · x · instagram · threads · tiktok · +1800 more</Text>
      <Gap />

      {phase.name === 'input' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title="Paste a link" width={boxWidth} button={DOWNLOAD_BUTTON}>
            <TextInput
              value={urlInput}
              onChange={setUrlInput}
              onSubmit={handleUrlSubmit}
              placeholder="https://youtube.com/watch?v=…"
              width={boxWidth - 6}
              history={history}
              submitOnPaste={isProbablyUrl}
              onTab={() => {
                if (clipboardOffered) setUrlInput(clipboardUrl!)
              }}
            />
          </FramedInput>
          {phase.warning ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>✗ {phase.warning}</Text>
          ) : clipboardOffered ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>link in your clipboard — Tab to paste it</Text>
          ) : clipboardAccepted ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>from your clipboard — ↵ to download it</Text>
          ) : null}
          <Gap />
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            <Text color={BRAND_COLOR} underline>
              {terminalLink(`v${version}`, releaseUrl)}
            </Text>
            {' · by '}
            <Text color={BRAND_COLOR} underline>
              {terminalLink('Igect', 'https://igect.link/')}
            </Text>
          </Text>
        </Box>
      )}

      {phase.name === 'probing' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title={platform ? platform.label : 'Paste a link'} width={boxWidth} button={DOWNLOAD_BUTTON} buttonDim>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>{url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}…` : url}</Text>
          </FramedInput>
        </Box>
      )}

      {phase.name === 'playlist-scope' && (
        <Box justifyContent="center">
          <PlaylistScopePicker
            playlistTitle={phase.playlist.title}
            totalCount={phase.playlist.validEntries.length}
            hasSingleVideo={Boolean(phase.singleVideoUrl)}
            hasPhotos={phase.playlist.validEntries.some(e => e.kind === 'photo')}
            onSelect={(choice: PlaylistScopeChoice) => {
              const allPhotos = phase.playlist.validEntries.every(e => e.kind === 'photo')
              if (choice === 'full') {
                if (allPhotos) {
                  executeBatchDownload(phase.playlist, phase.playlist.validEntries, 'best')
                } else {
                  setPhase({
                    name: 'playlist-quality',
                    playlist: phase.playlist,
                    selectedEntries: phase.playlist.validEntries,
                    singleVideoUrl: phase.singleVideoUrl,
                  })
                }
              } else if (choice === 'select') {
                setPhase({
                  name: 'playlist-items',
                  playlist: phase.playlist,
                  singleVideoUrl: phase.singleVideoUrl,
                })
              } else if (choice === 'single' && phase.singleVideoUrl) {
                setUrl(phase.singleVideoUrl)
                void startProbe(phase.singleVideoUrl)
              }
            }}
            onBack={resetToInput}
            width={boxWidth}
          />
        </Box>
      )}

      {phase.name === 'playlist-items' && (
        <Box justifyContent="center">
          <PlaylistItemPicker
            entries={phase.playlist.validEntries}
            onConfirm={selected => {
              const allPhotos = selected.every(e => e.kind === 'photo')
              if (allPhotos) {
                executeBatchDownload(phase.playlist, selected, 'best')
              } else {
                setPhase({
                  name: 'playlist-quality',
                  playlist: phase.playlist,
                  selectedEntries: selected,
                  singleVideoUrl: phase.singleVideoUrl,
                })
              }
            }}
            onBack={() => {
              if (phase.playlist.validEntries.some(e => e.kind === 'photo')) {
                resetToInput()
              } else {
                setPhase({
                  name: 'playlist-scope',
                  playlist: phase.playlist,
                  singleVideoUrl: phase.singleVideoUrl,
                })
              }
            }}
            width={Math.min(contentWidth, 68)}
          />
        </Box>
      )}

      {phase.name === 'playlist-quality' && (
        <Box justifyContent="center">
          <PlaylistQualityPicker
            itemCount={phase.selectedEntries.length}
            hasPhotos={phase.selectedEntries.some(e => e.kind === 'photo')}
            onSelect={tier => {
              executeBatchDownload(phase.playlist, phase.selectedEntries, tier)
            }}
            onBack={() => {
              if (phase.playlist.validEntries.some(e => e.kind === 'photo')) {
                setPhase({
                  name: 'playlist-items',
                  playlist: phase.playlist,
                  singleVideoUrl: phase.singleVideoUrl,
                })
              } else {
                setPhase({
                  name: 'playlist-scope',
                  playlist: phase.playlist,
                  singleVideoUrl: phase.singleVideoUrl,
                })
              }
            }}
            width={boxWidth}
          />
        </Box>
      )}

      {phase.name === 'playlist-downloading' && (
        <Box justifyContent="center">
          <PlaylistProgress
            playlistTitle={phase.playlist.title}
            currentTitle={phase.queue[phase.currentIndex]?.title ?? 'Downloading...'}
            currentIndex={phase.currentIndex}
            totalCount={phase.queue.length}
            progress={phase.progress}
            processing={phase.processing}
            skippedCount={phase.skippedCount}
            lastWarning={phase.lastWarning}
            width={Math.min(contentWidth, 68)}
          />
        </Box>
      )}

      {phase.name === 'playlist-done' && (
        <Box flexDirection="column" alignItems="center">
          <Text>
            <Text bold color={theme.primary}>{phase.hasPhotos ? '✓ post downloaded! ' : '✓ playlist downloaded! '}</Text>
            <Text color={theme.primary}>saved to:</Text>
          </Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{shortenPath(phase.targetDir, os.homedir(), 60)}</Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {`${phase.downloadCount} ${phase.hasPhotos ? 'item' : 'video'}${phase.downloadCount === 1 ? '' : 's'} downloaded` + (phase.skippedCount > 0 ? ` (${phase.skippedCount} skipped)` : '')}
          </Text>
          <Gap />
          <Box
            borderStyle="round"
            borderColor={theme.gray}
            borderDimColor={theme.dimSecondary}
            borderBackgroundColor={theme.background}
            paddingX={3}
          >
            <Text bold color={theme.primary}>{DONE_LABEL}</Text>
          </Box>
        </Box>
      )}

      {phase.name === 'confirm-overwrite' && (
        <Box flexDirection="column" alignItems="center" width={boxWidth}>
          <Text bold color={theme.primary}>File already exists at:</Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{shortenPath(phase.existingPath, os.homedir(), 60)}</Text>
          <Gap />
          <Text color={theme.primary}>Redownload? <Text bold>[y/N]</Text></Text>
        </Box>
      )}

      {phase.name === 'picking' && platform && (
        <Box width={contentWidth}>
          <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
            {wrapText(info?.title ?? '', Math.max(10, contentWidth - 41)).map((line, index) => (
              <Text key={index} bold color={theme.primary}>
                {line}
              </Text>
            ))}
            <Gap />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              ▸ {platform.label}
              {info?.duration ? ` · ${formatDuration(info.duration)}` : ''}
              {info?.uploader ? ` · ${info.uploader}` : ''}
            </Text>
          </Box>
          <Panel title="Download" width={38}>
            <SelectInput
              indicatorComponent={ChoiceIndicator}
              itemComponent={ChoiceItem}
              items={choices.map((choice, index) => ({
                key: String(index),
                label: choiceLabel(choice),
                value: index,
              }))}
              onSelect={handlePick}
              onHighlight={item => (highlightRef.current = item.value)}
            />
          </Panel>
        </Box>
      )}

      {phase.name === 'downloading' && (
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {(phase.title || info?.title) ? `${truncate(phase.title || info!.title, 42)} · ` : ''}
            {choiceLabel(phase.choice)}
          </Text>
          <Gap />
          {phase.processing ? (
            <>
              <ProgressBar percent={1} />
              <Gap />
              <Text>
                <Text color={theme.primary}>
                  <Spinner type="dots" />
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}> processing…</Text>
              </Text>
            </>
          ) : phase.progress?.totalBytes ? (
            <>
              <ProgressBar percent={phase.progress.downloadedBytes / phase.progress.totalBytes} />
              <Gap />
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{downloadMeta(phase.progress)}</Text>
            </>
          ) : phase.progress ? (
            <>
              <Text>
                <Text color={theme.primary}>
                  <Spinner type="dots" />
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}> downloading…</Text>
              </Text>
              <Gap />
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{indeterminateMeta(phase.progress)}</Text>
            </>
          ) : (
            <>
              <ProgressBar percent={0} />
              <Gap />
              <Text>
                <Text color={theme.primary}>
                  <Spinner type="dots" />
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  {phase.refreshing ? ' link expired — grabbing a fresh one…' : ' starting download…'}
                </Text>
              </Text>
            </>
          )}
        </Box>
      )}

      {phase.name === 'done' && (
        <Box flexDirection="column" alignItems="center">
          <Text>
            <Text bold color={theme.primary}>✓ downloaded! </Text>
            <Text color={theme.primary}>find your file in:</Text>
          </Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{shortenPath(phase.filepath, os.homedir(), 60)}</Text>
          <Gap />
          <Box
            borderStyle="round"
            borderColor={theme.gray}
            borderDimColor={theme.dimSecondary}
            borderBackgroundColor={theme.background}
            paddingX={3}
          >
            <Text bold color={theme.primary}>{DONE_LABEL}</Text>
          </Box>
        </Box>
      )}

      {phase.name === 'error' && (
        <Box flexDirection="column" alignItems="center" width={Math.max(10, Math.min(columns - 6, 72))}>
          <Text bold color={theme.primary}>✗ {phase.message}</Text>
          {isExtractorError(phase.message) && (
            <Box marginTop={1}>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                Hint: Try running 'open-omni -U' to update the video extractor.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {hints.length > 0 ? (
        <>
          <Gap lines={2} />
          <Shortcuts
            items={hints}
            leading={
              phase.name === 'probing' ? (
                <Text>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}> {phase.status}</Text>
                </Text>
              ) : undefined
            }
          />
        </>
      ) : null}
    </FullScreen>
  )
}
