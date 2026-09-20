import React from 'react'
import {Box} from 'ink'
import {PlaylistScopePicker, type PlaylistScopeChoice} from '../playlist-scope-picker.js'
import {PlaylistItemPicker} from '../playlist-item-picker.js'
import {PlaylistQualityPicker} from '../playlist-quality-picker.js'
import {PlaylistProgress} from '../playlist-progress.js'
import type {PlaylistMetadata, PlaylistEntry, QualityTier} from '../../lib/playlist.js'
import type {DownloadProgress} from '../../lib/ytdlp.js'
import type {AudioFormat, VideoFormat} from '../../lib/args.js'

export function PlaylistScopeView({
  playlist,
  singleVideoUrl,
  width,
  onSelect,
  onBack,
}: {
  playlist: PlaylistMetadata
  singleVideoUrl?: string
  width: number
  onSelect: (choice: PlaylistScopeChoice) => void
  onBack: () => void
}) {
  return (
    <Box justifyContent="center">
      <PlaylistScopePicker
        playlistTitle={playlist.title}
        totalCount={playlist.validEntries.length}
        hasSingleVideo={Boolean(singleVideoUrl)}
        hasPhotos={playlist.validEntries.some(e => e.kind === 'photo')}
        onSelect={onSelect}
        onBack={onBack}
        width={width}
      />
    </Box>
  )
}

export function PlaylistItemsView({
  entries,
  width,
  onConfirm,
  onBack,
}: {
  entries: PlaylistEntry[]
  width: number
  onConfirm: (selected: PlaylistEntry[]) => void
  onBack: () => void
}) {
  return (
    <Box justifyContent="center">
      <PlaylistItemPicker
        entries={entries}
        onConfirm={onConfirm}
        onBack={onBack}
        width={width}
      />
    </Box>
  )
}

export function PlaylistQualityView({
  itemCount,
  hasPhotos,
  audioFormat,
  videoFormat,
  width,
  onSelect,
  onBack,
}: {
  itemCount: number
  hasPhotos: boolean
  audioFormat?: AudioFormat
  videoFormat?: VideoFormat
  width: number
  onSelect: (tier: QualityTier) => void
  onBack: () => void
}) {
  return (
    <Box justifyContent="center">
      <PlaylistQualityPicker
        itemCount={itemCount}
        hasPhotos={hasPhotos}
        audioFormat={audioFormat}
        videoFormat={videoFormat}
        onSelect={onSelect}
        onBack={onBack}
        width={width}
      />
    </Box>
  )
}

export function PlaylistDownloadingView({
  playlistTitle,
  currentTitle,
  currentIndex,
  totalCount,
  progress,
  processing = false,
  skippedCount = 0,
  lastWarning,
  width,
}: {
  playlistTitle: string
  currentTitle: string
  currentIndex: number
  totalCount: number
  progress?: DownloadProgress
  processing?: boolean
  skippedCount?: number
  lastWarning?: string
  width: number
}) {
  return (
    <Box justifyContent="center">
      <PlaylistProgress
        playlistTitle={playlistTitle}
        currentTitle={currentTitle}
        currentIndex={currentIndex}
        totalCount={totalCount}
        progress={progress}
        processing={processing}
        skippedCount={skippedCount}
        lastWarning={lastWarning}
        width={width}
      />
    </Box>
  )
}
