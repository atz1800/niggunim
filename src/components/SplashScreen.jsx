import React, { useEffect, useState } from 'react'

const NOTES = ['♩', '♪', '♫', '♬', '𝄞', '𝄢', '♩', '♪', '♫', '♬', '𝄞', '♩', '♪']

const NOTE_CONFIGS = NOTES.map((note, i) => ({
  note,
  left: `${5 + (i * 7.2) % 90}%`,
  delay: `${(i * 0.3) % 3}s`,
  duration: `${3 + (i * 0.4) % 3}s`,
  size: `${1.1 + (i * 0.15) % 1.4}rem`,
  opacity: 0.15 + (i * 0.07) % 0.45,
}))

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 2600)
    const t2 = setTimeout(() => onDone(), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash-root ${phase}`}>
      <div className="splash-notes-bg">
        {NOTE_CONFIGS.map((c, i) => (
          <span
            key={i}
            className="splash-note"
            style={{
              left: c.left,
              animationDelay: c.delay,
              animationDuration: c.duration,
              fontSize: c.size,
              opacity: c.opacity,
            }}
          >
            {c.note}
          </span>
        ))}
      </div>

      <div className="splash-center">
        <div className="splash-icon-ring">
          <span className="splash-icon">🎵</span>
        </div>

        <h1 className="splash-title">יומן הניגונים שלי</h1>

        <div className="splash-divider" />

        <blockquote className="splash-quote">
          ״על ידי נגינה דקדושה יכולין לזכות לבחינת נבואה״
        </blockquote>
        <p className="splash-quote-source">ליקוטי עצות — רבי נחמן מברסלב</p>

        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}
