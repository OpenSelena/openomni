import React, {useCallback} from 'react'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  download,
  findFfmpeg,
  maskProxyCredentials,
  type DownloadChoice,
  type DownloadProgress,
  type SubtitleOptions,
  type ThumbnailOptions,
  type MetadataOptions,
  type VideoInfo,
} from '../lib/ytdlp.js'
import {detectPlatform} from '../lib/platforms.js'
import {getCompletedDownload, recordDownloadWithStat} from '../lib/ledger.js'
import {addToHistory} from '../lib/history.js'
import {normalizeToYtdlpSection} from '../lib/time.js'
import type {Outcome, Phase} from './types.js'

const DEFAULT_OUT_DIR = path.join(os.homedir(), 'Downloads')

export type UseSingleDownloadOptions = {
  outDir?: string
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
  metadata?: MetadataOptions
  cookieFile?: string
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
  autoSelect?: 'best' | 'mp3'
  info?: VideoInfo
  ytdlpRef: React.MutableRefObject<string>
  infoJsonRef: React.MutableRefObject<string | undefined>
  abortRef: React.MutableRefObject<AbortController | undefined>
  onOutcome: (outcome: Outcome) => void
  exit: (error?: Error) => void
  setPhase: React.Dispatch<React.SetStateAction<Phase>>
  setHistory: React.Dispatch<React.SetStateAction<string[]>>
}

export function useSingleDownload({
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
}: UseSingleDownloadOptions) {
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

          const targetDir = outDir ?? DEFAULT_OUT_DIR
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
            metadata,
            cookieFile,
            section,
            proxy,
            geoBypass,
            geoCountry,
            limitRate,
            sponsorblock,
            sponsorblockRemove,
            outputTemplate: outputTemplate
              ? path.isAbsolute(outputTemplate)
                ? outputTemplate
                : path.join(targetDir, outputTemplate)
              : undefined,
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
          setPhase({
            name: 'error',
            message: maskProxyCredentials(error instanceof Error ? error.message : String(error)),
          })
          if (autoSelect) {
            exit(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })()
    },
    [
      outDir,
      onOutcome,
      autoSelect,
      exit,
      subtitles,
      thumbnail,
      metadata,
      cookieFile,
      skipExisting,
      force,
      time,
      info,
      proxy,
      geoBypass,
      geoCountry,
      limitRate,
      sponsorblock,
      sponsorblockRemove,
      outputTemplate,
      ytdlpRef,
      infoJsonRef,
      abortRef,
      setPhase,
      setHistory,
    ],
  )

  return {executeDownload}
}
