// נרמול לחיפוש: גרשיים/מרכאות עבריות ולועזיות נחשבים זהים, ניקוד וטעמים מוסרים
export function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[״”“"]/g, '"')
    .replace(/[׳’‘`']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesSearch(niggun, query) {
  const q = normalize(query)
  if (!q) return true
  return [niggun.name, niggun.chords, niggun.story, niggun.mood]
    .some(field => normalize(field).includes(q))
}
