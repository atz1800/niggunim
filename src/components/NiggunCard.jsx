import { getAudioFiles } from '../lib/audio'

export default function NiggunCard({ niggun, onOpen }) {
  const audioCount = getAudioFiles(niggun).length

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }

  return (
    <div className="niggun-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown}
      aria-label={`פתח את ${niggun.name}`}>
      <div className="card-header">
        <span className="card-name">{niggun.name}</span>
        {niggun.mood && <span className="card-mood">{niggun.mood}</span>}
      </div>

      {niggun.hebrewDate && (
        <div className="card-date">📅 {niggun.hebrewDate}</div>
      )}

      {niggun.chords && (
        <div className="card-chords" dir="ltr">🎸 {niggun.chords}</div>
      )}

      {niggun.story && (
        <div className="card-story">{niggun.story}</div>
      )}

      {audioCount > 0 && (
        <div className="card-audio-row">
          {/* כל הכרטיס לחיץ — הסמל דקורטיבי בלבד (אין כפתור מקונן בתוך role=button) */}
          <span className="card-play-btn" aria-hidden="true">▶</span>
          <span className="card-audio-label">
            {audioCount > 1 ? `${audioCount} הקלטות` : 'הקלטה'}
          </span>
        </div>
      )}
    </div>
  )
}
