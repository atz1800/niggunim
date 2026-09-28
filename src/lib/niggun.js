import { getAudioFiles } from './audio'

/** תגיות — שדה חדש (tags), עם תאימות לשדה הישן mood */
export function getTags(niggun) {
  if (Array.isArray(niggun.tags) && niggun.tags.length) return niggun.tags
  return niggun.mood ? [niggun.mood] : []
}

export function collectTags(niggunim, base = []) {
  const set = new Set(base)
  niggunim.forEach(n => getTags(n).forEach(t => set.add(t)))
  return [...set]
}

export function hasAudio(niggun) {
  return getAudioFiles(niggun).length > 0
}

const millis = ts => (ts?.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : 0)
// ניגון שנוצר עכשיו (ה-serverTimestamp עדיין לא חזר) — נחשב החדש ביותר
const created = n => (n.createdAt ? millis(n.createdAt) : Number.MAX_SAFE_INTEGER)

export const SORTS = {
  newest: { label: 'החדשים ביותר', compare: (a, b) => created(b) - created(a) },
  oldest: { label: 'הישנים ביותר', compare: (a, b) => created(a) - created(b) },
  name: { label: 'לפי שם (א-ת)', compare: (a, b) => (a.name || '').localeCompare(b.name || '', 'he') },
  played: { label: 'נוגנו לאחרונה', compare: (a, b) => millis(b.lastPlayedAt) - millis(a.lastPlayedAt) || created(b) - created(a) },
}

export function sortNiggunim(list, sortKey, favoritesFirst = false) {
  const cmp = (SORTS[sortKey] || SORTS.newest).compare
  return [...list].sort((a, b) =>
    (favoritesFirst ? (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) : 0) || cmp(a, b))
}

/** השדות שנשמרים ב-Firestore מטופס ההוספה/עריכה */
export function formToDoc(form) {
  const tags = [...new Set(form.tags.map(t => t.trim()).filter(Boolean))]
  return {
    name: form.name.trim(),
    chords: form.chords.trim(),
    story: form.story.trim(),
    lyrics: form.lyrics.trim(),
    source: form.source.trim(),
    composer: form.composer.trim(),
    hebrewDate: form.hebrewDate.trim(),
    tags,
    mood: tags[0] || '', // תאימות לאחור
  }
}

export function docToForm(niggun = {}) {
  return {
    name: niggun.name || '',
    chords: niggun.chords || '',
    story: niggun.story || '',
    lyrics: niggun.lyrics || '',
    source: niggun.source || '',
    composer: niggun.composer || '',
    hebrewDate: niggun.hebrewDate || '',
    tags: getTags(niggun),
  }
}
