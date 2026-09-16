import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { useTheme } from '../theme.js'
import { Panel } from './panel.js'
import { ProgressBar } from './progress-bar.js'
import type { DownloadProgress } from '../lib/ytdlp.js'
import { formatBytes, formatEta, formatSpeed } from '../lib/format.js'

export type PlaylistProgressProps = {
  playlistTitle: string
  currentTitle: string
  currentIndex: number
  totalCount: number
  progress?: DownloadProgress
  processing: boolean
  skippedCount: number
  lastWarning?: string
  width?: number
}

export function PlaylistProgress({
  playlistTitle,
  currentTitle,
  currentIndex,
  totalCount,
  progress,
  processing,
  skippedCount,
  lastWarning,
  width = 64,
}: PlaylistProgressProps) {
  const theme = useTheme()

  let itemRatio = 0
  if (processing) {
    itemRatio = 1
  } else if (progress?.totalBytes && progress.totalBytes > 0) {
    itemRatio = Math.min(1, progress.downloadedBytes / progress.totalBytes)
  }
  const itemPct = Math.round(itemRatio * 100)

  const batchRatio =
    totalCount > 0 ? Math.min(1, (currentIndex + itemRatio) / totalCount) : 0
  const batchPct = Math.round(batchRatio * 100)
  const cleanTitle = currentTitle.length > 44 ? `${currentTitle.slice(0, 41)}...` : currentTitle

  const speedStr = progress?.speed ? formatSpeed(progress.speed) : ''
  const etaStr = progress?.eta ? `${formatEta(progress.eta)} left` : ''
  const bytesStr = progress?.downloadedBytes ? formatBytes(progress.downloadedBytes) : ''

  return (
    <Panel title={`Playlist: ${playlistTitle.slice(0, 30)}`} width={width}>
      <Box flexDirection="column" paddingY={1}>
        {/* Overall Batch Progress Header */}
        <Box justifyContent="space-between" marginBottom={0}>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            Overall Batch:
          </Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {`${batchPct}% (${currentIndex}/${totalCount})`}
          </Text>
        </Box>

        {/* Overall Batch Progress Bar */}
        <ProgressBar percent={batchRatio} width={width - 6} showPercent={false} />

        {/* Active Video Stream Header */}
        <Box marginTop={1} justifyContent="space-between" marginBottom={0}>
          <Text color={theme.primary} bold>
            {`[${currentIndex + 1}/${totalCount}] ${cleanTitle}`}
          </Text>
          <Text color={theme.primary}>
            {`${itemPct}%`}
          </Text>
        </Box>

        {/* Active Stream Progress Bar */}
        <ProgressBar percent={itemRatio} width={width - 6} showPercent={false} />

        {/* Stream Metrics / Spinner */}
        <Box marginTop={1} justifyContent="space-between">
          <Box>
            {processing ? (
              <Text color={theme.primary}>
                <Spinner type="dots" /> processing…
              </Text>
            ) : (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {`${bytesStr} ${speedStr ? `(${speedStr})` : ''}`}
              </Text>
            )}
          </Box>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {etaStr}
          </Text>
        </Box>

        {/* Skipped Items and Last Warning */}
        {skippedCount > 0 && (
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              {`⚠ ${skippedCount} item${skippedCount === 1 ? '' : 's'} skipped`}
            </Text>
            {lastWarning && (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {`  └─ ${lastWarning.length > 55 ? `${lastWarning.slice(0, 52)}...` : lastWarning}`}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Panel>
  )
}
