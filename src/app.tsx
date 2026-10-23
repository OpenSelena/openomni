import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Box, Text, useApp, useInput, useStdout} from 'ink'
import Spinner from 'ink-spinner'
import {FullScreen} from './components/fullscreen.js'
import {Logo} from './components/logo.js'
import {Shortcuts} from './components/shortcuts.js'
import {InputView} from './components/views/input-view.js'
import {ProbingView} from './components/views/probing-view.js'
import {PickingView, choiceLabel} from './components/views/picking-view.js'
import {DownloadingView} from './components/views/downloading-view.js'
import {SingleDoneView, PlaylistDoneView, DONE_LABEL, REVEAL_LABEL} from './components/views/completion-view.js'
import {ErrorView, ConfirmOverwriteView} from './components/views/error-view.js'
import {
  PlaylistScopeView,
  PlaylistItemsView,
  PlaylistQualityView,
  PlaylistDownloadingView,
} from './components/views/playlist-views.js'
import type {PlaylistScopeChoice} from './components/playlist-scope-picker.js'
import {clickTargetAt, findFrameRow, frameRowSpan, type ClickTarget} from './lib/click-map.js'
import {formatBytes, formatDuration, formatEta, formatSpeed, shortenPath, terminalLink, truncate, wrapText} from './lib/format.js'
import {addToHistory, loadHistory} from './lib/history.js'
import {detectPlatform, isProbablyUrl, openBrowser, revealInFileManager, type Platform} from './lib/platforms.js'
import {useMouseClick} from './lib/use-mouse-click.js'
import {BRAND_COLOR, nextThemeMode, ThemeProvider, type ThemeMode, useTheme} from './theme.js'
import {
  buildChoices,
  type DownloadChoice,
  type DownloadProgress,
  type SubtitleOptions,
  type ThumbnailOptions,
  type MetadataOptions,
  type VideoInfo,
} from './lib/ytdlp.js'
import {
  type PlaylistEntry,
  type PlaylistMetadata,
  type QualityTier,
} from './lib/playlist.js'
import type {AudioFormat, VideoFormat} from './lib/args.js'
import {getNextAudioFormat, getNextVideoFormat} from './lib/format-cycle.js'
import {getCompletedDownload} from './lib/ledger.js'
import type {Outcome, Phase} from './hooks/types.js'
import {useSingleDownload} from './hooks/use-single-download.js'
import {useBatchQueue} from './hooks/use-batch-queue.js'
import {useEngineProbe} from './hooks/use-engine-probe.js'

export type {Outcome, Phase}

const DOWNLOAD_BUTTON = 'download'
const TAGLINE = 'grab any video. paste. download. done.'

