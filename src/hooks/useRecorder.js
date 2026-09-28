import { useState, useRef, useEffect, useCallback } from 'react'

// Chrome/Android → webm/opus, Safari/iOS → mp4/aac
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus']

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
}

export const recordingSupported = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

const extFor = type => (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm')

function stamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`
}

const MIC_ERRORS = {
  NotAllowedError: 'אין הרשאה למיקרופון — אפשר אותה בהגדרות הדפדפן',
  NotFoundError: 'לא נמצא מיקרופון במכשיר',
  NotReadableError: 'המיקרופון תפוס על ידי אפליקציה אחרת',
}

/**
 * הקלטה מהמיקרופון. onDone(file) נקרא עם File מוכן להעלאה כשעוצרים.
 * שומר את המסך דלוק בזמן הקלטה (Wake Lock) ומשחרר את המיקרופון בסיום / ביציאה.
 */
export function useRecorder({ onDone, onError }) {
  const [state, setState] = useState('idle') // idle | starting | recording | paused
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const rec = useRef(null)
  const stream = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)
  const raf = useRef(null)
  const audioCtx = useRef(null)
  const wakeLock = useRef(null)
  const startedAt = useRef(0)
  const accumulated = useRef(0)
  const discardNext = useRef(false)
  const cbs = useRef({ onDone, onError })
  useEffect(() => { cbs.current = { onDone, onError } })

  const cleanup = useCallback(() => {
    clearInterval(timer.current)
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach(t => t.stop())
    stream.current = null
    audioCtx.current?.close().catch(() => {})
    audioCtx.current = null
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    setLevel(0)
  }, [])

  // יציאה מהמסך באמצע הקלטה — משחררים את המיקרופון בלי לשמור
  useEffect(() => () => {
    if (rec.current && rec.current.state !== 'inactive') {
      discardNext.current = true
      rec.current.stop()
    }
    cleanup()
  }, [cleanup])

  function tick() {
    setElapsed(accumulated.current + (Date.now() - startedAt.current))
  }

  function meter(analyser) {
    const data = new Uint8Array(analyser.fftSize)
    const loop = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128))
      setLevel(Math.min(1, peak / 64))
      raf.current = requestAnimationFrame(loop)
    }
    loop()
  }

  async function start() {
    if (state !== 'idle') return
    setState('starting')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      })
    } catch (err) {
      setState('idle')
      cbs.current.onError?.(MIC_ERRORS[err.name] || 'לא ניתן להפעיל את המיקרופון: ' + err.message)
      return
    }

    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream.current, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined)
    chunks.current = []
    recorder.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunks.current, { type })
      chunks.current = []
      rec.current = null
      if (discardNext.current || !blob.size) { discardNext.current = false; return }
      const file = new File([blob], `הקלטה_${stamp()}.${extFor(type)}`, { type: type.split(';')[0] })
      cbs.current.onDone?.(file)
    }
    recorder.start(1000)
    rec.current = recorder

    try {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)()
      // נוצר אחרי await, מחוץ ל-gesture — דפדפנים מתחילים אותו במצב suspended
      audioCtx.current.resume?.().catch(() => {})
      const analyser = audioCtx.current.createAnalyser()
      analyser.fftSize = 512
      audioCtx.current.createMediaStreamSource(stream.current).connect(analyser)
      meter(analyser)
    } catch { /* מד עוצמה הוא בונוס */ }

    try { wakeLock.current = await navigator.wakeLock?.request('screen') } catch { /* לא נתמך */ }

    accumulated.current = 0
    startedAt.current = Date.now()
    setElapsed(0)
    timer.current = setInterval(tick, 250)
    setState('recording')
  }

  function pause() {
    if (rec.current?.state !== 'recording') return
    rec.current.pause()
    accumulated.current += Date.now() - startedAt.current
    clearInterval(timer.current)
    setState('paused')
  }

  function resume() {
    if (rec.current?.state !== 'paused') return
    rec.current.resume()
    startedAt.current = Date.now()
    timer.current = setInterval(tick, 250)
    setState('recording')
  }

  function stop() {
    if (!rec.current) return
    rec.current.stop()
    cleanup()
    setState('idle')
  }

  function cancel() {
    if (!rec.current) return
    discardNext.current = true
    rec.current.stop()
    cleanup()
    setState('idle')
    setElapsed(0)
  }

  return { state, elapsed, level, start, pause, resume, stop, cancel }
}

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
