import type {AudioFormat, VideoFormat} from './args.js'

export const AUDIO_CYCLE_ORDER: readonly AudioFormat[] = [
  'mp3',
  'flac',
  'opus',
  'best',
  'm4a',
  'aac',
  'wav',
  'alac',
  'vorbis',
]

export const VIDEO_CYCLE_ORDER: readonly VideoFormat[] = [
  'mp4',
  'mkv',
  'webm',
]

export function getNextAudioFormat(current: AudioFormat): AudioFormat {
  const index = AUDIO_CYCLE_ORDER.indexOf(current)
  if (index === -1) return AUDIO_CYCLE_ORDER[0]!
  return AUDIO_CYCLE_ORDER[(index + 1) % AUDIO_CYCLE_ORDER.length]!
}

export function getNextVideoFormat(current: VideoFormat): VideoFormat {
  const index = VIDEO_CYCLE_ORDER.indexOf(current)
  if (index === -1) return VIDEO_CYCLE_ORDER[0]!
  return VIDEO_CYCLE_ORDER[(index + 1) % VIDEO_CYCLE_ORDER.length]!
}
