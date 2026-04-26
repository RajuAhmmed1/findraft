import { useEffect, useState } from 'react'
import Modal from './Modal'

export default function AvatarUploadModal({
  initialUrl = '',
  loading = false,
  onClose,
  onApply
}) {
  const [url, setUrl] = useState(initialUrl || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setUrl(initialUrl || '')
    setError('')
  }, [initialUrl])

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setUrl(String(reader.result || ''))
      setError('')
    }
    reader.onerror = () => setError('Could not read selected file.')
    reader.readAsDataURL(file)
  }

  const apply = () => {
    if (url && !url.startsWith('data:image/')) {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setError('Use a valid http/https image URL.')
          return
        }
      } catch {
        setError('Use a valid image URL.')
        return
      }
    }
    setError('')
    onApply(url.trim())
  }

  return (
    <Modal title="Profile Picture" onClose={onClose} size="modal-compact modal-premium">
      <div className="avatar-upload">
        <div className="avatar avatar-upload-preview">
          {url
            ? <img src={url} alt="Profile preview" className="avatar-img" />
            : <span className="avatar-fallback">👤</span>}
        </div>

        <div className="form-group" style={{ marginBottom: 10 }}>
          <label className="form-label">Image URL</label>
          <input
            className="form-input"
            placeholder="https://example.com/photo.jpg"
            value={url.startsWith('data:image/') ? '' : url}
            onChange={e => setUrl(e.target.value)}
          />
          <div className="form-hint">Or choose a local image file below.</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            Choose Image
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-sm" onClick={() => setUrl('')} disabled={!url || loading}>Remove</button>
        </div>

        {error && <div className="alert alert-error mb12">{error}</div>}

        <div className="delete-confirm-actions" style={{ width: '100%' }}>
          <button className="btn btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={apply} disabled={loading}>
            {loading ? 'Saving…' : 'Save Photo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}