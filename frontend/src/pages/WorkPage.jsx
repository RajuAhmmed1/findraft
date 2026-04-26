import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import ConfirmModal from '../components/ConfirmModal'
import { useFmt, fmtDate, fmtDateInput, currentMonth, currentYear } from '../utils/format'

const MONTH = currentMonth()
const YEAR  = currentYear()

function WorkForm({ initial, orgs, onSubmit, loading }) {
  const fmtC = useFmt()
  const [form, setForm] = useState({
    organization: initial?.organization?._id || initial?.organization || (orgs[0]?._id || ''),
    date:  fmtDateInput(initial?.date) || new Date().toISOString().slice(0, 10),
    hours: initial?.hours || '',
    notes: initial?.notes || '',
  })
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedOrg = orgs.find(o => o._id === form.organization)
  const gross = selectedOrg ? (parseFloat(form.hours) || 0) * selectedOrg.hourlyRate : 0
  const net   = selectedOrg ? gross * (1 - (selectedOrg.taxPercent || 0) / 100) : 0

  const submit = () => {
    if (!form.organization) return setErr('Select an organization.')
    if (!form.hours || Number(form.hours) <= 0) return setErr('Enter valid hours.')
    if (!form.date) return setErr('Date is required.')
    setErr('')
    onSubmit({ ...form, hours: parseFloat(form.hours) })
  }

  return (
    <div>
      {err && <div className="alert alert-error mb12">{err}</div>}
      {orgs.length === 0 && (
        <div className="alert" style={{ background:'var(--amber-lt)', color:'var(--amber)', marginBottom:12 }}>
          ⚠ Add an organization first before logging work hours.
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Organization</label>
        <select className="form-select" value={form.organization} onChange={set('organization')}>
          {orgs.length === 0
            ? <option value="">No organizations yet</option>
            : orgs.map(o => <option key={o._id} value={o._id}>{o.name} — {fmtC(o.hourlyRate, o.currency)}/hr</option>)
          }
        </select>
      </div>
      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={form.date} onChange={set('date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Hours Worked</label>
          <input className="form-input" type="number" min="0.25" max="24" step="0.25" placeholder="8" value={form.hours} onChange={set('hours')} autoFocus />
        </div>
      </div>

      {/* Live earnings preview */}
      {selectedOrg && parseFloat(form.hours) > 0 && (
        <div style={{ background:'var(--surface2)', borderRadius:10, padding:14, marginBottom:16, border:'1px solid var(--border)' }}>
          <div className="text-xs text-muted mb8" style={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>Earnings Preview</div>
          <div className="earnings-preview-grid">
            <div>
              <div className="text-xs text-muted mb4">Hours × Rate</div>
              <div style={{ fontWeight:600, fontSize:13 }}>{form.hours}h × {fmtC(selectedOrg.hourlyRate, selectedOrg.currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted mb4">Gross</div>
              <div style={{ fontWeight:600, fontSize:13 }}>{fmtC(gross, selectedOrg.currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted mb4">Net (after {selectedOrg.taxPercent}% tax)</div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--accent)' }}>{fmtC(net, selectedOrg.currency)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="What did you work on?" value={form.notes} onChange={set('notes')} />
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading || orgs.length === 0}>
          {loading ? 'Saving…' : 'Log Hours'}
        </button>
      </div>
    </div>
  )
}

export default function WorkPage() {
  const fmtC = useFmt()
  const [showModal, setShow]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterMonth, setFM]  = useState(MONTH)
  const [filterYear,  setFY]  = useState(YEAR)
  const [filterOrg,   setFO]  = useState('')   // ← org filter
  const { addToast } = useToast()

  // Build params — include orgId only when set
  const params = {
    month: filterMonth,
    year:  filterYear,
    ...(filterOrg ? { orgId: filterOrg } : {})
  }

  const { data, loading, refetch } = useApi('/worklogs', params)
  const { data: orgData }          = useApi('/organizations')
  const crud = useCrud('/worklogs')

  const logs = data?.items || []
  const orgs = orgData?.items || []

  const totalHours = logs.reduce((a, l) => a + l.hours, 0)
  const totalNet   = logs.reduce((a, l) => a + (l.netEarnings || 0), 0)
  const totalGross = logs.reduce((a, l) => a + (l.grossEarnings || 0), 0)

  // Per-org breakdown for selected filter
  const orgTotals = logs.reduce((acc, l) => {
    const name = l.organization?.name || 'Unknown'
    if (!acc[name]) acc[name] = { hours: 0, net: 0 }
    acc[name].hours += l.hours
    acc[name].net   += l.netEarnings || 0
    return acc
  }, {})

  const close = () => { setShow(false); setEditing(null) }

  const save = useCallback(async form => {
    try {
      if (editing) { await crud.update(editing._id, form); addToast('Work log updated!') }
      else         { await crud.create(form);              addToast('Hours logged!') }
      close(); refetch(params)
    } catch (e) { addToast(e.message, 'error') }
  }, [editing, filterMonth, filterYear, filterOrg])

  const remove = async () => {
    if (!deleteTarget?._id) return
    try { await crud.remove(deleteTarget._id); addToast('Deleted.'); setDeleteTarget(null); refetch(params) }
    catch (e) { addToast(e.message, 'error') }
  }

  const months = Array.from({ length:12 }, (_,i) => ({
    value: i+1,
    label: new Date(2024,i,1).toLocaleString('default',{ month:'long' })
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb20">
        <h2 style={{ fontSize:18, fontWeight:600 }}>Work Tracker</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}>+ Log Hours</button>
      </div>

      {/* Summary cards */}
      <div className="g3 mb20">
        <StatCard label="Total Hours"  value={`${totalHours.toFixed(1)}h`} icon="⏱" iconBg="var(--primary-lt)" />
        <StatCard label="Gross Earned" value={fmtC(totalGross)}             icon="💼" iconBg="var(--amber-lt)"   />
        <StatCard label="Net Earned"   value={fmtC(totalNet)}               icon="💰" iconBg="var(--accent-lt)"  valueColor="var(--accent)" />
      </div>

      {/* Per-org mini summary — only when no org filter applied and data exists */}
      {!filterOrg && Object.keys(orgTotals).length > 1 && (
        <div className="card mb20">
          <div className="card-header">
            <div className="card-title">Breakdown by Organization</div>
            <span className="text-sm text-muted">{months.find(m=>m.value===filterMonth)?.label} {filterYear}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            {Object.entries(orgTotals).map(([name, d]) => (
              <div key={name} style={{ background:'var(--surface2)', borderRadius:10, padding:'12px 16px', flex:'1 1 160px' }}>
                <div className="text-xs text-muted mb4" style={{ fontWeight:600 }}>{name}</div>
                <div style={{ fontWeight:700, fontSize:15 }}>{d.hours.toFixed(1)}h</div>
                <div className="text-sm" style={{ color:'var(--accent)', marginTop:2 }}>{fmtC(d.net)} net</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table with filters */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Work Log</div>
          <div className="flex-center gap8" style={{ flexWrap:'wrap' }}>
            {/* Organization filter */}
            <select
              className="form-select"
              style={{ width:'auto', padding:'5px 10px', fontSize:12 }}
              value={filterOrg}
              onChange={e => { setFO(e.target.value); refetch({ month:filterMonth, year:filterYear, ...(e.target.value?{orgId:e.target.value}:{}) }) }}
            >
              <option value="">All Organizations</option>
              {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>

            {/* Month filter */}
            <select
              className="form-select"
              style={{ width:'auto', padding:'5px 10px', fontSize:12 }}
              value={filterMonth}
              onChange={e => { setFM(+e.target.value); refetch({ month:+e.target.value, year:filterYear, ...(filterOrg?{orgId:filterOrg}:{}) }) }}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            {/* Year filter */}
            <select
              className="form-select"
              style={{ width:'auto', padding:'5px 10px', fontSize:12 }}
              value={filterYear}
              onChange={e => { setFY(+e.target.value); refetch({ month:filterMonth, year:+e.target.value, ...(filterOrg?{orgId:filterOrg}:{}) }) }}
            >
              {[YEAR, YEAR-1, YEAR-2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--text3)' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⏱️</div>
            <div className="empty-title">No work hours logged</div>
            <div className="empty-text">
              {filterOrg ? 'No hours for this organization in the selected period.' : 'Click "+ Log Hours" to start tracking.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Gross</th>
                  <th style={{ color:'var(--accent)' }}>Net (after tax)</th>
                  <th>Notes</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const org = log.organization
                  return (
                  <tr key={log._id}>
                      <td data-label="Organization">
                        <span
                          className="badge"
                          style={{
                            background: org?.color ? org.color+'22' : 'var(--primary-lt)',
                            color:      org?.color || 'var(--primary)'
                          }}
                        >
                          {org?.name || 'Unknown'}
                        </span>
                      </td>
                      <td data-label="Date" className="text-sm text-muted">{fmtDate(log.date)}</td>
                      <td data-label="Hours" style={{ fontWeight:600 }}>{log.hours}h</td>
                      <td data-label="Rate" className="text-muted text-sm mono">{fmtC(log.hourlyRateSnapshot)}/hr</td>
                      <td data-label="Gross" className="neu">{fmtC(log.grossEarnings || 0)}</td>
                      <td data-label="Net" className="pos">{fmtC(log.netEarnings || 0)}</td>
                      <td data-label="Notes" className="text-muted text-sm" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {log.notes || '—'}
                      </td>
                      <td data-label="" style={{ textAlign:'right' }}>
                        <button className="btn btn-sm" style={{ marginRight:6 }} onClick={() => { setEditing(log); setShow(true) }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(log)}>Del</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--border)', fontWeight:600, background:'var(--surface2)' }}>
                  <td colSpan={2} style={{ padding:'10px 14px' }}>Total ({logs.length} entries)</td>
                  <td style={{ padding:'10px 14px' }}>{totalHours.toFixed(1)}h</td>
                  <td />
                  <td style={{ padding:'10px 14px' }} className="neu">{fmtC(totalGross)}</td>
                  <td style={{ padding:'10px 14px' }} className="pos">{fmtC(totalNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Work Log' : 'Log Work Hours'} onClose={close}>
          <WorkForm initial={editing} orgs={orgs} onSubmit={save} loading={crud.loading} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Work Log"
          message="Delete this work log entry?"
          note="This work record will be permanently removed."
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
