import AudioDropZone from './AudioDropZone'
import FileUploadList from './FileUploadList'
import Recorder from './Recorder'

/** הקלטה מהמיקרופון + העלאת קבצים + רשימת ההעלאות — משותף להוספה ולעריכה */
export default function AudioInputs({ uploads, onError, onRecordingChange, autoRecord }) {
  return (
    <>
      <Recorder
        onRecorded={file => uploads.add([file])}
        onError={onError}
        onActiveChange={onRecordingChange}
        autoStart={autoRecord}
      />
      <AudioDropZone onFiles={uploads.add}>
        📁 או גרור קבצים לכאן / <strong>לחץ לבחירה</strong>
      </AudioDropZone>
      <FileUploadList files={uploads.files} onRemove={uploads.remove} />
      {uploads.uploading && (
        <div className="upload-status-msg" role="status">⏳ מעלה הקלטות... יש להמתין לפני השמירה</div>
      )}
    </>
  )
}
