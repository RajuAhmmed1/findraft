import Modal from './Modal'

export default function ConfirmModal({
  title = 'Confirm Action',
  message,
  note,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  danger = false,
  onConfirm,
  onClose
}) {
  return (
    <Modal title={title} onClose={onClose} size="modal-compact modal-premium">
      <div className="delete-confirm">
        <div className="delete-confirm-badge">{danger ? '⚠' : '•'}</div>
        <div className="delete-confirm-title">{message}</div>
        {note && <div className="delete-confirm-note">{note}</div>}
        <div className="delete-confirm-actions">
          <button className="btn btn-sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}