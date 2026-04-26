import { useEffect } from 'react'

export default function Modal({ title, onClose, onSave, saveLabel = 'Save', children, size = '' }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {onSave && (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>
          </div>
        )}
      </div>
    </div>
  )
}
