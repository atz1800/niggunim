import { useState, useEffect } from 'react'
import { getAudioFiles } from '../lib/audio'
import { getTags } from '../lib/niggun'

function buildText(niggun) {
  const lines = [`🎵 ${niggun.name}`]
  const tags = getTags(niggun)
  if (niggun.source) lines.push(`🕍 ${niggun.source}`)
  if (niggun.composer) lines.push(`✍️ ${niggun.composer}`)
  if (niggun.hebrewDate) lines.push(`📅 ${niggun.hebrewDate}`)
  if (tags.length) lines.push(`🏷️ ${tags.join(' · ')}`)
  if (niggun.chords) lines.push(`\nאקורדים:\n${niggun.chords}`)
  if (niggun.lyrics) lines.push(`\n${niggun.lyrics}`)
  if (niggun.story) lines.push(`\n${niggun.story}`)
  lines.push('\n— יומן הניגונים שלי')
  return lines.join('\n')
}

// מוריד את ההקלטה הראשונה כקובץ לשיתוף (דורש CORS ב-bucket; אם אין — משתפים טקסט בלבד)
async function audioAsFile(niggun) {
  const first = getAudioFiles(niggun)[0]
  if (!first?.url) return null
  try {
    const res = await fetch(first.url)
    if (!res.ok) return null
    const blob = await res.blob()
    const file = new File([blob], first.name || 'recording', { type: blob.type || 'audio/mpeg' })
    return navigator.canShare?.({ files: [file] }) ? file : null
  } catch {
    return null
  }
}

export default function ShareButton({ niggun }) {
  const [status, setStatus] = useState('') // '' | 'loading' | 'copied'
  const hasAudio = getAudioFiles(niggun).length > 0

  useEffect(() => {
    if (status !== 'copied') return
    const t = setTimeout(() => setStatus(''), 2500)
    return () => clearTimeout(t)
  }, [status])

  async function share(withAudio) {
    const text = buildText(niggun)
    if (navigator.share) {
      let data = { title: niggun.name, text }
      if (withAudio) {
        setStatus('loading')
        const file = await audioAsFile(niggun)
        setStatus('')
        if (file) data = { ...data, files: [file] }
      }
      try {
        await navigator.share(data)
        return
      } catch (err) {
        if (err?.name === 'AbortError') return // המשתמש סגר את חלון השיתוף
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      // אין גישה ללוח — אין מה לעשות
    }
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildText(niggun))}`, '_blank', 'noopener')
  }

  const canShareFiles = hasAudio && !!navigator.canShare

  return (
    <div className="share-buttons">
      <button type="button" className="btn btn-secondary" onClick={() => share(false)}>
        {status === 'copied' ? '✅ הועתק!' : '🔗 שתף'}
      </button>
      {canShareFiles && (
        <button type="button" className="btn btn-secondary" onClick={() => share(true)} disabled={status === 'loading'}>
          {status === 'loading' ? '⏳ מכין...' : '🎧 שתף עם הקלטה'}
        </button>
      )}
      <button type="button" className="btn btn-secondary btn-icon" onClick={handleWhatsApp}
        title="שתף בוואטסאפ" aria-label="שתף בוואטסאפ">
        💬
      </button>
      <span className="sr-only" role="status">{status === 'copied' ? 'הטקסט הועתק ללוח' : ''}</span>
    </div>
  )
}
