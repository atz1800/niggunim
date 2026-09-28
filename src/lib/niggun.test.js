import { describe, it, expect } from 'vitest'
import { getTags, collectTags, sortNiggunim, formToDoc, docToForm } from './niggun'

const ts = ms => ({ toMillis: () => ms })

describe('tags', () => {
  it('reads new tags and falls back to legacy mood', () => {
    expect(getTags({ tags: ['שבת', 'דבקות'] })).toEqual(['שבת', 'דבקות'])
    expect(getTags({ mood: 'שמח' })).toEqual(['שמח'])
    expect(getTags({})).toEqual([])
  })

  it('collects unique tags across niggunim', () => {
    expect(collectTags([{ tags: ['א', 'ב'] }, { mood: 'ב' }, { tags: ['ג'] }], ['א'])).toEqual(['א', 'ב', 'ג'])
  })
})

describe('sortNiggunim', () => {
  const list = [
    { id: 1, name: 'ב', createdAt: ts(100), lastPlayedAt: ts(5) },
    { id: 2, name: 'א', createdAt: ts(300), favorite: true },
    { id: 3, name: 'ג', createdAt: ts(200), lastPlayedAt: ts(9) },
  ]
  const ids = l => l.map(n => n.id)

  it('sorts by date, name and last played', () => {
    expect(ids(sortNiggunim(list, 'newest'))).toEqual([2, 3, 1])
    expect(ids(sortNiggunim(list, 'oldest'))).toEqual([1, 3, 2])
    expect(ids(sortNiggunim(list, 'name'))).toEqual([2, 1, 3])
    expect(ids(sortNiggunim(list, 'played'))).toEqual([3, 1, 2])
  })

  it('can put favorites first', () => {
    expect(ids(sortNiggunim(list, 'oldest', true))).toEqual([2, 1, 3])
  })

  it('treats a just-created niggun (no timestamp yet) as newest', () => {
    expect(ids(sortNiggunim([...list, { id: 4, name: 'ד' }], 'newest'))[0]).toBe(4)
  })
})

describe('form <-> doc', () => {
  it('trims, dedupes tags and keeps legacy mood in sync', () => {
    const doc = formToDoc({ ...docToForm(), name: ' ניגון ', tags: ['שבת', ' שבת', '', 'שמח'] })
    expect(doc.name).toBe('ניגון')
    expect(doc.tags).toEqual(['שבת', 'שמח'])
    expect(doc.mood).toBe('שבת')
  })
})
