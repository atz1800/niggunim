import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, connectAuthEmulator, signInWithCredential } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

// מטמון מקומי — הרשימה זמינה גם בלי רשת (PWA), ומסתנכרנת כשהחיבור חוזר
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence)

// פיתוח מקומי מול Firebase Emulator: VITE_USE_EMULATORS=true (לא נכלל בבניית פרודקשן)
export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true'
if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  // התחברות ללא popup לבדיקות אוטומטיות (האמולטור מקבל id token לא חתום)
  window.__emulatorSignIn = (email) => signInWithCredential(auth,
    GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })))
}

// התחברות בסיסית בלבד. הרשאת Drive מתבקשת רק כשצריך להעביר הקלטה ישנה מ-Drive
export const googleProvider = new GoogleAuthProvider()

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
