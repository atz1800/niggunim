const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const INDEX = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'B#': 0,
}

// אקורד שלם: שורש + איכות (m, maj7, sus4, dim, 7b9...) + בס אופציונלי (G/B)
const CHORD = /^([A-G][#b]?)((?:maj|min|m|M|dim|aug|sus|add|\d|\+|°|ø|#|b)*)(?:\/([A-G][#b]?))?$/
// מפרידים בין אקורדים: רווחים, מקפים, קווים, פסיקים, סוגריים
const SPLIT = /(\s+|[-–|,()[\]])/

function shift(note, semitones, flats) {
  const i = INDEX[note]
  if (i === undefined) return note
  return (flats ? FLATS : SHARPS)[(((i + semitones) % 12) + 12) % 12]
}

export function isChord(token) {
  return CHORD.test(token)
}

/**
 * מעביר טון לטקסט אקורדים. רק טוקנים שהם אקורד שלם משתנים — שאר הטקסט נשמר.
 * ברירת מחדל: במולים אם הטקסט המקורי משתמש במולים, אחרת דיאזים.
 */
export function transposeChords(text, semitones, preferFlats) {
  if (!text || !semitones) return text || ''
  const tokens = text.split(SPLIT)
  const flats = preferFlats ?? tokens.some(t => /^[A-G]b/.test(t) && isChord(t))
  return tokens.map(token => {
    const m = token.match(CHORD)
    if (!m) return token
    const [, root, quality, bass] = m
    return shift(root, semitones, flats) + quality + (bass ? '/' + shift(bass, semitones, flats) : '')
  }).join('')
}

export function hasChords(text) {
  return !!text && text.split(SPLIT).some(isChord)
}

export function semitoneLabel(n) {
  if (!n) return 'טון מקורי'
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}`
}
