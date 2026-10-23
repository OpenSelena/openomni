import React, {useCallback} from 'react'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  findFfmpeg,
  maskProxyCredentials,
  type DownloadChoice,
  type DownloadProgress,
  type SubtitleOptions,
  type ThumbnailOptions,
  type MetadataOptions,
} from '../lib/ytdlp.js'
import {
  buildQualityTierArgs,
  resolvePlaylistDir,
  type PlaylistMetadata,
  type PlaylistEntry,
  type QualityTier,
} from '../lib/playlist.js'
import {downloadUnifiedItem} from '../lib/dispatcher.js'
import type {Outcome, Phase} from './types.js'

const DEFAULT_OUT_DIR = path.join(os.homedir(), 'Downloads')

export type UseBatchQueueOptions = {
  outDir?: string
  subtitles?: SubtitleOptions
  thumbnail?: ThumbnailOptions
  metadata?: MetadataOptions
  activeAudioFormat?: string
  activeVideoFormat?: string
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
  autoSelect?: 'best' | 'mp3'
  ytdlpRef: React.MutableRefObject<string>
  gallerydlRef: React.MutableRefObject<string>
  abortRef: React.MutableRefObject<AbortController | undefined>
  onOutcome: (outcome: Outcome) => void
  exit: (error?: Error) => void
  setPhase: React.Dispatch<React.SetStateAction<Phase>>
}

export function useBatchQueue({
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
}: UseBatchQueueOptions) {
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
          const baseDir = outDir ?? DEFAULT_OUT_DIR
          const playlistDir = resolvePlaylistDir(baseDir, playlist.title)
          await fs.mkdir(playlistDir, {recursive: true})
          const ffmpegLocation = await findFfmpeg()
          const choice: DownloadChoice = {
            label: tier === 'mp3' && activeAudioFormat ? `audio (${activeAudioFormat})` : tier,
            kind: tier === 'mp3' ? 'audio' : 'video',
            args: buildQualityTierArgs(tier, activeAudioFormat, activeVideoFormat),
          }

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
                outputTemplate,
                totalCount: queue.length,
                ytdlp: ytdlpRef.current,
                gallerydl: gallerydlRef.current,
                ffmpegLocation,
                choice,
                subtitles: subtitles?.enabled ? subtitles : undefined,
                thumbnail: thumbnail?.enabled ? thumbnail : undefined,
                metadata,
                signal: controller.signal,
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
                  ? {...prev, skippedCount: skipped, lastWarning: `${entry.title}: ${maskProxyCredentials(errMsg)}`}
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
      ytdlpRef,
      gallerydlRef,
      abortRef,
      setPhase,
    ],
  )

  return {executeBatchDownload}
}
