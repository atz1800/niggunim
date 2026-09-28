import { useState } from 'react'
import { transposeChords, hasChords, semitoneLabel } from '../lib/chords'

/** תצוגת אקורדים עם העברת טון (לא משנה את מה שנשמר) */
export default function ChordsView({ chords }) {
  const [shift, setShift] = useState(0)
  const canTranspose = hasChords(chords)
  // טווח -6..+6: מעבר לזה אותו אקורד באוקטבה אחרת
  const wrap = n => (n > 6 ? n - 12 : n < -6 ? n + 12 : n)

  return (
    <>
      {canTranspose && (
        <div className="transpose" role="group" aria-label="העברת טון">
          <button type="button" className="transpose-btn" onClick={() => setShift(s => wrap(s - 1))} aria-label="הורד חצי טון">−</button>
          <button type="button" className="transpose-value" onClick={() => setShift(0)}
            title="חזרה לטון המקורי" aria-live="polite">{semitoneLabel(shift)}</button>
          <button type="button" className="transpose-btn" onClick={() => setShift(s => wrap(s + 1))} aria-label="העלה חצי טון">+</button>
        </div>
      )}
      <div className="detail-chords" dir="ltr">{transposeChords(chords, shift)}</div>
    </>
  )
}
