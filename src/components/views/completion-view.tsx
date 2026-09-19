import React from 'react'
import os from 'node:os'
import {Box, Text} from 'ink'
import {shortenPath} from '../../lib/format.js'
import type {Theme} from '../../theme.js'

export const DONE_LABEL = '↵ download another'
export const REVEAL_LABEL = '[o] reveal in folder'

export type SingleDoneViewProps = {
  filepath: string
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function SingleDoneView({
  filepath,
  theme,
  gapComponent: Gap,
}: SingleDoneViewProps) {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text>
        <Text bold color={theme.primary}>✓ downloaded! </Text>
        <Text color={theme.primary}>find your file in:</Text>
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {shortenPath(filepath, os.homedir(), 60)}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          <Text bold color={theme.primary}>[o]</Text> reveal in folder
        </Text>
      </Box>
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
  )
}

export type PlaylistDoneViewProps = {
  playlistTitle: string
  downloadCount: number
  skippedCount: number
  targetDir: string
  hasPhotos?: boolean
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function PlaylistDoneView({
  downloadCount,
  skippedCount,
  targetDir,
  hasPhotos,
  theme,
  gapComponent: Gap,
}: PlaylistDoneViewProps) {
  const itemType = hasPhotos ? 'item' : 'video'
  const plural = downloadCount === 1 ? '' : 's'
  const skipText = skippedCount > 0 ? ` (${skippedCount} skipped)` : ''

  return (
    <Box flexDirection="column" alignItems="center">
      <Text>
        <Text bold color={theme.primary}>{hasPhotos ? '✓ post downloaded! ' : '✓ playlist downloaded! '}</Text>
        <Text color={theme.primary}>saved to:</Text>
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {shortenPath(targetDir, os.homedir(), 60)}
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {`${downloadCount} ${itemType}${plural} downloaded${skipText}`}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          <Text bold color={theme.primary}>[o]</Text> reveal in folder
        </Text>
      </Box>
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
  )
}
