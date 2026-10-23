import type {DownloadChoice, DownloadProgress, VideoInfo} from '../lib/ytdlp.js'
import type {PlaylistMetadata, PlaylistEntry, QualityTier} from '../lib/playlist.js'

export type Outcome = {filepath?: string}

export type Phase =
  | {name: 'input'; warning?: string}
  | {name: 'probing'; status: string}
  | {name: 'picking'}
  | {
      name: 'downloading'
      choice: DownloadChoice
      title?: string
      progress?: DownloadProgress
      processing: boolean
      refreshing?: boolean
    }
  | {
      name: 'playlist-scope'
      playlist: PlaylistMetadata
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-items'
      playlist: PlaylistMetadata
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-quality'
      playlist: PlaylistMetadata
      selectedEntries: PlaylistEntry[]
      singleVideoUrl?: string
    }
  | {
      name: 'playlist-downloading'
      playlist: PlaylistMetadata
      queue: PlaylistEntry[]
      tier: QualityTier
      currentIndex: number
      skippedCount: number
      lastWarning?: string
      progress?: DownloadProgress
      processing: boolean
    }
  | {
      name: 'playlist-done'
      playlistTitle: string
      downloadCount: number
      skippedCount: number
      targetDir: string
      hasPhotos?: boolean
    }
  | {
      name: 'confirm-overwrite'
      existingPath: string
      choice: DownloadChoice
    }
  | {name: 'done'; filepath: string}
  | {name: 'error'; message: string}
