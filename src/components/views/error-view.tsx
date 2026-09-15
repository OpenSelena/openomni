import React from 'react'
import os from 'node:os'
import {Box, Text} from 'ink'
import {shortenPath} from '../../lib/format.js'
import {isExtractorError} from '../../lib/ytdlp.js'
import type {Theme} from '../../theme.js'

export type ErrorViewProps = {
  message: string
  columns: number
  theme: Theme
}

export function ErrorView({message, columns, theme}: ErrorViewProps) {
  const width = Math.max(10, Math.min(columns - 6, 72))

  return (
    <Box flexDirection="column" alignItems="center" width={width}>
      <Text bold color={theme.primary}>✗ {message}</Text>
      {isExtractorError(message) && (
        <Box marginTop={1}>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            Hint: Try running 'open-omni -U' to update the video extractor.
          </Text>
        </Box>
      )}
    </Box>
  )
}

export type ConfirmOverwriteViewProps = {
  existingPath: string
  boxWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function ConfirmOverwriteView({
  existingPath,
  boxWidth,
  theme,
  gapComponent: Gap,
}: ConfirmOverwriteViewProps) {
  return (
    <Box flexDirection="column" alignItems="center" width={boxWidth}>
      <Text bold color={theme.primary}>File already exists at:</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {shortenPath(existingPath, os.homedir(), 60)}
      </Text>
      <Gap />
      <Text color={theme.primary}>
        Redownload? <Text bold>[y/N]</Text>
      </Text>
    </Box>
  )
}
