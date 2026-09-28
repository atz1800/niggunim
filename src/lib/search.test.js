import { describe, it, expect } from 'vitest'
import { normalize, matchesSearch } from './search'

describe('normalize', () => {
  it('treats Hebrew and ASCII gershayim the same', () => {
    expect(normalize('אדמו״ר')).toBe(normalize('אדמו"ר'))
    expect(normalize('ר׳ נחמן')).toBe(normalize("ר' נחמן"))
  })

  it('strips niqqud and collapses whitespace', () => {
    expect(normalize('  שָׁלוֹם   עֲלֵיכֶם ')).toBe('שלום עליכם')
  })

  it('handles missing values', () => {
    expect(normalize(undefined)).toBe('')
  })
})

describe('matchesSearch', () => {
  const niggun = { name: 'ניגון האדמו״ר', chords: 'Am - G', story: 'למדתי בשבת', mood: 'דבקות' }

  it('matches every field', () => {
    expect(matchesSearch(niggun, 'אדמו"ר')).toBe(true)
    expect(matchesSearch(niggun, 'am')).toBe(true)
    expect(matchesSearch(niggun, 'בשבת')).toBe(true)
    expect(matchesSearch(niggun, 'דבקות')).toBe(true)
  })

  it('returns true for an empty query and false for no match', () => {
    expect(matchesSearch(niggun, '  ')).toBe(true)
    expect(matchesSearch(niggun, 'חתונה')).toBe(false)
  })
})
