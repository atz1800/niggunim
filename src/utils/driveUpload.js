/**
 * העלאת קובץ שמע ל-Google Drive של המשתמש
 * onProgress(0-100) — קריאה לעדכון אחוז ההעלאה
 * מחזיר: { url, name, fileId }
 */
function getAudioMimeType(file) {
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') return file.type
  const ext = file.name.split('.').pop().toLowerCase()
  const map = {
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
    wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
    wma: 'audio/x-ms-wma', opus: 'audio/ogg; codecs=opus',
  }
  return map[ext] || 'audio/mpeg'
}

export async function uploadToDrive(file, accessToken, onProgress = () => {}) {
  onProgress(10)

  // שלב 1: פרטי הקובץ
  const metadata = {
    name: file.name,
    mimeType: getAudioMimeType(file),
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  onProgress(30)

  // שלב 2: העלאה ל-Drive
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  )

  if (!res.ok) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED')
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error?.message || `שגיאת Drive: ${res.status}`)
  }

  const { id: fileId } = await res.json()
  onProgress(80)

  // שלב 3: הפוך לנגיש לכולם (כדי שניתן לנגן ב-audio tag)
  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }
  )
  if (!permRes.ok) throw new Error('לא ניתן להפוך את הקובץ לציבורי: ' + permRes.status)

  onProgress(100)

  return {
    url: `https://drive.google.com/uc?export=download&id=${fileId}`,
    name: file.name,
    fileId,
  }
}
