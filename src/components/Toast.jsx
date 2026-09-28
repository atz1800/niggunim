export default function Toast({ toast, onAction }) {
  return (
    <div className={`toast ${toast ? 'show' : ''} ${toast?.type || ''}`} role="status" aria-live="polite">
      {toast && (
        <>
          <span>{toast.msg}</span>
          {toast.action && (
            <button type="button" className="toast-action" onClick={onAction}>{toast.action}</button>
          )}
        </>
      )}
    </div>
  )
}
