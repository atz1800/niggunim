import React, { useState } from 'react'

export default function ShareButton({ niggun }) {
  const [copied, setCopied] = useState(false)

  function buildText() {
    const lines = []
    lines.push(`🎵 ${niggun.name}`)
    if (niggun.hebrewDate) lines.push(`📅 ${niggun.hebrewDate}`)
    if (niggun.mood) lines.push(`🎭 ${niggun.mood}`)
    if (niggun.chords) lines.push(`\nאקורדים: ${niggun.chords}`)
    if (niggun.story) lines.push(`\n${niggun.story}`)
    lines.push('\n— יומן הניגונים שלי')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildText()

    if (navigator.share) {
      try {
        await navigator.share({ title: niggun.name, text })
        return
      } catch {
        // fallback to copy
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Silent fail
    }
  }

  async function handleWhatsApp() {
    const text = encodeURIComponent(buildText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-secondary" onClick={handleShare}>
        {copied ? '✅ הועתק!' : '🔗 שתף'}
      </button>
      <button
        className="btn btn-secondary"
        onClick={handleWhatsApp}
        title="שתף בוואטסאפ"
        style={{ fontSize: '1.1rem', padding: '8px 14px' }}
      >
        💬
      </button>
    </div>
  )
}
