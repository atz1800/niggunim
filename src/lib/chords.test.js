import { describe, it, expect } from 'vitest'
import { transposeChords, hasChords, semitoneLabel } from './chords'

describe('transposeChords', () => {
  it('transposes simple progressions and keeps separators', () => {
    expect(transposeChords('Am - G - F - E', 2)).toBe('Bm - A - G - F#')
    expect(transposeChords('Am | Dm | E7', -2)).toBe('Gm | Cm | D7')
  })

  it('keeps chord qualities and slash bass notes', () => {
    expect(transposeChords('Cmaj7 Dsus4 G/B E7b9', 1)).toBe('C#maj7 D#sus4 G#/C F7b9')
  })

  it('uses flats when the original does', () => {
    expect(transposeChords('Bb F Gm Eb', 2)).toBe('C G Am F')
    expect(transposeChords('Bb F', 1)).toBe('B Gb')
  })

  it('wraps around the octave', () => {
    expect(transposeChords('B', 1)).toBe('C')
    expect(transposeChords('C', -1)).toBe('B')
    expect(transposeChords('Am', 12)).toBe('Am')
  })

  it('does not touch Hebrew or non-chord words', () => {
    expect(transposeChords('בית: Am G\nפזמון: Dm E (x2)', 3)).toBe('בית: Cm A#\nפזמון: Fm G (x2)')
    expect(transposeChords('Bass Am', 2)).toBe('Bass Bm')
  })

  it('returns text unchanged for zero shift', () => {
    expect(transposeChords('Am G', 0)).toBe('Am G')
  })
})

describe('helpers', () => {
  it('detects chords', () => {
    expect(hasChords('Am - G')).toBe(true)
    expect(hasChords('לה מינור')).toBe(false)
  })

  it('labels semitones', () => {
    expect(semitoneLabel(0)).toBe('טון מקורי')
    expect(semitoneLabel(2)).toBe('+2')
    expect(semitoneLabel(-3)).toBe('−3')
  })
})
