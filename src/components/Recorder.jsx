import { useEffect, useRef } from 'react'
import { useRecorder, recordingSupported, formatDuration } from '../hooks/useRecorder'

/** כפתור הקלטה מהמיקרופון. כשעוצרים — הקובץ עובר ל-onRecorded ומתחיל לעלות */
export default function Recorder({ onRecorded, onError, onActiveChange, autoStart = false }) {
  const r = useRecorder({ onDone: onRecorded, onError })
  const started = useRef(false)
  const active = r.state === 'recording' || r.state === 'paused'

  useEffect(() => { onActiveChange?.(active) }, [active, onActiveChange])

  useEffect(() => {
    if (autoStart && !started.current && recordingSupported()) {
      started.current = true
      r.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  if (!recordingSupported()) return null

  if (r.state === 'idle' || r.state === 'starting') {
    return (
      <button type="button" className="recorder-start" onClick={r.start} disabled={r.state === 'starting'}>
        <span className="rec-dot" aria-hidden="true" /> {r.state === 'starting' ? 'מפעיל מיקרופון...' : 'הקלט עכשיו'}
      </button>
    )
  }

  const recording = r.state === 'recording'
  return (
    <div className={`recorder ${r.state}`} role="group" aria-label="הקלטה">
      <div className="recorder-status">
        <span className={`rec-dot ${recording ? 'live' : ''}`} aria-hidden="true" />
        <span className="recorder-time" aria-live="off">{formatDuration(r.elapsed)}</span>
        <span className="recorder-label">{recording ? 'מקליט...' : 'מושהה'}</span>
      </div>
      <div className="recorder-meter" aria-hidden="true">
        <div className="recorder-meter-fill" style={{ transform: `scaleX(${recording ? r.level : 0})` }} />
      </div>
      <div className="recorder-actions">
        <button type="button" className="btn btn-primary" onClick={r.stop}>⏹ סיים ושמור</button>
        {recording
          ? <button type="button" className="btn btn-secondary" onClick={r.pause}>⏸ השהה</button>
          : <button type="button" className="btn btn-secondary" onClick={r.resume}>⏺ המשך</button>}
        <button type="button" className="btn btn-secondary" onClick={r.cancel} aria-label="בטל הקלטה">✕</button>
      </div>
    </div>
  )
}
