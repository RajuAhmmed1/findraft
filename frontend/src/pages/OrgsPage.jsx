import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useFmt, currentMonth, currentYear } from '../utils/format'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const CURRENCIES = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']
const COLORS = ['#3b5bdb','#0ca678','#e67700','#6741d9','#1098ad','#e03131','#495057','#e64980']

function OrgForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({
    name:       initial?.name       || '',
    location:   initial?.location   || '',
    hourlyRate: initial?.hourlyRate != null ? initial.hourlyRate : '',
    currency:   initial?.currency   || 'USD',
    taxPercent: initial?.taxPercent != null ? initial.taxPercent : '',
    color:      initial?.color      || COLORS[0],
  })
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.name.trim()) return setErr('Organization name is required.')
    if (form.hourlyRate === '' || isNaN(Number(form.hourlyRate))) return setErr('Enter a valid hourly rate.')
    setErr('')
    onSubmit({ ...form, hourlyRate: parseFloat(form.hourlyRate), taxPercent: parseFloat(form.taxPercent) || 0 })
  }

  return (
    <div>
      {err && <div className="alert alert-error mb12">{err}</div>}
      <div className="form-group">
        <label className="form-label">Organization Name</label>
        <input className="form-input" placeholder="Acme Corp" value={form.name} onChange={set('name')} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Location <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="New York, USA" value={form.location} onChange={set('location')} />
      </div>
      <div className="form-grid3">
        <div className="form-group">
          <label className="form-label">Hourly Rate</label>
          <input className="form-input" type="number" min="0" step="0.5" placeholder="50" value={form.hourlyRate} onChange={set('hourlyRate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-select" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tax %</label>
          <input className="form-input" type="number" min="0" max="100" step="0.5" placeholder="22" value={form.taxPercent} onChange={set('taxPercent')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setForm(f => ({...f, color:c}))}
              style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',
                border:form.color===c?'3px solid var(--text)':'3px solid transparent',transition:'border .15s'}} />
          ))}
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8}}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save Organization'}
        </button>
      </div>
    </div>
  )
}

export default function OrgsPage() {
  const fmtC = useFmt()   // ← top of component

  const [showModal, setShow]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { addToast } = useToast()

  const { data, loading, refetch }   = useApi('/organizations')
  const { data: workData }           = useApi('/reports/work-by-org', { month:currentMonth(), year:currentYear() })
  const crud = useCrud('/organizations')

  const orgs      = data?.items || []
  const workByOrg = (workData?.data || []).reduce((acc,w) => { acc[w._id]=w; return acc }, {})

  const close = () => { setShow(false); setEditing(null) }

  const save = useCallback(async form => {
    try {
      if (editing) { await crud.update(editing._id, form); addToast('Organization updated!') }
      else         { await crud.create(form);              addToast('Organization added!') }
      close(); refetch()
    } catch (e) { addToast(e.message, 'error') }
  }, [editing])

  const remove = async () => {
    if (!deleteTarget?._id) return
    try { await crud.remove(deleteTarget._id); addToast('Deleted.'); setDeleteTarget(null); refetch() }
    catch (e) { addToast(e.message, 'error') }
  }

  return (
    <div>
      <div className="flex-between mb20">
        <h2 style={{fontSize:18,fontWeight:600}}>Organizations</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}>+ Add Organization</button>
      </div>

      {loading ? (
        <div className="g3">
          {[...Array(3)].map((_,i) => <div key={i} className="card" style={{height:220,background:'var(--surface2)'}} />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">⬡</div>
            <div className="empty-title">No organizations yet</div>
            <div className="empty-text">Add your first organization to start tracking work hours and earnings.</div>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={() => setShow(true)}>+ Add Organization</button>
          </div>
        </div>
      ) : (
        <div className="g3">
          {orgs.map(org => {
            const wk  = workByOrg[org._id] || {}
            const net  = Math.round(wk.totalNet   || 0)
            const hrs  = wk.totalHours || 0
            const gross= Math.round(wk.totalGross || 0)
            return (
              <div key={org._id} className="card" style={{borderTop:`3px solid ${org.color||'#3b5bdb'}`}}>
                <div className="flex-between mb12">
                  <div style={{
                    width:40,height:40,borderRadius:10,
                    background:org.color||'#3b5bdb',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontWeight:700,fontSize:16
                  }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <div className="flex gap8">
                    <button className="btn btn-sm" onClick={() => { setEditing(org); setShow(true) }}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(org)}>Del</button>
                  </div>
                </div>

                <div style={{fontWeight:600,fontSize:15,marginBottom:3}}>{org.name}</div>
                {org.location && <div className="text-sm text-muted mb12">📍 {org.location}</div>}

                <div className="org-info-grid">
                  <InfoBox label="Rate"       value={`${fmtC(org.hourlyRate, org.currency)}/hr`} />
                  <InfoBox label="Tax"        value={`${org.taxPercent || 0}%`} />
                  <InfoBox label="This Month" value={`${hrs}h`}      bg="var(--primary-lt)" color="var(--primary)" />
                  <InfoBox label="Net Earned" value={fmtC(net)}      bg="var(--accent-lt)"  color="var(--accent)"  />
                </div>

                {gross > 0 && (
                  <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:12}}>
                    <span className="text-muted">Gross this month</span>
                    <span className="neu" style={{fontWeight:600}}>{fmtC(gross)}</span>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add org card */}
          <div
            className="card"
            onClick={() => { setEditing(null); setShow(true) }}
            style={{border:'2px dashed var(--border)',background:'transparent',
              display:'flex',alignItems:'center',justifyContent:'center',
              minHeight:180,cursor:'pointer',transition:'border-color .15s'}}
            onMouseEnter={e => e.currentTarget.style.borderColor='var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
          >
            <div style={{textAlign:'center',color:'var(--text3)'}}>
              <div style={{fontSize:28,marginBottom:8}}>+</div>
              <div className="text-sm">Add Organization</div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Organization' : 'Add Organization'} onClose={close}>
          <OrgForm initial={editing} onSubmit={save} loading={crud.loading} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Organization"
          message={`Delete ${deleteTarget.name}?`}
          note="Associated work logs will also be permanently removed."
          confirmLabel="Delete"
          loading={crud.loading}
          danger
          onConfirm={remove}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function InfoBox({ label, value, bg, color }) {
  return (
    <div style={{background:bg||'var(--surface2)',borderRadius:8,padding:'10px 12px'}}>
      <div className="text-xs text-muted" style={{marginBottom:3,color:color?color+'aa':undefined}}>{label}</div>
      <div style={{fontWeight:600,fontSize:13,color:color||'var(--text)'}}>{value}</div>
    </div>
  )
}
