import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue, lazy, Suspense } from 'react'
import { collection, orderBy, query, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth, googleProvider } from './firebase'
import NiggunCard from './components/NiggunCard'
import Toast from './components/Toast'
import PlayerBar from './components/PlayerBar'
import SplashScreen, { FloatingNotes } from './components/SplashScreen'
import { shouldShowSplash } from './lib/splash'
import { useBackGuard } from './hooks/useBackGuard'
import { getDriveToken, clearDriveToken } from './utils/driveToken'
import { getAudioFiles, isDriveUrl } from './lib/audio'
import { matchesSearch } from './lib/search'
import { getTags, collectTags, sortNiggunim, SORTS } from './lib/niggun'
import { MOODS } from './lib/constants'
import { recordingSupported } from './hooks/useRecorder'

const loadAddNiggun = () => import('./components/AddNiggun')
const loadNiggunDetail = () => import('./components/NiggunDetail')
const AddNiggun = lazy(loadAddNiggun)
const NiggunDetail = lazy(loadNiggunDetail)
const BackupDialog = lazy(() => import('./components/BackupDialog'))

const FAVORITES = '__favorites__'

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value) } catch { /* חסום */ }
}

// רשימת השמעה: כל ההקלטות של הניגונים לפי הסדר (הקלטות Drive ישנות מדולגות — הן דורשות העברה)
function buildQueue(list) {
  return list.flatMap(n => getAudioFiles(n)
    .filter(f => f.url && !isDriveUrl(f.url))
    .map(f => ({ niggunId: n.id, name: n.name, fileName: f.name, url: f.url })))
}

const QUOTE = '״על ידי נגינה דקדושה יכולין לזכות לבחינת נבואה, כי עיקר הדבקות להשם יתברך הוא על-ידי נגינה.״'
const QUOTE_SOURCE = 'ליקוטי עצות — רבי נחמן מברסלב'
const UNDO_MS = 6000

function Loading({ text = 'טוען...' }) {
  return <div className="loading" role="status"><div className="spinner" aria-hidden="true" />{text}</div>
}

function AppHeader({ user, onLogout, onAdd, showAdd, onBackup }) {
  return (
    <header className="header">
      <div className="header-title">
        <span className="logo" aria-hidden="true">🎵</span>
        <div className="header-title-group">
          <h1>יומן הניגונים שלי</h1>
          <p className="header-quote">{QUOTE}</p>
          <p className="header-quote-source">{QUOTE_SOURCE}</p>
        </div>
      </div>
      {user && (
        <div className="header-actions">
          {showAdd && (
            <button type="button" className="btn btn-primary" onClick={onAdd}>➕ הוסף ניגון</button>
          )}
          {onBackup && (
            <button type="button" className="btn btn-secondary btn-icon" onClick={onBackup}
              title="גיבוי ושחזור" aria-label="גיבוי ושחזור">💾</button>
          )}
          <div className="user-info">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="user-avatar" title={user.displayName || ''}
                referrerPolicy="no-referrer" />
            )}
            <button type="button" className="btn btn-secondary btn-logout" onClick={onLogout}>↩ התנתק</button>
          </div>
        </div>
      )}
    </header>
  )
}

const LOGIN_ERRORS = {
  'auth/popup-blocked': 'הדפדפן חסם את חלון ההתחברות — אפשר חלונות קופצים ונסה שוב',
  'auth/network-request-failed': 'אין חיבור לרשת',
}

