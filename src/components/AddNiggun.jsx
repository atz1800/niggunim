import { useState } from 'react'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAudioUploads } from '../hooks/useAudioUploads'
import { deleteStorageFiles } from '../utils/storageUpload'
import Modal from './Modal'
import NiggunFormFields from './NiggunFormFields'
import FileUploadList from './FileUploadList'
import AudioDropZone from './AudioDropZone'

function getHebrewDate() {
  try {
    return new Date().toLocaleDateString('he-IL-u-ca-hebrew', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '' }
}

export default function AddNiggun({ uid, onClose, onAdded, onSaveError }) {
  const [form, setForm] = useState(() => ({
    name: '', chords: '', story: '', mood: '', hebrewDate: getHebrewDate(),
  }))
  const [error, setError] = useState('')
  const uploads = useAudioUploads(uid, setError)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הניגון חובה'); return }
    const audioFiles = uploads.done
    // כתיבה אופטימית: המטמון המקומי של Firestore מציג את הניגון מיד (גם בלי רשת),
    // וה-Promise מסתיים רק כשהשרת מאשר — לכן לא מחכים לו כדי לסגור את המודאל
    setDoc(doc(collection(db, 'users', uid, 'niggunim')), {
      name: form.name.trim(),
      chords: form.chords.trim(),
      story: form.story.trim(),
      mood: form.mood,
      hebrewDate: form.hebrewDate.trim(),
      audioFiles,
      createdAt: serverTimestamp(),
    }).catch(err => {
      // השרת דחה — הניגון לא נשמר, אז גם ההקלטות שלו מיותרות
      deleteStorageFiles(audioFiles.map(f => f.url))
      onSaveError('שגיאה בשמירת הניגון: ' + (err.code || err.message))
    })
    uploads.commit()
    onAdded()
    onClose()
  }

  // קבצים שהועלו ולא נשמרו נמחקים אוטומטית כשהמודאל נסגר (useAudioUploads)
  return (
    <Modal titleId="add-niggun-title" onClose={onClose}>
      <h2 className="modal-title" id="add-niggun-title">➕ הוסף ניגון חדש</h2>

      <form onSubmit={handleSubmit} noValidate>
        <NiggunFormFields form={form} onChange={handleChange} autoFocus />

        <div className="form-group">
          <span className="form-label">הקלטות — ניתן לבחור כמה קבצים</span>
          <AudioDropZone onFiles={uploads.add}>
            🎵 גרור קבצים לכאן או <strong>לחץ לבחירה</strong>
          </AudioDropZone>
          <FileUploadList files={uploads.files} onRemove={uploads.remove} />
          {uploads.uploading && (
            <div className="upload-status-msg" role="status">⏳ מעלה הקלטות... יש להמתין לפני השמירה</div>
          )}
        </div>

        {error && <div className="form-error" role="alert">⚠️ {error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="submit" className="btn btn-primary" disabled={uploads.uploading}>
            {uploads.uploading ? '⏳ ממתין להעלאה...' : '💾 שמור ניגון'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
