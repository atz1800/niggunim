import { useRef, useState } from 'react'
import Modal from './Modal'
import { exportJson, exportZip, importJson } from '../utils/backup'
import { getAudioFiles } from '../lib/audio'

export default function BackupDialog({ uid, niggunim, onClose, onToast }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const recordings = niggunim.reduce((sum, n) => sum + getAudioFiles(n).length, 0)

  async function handleZip() {
    setError('')
    setBusy('מכין קובץ...')
    try {
      await exportZip(niggunim, (done, total) => setBusy(`מוריד הקלטות ${done}/${total}...`))
      onToast('✅ הגיבוי המלא ירד')
    } catch (err) {
      setError(err.message === 'NO_CORS'
        ? 'הדפדפן לא הורשה להוריד את ההקלטות (חסרה הגדרת CORS ב-Storage). הגיבוי המהיר עדיין עובד.'
        : 'שגיאה בגיבוי: ' + err.message)
    } finally {
      setBusy('')
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm('לשחזר מהקובץ? ניגונים קיימים עם אותו מזהה יתעדכנו, ושום דבר לא יימחק.')) return
    setError('')
    setBusy('משחזר...')
    try {
      const count = await importJson(file, uid)
      onToast(`✅ שוחזרו ${count} ניגונים`)
      onClose()
    } catch (err) {
      setError(err.message === 'INVALID_FILE' ? 'זה לא קובץ גיבוי של יומן הניגונים' : 'שגיאה בשחזור: ' + err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal titleId="backup-title" onClose={onClose}>
      <h2 className="modal-title" id="backup-title">💾 גיבוי ושחזור</h2>
      <p className="muted-text backup-summary">{niggunim.length} ניגונים · {recordings} הקלטות</p>

      <div className="backup-options">
        <button type="button" className="backup-option" onClick={() => { exportJson(niggunim); onToast('✅ קובץ הגיבוי ירד') }} disabled={!!busy}>
          <strong>📄 גיבוי מהיר</strong>
          <span>כל הנתונים וקישורים להקלטות, בקובץ JSON קטן</span>
        </button>
        <button type="button" className="backup-option" onClick={handleZip} disabled={!!busy || !recordings}>
          <strong>🗜️ גיבוי מלא</strong>
          <span>קובץ ZIP עם כל ההקלטות עצמן — לשמירה במחשב או בענן</span>
        </button>
        <button type="button" className="backup-option" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          <strong>♻️ שחזור מגיבוי</strong>
          <span>טעינת קובץ JSON שנוצר כאן (או backup.json מתוך ה-ZIP)</span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
      </div>

      {busy && <div className="upload-status-msg" role="status">⏳ {busy}</div>}
      {error && <div className="form-error" role="alert">⚠️ {error}</div>}
    </Modal>
  )
}
