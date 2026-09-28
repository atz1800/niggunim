import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../hooks/useRecorder'
import { fixInfiniteDuration, isFixingDuration } from '../lib/audio'

/**
 * נגן תחתון — מנגן רשימת הקלטות ברצף (פלייליסט).
 * תומך בכפתורי מסך הנעילה / אוזניות דרך Media Session API.
 */
export default function PlayerBar({ queue, index, onIndex, onClose, onOpen, onTrackStart }) {
  const audio = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState({ cur: 0, dur: 0 })
  const track = queue[index]
  const hasPrev = index > 0
  const hasNext = index < queue.length - 1

  const cbs = useRef({})
  useEffect(() => { cbs.current = { onIndex, onTrackStart, index, hasNext, hasPrev } })

  useEffect(() => {
    const a = audio.current
    if (!a || !track) return
    a.src = track.url
    a.play().catch(() => setPlaying(false))
    cbs.current.onTrackStart?.(track)

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.name,
        artist: track.fileName || 'יומן הניגונים שלי',
        album: 'יומן הניגונים שלי',
        artwork: [{ src: '/niggunim/icon-512.png', sizes: '512x512', type: 'image/png' }],
      })
    }
  }, [track])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const go = d => () => {
      const { index: i, hasNext: n, hasPrev: p, onIndex: set } = cbs.current
      if ((d > 0 && n) || (d < 0 && p)) set(i + d)
    }
    ms.setActionHandler('play', () => audio.current?.play())
    ms.setActionHandler('pause', () => audio.current?.pause())
    ms.setActionHandler('previoustrack', go(-1))
    ms.setActionHandler('nexttrack', go(1))
    return () => ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(a => ms.setActionHandler(a, null))
  }, [])

  if (!track) return null

  function toggle() {
    const a = audio.current
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }

  function seek(e) {
    const a = audio.current
    if (Number.isFinite(a.duration)) a.currentTime = (Number(e.target.value) / 1000) * a.duration
  }

  const progress = time.dur ? Math.round((time.cur / time.dur) * 1000) : 0

  return (
    <div className="player-bar" role="region" aria-label="נגן">
      <audio
        ref={audio}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={fixInfiniteDuration}
        onTimeUpdate={e => {
          const a = e.currentTarget
          if (isFixingDuration(a)) return
          setTime({ cur: a.currentTime, dur: Number.isFinite(a.duration) ? a.duration : 0 })
        }}
        onEnded={e => {
          if (isFixingDuration(e.currentTarget)) return
          if (hasNext) onIndex(index + 1)
          else setPlaying(false)
        }}
        onError={() => hasNext && onIndex(index + 1)}
      />
      <input type="range" className="player-seek" min={0} max={1000} value={progress} onChange={seek}
        disabled={!time.dur} aria-label="מיקום בהקלטה" dir="ltr" />
      <div className="player-row">
        <button type="button" className="player-info" onClick={() => onOpen(track.niggunId)} title="פתח את הניגון">
          <span className="player-title">{track.name}</span>
          <span className="player-sub">
            {index + 1}/{queue.length} · {formatDuration(time.cur * 1000)}{time.dur ? ` / ${formatDuration(time.dur * 1000)}` : ''}
          </span>
        </button>
        <div className="player-controls" dir="ltr">
          <button type="button" onClick={() => onIndex(index - 1)} disabled={!hasPrev} aria-label="הקודם">⏮</button>
          <button type="button" className="player-main" onClick={toggle} aria-label={playing ? 'השהה' : 'נגן'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button type="button" onClick={() => onIndex(index + 1)} disabled={!hasNext} aria-label="הבא">⏭</button>
          <button type="button" onClick={onClose} aria-label="סגור נגן">✕</button>
        </div>
      </div>
    </div>
  )
}
