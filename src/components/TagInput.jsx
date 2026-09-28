import { useState, useId } from 'react'

/** בחירת תגיות: הצעות מוכנות + תגית חופשית (Enter / פסיק) */
export default function TagInput({ value, onChange, suggestions }) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const options = [...new Set([...suggestions, ...value])]

  function toggle(tag) {
    onChange(value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag])
  }

  function addDraft() {
    const tag = draft.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  return (
    <div className="tag-input">
      <div className="chips" role="group" aria-labelledby={`${id}-label`}>
        {options.map(tag => (
          <button key={tag} type="button" className={`chip ${value.includes(tag) ? 'active' : ''}`}
            aria-pressed={value.includes(tag)} onClick={() => toggle(tag)}>
            {tag}
          </button>
        ))}
      </div>
      <input className="form-input tag-draft" value={draft} placeholder="תגית חדשה + Enter"
        aria-label="הוסף תגית חדשה"
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDraft() } }}
        onBlur={addDraft} />
      <span id={`${id}-label`} className="sr-only">תגיות</span>
    </div>
  )
}
