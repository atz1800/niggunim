import { useRef, useState } from 'react'
import { AUDIO_ACCEPT, MAX_AUDIO_MB } from '../lib/constants'

export default function AudioDropZone({ onFiles, children }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`audio-upload ${dragOver ? 'drag-over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() }
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={e => { onFiles(e.target.files); e.target.value = '' }}
      />
      <div className="audio-upload-text">
        {children}
        <div className="audio-upload-hint">MP3 / M4A / WAV ועוד — עד {MAX_AUDIO_MB}MB לקובץ</div>
      </div>
    </div>
  )
}
