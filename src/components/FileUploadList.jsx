const STATUS_ICON = { uploading: '⏫', done: '✅', error: '❌' }

export default function FileUploadList({ files, onRemove }) {
  if (!files.length) return null
  return (
    <ul className="audio-files-list">
      {files.map(f => (
        <li key={f.id} className={`audio-file-item ${f.status}`}>
          <span className="audio-file-name">
            <span aria-hidden="true">{STATUS_ICON[f.status]}</span> {f.file.name}
          </span>
          <div className="audio-file-right">
            {f.status === 'uploading' && (
              <div className="upload-progress-wrapper">
                <div className="file-progress-bar" role="progressbar"
                  aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`העלאת ${f.file.name}`}>
                  <div className="file-progress-fill" style={{ width: `${f.progress}%` }} />
                </div>
                <span className="file-progress-text">{f.progress}%</span>
              </div>
            )}
            {f.status === 'done' && <span className="file-done-label">הועלה</span>}
            {f.status === 'error' && <span className="file-done-label">נכשל</span>}
            {f.status !== 'uploading' && (
              <button type="button" className="remove-file-btn"
                onClick={() => onRemove(f.id)} aria-label={`הסר ${f.file.name}`}>✕</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
