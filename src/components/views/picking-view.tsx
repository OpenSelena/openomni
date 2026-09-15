import React from 'react'
import {Box, Text} from 'ink'
import SelectInput, {type IndicatorProps, type ItemProps} from 'ink-select-input'
import {Panel} from '../panel.js'
import {formatDuration, wrapText} from '../../lib/format.js'
import type {DownloadChoice, VideoInfo} from '../../lib/ytdlp.js'
import type {Platform} from '../../lib/platforms.js'
import {useTheme, type Theme} from '../../theme.js'

export const choiceLabel = (choice: DownloadChoice) => {
  if (choice.kind === 'audio') return `♪ ${choice.label}`
  if (choice.kind === 'photo') return `📷 ${choice.label}`
  return `▶ ${choice.label}`
}

export function ChoiceIndicator({isSelected}: IndicatorProps) {
  const theme = useTheme()
  return (
    <Box marginRight={1}>
      <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
    </Box>
  )
}

export function ChoiceItem({isSelected, label}: ItemProps) {
  const theme = useTheme()
  return (
    <Text color={theme.primary} bold={isSelected}>
      {label}
    </Text>
  )
}

export type PickingViewProps = {
  contentWidth: number
  info?: VideoInfo
  platform: Platform
  choices: DownloadChoice[]
  onSelect: (item: {value: number}) => void
  onHighlight: (item: {value: number}) => void
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function PickingView({
  contentWidth,
  info,
  platform,
  choices,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap,
}: PickingViewProps) {
  return (
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
          onSelect={onSelect}
          onHighlight={onHighlight}
        />
      </Panel>
    </Box>
  )
}
