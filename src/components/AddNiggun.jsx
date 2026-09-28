import { useState } from 'react'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAudioUploads } from '../hooks/useAudioUploads'
import { deleteStorageFiles } from '../utils/storageUpload'
import { docToForm, formToDoc } from '../lib/niggun'
import Modal from './Modal'
import NiggunFormFields from './NiggunFormFields'
import AudioInputs from './AudioInputs'

function getHebrewDate() {
  try {
    return new Date().toLocaleDateString('he-IL-u-ca-hebrew', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '' }
}

export default function AddNiggun({ uid, onClose, onAdded, onSaveError, tagSuggestions, quickRecord = false, onBusyChange }) {
  const [form, setForm] = useState(() => ({ ...docToForm(), hebrewDate: getHebrewDate() }))
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const uploads = useAudioUploads(uid, setError)

  function setRecordingState(active) {
    setRecording(active)
    onBusyChange?.(active)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const audioFiles = uploads.done
    const data = formToDoc(form)
    // הקלטה מהירה בלי שם — שם זמני, אפשר לערוך אחר כך
    if (!data.name) {
      if (!audioFiles.length) { setError('תן שם לניגון או הוסף הקלטה'); return }
      data.name = `ניגון חדש · ${form.hebrewDate || new Date().toLocaleDateString('he-IL')}`
    }
    // כתיבה אופטימית: המטמון המקומי של Firestore מציג את הניגון מיד (גם בלי רשת),
    // וה-Promise מסתיים רק כשהשרת מאשר — לכן לא מחכים לו כדי לסגור את המודאל
    setDoc(doc(collection(db, 'users', uid, 'niggunim')), {
      ...data,
      audioFiles,
      createdAt: serverTimestamp(),
    }).catch(err => {
      // השרת דחה — הניגון לא נשמר, אז גם ההקלטות שלו מיותרות
      deleteStorageFiles(audioFiles.map(f => f.url))
      onSaveError('שגיאה בשמירת הניגון: ' + (err.code || err.message))
    })
    uploads.commit()
    onBusyChange?.(false)
    onAdded()
    onClose()
  }

  function requestClose() {
    if (recording && !window.confirm('ההקלטה עדיין רצה. לצאת בלי לשמור אותה?')) return
    onBusyChange?.(false)
    onClose()
  }

  // קבצים שהועלו ולא נשמרו נמחקים אוטומטית כשהמודאל נסגר (useAudioUploads)
  return (
    <Modal titleId="add-niggun-title" onClose={requestClose}>
      <h2 className="modal-title" id="add-niggun-title">{quickRecord ? '🎙️ הקלטה מהירה' : '➕ הוסף ניגון חדש'}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <span className="form-label">הקלטות</span>
          <AudioInputs uploads={uploads} onError={setError} onRecordingChange={setRecordingState} autoRecord={quickRecord} />
        </div>

        <NiggunFormFields form={form} setForm={setForm} tagSuggestions={tagSuggestions} autoFocus={!quickRecord} />

        {error && <div className="form-error" role="alert">⚠️ {error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={requestClose}>
            ביטול
          </button>
          <button type="submit" className="btn btn-primary" disabled={uploads.uploading || recording}>
            {recording ? '🎙️ מקליט...' : uploads.uploading ? '⏳ ממתין להעלאה...' : '💾 שמור ניגון'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
