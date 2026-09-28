import { useId } from 'react'
import { MOODS } from '../lib/constants'

/** שדות הטופס המשותפים להוספה ולעריכה */
export default function NiggunFormFields({ form, onChange, autoFocus = false, storyRows = 4 }) {
  const id = useId()
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-name`}>שם הניגון *</label>
        <input className="form-input" id={`${id}-name`} name="name" value={form.name} required
          onChange={onChange} placeholder='לדוגמא: ניגון האדמו"ר' autoFocus={autoFocus} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-chords`}>אקורדים</label>
        <input className="form-input" id={`${id}-chords`} name="chords" value={form.chords}
          onChange={onChange} placeholder="Am - G - F - E" dir="ltr" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-mood`}>מצב רוח / קטגוריה</label>
        <select className="form-input filter-select form-select" id={`${id}-mood`} name="mood"
          value={form.mood} onChange={onChange}>
          <option value="">— בחר —</option>
          {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-date`}>תאריך עברי</label>
        <input className="form-input" id={`${id}-date`} name="hebrewDate" value={form.hebrewDate}
          onChange={onChange} placeholder='י"ד בניסן תשפ"ה' />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-story`}>סיפור / הקשר</label>
        <textarea className="form-input" id={`${id}-story`} name="story" value={form.story}
          onChange={onChange} rows={storyRows}
          placeholder="מאיפה למדת את הניגון? באיזה אירוע? מה הוא מעורר בך?" />
      </div>
    </>
  )
}