export default function App() {
  const [splashDone, setSplashDone] = useState(() => !shouldShowSplash())
  const [user, setUser] = useState(undefined)
  // הנתונים נשמרים יחד עם ה-uid שאליו הם שייכים — כך "טוען" נגזר ולא מנוהל ידנית
  const [data, setData] = useState({ uid: null, items: [] })
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState(() => readPref('sort', 'newest'))
  const [quickRecord, setQuickRecord] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [player, setPlayer] = useState(null) // { queue, index }
  const addBusy = useRef(false)
  const playedThisSession = useRef(new Set())
  const [toast, setToast] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const toastTimer = useRef(null)
  const pendingRef = useRef(null)

  const deferredSearch = useDeferredValue(search)
  const loading = !!user && data.uid !== user.uid
  const niggunim = useMemo(
    () => (data.uid === user?.uid ? data.items : []).filter(n => n.id !== pendingDelete?.id),
    [data, user, pendingDelete]
  )
  // תמיד הגרסה העדכנית מ-Firestore (למשל אחרי מיגרציית הקלטה) — לא עותק ישן
  const selected = selectedId ? niggunim.find(n => n.id === selectedId) || null : null

  // מחוות "חזור": סוגרת מסך פירוט / מודאל הוספה לפני יציאה מהאפליקציה
  useBackGuard([
    { open: !!selected, close: () => setSelectedId(null) },
    { open: showBackup, close: () => setShowBackup(false) },
    {
      open: showAdd,
      close: () => {
        // הקלטה רצה — לא זורקים אותה בטעות במחוות "חזור"
        if (addBusy.current && !window.confirm('ההקלטה עדיין רצה. לצאת בלי לשמור אותה?')) return
        addBusy.current = false
        setShowAdd(false)
      },
    },
  ])

  // רק הקלטה אחת מתנגנת בכל רגע (נגן תחתון / נגני מסך הפירוט)
  useEffect(() => {
    const onPlay = e => document.querySelectorAll('audio').forEach(a => { if (a !== e.target && !a.paused) a.pause() })
    document.addEventListener('play', onPlay, true)
    return () => document.removeEventListener('play', onPlay, true)
  }, [])

  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), [])

  const showToast = useCallback((msg, type = 'success', action = null) => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type, action })
    toastTimer.current = setTimeout(() => setToast(null), action ? UNDO_MS : 3500)
  }, [])

  // טעינה מוקדמת של המסכים אחרי התחברות — שיהיו זמינים מיד וגם בלי רשת
  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => { loadAddNiggun().catch(() => {}); loadNiggunDetail().catch(() => {}) }, 1000)
    return () => clearTimeout(t)
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'niggunim'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setData({ uid: user.uid, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) })
    }, err => {
      setData({ uid: user.uid, items: [] })
      showToast('שגיאה בטעינת הניגונים: ' + err.code, 'error')
    })
  }, [user, showToast])

  // ── מחיקה עם "בטל": הניגון מוסתר מיד, ונמחק בפועל (כולל הקלטות) רק אחרי חלון הביטול ──
  const finalizeDelete = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    clearTimeout(pending.timer)
    try {
      await deleteDoc(doc(db, 'users', pending.uid, 'niggunim', pending.niggun.id))
      const { deleteStorageFiles } = await import('./utils/storageUpload')
      await deleteStorageFiles(getAudioFiles(pending.niggun).map(f => f.url))
    } catch (err) {
      showToast('שגיאה במחיקה: ' + (err.code || err.message), 'error')
    } finally {
      setPendingDelete(p => (p?.id === pending.niggun.id ? null : p))
    }
  }, [showToast])

  function handleDelete(niggun) {
    finalizeDelete() // מחיקה קודמת שממתינה — מבצעים עכשיו
    const timer = setTimeout(finalizeDelete, UNDO_MS)
    pendingRef.current = { niggun, uid: user.uid, timer }
    setPendingDelete({ id: niggun.id })
    setSelectedId(null)
    showToast('🗑️ הניגון נמחק', 'success', 'בטל')
  }

  function undoDelete() {
    const pending = pendingRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRef.current = null
    setPendingDelete(null)
    showToast('↩️ המחיקה בוטלה')
  }

  // סגירת האפליקציה בזמן חלון הביטול — מבצעים את המחיקה (best effort)
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') finalizeDelete() }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [finalizeDelete])

  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      showToast(LOGIN_ERRORS[err.code] || 'שגיאה בהתחברות: ' + err.code, 'error')
    }
  }

  async function handleLogout() {
    // מחיקה שממתינה — מבצעים לפני היציאה (עד 3 שניות, כדי שלא ייתקע בלי רשת)
    await Promise.race([finalizeDelete(), new Promise(r => setTimeout(r, 3000))])
    await signOut(auth)
    setSelectedId(null)
    setShowAdd(false)
    setPlayer(null)
    clearDriveToken()
  }

  const allTags = useMemo(() => collectTags(niggunim), [niggunim])
  const tagSuggestions = useMemo(() => collectTags(niggunim, MOODS), [niggunim])

  const filtered = useMemo(() => sortNiggunim(niggunim.filter(n =>
    matchesSearch(n, deferredSearch) &&
    (!tagFilter || (tagFilter === FAVORITES ? n.favorite : getTags(n).includes(tagFilter)))
  ), sort), [niggunim, deferredSearch, tagFilter, sort])

  function changeSort(value) {
    setSort(value)
    writePref('sort', value)
  }

  function openAdd(record = false) {
    setQuickRecord(record)
    setShowAdd(true)
  }

  // ניגון מהרשימה: מתחיל מהניגון שנבחר וממשיך ברצף עם שאר הרשימה המסוננת
  function playFrom(niggunId) {
    const queue = buildQueue(filtered)
    if (!queue.length) { showToast('אין הקלטות לניגון ברשימה הזו', 'error'); return }
    const index = Math.max(0, queue.findIndex(t => t.niggunId === niggunId))
    setPlayer({ queue, index })
  }

  function onTrackStart(track) {
    if (playedThisSession.current.has(track.niggunId)) return
    playedThisSession.current.add(track.niggunId)
    updateDoc(doc(db, 'users', user.uid, 'niggunim', track.niggunId), { lastPlayedAt: serverTimestamp() }).catch(() => {})
  }

  const playingId = player?.queue[player.index]?.niggunId

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  if (user === undefined) return <Loading />

  if (!user) {
    return (
      <main className="login-screen">
        <FloatingNotes count={10} />
        <div className="login-content">
          <div className="login-logo" aria-hidden="true">🎵</div>
          <h1 className="login-title">יומן הניגונים שלי</h1>
          <p className="login-subtitle">שמור את הניגונים, האקורדים והסיפורים שמלווים אותך בדרך</p>
          <button type="button" className="btn-google" onClick={handleLogin}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.4 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.2-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.2C29.5 35.6 26.9 36 24 36c-5.4 0-9.7-2.6-11.3-7H6.3C9.7 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.2C41.3 35.2 44 30 44 24c0-1.3-.2-2.7-.4-4z"/>
            </svg>
            התחבר עם Google
          </button>
          <Toast toast={toast} />
        </div>
      </main>
    )
  }

  const filtering = !!search || !!tagFilter

  return (
    <div className={`app ${player ? 'has-player' : ''}`}>
      <AppHeader user={user} onLogout={handleLogout} onAdd={() => openAdd(false)} showAdd={!selected}
        onBackup={selected ? null : () => setShowBackup(true)} />

      <main>
        {selected ? (
          <Suspense fallback={<Loading />}>
            <NiggunDetail
              key={selected.id}
              niggun={selected}
              uid={user.uid}
              getDriveToken={getDriveToken}
              onBack={() => setSelectedId(null)}
              onUpdated={() => showToast('✅ עודכן בהצלחה!')}
              onDelete={handleDelete}
              onSaveError={msg => showToast(msg, 'error')}
              tagSuggestions={tagSuggestions}
            />
          </Suspense>
        ) : (
          <>
            <div className="toolbar">
              <div className="search-box">
                <span className="search-icon" aria-hidden="true">🔍</span>
                <input type="search" placeholder="חפש ניגון, אקורדים, מילים, סיפור..." aria-label="חיפוש ניגונים"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="filter-select" value={sort} aria-label="מיון"
                onChange={e => changeSort(e.target.value)}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button type="button" className="btn btn-secondary play-all" onClick={() => playFrom(null)}
                disabled={!filtered.some(n => getAudioFiles(n).length)}>▶ נגן הכל</button>
            </div>

            {(allTags.length > 0 || niggunim.some(n => n.favorite)) && (
              <div className="chips filter-chips" role="group" aria-label="סינון">
                <button type="button" className={`chip ${!tagFilter ? 'active' : ''}`} aria-pressed={!tagFilter}
                  onClick={() => setTagFilter('')}>הכל</button>
                {niggunim.some(n => n.favorite) && (
                  <button type="button" className={`chip ${tagFilter === FAVORITES ? 'active' : ''}`}
                    aria-pressed={tagFilter === FAVORITES}
                    onClick={() => setTagFilter(t => (t === FAVORITES ? '' : FAVORITES))}>★ מועדפים</button>
                )}
                {allTags.map(t => (
                  <button key={t} type="button" className={`chip ${tagFilter === t ? 'active' : ''}`}
                    aria-pressed={tagFilter === t} onClick={() => setTagFilter(f => (f === t ? '' : t))}>{t}</button>
                ))}
              </div>
            )}

            {loading ? (
              <Loading text="טוען ניגונים..." />
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="emoji" aria-hidden="true">{filtering ? '🔎' : '🎵'}</div>
                <h2>{filtering ? 'לא נמצאו תוצאות' : 'היומן שלך ריק עדיין'}</h2>
                <p>{filtering ? 'נסה מילות חיפוש אחרות' : 'הוסף את הניגון הראשון שלך!'}</p>
                {!filtering && (
                  <button type="button" className="btn btn-primary" onClick={() => openAdd(false)}>➕ הוסף ניגון ראשון</button>
                )}
              </div>
            ) : (
              <div className="gallery">
                {filtered.map(n => (
                  <NiggunCard key={n.id} niggun={n} uid={user.uid} playing={playingId === n.id}
                    onOpen={() => setSelectedId(n.id)} onPlay={() => playFrom(n.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {!selected && recordingSupported() && (
        <button type="button" className="fab-record" onClick={() => openAdd(true)}
          aria-label="הקלטה מהירה של ניגון" title="הקלטה מהירה">🎙️</button>
      )}

      {showAdd && (
        <Suspense fallback={null}>
          <AddNiggun
            uid={user.uid}
            quickRecord={quickRecord}
            tagSuggestions={tagSuggestions}
            onBusyChange={busy => { addBusy.current = busy }}
            onClose={() => setShowAdd(false)}
            onAdded={() => showToast('✅ הניגון נשמר!')}
            onSaveError={msg => showToast(msg, 'error')}
          />
        </Suspense>
      )}

      {showBackup && (
        <Suspense fallback={null}>
          <BackupDialog uid={user.uid} niggunim={niggunim} onClose={() => setShowBackup(false)}
            onToast={msg => showToast(msg)} />
        </Suspense>
      )}

      {player && (
        <PlayerBar
          queue={player.queue}
          index={player.index}
          onIndex={index => setPlayer(p => ({ ...p, index }))}
          onClose={() => setPlayer(null)}
          onOpen={id => setSelectedId(id)}
          onTrackStart={onTrackStart}
        />
      )}

      <Toast toast={toast} onAction={undoDelete} />
      {!selected && <footer className="app-footer">נוצר ע"י עמיחי צדוק</footer>}
    </div>
  )
}
