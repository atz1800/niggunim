import { useState, useEffect } from 'react'

function buildText(niggun) {
  const lines = [`🎵 ${niggun.name}`]
  if (niggun.hebrewDate) lines.push(`📅 ${niggun.hebrewDate}`)
  if (niggun.mood) lines.push(`🎭 ${niggun.mood}`)
  if (niggun.chords) lines.push(`\nאקורדים: ${niggun.chords}`)
  if (niggun.story) lines.push(`\n${niggun.story}`)
  lines.push('\n— יומן הניגונים שלי')
  return lines.join('\n')
}

export default function ShareButton({ niggun }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(t)
  }, [copied])

  async function handleShare() {
    const text = buildText(niggun)
    if (navigator.share) {
      try {
        await navigator.share({ title: niggun.name, text })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return // המשתמש סגר את חלון השיתוף
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // אין גישה ללוח — אין מה לעשות
    }
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildText(niggun))}`, '_blank', 'noopener')
  }

  return (
    <div className="share-buttons">
      <button type="button" className="btn btn-secondary" onClick={handleShare}>
        {copied ? '✅ הועתק!' : '🔗 שתף'}
      </button>
      <button type="button" className="btn btn-secondary btn-icon" onClick={handleWhatsApp}
        title="שתף בוואטסאפ" aria-label="שתף בוואטסאפ">
        💬
      </button>
      <span className="sr-only" role="status">{copied ? 'הטקסט הועתק ללוח' : ''}</span>
    </div>
  )
}
