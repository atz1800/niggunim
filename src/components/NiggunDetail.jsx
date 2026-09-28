import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { uploadToStorage, deleteStorageFiles } from '../utils/storageUpload'
import { getAudioFiles, isDriveUrl } from '../lib/audio'
import { useAudioUploads } from '../hooks/useAudioUploads'
import { getTags, docToForm, formToDoc } from '../lib/niggun'
import ShareButton from './ShareButton'
import NiggunFormFields from './NiggunFormFields'
import AudioInputs from './AudioInputs'
import ChordsView from './ChordsView'
import FavoriteButton from './FavoriteButton'

// עדכון אטומי ב-Firestore — transaction מונע race condition כשכמה קבצים מגרים במקביל
async function migrateUrlInFirestore(oldUrl, newUrl, uid, niggunId) {
  const ref = doc(db, 'users', uid, 'niggunim', niggunId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const data = snap.data()
    const audioFiles = getAudioFiles(data).map(f =>
      f.url === oldUrl ? { ...f, url: newUrl } : f
    )
    const updates = { audioFiles }
    if (data.audioUrl === oldUrl) updates.audioUrl = newUrl
    tx.update(ref, updates)
  })
}

function fetchFromDrive(driveId, token) {
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

const driveIdOf = url => url?.match(/[?&]id=([^&]+)/)?.[1]

/**
 * נגן אודיו הרמטי:
 * - Firebase Storage URL → מנגן ישירות, לא פג לעולם
 * - Drive URL + טוקן זמין → מיגרציה אוטומטית שקטה ל-Storage, מעדכן Firestore
 * - Drive URL + אין טוקן → כפתור "העבר" מפורש (לא popup ספונטני)
 * - אחרי מיגרציה אחת — Storage לצמיתות, Drive לא עוד
 */
function AudioPlayer({ audioFile, uid, niggunId, getDriveToken, onPlay }) {
  const { name, url } = audioFile
  const [status, setStatus] = useState(() => isDriveUrl(url) ? 'pending' : 'ready')
  const started = useRef(false)

  async function runMigration(token) {
    setStatus('migrating')
    try {
      const driveId = driveIdOf(url)
      if (!driveId) throw new Error('NO_ID')

      let res = await fetchFromDrive(driveId, token)
      if (res.status === 401) {
        // רענן טוקן — popup אחד בלבד אם הכרחי
        const fresh = await getDriveToken({ force: true })
        if (!fresh) throw new Error('NO_TOKEN')
        res = await fetchFromDrive(driveId, fresh)
      }
      if (!res.ok) throw new Error(`DOWNLOAD_FAILED:${res.status}`)

      const blob = await res.blob()
      const file = new File([blob], name || 'recording', {
        type: blob.type?.startsWith('audio/') ? blob.type : '',
      })
      const { url: newUrl } = await uploadToStorage(file, uid)
      // העדכון ב-Firestore יגיע בחזרה דרך onSnapshot, והנגן יתחלף ל-URL החדש
      await migrateUrlInFirestore(url, newUrl, uid, niggunId)
    } catch (err) {
      console.warn('Migration failed:', err.message)
      setStatus('failed')
    }
  }

  useEffect(() => {
    if (status !== 'pending' || started.current) return
    started.current = true
    getDriveToken({ interactive: false }).then(token => {
      if (token) runMigration(token) // טוקן קיים → מגר בשקט
      else setStatus('needsAuth')    // אין טוקן → הצג כפתור, לא popup
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleMigrateClick() {
    const token = await getDriveToken({ force: true })
    if (token) runMigration(token)
    else setStatus('failed')
  }

  if (status === 'pending' || status === 'migrating') return (
    <div className="drive-loading" role="status">🔄 מעביר לאחסון קבוע... (פעם אחת בלבד)</div>
  )

  if (status === 'needsAuth') return (
    <button type="button" className="btn-migrate" onClick={handleMigrateClick}>
      🔒 הפעל הקלטה — העברה חד-פעמית לאחסון קבוע
    </button>
  )

  if (status === 'failed') {
    const driveId = driveIdOf(url)
    if (!driveId) return <div className="drive-loading">⚠️ לא ניתן לנגן את ההקלטה</div>
    return (
      <a href={`https://drive.google.com/file/d/${driveId}/view`}
         target="_blank" rel="noreferrer" className="drive-open-link">
        🔗 פתח ב-Google Drive
      </a>
    )
  }

  return (
    <div dir="ltr">
      <audio controls preload="metadata" className="audio-player" src={url}
             aria-label={name || 'הקלטה'} onError={() => setStatus('failed')} onPlay={onPlay} />
    </div>
  )
}

function EditNiggun({ niggun, uid, onCancel, onSaved, onSaveError, tagSuggestions }) {
  // מאותחל מהגרסה העדכנית ביותר של הניגון ברגע הכניסה לעריכה
  const [form, setForm] = useState(() => docToForm(niggun))
  const [recording, setRecording] = useState(false)
  const [existingFiles, setExistingFiles] = useState(() => getAudioFiles(niggun))
  const [error, setError] = useState('')
  const uploads = useAudioUploads(uid, setError)

  function handleCancel() {
    if (recording && !window.confirm('ההקלטה עדיין רצה. לצאת בלי לשמור אותה?')) return
    uploads.discard()
    onCancel()
  }

  function handleSave(e) {
    e.preventDefault()
    const data = formToDoc(form)
    if (!data.name) { setError('שם הניגון חובה'); return }
    const added = uploads.done
    const allAudioFiles = [...existingFiles, ...added]
    const keptUrls = new Set(allAudioFiles.map(f => f.url))
    const removed = getAudioFiles(niggun).map(f => f.url).filter(u => !keptUrls.has(u))
    // כתיבה אופטימית (ראה AddNiggun) — המסך מתעדכן מיד מהמטמון המקומי
    updateDoc(doc(db, 'users', uid, 'niggunim', niggun.id), {
      ...data,
      audioFiles: allAudioFiles,
      audioUrl: allAudioFiles[0]?.url || '',
      audioFileName: allAudioFiles[0]?.name || '',
    }).then(() => {
      // הקלטות שהוסרו נמחקות מ-Storage רק אחרי שהשרת אישר את השמירה
      if (removed.length) deleteStorageFiles(removed)
    }).catch(err => {
      deleteStorageFiles(added.map(f => f.url))
      onSaveError('שגיאה בשמירת השינויים: ' + (err.code || err.message))
    })
    uploads.commit()
    onSaved()
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <div className="detail-header">
        <button type="button" className="detail-back" onClick={handleCancel} aria-label="חזרה בלי לשמור">←</button>
        <h1 className="detail-name">✏️ עריכת ניגון</h1>
      </div>

      <NiggunFormFields form={form} setForm={setForm} tagSuggestions={tagSuggestions} />

      <div className="form-group">
        <span className="form-label">הקלטות קיימות</span>
        {existingFiles.length === 0 ? (
          <p className="muted-text">אין הקלטות</p>
        ) : (
          <ul className="audio-files-list">
            {existingFiles.map((f, i) => (
              <li key={f.url || i} className="audio-file-item done">
                <span className="audio-file-name">🎵 {f.name || `הקלטה ${i + 1}`}</span>
                <button type="button" className="remove-file-btn"
                  onClick={() => setExistingFiles(prev => prev.filter((_, j) => j !== i))}
                  aria-label={`הסר ${f.name || `הקלטה ${i + 1}`}`}>✕ הסר</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">הוסף הקלטות</span>
        <AudioInputs uploads={uploads} onError={setError} onRecordingChange={setRecording} />
      </div>

      {error && <div className="form-error" role="alert">⚠️ {error}</div>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={handleCancel}>ביטול</button>
        <button type="submit" className="btn btn-primary" disabled={uploads.uploading || recording}>
          {recording ? '🎙️ מקליט...' : uploads.uploading ? '⏳ ממתין להעלאה...' : '💾 שמור'}
        </button>
      </div>
    </form>
  )
}

export default function NiggunDetail({ niggun, uid, getDriveToken, onBack, onUpdated, onDelete, onSaveError, tagSuggestions }) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const markedPlayed = useRef(false)

  // "נוגן לאחרונה" — פעם אחת לכל פתיחה של המסך
  function markPlayed() {
    if (markedPlayed.current) return
    markedPlayed.current = true
    updateDoc(doc(db, 'users', uid, 'niggunim', niggun.id), { lastPlayedAt: serverTimestamp() }).catch(() => {})
  }

  if (editing) {
    return (
      <EditNiggun
        niggun={niggun}
        uid={uid}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); onUpdated() }}
        onSaveError={onSaveError}
        tagSuggestions={tagSuggestions}
      />
    )
  }

  const audioFiles = getAudioFiles(niggun)
  const tags = getTags(niggun)

  return (
    <div>
      <div className="detail-header">
        <button type="button" className="detail-back" onClick={onBack} aria-label="חזרה לרשימה">←</button>
        <h1 className="detail-name">{niggun.name}</h1>
        <FavoriteButton uid={uid} niggun={niggun} className="detail-fav" />
      </div>

      <div className="detail-meta">
        {tags.map(t => <span key={t} className="meta-chip mood">{t}</span>)}
        {niggun.source && <span className="meta-chip">🕍 {niggun.source}</span>}
        {niggun.composer && <span className="meta-chip">✍️ {niggun.composer}</span>}
        {niggun.hebrewDate && <span className="meta-chip">📅 {niggun.hebrewDate}</span>}
        {audioFiles.length > 0 && (
          <span className="meta-chip">🎵 {audioFiles.length > 1 ? `${audioFiles.length} הקלטות` : 'הקלטה'}</span>
        )}
      </div>

      {niggun.chords && (
        <section className="detail-section">
          <h2 className="detail-section-label">אקורדים</h2>
          <ChordsView chords={niggun.chords} />
        </section>
      )}

      {audioFiles.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-section-label">הקלטות</h2>
          <div className="audio-players-list">
            {audioFiles.map((f, i) => (
              <div key={f.url || i} className="audio-player-item">
                <div className="audio-player-name">🎵 {f.name || `הקלטה ${i + 1}`}</div>
                <AudioPlayer
                  audioFile={f}
                  uid={uid}
                  niggunId={niggun.id}
                  getDriveToken={getDriveToken}
                  onPlay={markPlayed}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {niggun.lyrics && (
        <section className="detail-section">
          <h2 className="detail-section-label">מילים</h2>
          <div className="detail-story detail-lyrics">{niggun.lyrics}</div>
        </section>
      )}

      {niggun.story && (
        <section className="detail-section">
          <h2 className="detail-section-label">סיפור הניגון</h2>
          <div className="detail-story">{niggun.story}</div>
        </section>
      )}

      <div className="detail-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ ערוך</button>
        <ShareButton niggun={niggun} />
        {confirmDelete ? (
          <>
            <span className="muted-text confirm-text">בטוח למחוק?</span>
            <button type="button" className="btn btn-danger" onClick={() => onDelete(niggun)}>מחק</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>ביטול</button>
          </>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>🗑️ מחק</button>
        )}
      </div>
    </div>
  )
}
