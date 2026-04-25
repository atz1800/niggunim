import React, { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { uploadToDrive } from '../utils/driveUpload'

const MOODS = ['שבת', 'שמח', 'עצוב', 'מהיר', 'איטי', 'דבקות', 'תפילה', 'אחר']

function getHebrewDate() {
  try {
    return new Date().toLocaleDateString('he-IL-u-ca-hebrew', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '' }
}

let nextId = 1

export default function AddNiggun({ uid, getDriveToken, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '', chords: '', story: '', mood: '', hebrewDate: getHebrewDate(),
  })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const uploading = files.some(f => f.status === 'uploading')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleFilesSelect(rawFiles) {
    const allowed = /\.(mp3|m4a|wav|ogg|aac)$/i
    const valid = Array.from(rawFiles).filter(f =>
      f.type.startsWith('audio/') || allowed.test(f.name)
    )
    if (!valid.length) { setError('קבצי שמע בלבד (MP3, M4A, WAV)'); return }
    setError('')
    const entries = valid.map(file => ({
      id: nextId++, file, status: 'uploading', progress: 0, result: null
    }))
    setFiles(prev => [...prev, ...entries])
    entries.forEach(entry => startUpload(entry))
  }

  async function startUpload(entry) {
    try {
      let token = await getDriveToken()
      if (!token) throw new Error('אין גישה ל-Google Drive. אנא התנתק והתחבר מחדש.')

      let result
      try {
        result = await uploadToDrive(entry.file, token, (progress) => {
          setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress } : f))
        })
      } catch (uploadErr) {
        if (uploadErr.message === 'TOKEN_EXPIRED') {
          token = await getDriveToken(true)
          if (!token) throw new Error('לא ניתן לחדש את החיבור ל-Google Drive')
          result = await uploadToDrive(entry.file, token, (progress) => {
            setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress } : f))
          })
        } else {
          throw uploadErr
        }
      }

      setFiles(prev => prev.map(f => f.id === entry.id
        ? { ...f, status: 'done', progress: 100, result }
        : f
      ))
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === entry.id
        ? { ...f, status: 'error', progress: 0 }
        : f
      ))
      setError('שגיאת העלאה: ' + err.message)
    }
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הניגון חובה'); return }
    setSaving(true)
    setError('')
    try {
      const audioFiles = files
        .filter(f => f.status === 'done')
        .map(f => f.result)

      const docData = {
        name: form.name.trim(),
        chords: form.chords.trim(),
        story: form.story.trim(),
        mood: form.mood,
        hebrewDate: form.hebrewDate.trim(),
        audioFiles,
        createdAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, 'users', uid, 'niggunim'), docData)
      onAdded({ id: docRef.id, ...docData })
      onClose()
    } catch (err) {
      setError('שגיאה בשמירה: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">➕ הוסף ניגון חדש</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">שם הניגון *</label>
            <input className="form-input" name="name" value={form.name}
              onChange={handleChange} placeholder='לדוגמא: ניגון האדמו"ר' autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">אקורדים</label>
            <input className="form-input" name="chords" value={form.chords}
              onChange={handleChange} placeholder="Am - G - F - E" dir="ltr" />
          </div>

          <div className="form-group">
            <label className="form-label">מצב רוח / קטגוריה</label>
            <select className="form-input filter-select" name="mood" value={form.mood}
              onChange={handleChange} style={{ width: '100%' }}>
              <option value="">— בחר —</option>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">תאריך עברי</label>
            <input className="form-input" name="hebrewDate" value={form.hebrewDate}
              onChange={handleChange} placeholder='י"ד בניסן תשפ"ה' />
          </div>

          <div className="form-group">
            <label className="form-label">סיפור / הקשר</label>
            <textarea className="form-input" name="story" value={form.story}
              onChange={handleChange}
              placeholder="מאיפה למדת את הניגון? באיזה אירוע? מה הוא מעורר בך?"
              rows={4} />
          </div>

          <div className="form-group">
            <label className="form-label">הקלטות — ניתן לבחור כמה קבצים</label>
            <div
              className={`audio-upload ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFilesSelect(e.dataTransfer.files) }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.aac,.mp3,.m4a,.wav,.ogg,.flac,.wma,.opus"
                multiple
                onChange={e => handleFilesSelect(e.target.files)}
              />
              <div className="audio-upload-text">
                🎵 גרור קבצים לכאן או <strong>לחץ לבחירה</strong>
                <div style={{ fontSize: '0.8rem', marginTop: 4, opacity: 0.7 }}>
                  MP3 / M4A / WAV — יעלה ל-Google Drive שלך אוטומטית
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="audio-files-list">
                {files.map(f => (
                  <div key={f.id} className={`audio-file-item ${f.status}`}>
                    <span className="audio-file-name">
                      {f.status === 'uploading' && '⏫'}
                      {f.status === 'done' && '✅'}
                      {f.status === 'error' && '❌'}
                      {' '}{f.file.name}
                    </span>
                    <div className="audio-file-right">
                      {f.status === 'uploading' && (
                        <div className="upload-progress-wrapper">
                          <div className="file-progress-bar">
                            <div className="file-progress-fill" style={{ width: `${f.progress}%` }} />
                          </div>
                          <span className="file-progress-text">{f.progress}%</span>
                        </div>
                      )}
                      {f.status === 'done' && (
                        <span className="file-done-label">הועלה</span>
                      )}
                      {f.status !== 'uploading' && (
                        <button type="button" className="remove-file-btn" onClick={() => removeFile(f.id)}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="upload-status-msg">⏳ מעלה ל-Google Drive... יש להמתין לפני השמירה</div>
            )}
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              ביטול
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? '💾 שומר...' : uploading ? '⏳ ממתין להעלאה...' : '💾 שמור ניגון'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
