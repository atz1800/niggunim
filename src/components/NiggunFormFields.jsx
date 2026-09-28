import { useId } from 'react'
import TagInput from './TagInput'

/** שדות הטופס המשותפים להוספה ולעריכה */
export default function NiggunFormFields({ form, setForm, tagSuggestions, autoFocus = false }) {
  const id = useId()
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-name`}>שם הניגון</label>
        <input className="form-input" id={`${id}-name`} name="name" value={form.name}
          onChange={onChange} placeholder='לדוגמא: ניגון האדמו"ר' autoFocus={autoFocus} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor={`${id}-source`}>חסידות / מקור</label>
          <input className="form-input" id={`${id}-source`} name="source" value={form.source}
            onChange={onChange} placeholder="חב״ד, מודזיץ, קרליבך..." />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`${id}-composer`}>מחבר</label>
          <input className="form-input" id={`${id}-composer`} name="composer" value={form.composer}
            onChange={onChange} placeholder="אם ידוע" />
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">תגיות</span>
        <TagInput value={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} suggestions={tagSuggestions} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-chords`}>אקורדים</label>
        <textarea className="form-input chords-input" id={`${id}-chords`} name="chords" value={form.chords}
          onChange={onChange} placeholder={'Am - G - F - E\nDm - Am - E - Am'} dir="ltr" rows={3} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-lyrics`}>מילים</label>
        <textarea className="form-input" id={`${id}-lyrics`} name="lyrics" value={form.lyrics}
          onChange={onChange} rows={3} placeholder="אם יש לניגון מילים" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-date`}>תאריך עברי</label>
        <input className="form-input" id={`${id}-date`} name="hebrewDate" value={form.hebrewDate}
          onChange={onChange} placeholder='י"ד בניסן תשפ"ה' />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${id}-story`}>סיפור / הקשר</label>
        <textarea className="form-input" id={`${id}-story`} name="story" value={form.story}
          onChange={onChange} rows={4}
          placeholder="מאיפה למדת את הניגון? באיזה אירוע? מה הוא מעורר בך?" />
      </div>
    </>
  )
}
