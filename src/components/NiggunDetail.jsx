import React, { useState, useRef } from 'react'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { uploadToDrive } from '../utils/driveUpload'
import ShareButton from './ShareButton'

const MOODS = ['שבת', 'שמח', 'עצוב', 'מהיר', 'איטי', 'דבקות', 'תפילה', 'אחר']

function getAudioFiles(niggun) {
  if (niggun.audioFiles && niggun.audioFiles.length > 0) return niggun.audioFiles
  if (niggun.audioUrl) return [{ url: niggun.audioUrl, name: niggun.audioFileName || 'הקלטה' }]
  return []
}


// נגן שמע ל-Google Drive — מוריד blob עם הטוקן; אם פג תוקף — לינק בשקט
function DriveAudioPlayer({ fileId, fileName }) {
  const [src, setSrc] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let objectUrl = null
    async function load() {
      const token = localStorage.getItem('driveToken')
      if (!token) { setFailed(true); setLoading(false); return }
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) { setFailed(true); setLoading(false); return }
        const blob = await res.blob()
        const ext = (fileName || '').split('.').pop().toLowerCase()
        const mimeMap = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg' }
        const mime = (blob.type && blob.type !== 'application/octet-stream')
          ? blob.type
          : (mimeMap[ext] || 'audio/mp4')
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }))
        setSrc(objectUrl)
      } catch {
        setFailed(true)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [fileId, fileName])

  if (loading) return <div className="drive-loading">⏳ טוען הקלטה...</div>

  if (failed || !src) return (
    <a href={`https://drive.google.com/file/d/${fileId}/view`}
       target="_blank" rel="noreferrer"
       className="drive-open-link">
      🔗 פתח ב-Google Drive
    </a>
  )

  return (
    <div dir="ltr">
      <audio controls className="audio-player" src={src}
             onError={() => setFailed(true)} />
    </div>
  )
}

let nextId = 100

