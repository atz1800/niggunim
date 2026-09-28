import { describe, it, expect } from 'vitest'
import { getAudioMimeType, safeFileName, isAudioFile, isTooLarge, getAudioFiles, isStorageUrl, isDriveUrl } from './audio'

const file = (name, type = '', size = 1) => ({ name, type, size })

describe('getAudioMimeType', () => {
  it('keeps a real audio type', () => {
    expect(getAudioMimeType(file('a.mp3', 'audio/mpeg'))).toBe('audio/mpeg')
  })

  it('infers from extension when the browser reports nothing useful', () => {
    expect(getAudioMimeType(file('rec.m4a', ''))).toBe('audio/mp4')
    expect(getAudioMimeType(file('rec.AAC', 'application/octet-stream'))).toBe('audio/aac')
  })
})

describe('safeFileName', () => {
  it('removes path and URL-breaking characters but keeps Hebrew', () => {
    expect(safeFileName('ניגון #1?/a.mp3')).toBe('ניגון _1__a.mp3')
  })

  it('never returns an empty name', () => {
    expect(safeFileName('   ')).toBe('recording')
  })
})

describe('file checks', () => {
  it('accepts audio by type or extension', () => {
    expect(isAudioFile(file('x', 'audio/wav'))).toBe(true)
    expect(isAudioFile(file('x.opus'))).toBe(true)
    expect(isAudioFile(file('x.pdf', 'application/pdf'))).toBe(false)
  })

  it('flags files over the size limit', () => {
    expect(isTooLarge(file('x.mp3', 'audio/mpeg', 51 * 1024 * 1024))).toBe(true)
    expect(isTooLarge(file('x.mp3', 'audio/mpeg', 10 * 1024 * 1024))).toBe(false)
  })
})

describe('getAudioFiles', () => {
  it('prefers audioFiles and falls back to the legacy audioUrl', () => {
    expect(getAudioFiles({ audioFiles: [{ url: 'a', name: 'A' }] })).toEqual([{ url: 'a', name: 'A' }])
    expect(getAudioFiles({ audioUrl: 'b' })).toEqual([{ url: 'b', name: 'הקלטה' }])
    expect(getAudioFiles({})).toEqual([])
  })
})

describe('url kinds', () => {
  it('distinguishes Storage and Drive urls', () => {
    expect(isStorageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/y')).toBe(true)
    expect(isDriveUrl('https://drive.google.com/uc?export=download&id=1')).toBe(true)
    expect(isStorageUrl('http://127.0.0.1:9199/v0/b/x/o/y?alt=media')).toBe(true)
    expect(isStorageUrl('https://drive.google.com/uc?id=1')).toBe(false)
    expect(isStorageUrl(undefined)).toBe(false)
  })
})
