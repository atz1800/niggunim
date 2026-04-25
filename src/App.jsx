import React, { useState, useEffect } from 'react'
import { collection, orderBy, query, onSnapshot } from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'
import { db, auth, googleProvider } from './firebase'
import NiggunCard from './components/NiggunCard'
import AddNiggun from './components/AddNiggun'
import NiggunDetail from './components/NiggunDetail'

const MOODS = ['הכל', 'שבת', 'שמח', 'עצוב', 'מהיר', 'איטי', 'דבקות', 'תפילה', 'אחר']

const QUOTE = '״על ידי נגינה דקדושה יכולין לזכות לבחינת נבואה, כי עיקר הדבקות להשם יתברך הוא על-ידי נגינה.״'
const QUOTE_SOURCE = 'ליקוטי עצות — רבי נחמן מברסלב'

function Toast({ msg, type }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (msg) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])
  if (!msg) return null
  return <div className={`toast ${show ? 'show' : ''} ${type || ''}`}>{msg}</div>
}

function AppHeader({ user, onLogout, onAdd, showAdd }) {
  return (
    <header className="header">
      <div className="header-title">
        <span className="logo">🎵</span>
        <div className="header-title-group">
          <h1>יומן הניגונים שלי</h1>
          <p className="header-quote">{QUOTE}</p>
          <p className="header-quote-source">{QUOTE_SOURCE}</p>
        </div>
      </div>
      {user && (
        <div className="header-actions">
          {showAdd && (
            <button className="btn btn-primary" onClick={onAdd}>➕ הוסף ניגון</button>
          )}
          <div className="user-info">
            {user.photoURL && <img src={user.photoURL} alt={user.displayName} className="user-avatar" title={user.displayName} />}
            <button className="btn btn-secondary btn-logout" onClick={onLogout}>↩ התנתק</button>
          </div>
        </div>
      )}
    </header>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)
  const [niggunim, setNiggunim] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState('הכל')
  const [toast, setToast] = useState({ msg: '', type: '' })
  // Google Drive access token - saved in sessionStorage between page loads
  const [driveToken, setDriveToken] = useState(() => localStorage.getItem('driveToken') || null)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u || null))
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    const q = query(collection(db, 'users', user.uid, 'niggunim'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setNiggunim(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => { setLoading(false) })
    return unsub
  }, [user])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3500)
  }

  function saveDriveToken(token) {
    setDriveToken(token)
    if (token) localStorage.setItem('driveToken', token)
    else localStorage.removeItem('driveToken')
  }

  async function handleLogin() {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) saveDriveToken(credential.accessToken)
    } catch (err) {
      showToast('שגיאה: ' + err.code, 'error')
    }
  }

  async function getDriveToken(force = false) {
    if (!force && driveToken) return driveToken
    // טוקן פג תוקף או כפוי — נקה ובקש חדש
    saveDriveToken(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken || null
      saveDriveToken(token)
      return token
    } catch {
      return null
    }
  }

  async function handleLogout() {
    await signOut(auth)
    setNiggunim([])
    setSelected(null)
    saveDriveToken(null)
  }

  function handleAdded() { showToast('✅ הניגון נשמר!') }
  function handleUpdated(updated) {
    setNiggunim(prev => prev.map(n => n.id === updated.id ? updated : n))
    setSelected(updated)
    showToast('✅ עודכן בהצלחה!')
  }
  function handleDeleted(id) {
    setNiggunim(prev => prev.filter(n => n.id !== id))
    setSelected(null)
    showToast('🗑️ הניגון נמחק')
  }

  const filtered = niggunim.filter(n => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      n.name?.toLowerCase().includes(q) ||
      n.chords?.toLowerCase().includes(q) ||
      n.story?.toLowerCase().includes(q) ||
      n.mood?.toLowerCase().includes(q)
    const matchMood = moodFilter === 'הכל' || n.mood === moodFilter
    return matchSearch && matchMood
  })

  if (user === undefined) {
    return <div className="loading"><div className="spinner" />טוען...</div>
  }

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-logo">🎵</div>
        <h1 className="login-title">יומן הניגונים שלי</h1>
        <p className="login-subtitle">שמור את הניגונים, האקורדים והסיפורים שמלווים אותך בדרך</p>
        <button className="btn-google" onClick={handleLogin}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.4 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.2-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.2C29.5 35.6 26.9 36 24 36c-5.4 0-9.7-2.6-11.3-7H6.3C9.7 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.2C41.3 35.2 44 30 44 24c0-1.3-.2-2.7-.4-4z"/>
          </svg>
          התחבר עם Google
        </button>
        <Toast msg={toast.msg} type={toast.type} />
      </div>
    )
  }

  if (selected) {
    return (
      <div className="app">
        <AppHeader user={user} onLogout={handleLogout} showAdd={false} />
        <NiggunDetail
          niggun={selected}
          uid={user.uid}
          getDriveToken={getDriveToken}
          onBack={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
        <Toast msg={toast.msg} type={toast.type} />
      </div>
    )
  }

  return (
    <div className="app">
      <AppHeader user={user} onLogout={handleLogout} onAdd={() => setShowAdd(true)} showAdd={true} />

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="חפש ניגון, אקורדים, סיפור..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={moodFilter} onChange={e => setMoodFilter(e.target.value)}>
          {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />טוען ניגונים...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">{search || moodFilter !== 'הכל' ? '🔎' : '🎵'}</div>
          <h2>{search || moodFilter !== 'הכל' ? 'לא נמצאו תוצאות' : 'היומן שלך ריק עדיין'}</h2>
          <p>{search || moodFilter !== 'הכל' ? 'נסה מילות חיפוש אחרות' : 'הוסף את הניגון הראשון שלך!'}</p>
          {!search && moodFilter === 'הכל' && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ הוסף ניגון ראשון</button>
          )}
        </div>
      ) : (
        <div className="gallery">
          {filtered.map(n => <NiggunCard key={n.id} niggun={n} onClick={() => setSelected(n)} />)}
        </div>
      )}

      {showAdd && (
        <AddNiggun
          uid={user.uid}
          getDriveToken={getDriveToken}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}
