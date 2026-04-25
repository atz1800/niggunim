import React from 'react'

export default function NiggunCard({ niggun, onClick }) {
  const audioCount = niggun.audioFiles?.length || (niggun.audioUrl ? 1 : 0)
  const hasAudio = audioCount > 0

  return (
    <div className="niggun-card" onClick={onClick}>
      <div className="card-header">
        <span className="card-name">{niggun.name}</span>
        {niggun.mood && <span className="card-mood">{niggun.mood}</span>}
      </div>

      {niggun.hebrewDate && (
        <div className="card-date">📅 {niggun.hebrewDate}</div>
      )}

      {niggun.chords && (
        <div className="card-chords">🎸 {niggun.chords}</div>
      )}

      {niggun.story && (
        <div className="card-story">{niggun.story}</div>
      )}

      {hasAudio && (
        <div className="card-audio-row">
          <button
            className="card-play-btn"
            title="לחץ לשמיעה"
            onClick={e => { e.stopPropagation(); onClick() }}
          >
            ▶
          </button>
          <span className="card-audio-label">
            {audioCount > 1 ? `${audioCount} הקלטות` : 'הקלטה'}
          </span>
        </div>
      )}
    </div>
  )
}
