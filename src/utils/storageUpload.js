import { getStorage, connectStorageEmulator, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { app, USE_EMULATORS } from '../firebase'
import { getAudioMimeType, safeFileName, isStorageUrl } from '../lib/audio'

const storage = getStorage(app)
if (USE_EMULATORS) connectStorageEmulator(storage, '127.0.0.1', 9199)

/**
 * מעלה קובץ שמע ל-Firebase Storage של המשתמש.
 * מחזיר { url, name } — ה-URL קבוע לנצח, אין צורך ב-auth לניגון.
 */
export function uploadToStorage(file, userId, onProgress = () => {}) {
  const path = `users/${userId}/niggunim/${Date.now()}_${safeFileName(file.name)}`
  const storageRef = ref(storage, path)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: getAudioMimeType(file),
      cacheControl: 'public, max-age=31536000',
    })

    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress(pct)
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve({ url, name: file.name })
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

/**
 * מוחק קבצים מ-Storage לפי ה-download URL שלהם.
 * מתעלם מכתובות שאינן Storage (למשל Drive ישן) ומקבצים שכבר נמחקו.
 */
export async function deleteStorageFiles(urls) {
  const targets = urls.filter(isStorageUrl)
  await Promise.all(targets.map(async (url) => {
    try {
      await deleteObject(ref(storage, url))
    } catch (err) {
      if (err?.code !== 'storage/object-not-found') console.warn('Storage delete failed:', err?.code || err)
    }
  }))
}
