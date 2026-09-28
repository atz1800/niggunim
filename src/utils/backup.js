import { doc, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getAudioFiles, safeFileName } from '../lib/audio'

const FORMAT = 'niggunim-backup'
const TIMESTAMP_FIELDS = ['createdAt', 'lastPlayedAt']

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function serialize(niggunim) {
  return {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    niggunim: niggunim.map(n => {
      const out = { ...n }
      TIMESTAMP_FIELDS.forEach(f => { if (out[f]?.toDate) out[f] = out[f].toDate().toISOString() })
      return out
    }),
  }
}

/** גיבוי מהיר: כל הנתונים + קישורי ההקלטות, בקובץ JSON אחד */
export function exportJson(niggunim) {
  const json = JSON.stringify(serialize(niggunim), null, 2)
  download(new Blob([json], { type: 'application/json' }), `niggunim-backup-${stamp()}.json`)
}

/**
 * גיבוי מלא: ZIP עם קובץ הנתונים וכל ההקלטות עצמן.
 * דורש הגדרת CORS ב-bucket של Storage; אם ההורדה נחסמת — זורק NO_CORS.
 */
export async function exportZip(niggunim, onProgress = () => {}) {
  const { zip } = await import('fflate')
  const files = { 'backup.json': new TextEncoder().encode(JSON.stringify(serialize(niggunim), null, 2)) }
  const all = niggunim.flatMap(n => getAudioFiles(n).map((f, i) => ({ n, f, i })))
  let done = 0
  for (const { n, f, i } of all) {
    let res
    try {
      res = await fetch(f.url)
    } catch {
      throw new Error('NO_CORS')
    }
    if (!res.ok) throw new Error(`DOWNLOAD_FAILED:${res.status}`)
    const folder = safeFileName(n.name).slice(0, 60)
    files[`הקלטות/${folder}/${i + 1}_${safeFileName(f.name || 'recording')}`] = [new Uint8Array(await res.arrayBuffer()), { level: 0 }]
    onProgress(++done, all.length)
  }
  const data = await new Promise((resolve, reject) => zip(files, (err, out) => (err ? reject(err) : resolve(out))))
  download(new Blob([data], { type: 'application/zip' }), `niggunim-backup-${stamp()}.zip`)
}

/** שחזור מקובץ JSON — ניגון עם אותו מזהה מתעדכן, חדש נוסף. לא מוחק כלום. */
export async function importJson(file, uid) {
  const data = JSON.parse(await file.text())
  if (data?.format !== FORMAT || !Array.isArray(data.niggunim)) throw new Error('INVALID_FILE')
  const items = data.niggunim.filter(n => n && typeof n.id === 'string' && typeof n.name === 'string')
  // Firestore מגביל ל-500 פעולות ב-batch
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db)
    items.slice(i, i + 400).forEach(({ id, ...rest }) => {
      TIMESTAMP_FIELDS.forEach(f => {
        if (typeof rest[f] === 'string') rest[f] = Timestamp.fromDate(new Date(rest[f]))
      })
      batch.set(doc(db, 'users', uid, 'niggunim', id), rest, { merge: true })
    })
    await batch.commit()
  }
  return items.length
}
