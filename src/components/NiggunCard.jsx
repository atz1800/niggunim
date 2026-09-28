import { getAudioFiles } from '../lib/audio'
import { getTags } from '../lib/niggun'
import FavoriteButton from './FavoriteButton'

export default function NiggunCard({ niggun, uid, onOpen, onPlay, playing }) {
  const audioCount = getAudioFiles(niggun).length
  const tags = getTags(niggun)

  function onKeyDown(e) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }

  return (
    <div className={`niggun-card ${playing ? 'playing' : ''}`} role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown}
      aria-label={`פתח את ${niggun.name}`}>
      <div className="card-header">
        <span className="card-name">{niggun.name}</span>
        <FavoriteButton uid={uid} niggun={niggun} />
      </div>

      {(tags.length > 0 || niggun.source) && (
        <div className="card-tags">
          {niggun.source && <span className="card-source">{niggun.source}</span>}
          {tags.slice(0, 3).map(t => <span key={t} className="card-mood">{t}</span>)}
        </div>
      )}

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
          {/* ניגון מיידי מהרשימה בנגן התחתון, בלי לפתוח את הניגון */}
          <button type="button" className="card-play-btn" onClick={e => { e.stopPropagation(); onPlay() }}
            onKeyDown={e => e.stopPropagation()}
            aria-label={playing ? `מתנגן: ${niggun.name}` : `נגן את ${niggun.name}`}>
            {playing ? '♪' : '▶'}
          </button>
          <span className="card-audio-label">
            {audioCount > 1 ? `${audioCount} הקלטות` : 'הקלטה'}
          </span>
        </div>
      )}
    </div>
  )
}
