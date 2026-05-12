import React, { useEffect, useState } from 'react'

const NOTE_CONFIGS = [
  { note: '♩', left: '5%',  delay: '0s',    dur: '3.8s', size: '1.6rem', op: 0.55 },
  { note: '♪', left: '14%', delay: '0.4s',  dur: '4.2s', size: '1.2rem', op: 0.4  },
  { note: '♫', left: '23%', delay: '1.1s',  dur: '3.4s', size: '2rem',   op: 0.6  },
  { note: '𝄞', left: '33%', delay: '0.7s',  dur: '4.8s', size: '2.2rem', op: 0.5  },
  { note: '♬', left: '43%', delay: '1.6s',  dur: '3.2s', size: '1.4rem', op: 0.45 },
  { note: '♩', left: '53%', delay: '0.2s',  dur: '4.5s', size: '1.8rem', op: 0.55 },
  { note: '𝄢', left: '62%', delay: '1.3s',  dur: '3.9s', size: '1.5rem', op: 0.4  },
  { note: '♪', left: '71%', delay: '0.9s',  dur: '4.1s', size: '1.1rem', op: 0.5  },
  { note: '♫', left: '80%', delay: '0.5s',  dur: '3.6s', size: '1.9rem', op: 0.6  },
  { note: '♬', left: '89%', delay: '1.8s',  dur: '4.4s', size: '1.3rem', op: 0.45 },
  { note: '𝄞', left: '9%',  delay: '2.1s',  dur: '3.5s', size: '1.7rem', op: 0.35 },
  { note: '♩', left: '47%', delay: '2.5s',  dur: '4.0s', size: '1.2rem', op: 0.4  },
  { note: '♪', left: '76%', delay: '2.8s',  dur: '3.3s', size: '2.1rem', op: 0.5  },
  { note: '♫', left: '37%', delay: '3.1s',  dur: '4.6s', size: '1.4rem', op: 0.35 },
  { note: '♬', left: '92%', delay: '0.3s',  dur: '3.7s', size: '1.6rem', op: 0.55 },
]

export function FloatingNotes({ count }) {
  const configs = count ? NOTE_CONFIGS.slice(0, count) : NOTE_CONFIGS
  return (
    <div className="splash-notes-bg" aria-hidden="true">
      {configs.map((c, i) => (
        <span key={i} className="splash-note" style={{
          left: c.left, animationDelay: c.delay, animationDuration: c.dur,
          fontSize: c.size, opacity: c.op,
        }}>
          {c.note}
        </span>
      ))}
    </div>
  )
}

const TITLE = 'יומן הניגונים שלי'

function TypewriterTitle() {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        setShown(n => {
          if (n >= TITLE.length) { clearInterval(iv); return n }
          return n + 1
        })
      }, 70)
      return () => clearInterval(iv)
    }, 500)
    return () => clearTimeout(start)
  }, [])

  return (
    <h1 className="splash-title">
      {TITLE.slice(0, shown)}
      {shown < TITLE.length && <span className="splash-cursor">|</span>}
    </h1>
  )
}

const EQ_DELAYS = [0, 0.15, 0.3, 0.08, 0.22, 0.38, 0.12]

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 4600)
    const t2 = setTimeout(() => onDone(), 5200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash-root ${phase}`}>
      <FloatingNotes />

      <div className="splash-center">
        <div className="splash-icon-ring">
          <span className="splash-icon">🎵</span>
        </div>

        <TypewriterTitle />

        <div className="splash-eq">
          {EQ_DELAYS.map((d, i) => (
            <div key={i} className="splash-eq-bar" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>

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
