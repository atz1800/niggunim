import { useState, useRef, useEffect } from 'react'
import { uploadToStorage, deleteStorageFiles } from '../utils/storageUpload'
import { isAudioFile, isTooLarge } from '../lib/audio'
import { MAX_AUDIO_MB } from '../lib/constants'

/**
 * ניהול העלאות אודיו חדשות (טרם נשמרו ב-Firestore).
 * קבצים שהועלו ולא נשמרו נמחקים מ-Storage ב-discard() / remove() כדי לא להשאיר יתומים.
 */
export function useAudioUploads(uid, onError) {
  const [files, setFiles] = useState([])
  const nextId = useRef(1)
  const filesRef = useRef(files)
  const mounted = useRef(true)

  // יציאה בלי שמירה (למשל מחוות "חזור") — מנקים את מה שהועלה
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const urls = filesRef.current.filter(f => f.result).map(f => f.result.url)
      if (urls.length) deleteStorageFiles(urls)
    }
  }, [])

  const update = (id, patch) => {
    filesRef.current = filesRef.current.map(f => f.id === id ? { ...f, ...patch } : f)
    setFiles(filesRef.current)
  }

  async function startUpload(entry) {
    try {
      const result = await uploadToStorage(entry.file, uid, progress => update(entry.id, { progress }))
      // אם המשתמש כבר הסיר/ביטל/יצא בזמן ההעלאה — מוחקים מיד
      const stillWanted = mounted.current && filesRef.current.some(f => f.id === entry.id)
      if (!stillWanted) { deleteStorageFiles([result.url]); return }
      filesRef.current = filesRef.current.map(f => f.id === entry.id
        ? { ...f, status: 'done', progress: 100, result } : f)
      setFiles(filesRef.current)
    } catch (err) {
      if (!mounted.current) return
      update(entry.id, { status: 'error', progress: 0 })
      onError?.('שגיאת העלאה: ' + (err.code || err.message))
    }
  }

  function add(rawFiles) {
    const all = Array.from(rawFiles)
    const audio = all.filter(isAudioFile)
    if (!audio.length) { onError?.('קבצי שמע בלבד (MP3, M4A, WAV, AAC, FLAC, OPUS ועוד)'); return }
    const valid = audio.filter(f => !isTooLarge(f))
    if (valid.length < audio.length) onError?.(`קבצים מעל ${MAX_AUDIO_MB}MB לא הועלו`)
    else onError?.('')
    const entries = valid.map(file => ({
      id: nextId.current++, file, status: 'uploading', progress: 0, result: null,
    }))
    filesRef.current = [...filesRef.current, ...entries]
    setFiles(filesRef.current)
    entries.forEach(startUpload)
  }

  function remove(id) {
    const f = filesRef.current.find(x => x.id === id)
    if (f?.result) deleteStorageFiles([f.result.url])
    filesRef.current = filesRef.current.filter(x => x.id !== id)
    setFiles(filesRef.current)
  }

  // ביטול: מוחקים את כל מה שהועלה ולא נשמר
  function discard() {
    const urls = filesRef.current.filter(f => f.result).map(f => f.result.url)
    if (urls.length) deleteStorageFiles(urls)
    filesRef.current = []
    setFiles([])
  }

  // אחרי שמירה מוצלחת — הקבצים שייכים לניגון, אין למחוק
  function commit() {
    filesRef.current = []
    setFiles([])
  }

  const done = files.filter(f => f.status === 'done').map(f => f.result)
  const uploading = files.some(f => f.status === 'uploading')

  return { files, done, uploading, add, remove, discard, commit }
}
