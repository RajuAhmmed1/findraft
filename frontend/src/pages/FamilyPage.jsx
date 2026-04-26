import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useFmt, fmtDate, fmtDateInput, currentMonth, currentYear } from '../utils/format'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import ConfirmModal from '../components/ConfirmModal'

const CURRENCIES = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']
const MONTH = currentMonth()
const YEAR  = currentYear()

function FamilyForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({
    amount:    initial?.amount    || '',
    date:      fmtDateInput(initial?.date) || new Date().toISOString().slice(0,10),
    recipient: initial?.recipient || '',
    notes:     initial?.notes     || '',
    currency:  initial?.currency  || 'USD',
  })
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return setErr('Enter a valid amount.')
    if (!form.date) return setErr('Date is required.')
    setErr('')
    onSubmit({ ...form, amount: parseFloat(form.amount) })
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
        <label className="form-label">Recipient <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="e.g. Parents, Sister…" value={form.recipient} onChange={set('recipient')} />
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.date} onChange={set('date')} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
        <textarea className="form-textarea" placeholder="What was this for?" value={form.notes} onChange={set('notes')} />
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8}}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save Transfer'}
        </button>
      </div>
    </div>
  )
}

export default function FamilyPage() {
  const fmtC = useFmt()   // ← top of component

  const [showModal, setShow]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterMonth, setFM]  = useState(MONTH)
  const [filterYear,  setFY]  = useState(YEAR)
  const { addToast } = useToast()

  const params = { month:filterMonth, year:filterYear }
  const { data,    loading, refetch } = useApi('/family', params)
  const { data: allData }             = useApi('/family', {})
  const crud = useCrud('/family')

  const items    = data?.items    || []
  const allItems = allData?.items || []
  const total    = items.reduce((a,i) => a+i.amount, 0)
  const allTotal = allItems.reduce((a,i) => a+i.amount, 0)

  const close = () => { setShow(false); setEditing(null) }

  const save = useCallback(async form => {
    try {
      if (editing) { await crud.update(editing._id, form); addToast('Transfer updated!') }
      else         { await crud.create(form);              addToast('Transfer added!') }
      close(); refetch(params)
    } catch (e) { addToast(e.message, 'error') }
  }, [editing, filterMonth, filterYear])

  const remove = async () => {
    if (!deleteTarget?._id) return
    try { await crud.remove(deleteTarget._id); addToast('Deleted.'); setDeleteTarget(null); refetch(params) }
    catch (e) { addToast(e.message, 'error') }
  }

  const months = Array.from({length:12},(_,i)=>({value:i+1,label:new Date(2024,i,1).toLocaleString('default',{month:'long'})}))

  return (
    <div>
      <div className="flex-between mb20">
        <h2 style={{fontSize:18,fontWeight:600}}>Family Transfers</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}>+ Add Transfer</button>
      </div>

      <div className="g3 mb20">
        <StatCard label="Sent This Month" value={fmtC(total)}    icon="♥"  iconBg="var(--purple-lt)" valueColor="var(--purple)" />
        <StatCard label="Entries"         value={items.length}   icon="📋" iconBg="var(--primary-lt)" />
        <StatCard label="All Time Total"  value={fmtC(allTotal)} icon="🌍" iconBg="var(--surface2)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Transfer Records</div>
          <div className="flex-center gap8">
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterMonth}
              onChange={e => { setFM(+e.target.value); refetch({month:+e.target.value,year:filterYear}) }}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterYear}
              onChange={e => { setFY(+e.target.value); refetch({month:filterMonth,year:+e.target.value}) }}>
              {[YEAR,YEAR-1,YEAR-2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">♥</div>
            <div className="empty-title">No transfers this period</div>
            <div className="empty-text">Add a transfer to track money sent to family.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Recipient</th><th>Notes</th><th>Currency</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                  <th style={{textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td data-label="Date" className="text-sm text-muted">{fmtDate(item.date)}</td>
                    <td data-label="Recipient">{item.recipient||<span className="text-muted">—</span>}</td>
                    <td data-label="Notes" className="text-muted" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.notes||'—'}</td>
                    <td data-label="Currency"><span className="tag">{item.currency}</span></td>
                    <td data-label="Amount" style={{textAlign:'right'}} className="neg">-{fmtC(item.amount, item.currency)}</td>
                    <td data-label="" style={{textAlign:'right'}}>
                      <button className="btn btn-sm" style={{marginRight:6}} onClick={() => { setEditing(item); setShow(true) }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(item)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                  <td colSpan={4} style={{padding:'10px 14px'}}>Total ({items.length} entries)</td>
                  <td style={{textAlign:'right',padding:'10px 14px'}} className="neg">-{fmtC(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Transfer' : 'Add Family Transfer'} onClose={close}>
          <FamilyForm initial={editing} onSubmit={save} loading={crud.loading} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Family Transfer"
          message="Delete this family transfer record?"
          note="This transfer will be permanently removed."
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
