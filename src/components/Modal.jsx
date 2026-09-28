import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** מודאל נגיש: role=dialog, סגירה ב-Escape, פוקוס נשאר בתוך המודאל וחוזר למקור בסגירה */
export default function Modal({ titleId, onClose, children }) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const node = ref.current
    if (!node.contains(document.activeElement)) node.querySelector(FOCUSABLE)?.focus()

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current() }
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    node.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      node.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        {children}
      </div>
    </div>
  )
}