export default function NiggunDetail({ niggun, uid, getDriveToken, onBack, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: niggun.name || '',
    chords: niggun.chords || '',
    story: niggun.story || '',
    mood: niggun.mood || '',
    hebrewDate: niggun.hebrewDate || '',
  })
  const [existingFiles, setExistingFiles] = useState(getAudioFiles(niggun))
  const [newFiles, setNewFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  const uploading = newFiles.some(f => f.status === 'uploading')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleNewFilesSelect(rawFiles) {
    const valid = Array.from(rawFiles).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|aac)$/i.test(f.name)
    )
    const entries = valid.map(file => ({
      id: nextId++, file, status: 'uploading', progress: 0, result: null
    }))
    setNewFiles(prev => [...prev, ...entries])
    entries.forEach(entry => startUpload(entry))
  }

  async function startUpload(entry) {
    try {
      let token = await getDriveToken()
      if (!token) throw new Error('אין גישה ל-Google Drive. אנא התנתק והתחבר מחדש.')

      let result
      try {
        result = await uploadToDrive(entry.file, token, (progress) => {
          setNewFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress } : f))
        })
      } catch (uploadErr) {
        if (uploadErr.message === 'TOKEN_EXPIRED') {
          token = await getDriveToken(true)
          if (!token) throw new Error('לא ניתן לחדש את החיבור ל-Google Drive')
          result = await uploadToDrive(entry.file, token, (progress) => {
            setNewFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress } : f))
          })
        } else {
          throw uploadErr
        }
      }

      setNewFiles(prev => prev.map(f => f.id === entry.id
        ? { ...f, status: 'done', progress: 100, result }
        : f
      ))
    } catch (err) {
      setNewFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'error' } : f))
      setError('שגיאת העלאה: ' + err.message)
    }
  }

  function removeExistingFile(idx) {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function removeNewFile(id) {
    setNewFiles(prev => prev.filter(f => f.id !== id))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('שם הניגון חובה'); return }
    setSaving(true)
    setError('')
    try {
      const uploadedNew = newFiles.filter(f => f.status === 'done').map(f => f.result)
      const allAudioFiles = [...existingFiles, ...uploadedNew]
      const updates = {
        ...form,
        audioFiles: allAudioFiles,
        audioUrl: allAudioFiles[0]?.url || '',
        audioFileName: allAudioFiles[0]?.name || '',
      }
      await updateDoc(doc(db, 'users', uid, 'niggunim', niggun.id), updates)
      onUpdated({ ...niggun, ...updates })
      setEditing(false)
      setNewFiles([])
    } catch (err) {
      setError('שגיאה: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteDoc(doc(db, 'users', uid, 'niggunim', niggun.id))
      onDeleted(niggun.id)
    } catch (err) {
      setError('שגיאה במחיקה: ' + err.message)
    }
  }

  const displayAudioFiles = getAudioFiles(niggun)

  if (editing) {
    return (
      <div>
        <div className="detail-header">
          <button className="detail-back" onClick={() => setEditing(false)}>←</button>
          <h1 className="detail-name">✏️ עריכת ניגון</h1>
        </div>

        <div className="form-group">
          <label className="form-label">שם הניגון *</label>
          <input className="form-input" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">אקורדים</label>
          <input className="form-input" name="chords" value={form.chords} onChange={handleChange} dir="ltr" />
        </div>
        <div className="form-group">
          <label className="form-label">מצב רוח</label>
          <select className="form-input filter-select" name="mood" value={form.mood}
            onChange={handleChange} style={{ width: '100%' }}>
            <option value="">— בחר —</option>
            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">תאריך עברי</label>
          <input className="form-input" name="hebrewDate" value={form.hebrewDate} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">סיפור</label>
          <textarea className="form-input" name="story" value={form.story} onChange={handleChange} rows={5} />
        </div>

        <div className="form-group">
          <label className="form-label">הקלטות קיימות</label>
          {existingFiles.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>אין הקלטות</p>
          ) : (
            <div className="audio-files-list">
              {existingFiles.map((f, i) => (
                <div key={i} className="audio-file-item done">
                  <span className="audio-file-name">✅ {f.name}</span>
                  <button type="button" className="remove-file-btn" onClick={() => removeExistingFile(i)}>✕ הסר</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">הוסף הקלטות</label>
          <div className="audio-upload" onClick={() => fileInputRef.current.click()}>
            <input ref={fileInputRef} type="file" accept="audio/*,.aac,.mp3,.m4a,.wav,.ogg,.flac,.wma,.opus" multiple
              onChange={e => handleNewFilesSelect(e.target.files)} />
            <div className="audio-upload-text">🎵 <strong>לחץ להוספת קבצים</strong> — יעלו מיד</div>
          </div>
          {newFiles.length > 0 && (
            <div className="audio-files-list" style={{ marginTop: 8 }}>
              {newFiles.map(f => (
                <div key={f.id} className={`audio-file-item ${f.status}`}>
                  <span className="audio-file-name">
                    {f.status === 'uploading' ? '⏫' : f.status === 'done' ? '✅' : '❌'} {f.file.name}
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
                    {f.status !== 'uploading' && (
                      <button type="button" className="remove-file-btn" onClick={() => removeNewFile(f.id)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {uploading && <div className="upload-status-msg">⏳ מעלה קבצים... יש להמתין</div>}
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>⚠️ {error}</div>}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>ביטול</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
            {saving ? '💾 שומר...' : uploading ? '⏳ ממתין להעלאה...' : '💾 שמור'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="detail-header">
        <button className="detail-back" onClick={onBack}>←</button>
        <h1 className="detail-name">{niggun.name}</h1>
      </div>

      <div className="detail-meta">
        {niggun.mood && <span className="meta-chip mood">🎭 {niggun.mood}</span>}
        {niggun.hebrewDate && <span className="meta-chip">📅 {niggun.hebrewDate}</span>}
        {displayAudioFiles.length > 0 && (
          <span className="meta-chip">🎵 {displayAudioFiles.length > 1 ? `${displayAudioFiles.length} הקלטות` : 'הקלטה'}</span>
        )}
      </div>

      {niggun.chords && (
        <div className="detail-section">
          <div className="detail-section-label">אקורדים</div>
          <div className="detail-chords" dir="ltr">{niggun.chords}</div>
        </div>
      )}

      {displayAudioFiles.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-label">הקלטות</div>
          <div className="audio-players-list">
            {displayAudioFiles.map((f, i) => {
              const driveId = f.fileId || f.url?.match(/[?&]id=([^&]+)/)?.[1]
              return (
                <div key={i} className="audio-player-item">
                  <div className="audio-player-name">🎵 {f.name || `הקלטה ${i + 1}`}</div>
                  {driveId
                    ? <DriveAudioPlayer key={driveId} fileId={driveId} fileName={f.name} />
                    : <div dir="ltr"><audio controls className="audio-player" src={f.url} /></div>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}

      {niggun.story && (
        <div className="detail-section">
          <div className="detail-section-label">סיפור הניגון</div>
          <div className="detail-story">{niggun.story}</div>
        </div>
      )}

      {error && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>⚠️ {error}</div>}

      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ ערוך</button>
        <ShareButton niggun={niggun} />
        {confirmDelete ? (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>בטוח למחוק?</span>
            <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>ביטול</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>🗑️ מחק</button>
        )}
      </div>
    </div>
  )
}
