import { MAX_AUDIO_MB } from './constants'

const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac|flac|wma|opus|webm)$/i

const MIME_BY_EXT = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
  wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  wma: 'audio/x-ms-wma', opus: 'audio/ogg', webm: 'audio/webm',
}

export function isAudioFile(file) {
  return file.type?.startsWith('audio/') || AUDIO_EXT.test(file.name)
}

export function isTooLarge(file) {
  return file.size > MAX_AUDIO_MB * 1024 * 1024
}

// חלק מהמכשירים (בעיקר אנדרואיד) מחזירים type ריק או octet-stream עבור m4a/aac —
// בלי contentType תקין Safari מסרב לנגן
export function getAudioMimeType(file) {
  if (file.type && file.type.startsWith('audio/')) return file.type
  const ext = file.name.split('.').pop().toLowerCase()
  return MIME_BY_EXT[ext] || 'audio/mpeg'
}

// שם בטוח לנתיב ב-Storage — בלי / # ? וכו'. עברית נשמרת.
export function safeFileName(name) {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[/\\#?%*:|"<>[\]\u0000-\u001f]/g, '_').trim()
  return cleaned.slice(-120) || 'recording'
}

export function getAudioFiles(niggun) {
  if (niggun.audioFiles?.length) return niggun.audioFiles
  if (niggun.audioUrl) return [{ url: niggun.audioUrl, name: niggun.audioFileName || 'הקלטה' }]
  return []
}

// download URL של Firebase Storage (גם בפרודקשן וגם באמולטור): .../v0/b/<bucket>/o/<path>
export function isStorageUrl(url) {
  return typeof url === 'string' && /\/v0\/b\/[^/]+\/o\//.test(url)
}

export function isDriveUrl(url) {
  return typeof url === 'string' &&
    (url.includes('drive.google.com') || url.includes('googleapis.com/drive'))
}

// הקלטות webm ישנות (לפני שהתחלנו לכתוב את האורך לקובץ) מדווחות משך Infinity,
// ואז אי אפשר לקפוץ בהן. קפיצה זמנית לסוף הקובץ גורמת לדפדפן לחשב את המשך האמיתי,
// ואז חוזרים למקום. בזמן התיקון a.dataset.fixingDuration מסומן והנגן מושתק.
export function fixInfiniteDuration(e) {
  const a = e.currentTarget
  if (a.duration !== Infinity || a.dataset.fixingDuration) return
  const pos = a.currentTime
  const wasMuted = a.muted
  a.dataset.fixingDuration = '1'
  a.muted = true
  const done = () => {
    if (!Number.isFinite(a.duration)) return
    a.removeEventListener('durationchange', done)
    a.currentTime = pos
    a.muted = wasMuted
    delete a.dataset.fixingDuration
  }
  a.addEventListener('durationchange', done)
  a.currentTime = 1e101
}

export function isFixingDuration(a) {
  return !!a?.dataset.fixingDuration
}
