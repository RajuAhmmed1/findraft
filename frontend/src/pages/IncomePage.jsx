import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useFmt, fmtDate, fmtDateInput, currentMonth, currentYear } from '../utils/format'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import ConfirmModal from '../components/ConfirmModal'

const INCOME_CATS = ['Salary','Freelance','Investment','Bonus','Rental','Gift','Other']
const CURRENCIES  = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']
const MONTH = currentMonth()
const YEAR  = currentYear()

// Form receives fmtC so no hook is called inside sub-component
function IncomeForm({ initial, orgs, fmtC, onSubmit, loading }) {
  const [form, setForm] = useState({
    amount:       initial?.amount       || '',
    category:     initial?.category     || INCOME_CATS[0],
    date:         fmtDateInput(initial?.date) || new Date().toISOString().slice(0,10),
    notes:        initial?.notes        || '',
    currency:     initial?.currency     || 'USD',
    organization: initial?.organization?._id || initial?.organization || '',
  })
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return setErr('Enter a valid amount.')
    if (!form.date) return setErr('Date is required.')
    setErr('')
    onSubmit({ ...form, amount: parseFloat(form.amount), organization: form.organization || null })
  }

  return (
    <div>
      {err && <div className="alert alert-error mb12">{err}</div>}
      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Amount</label>
          <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00"
            value={form.amount} onChange={set('amount')} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-select" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select" value={form.category} onChange={set('category')}>
          {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {orgs.length > 0 && (
        <div className="form-group">
          <label className="form-label">Link to Organization <span className="text-muted">(optional)</span></label>
          <select className="form-select" value={form.organization} onChange={set('organization')}>
            <option value="">— None —</option>
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
          <div className="form-hint">Link income to an org for better reporting.</div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.date} onChange={set('date')} />
      </div>

      <div className="form-group">
        <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="Add a note…" value={form.notes} onChange={set('notes')} />
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save Income'}
        </button>
      </div>
    </div>
  )
}

export default function IncomePage() {
  // ← Hook at very top of component, before any conditionals
  const fmtC = useFmt()

  const [showModal, setShow]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterMonth, setFM]  = useState(MONTH)
  const [filterYear,  setFY]  = useState(YEAR)
  const [filterOrg,   setFO]  = useState('')
  const { addToast } = useToast()

  const params = { month:filterMonth, year:filterYear, ...(filterOrg?{orgId:filterOrg}:{}) }
  const { data, loading, refetch } = useApi('/income', params)
  const { data: orgData }          = useApi('/organizations')
  const crud = useCrud('/income')

  const items = data?.items || []
  const orgs  = orgData?.items || []
  const total = items.reduce((a,i) => a+i.amount, 0)
  const avg   = items.length ? total/items.length : 0

  const close = () => { setShow(false); setEditing(null) }

  const save = useCallback(async form => {
    try {
      if (editing) { await crud.update(editing._id, form); addToast('Income updated!') }
      else         { await crud.create(form);              addToast('Income added!') }
      close(); refetch(params)
    } catch (e) { addToast(e.message, 'error') }
  }, [editing, filterMonth, filterYear, filterOrg])

  const remove = async () => {
    if (!deleteTarget?._id) return
    try { await crud.remove(deleteTarget._id); addToast('Deleted.'); setDeleteTarget(null); refetch(params) }
    catch (e) { addToast(e.message, 'error') }
  }

  const months = Array.from({length:12},(_,i)=>({ value:i+1, label:new Date(2024,i,1).toLocaleString('default',{month:'long'}) }))

  return (
    <div>
      <div className="flex-between mb20">
        <h2 style={{fontSize:18,fontWeight:600}}>Income</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}>+ Add Income</button>
      </div>

      <div className="g3 mb20">
        <StatCard label="Total Income"  value={fmtC(total)} icon="💰" iconBg="var(--accent-lt)" valueColor="var(--accent)" />
        <StatCard label="Entries"       value={items.length} icon="📋" iconBg="var(--primary-lt)" />
        <StatCard label="Average Entry" value={fmtC(avg)}  icon="⟨⟩" iconBg="var(--surface2)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Income Entries</div>
          <div className="flex-center gap8" style={{flexWrap:'wrap'}}>
            {orgs.length > 0 && (
              <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
                value={filterOrg}
                onChange={e => { setFO(e.target.value); refetch({month:filterMonth,year:filterYear,...(e.target.value?{orgId:e.target.value}:{})}) }}>
                <option value="">All Organizations</option>
                {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            )}
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterMonth}
              onChange={e => { setFM(+e.target.value); refetch({month:+e.target.value,year:filterYear,...(filterOrg?{orgId:filterOrg}:{})}) }}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterYear}
              onChange={e => { setFY(+e.target.value); refetch({month:filterMonth,year:+e.target.value,...(filterOrg?{orgId:filterOrg}:{})}) }}>
              {[YEAR,YEAR-1,YEAR-2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💰</div>
            <div className="empty-title">No income entries found</div>
            <div className="empty-text">Adjust filters or click "+ Add Income" to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th><th>Organization</th><th>Notes</th>
                  <th>Date</th><th>Currency</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                  <th style={{textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td data-label="Category"><span className="badge badge-income">{item.category}</span></td>
                    <td data-label="Organization">
                      {item.organization
                        ? <span className="badge badge-work" style={{background:(item.organization.color||'#3b5bdb')+'22',color:item.organization.color||'var(--primary)'}}>{item.organization.name}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td data-label="Notes" className="text-muted" style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.notes||'—'}</td>
                    <td data-label="Date" className="text-sm text-muted">{fmtDate(item.date)}</td>
                    <td data-label="Currency"><span className="tag">{item.currency}</span></td>
                    <td data-label="Amount" style={{textAlign:'right'}} className="pos">+{fmtC(item.amount, item.currency)}</td>
                    <td data-label="" style={{textAlign:'right'}}>
                      <button className="btn btn-sm" style={{marginRight:6}} onClick={() => { setEditing(item); setShow(true) }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(item)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                  <td colSpan={5} style={{padding:'10px 14px'}}>Total ({items.length} entries)</td>
                  <td style={{textAlign:'right',padding:'10px 14px'}} className="pos">+{fmtC(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Income' : 'Add Income'} onClose={close}>
          <IncomeForm initial={editing} orgs={orgs} fmtC={fmtC} onSubmit={save} loading={crud.loading} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Income Entry"
          message={`Delete ${deleteTarget.category} income entry?`}
          note="This income record will be permanently removed."
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
