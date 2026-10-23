import React, {useCallback} from 'react'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  ensureYtDlp,
  buildChoices,
  maskProxyCredentials,
  type DownloadChoice,
  type VideoInfo,
} from '../lib/ytdlp.js'
import {
  sanitizeFilename,
  type PlaylistMetadata,
  type PlaylistEntry,
  type QualityTier,
} from '../lib/playlist.js'
import {probeUnified, downloadUnifiedItem} from '../lib/dispatcher.js'
import {detectPlatform, type Platform} from '../lib/platforms.js'
import type {AudioFormat, VideoFormat} from '../lib/args.js'
import type {Outcome, Phase} from './types.js'

const DEFAULT_OUT_DIR = path.join(os.homedir(), 'Downloads')

export type UseEngineProbeOptions = {
  outDir?: string
  mediaFilter?: 'all' | 'photos' | 'videos'
  cookieFile?: string
  cookieHeader?: string
  proxy?: string
  geoBypass?: boolean
  geoCountry?: string
  limitRate?: string
  skipExisting?: boolean
  force?: boolean
  time?: string
  autoSelect?: 'best' | 'mp3'
  activeAudioFormat?: AudioFormat
  activeVideoFormat?: VideoFormat
  ytdlpRef: React.MutableRefObject<string>
  gallerydlRef: React.MutableRefObject<string>
  infoJsonRef: React.MutableRefObject<string | undefined>
  highlightRef: React.MutableRefObject<number>
  abortRef: React.MutableRefObject<AbortController | undefined>
  onOutcome: (outcome: Outcome) => void
  exit: (error?: Error) => void
  setPhase: React.Dispatch<React.SetStateAction<Phase>>
  setPlatform: React.Dispatch<React.SetStateAction<Platform | undefined>>
  setInfo: React.Dispatch<React.SetStateAction<VideoInfo | undefined>>
  setChoices: React.Dispatch<React.SetStateAction<DownloadChoice[]>>
  executeDownload: (choice: DownloadChoice, targetUrl: string, cachedInfoJsonPath?: string) => void
  executeBatchDownload: (playlist: PlaylistMetadata, queue: PlaylistEntry[], tier: QualityTier) => void
}

export function useEngineProbe({
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
}: UseEngineProbeOptions) {
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
          proxy,
          geoBypass,
          geoCountry,
          limitRate,
          signal: controller.signal,
          onStatus: status => setPhase({name: 'probing', status}),
        })
        if (controller.signal.aborted) return

        if (probeResult.kind === 'single_photo') {
          const item = probeResult.item
          const postTitle = probeResult.postTitle
          const baseDir = outDir ?? DEFAULT_OUT_DIR
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
              proxy,
              limitRate,
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
            setPhase({
              name: 'error',
              message: maskProxyCredentials(err instanceof Error ? err.message : String(err)),
            })
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
        const availableChoices = buildChoices(videoInfo, {
          audioFormat: activeAudioFormat,
          videoFormat: activeVideoFormat,
        })
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
        setPhase({
          name: 'error',
          message: maskProxyCredentials(error instanceof Error ? error.message : String(error)),
        })
        if (autoSelect) {
          exit(error instanceof Error ? error : new Error(String(error)))
        }
      }
    },
    [
      autoSelect,
      executeDownload,
      executeBatchDownload,
      exit,
      mediaFilter,
      onOutcome,
      outDir,
      cookieFile,
      cookieHeader,
      skipExisting,
      force,
      time,
      activeAudioFormat,
      activeVideoFormat,
      proxy,
      geoBypass,
      geoCountry,
      limitRate,
      abortRef,
      setPlatform,
      setPhase,
      ytdlpRef,
      gallerydlRef,
      infoJsonRef,
      setInfo,
      setChoices,
      highlightRef,
    ],
  )

  return {startProbe}
}
