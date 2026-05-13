import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

/**
 * מעלה קובץ שמע ל-Firebase Storage של המשתמש.
 * מחזיר { url, name } — ה-URL קבוע לנצח, אין צורך ב-auth לניגון.
 */
export async function uploadToStorage(file, userId, onProgress = () => {}) {
  const path = `users/${userId}/niggunim/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)

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
