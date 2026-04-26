import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useFmt, fmtDate, fmtDateInput, currentMonth, currentYear } from '../utils/format'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import ConfirmModal from '../components/ConfirmModal'

const EXPENSE_CATS = ['Rent','Groceries','Utilities','Transport','Subscriptions','Healthcare','Entertainment','Clothing','Education','Dining','Other']
const CURRENCIES   = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']
const MONTH = currentMonth()
const YEAR  = currentYear()

function ExpenseForm({ initial, fmtC, onSubmit, loading }) {
  const [form, setForm] = useState({
    amount:   initial?.amount   || '',
    category: initial?.category || EXPENSE_CATS[0],
    date:     fmtDateInput(initial?.date) || new Date().toISOString().slice(0,10),
    notes:    initial?.notes    || '',
    currency: initial?.currency || 'USD',
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
        <label className="form-label">Category</label>
        <select className="form-select" value={form.category} onChange={set('category')}>
          {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={form.date} onChange={set('date')} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="Add a note…" value={form.notes} onChange={set('notes')} />
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',paddingTop:8}}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}

export default function ExpensePage() {
  const fmtC = useFmt()   // ← top of component

  const [showModal, setShow]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterMonth, setFM]  = useState(MONTH)
  const [filterYear,  setFY]  = useState(YEAR)
  const [filterCat,   setFC]  = useState('')
  const { addToast } = useToast()

  const params = { month:filterMonth, year:filterYear, ...(filterCat?{category:filterCat}:{}) }
  const { data, loading, refetch } = useApi('/expenses', params)
  const crud = useCrud('/expenses')

  const items  = data?.items || []
  const total  = items.reduce((a,i) => a+i.amount, 0)
  const catTotals = items.reduce((acc,i) => { acc[i.category]=(acc[i.category]||0)+i.amount; return acc }, {})
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0]

  const close = () => { setShow(false); setEditing(null) }

  const save = useCallback(async form => {
    try {
      if (editing) { await crud.update(editing._id, form); addToast('Expense updated!') }
      else         { await crud.create(form);              addToast('Expense added!') }
      close(); refetch(params)
    } catch (e) { addToast(e.message, 'error') }
  }, [editing, filterMonth, filterYear, filterCat])

  const remove = async () => {
    if (!deleteTarget?._id) return
    try { await crud.remove(deleteTarget._id); addToast('Deleted.'); setDeleteTarget(null); refetch(params) }
    catch (e) { addToast(e.message, 'error') }
  }

  const months = Array.from({length:12},(_,i)=>({value:i+1,label:new Date(2024,i,1).toLocaleString('default',{month:'long'})}))

  return (
    <div>
      <div className="flex-between mb20">
        <h2 style={{fontSize:18,fontWeight:600}}>Expenses</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShow(true) }}>+ Add Expense</button>
      </div>

      <div className="g3 mb20">
        <StatCard label="Total Expenses" value={fmtC(total)}     icon="💸" iconBg="var(--red-lt)"    valueColor="var(--red)" />
        <StatCard label="Entries"        value={items.length}    icon="📋" iconBg="var(--primary-lt)" />
        <StatCard label="Top Category"   value={topCat?topCat[0]:'—'} icon="📊" iconBg="var(--amber-lt)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Expense Entries</div>
          <div className="flex-center gap8" style={{flexWrap:'wrap'}}>
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterCat}
              onChange={e => { setFC(e.target.value); refetch({month:filterMonth,year:filterYear,...(e.target.value?{category:e.target.value}:{})}) }}>
              <option value="">All Categories</option>
              {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterMonth}
              onChange={e => { setFM(+e.target.value); refetch({month:+e.target.value,year:filterYear,...(filterCat?{category:filterCat}:{})}) }}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="form-select" style={{width:'auto',padding:'5px 10px',fontSize:12}}
              value={filterYear}
              onChange={e => { setFY(+e.target.value); refetch({month:filterMonth,year:+e.target.value,...(filterCat?{category:filterCat}:{})}) }}>
              {[YEAR,YEAR-1,YEAR-2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <div className="empty-title">No expenses found</div>
            <div className="empty-text">Adjust filters or add your first expense.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th><th>Notes</th><th>Date</th><th>Currency</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                  <th style={{textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td data-label="Category"><span className="badge badge-expense">{item.category}</span></td>
                    <td data-label="Notes" className="text-muted" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.notes||'—'}</td>
                    <td data-label="Date" className="text-sm text-muted">{fmtDate(item.date)}</td>
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
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={close}>
          <ExpenseForm initial={editing} fmtC={fmtC} onSubmit={save} loading={crud.loading} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Expense"
          message={`Delete ${deleteTarget.category} expense?`}
          note="This expense record will be permanently removed."
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