const Gap = ({lines = 1}: {lines?: number}) => (
  <Box flexDirection="column" flexShrink={0}>
    {Array.from({length: lines}, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

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
  'playlist-done': [
    ['o', 'reveal'],
    ['^c', 'quit'],
  ],
  done: [
    ['o', 'reveal'],
    ['^c', 'quit'],
  ],
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
  initialMetadata?: MetadataOptions
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  mediaFilter?: 'all' | 'photos' | 'videos'
  cookieFile?: string
  cookieHeader?: string
  skipExisting?: boolean
  force?: boolean
  time?: string
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  sponsorblock?: boolean
  sponsorblockRemove?: string
  outputTemplate?: string
  concurrency?: number
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
  version = '1.4.1',
  initialSubtitles,
  initialThumbnail,
  initialMetadata,
  audioFormat,
  videoFormat,
  mediaFilter = 'all',
  cookieFile,
  cookieHeader,
  skipExisting,
  force,
  time,
  proxy,
  geoBypass,
  geoCountry,
  limitRate,
  sponsorblock,
  sponsorblockRemove,
  outputTemplate,
  concurrency,
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
  initialMetadata?: MetadataOptions
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  mediaFilter?: 'all' | 'photos' | 'videos'
  cookieFile?: string
  cookieHeader?: string
  skipExisting?: boolean
  force?: boolean
  time?: string
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  sponsorblock?: boolean
  sponsorblockRemove?: string
  outputTemplate?: string
  concurrency?: number
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
  const metadata = initialMetadata
  const [activeAudioFormat, setActiveAudioFormat] = useState<AudioFormat>(audioFormat ?? 'mp3')
  const [activeVideoFormat, setActiveVideoFormat] = useState<VideoFormat>(videoFormat ?? 'mp4')
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

  const cycleAudioFormat = useCallback(() => {
    const next = getNextAudioFormat(activeAudioFormat)
    setActiveAudioFormat(next)
    if (info) {
      setChoices(buildChoices(info, {audioFormat: next, videoFormat: activeVideoFormat}))
    }
  }, [info, activeAudioFormat, activeVideoFormat])

  const cycleVideoFormat = useCallback(() => {
    const next = getNextVideoFormat(activeVideoFormat)
    setActiveVideoFormat(next)
    if (info) {
      setChoices(buildChoices(info, {audioFormat: activeAudioFormat, videoFormat: next}))
    }
  }, [info, activeAudioFormat, activeVideoFormat])

  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80
  const boxWidth = Math.max(14, Math.min(64, columns - 6))
  const contentWidth = Math.max(10, Math.min(columns - 4, 78))

  const {executeDownload} = useSingleDownload({
    outDir,
    subtitles,
    thumbnail,
    metadata,
    cookieFile,
    skipExisting,
    force,
    time,
    proxy,
    geoBypass,
    geoCountry,
    limitRate,
    sponsorblock,
    sponsorblockRemove,
    outputTemplate,
    autoSelect,
    info,
    ytdlpRef,
    infoJsonRef,
    abortRef,
    onOutcome,
    exit,
    setPhase,
    setHistory,
  })

  const {executeBatchDownload} = useBatchQueue({
    outDir,
    subtitles,
    thumbnail,
    metadata,
    activeAudioFormat,
    activeVideoFormat,
    cookieFile,
    cookieHeader,
    skipExisting,
    force,
    time,
    proxy,
    geoBypass,
    geoCountry,
    limitRate,
    sponsorblock,
    sponsorblockRemove,
    outputTemplate,
    autoSelect,
    ytdlpRef,
    gallerydlRef,
    abortRef,
    onOutcome,
    exit,
    setPhase,
  })

  const {startProbe} = useEngineProbe({
    outDir,
    mediaFilter,
    cookieFile,
    cookieHeader,
    proxy,
    geoBypass,
    geoCountry,
    limitRate,
    skipExisting,
    force,
    time,
    autoSelect,
    activeAudioFormat,
    activeVideoFormat,
    ytdlpRef,
    gallerydlRef,
    infoJsonRef,
    highlightRef,
    abortRef,
    onOutcome,
    exit,
    setPhase,
    setPlatform,
    setInfo,
    setChoices,
    executeDownload,
    executeBatchDownload,
  })

  useEffect(() => {
    if (initialUrl) void startProbe(initialUrl)
  }, [initialUrl, startProbe])

  const resetToInput = useCallback(() => {
    setUrl('')
    setUrlInput('')
    setPlatform(undefined)
    setInfo(undefined)
    setChoices([])
    infoJsonRef.current = undefined
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
      if ((input === 'a' || input === 'A') && !key.ctrl && isPickerPhase(phase.name)) {
        cycleAudioFormat()
        return
      }
      if ((input === 'v' || input === 'V') && !key.ctrl && isPickerPhase(phase.name)) {
        cycleVideoFormat()
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
      if ((input === 'o' || input === 'O') && !key.ctrl) {
        if (phase.name === 'done') {
          revealInFileManager(phase.filepath)
          return
        }
        if (phase.name === 'playlist-done') {
          revealInFileManager(phase.targetDir)
          return
        }
      }
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
      ['a', `audio:${activeAudioFormat}`],
      ['v', `video:${activeVideoFormat}`],
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
    if (key === 'a') return cycleAudioFormat
    if (key === 'v') return cycleVideoFormat
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
    if (key === 'o') {
      if (phase.name === 'done') return () => revealInFileManager(phase.filepath)
      if (phase.name === 'playlist-done') return () => revealInFileManager(phase.targetDir)
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
    const revealTarget = phase.name === 'done' ? phase.filepath : phase.targetDir
    clickTargets.push({match: REVEAL_LABEL, padX: 1, action: () => revealInFileManager(revealTarget)})
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
        <InputView
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          onSubmit={handleUrlSubmit}
          boxWidth={boxWidth}
          history={history}
          clipboardOffered={clipboardOffered}
          clipboardAccepted={clipboardAccepted}
          clipboardUrl={clipboardUrl}
          warning={phase.warning}
          version={version}
          releaseUrl={releaseUrl}
          theme={theme}
          buttonText={DOWNLOAD_BUTTON}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'probing' && (
        <ProbingView
          platform={platform}
          url={url}
          boxWidth={boxWidth}
          theme={theme}
          buttonText={DOWNLOAD_BUTTON}
        />
      )}

      {phase.name === 'playlist-scope' && (
        <PlaylistScopeView
          playlist={phase.playlist}
          singleVideoUrl={phase.singleVideoUrl}
          width={boxWidth}
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
        />
      )}

      {phase.name === 'playlist-items' && (
        <PlaylistItemsView
          entries={phase.playlist.validEntries}
          width={Math.min(contentWidth, 68)}
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
        />
      )}

      {phase.name === 'playlist-quality' && (
        <PlaylistQualityView
          itemCount={phase.selectedEntries.length}
          hasPhotos={phase.selectedEntries.some(e => e.kind === 'photo')}
          audioFormat={activeAudioFormat}
          videoFormat={activeVideoFormat}
          width={boxWidth}
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
        />
      )}

      {phase.name === 'playlist-downloading' && (
        <PlaylistDownloadingView
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
      )}

      {phase.name === 'playlist-done' && (
        <PlaylistDoneView
          playlistTitle={phase.playlistTitle}
          downloadCount={phase.downloadCount}
          skippedCount={phase.skippedCount}
          targetDir={phase.targetDir}
          hasPhotos={phase.hasPhotos}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'confirm-overwrite' && (
        <ConfirmOverwriteView
          existingPath={phase.existingPath}
          boxWidth={boxWidth}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'picking' && platform && (
        <PickingView
          contentWidth={contentWidth}
          info={info}
          platform={platform}
          choices={choices}
          onSelect={handlePick}
          onHighlight={item => (highlightRef.current = item.value)}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'downloading' && (
        <DownloadingView
          title={phase.title}
          fallbackTitle={info?.title}
          choice={phase.choice}
          processing={phase.processing}
          progress={phase.progress}
          refreshing={phase.refreshing}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'done' && (
        <SingleDoneView
          filepath={phase.filepath}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'error' && (
        <ErrorView
          message={phase.message}
          columns={columns}
          theme={theme}
        />
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
