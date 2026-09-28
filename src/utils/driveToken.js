import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth'
import { auth, DRIVE_SCOPE } from '../firebase'

// טוקן Drive משמש רק להעברה חד-פעמית של הקלטות ישנות ל-Storage.
// נשמר בזיכרון + sessionStorage בלבד (לא localStorage), ופג אחרי ~55 דקות כמו אצל Google.
const KEY = 'driveToken'
const TTL_MS = 55 * 60 * 1000

let memo = null

function read() {
  if (memo && memo.exp > Date.now()) return memo.token
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (saved?.exp > Date.now()) { memo = saved; return saved.token }
  } catch { /* חסום */ }
  return null
}

function write(token) {
  memo = token ? { token, exp: Date.now() + TTL_MS } : null
  try {
    if (memo) sessionStorage.setItem(KEY, JSON.stringify(memo))
    else sessionStorage.removeItem(KEY)
  } catch { /* חסום */ }
}

export function clearDriveToken() {
  write(null)
  try { localStorage.removeItem(KEY) } catch { /* גרסה ישנה שמרה כאן */ }
}

/**
 * interactive=false → מחזיר טוקן שמור בלבד (או null), בלי popup.
 * force=true → מתעלם מהשמור ומבקש חדש.
 * משתמש ב-reauthenticateWithPopup: אם נבחר חשבון אחר, Firebase זורק
 * auth/user-mismatch במקום להחליף בשקט את המשתמש המחובר.
 */
export async function getDriveToken({ interactive = true, force = false } = {}) {
  if (!force) {
    const cached = read()
    if (cached || !interactive) return cached
  }
  const user = auth.currentUser
  if (!user) return null
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope(DRIVE_SCOPE)
    if (user.email) provider.setCustomParameters({ login_hint: user.email })
    const result = await reauthenticateWithPopup(user, provider)
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken || null
    write(token)
    return token
  } catch (err) {
    console.warn('Drive auth failed:', err?.code || err)
    write(null)
    return null
  }
}
