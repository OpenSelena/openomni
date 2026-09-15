import React from 'react'
import {Box, Text} from 'ink'
import Spinner from 'ink-spinner'
import {ProgressBar} from '../progress-bar.js'
import {formatBytes, formatEta, formatSpeed, truncate} from '../../lib/format.js'
import type {DownloadChoice, DownloadProgress} from '../../lib/ytdlp.js'
import type {Theme} from '../../theme.js'
import {choiceLabel} from './picking-view.js'

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

export type DownloadingViewProps = {
  title?: string
  fallbackTitle?: string
  choice: DownloadChoice
  processing: boolean
  progress?: DownloadProgress
  refreshing?: boolean
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function DownloadingView({
  title,
  fallbackTitle,
  choice,
  processing,
  progress,
  refreshing,
  theme,
  gapComponent: Gap,
}: DownloadingViewProps) {
  const displayTitle = title || fallbackTitle

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {displayTitle ? `${truncate(displayTitle, 42)} · ` : ''}
        {choiceLabel(choice)}
      </Text>
      <Gap />
      {processing ? (
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
      ) : progress?.totalBytes ? (
        <>
          <ProgressBar percent={progress.downloadedBytes / progress.totalBytes} />
          <Gap />
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{downloadMeta(progress)}</Text>
        </>
      ) : progress ? (
        <>
          <Text>
            <Text color={theme.primary}>
              <Spinner type="dots" />
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}> downloading…</Text>
          </Text>
          <Gap />
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{indeterminateMeta(progress)}</Text>
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
              {refreshing ? ' link expired — grabbing a fresh one…' : ' starting download…'}
            </Text>
          </Text>
        </>
      )}
    </Box>
  )
}
