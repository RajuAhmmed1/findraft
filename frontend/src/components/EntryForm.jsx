import { useState } from 'react'
import { fmtDateInput } from '../utils/format'

const INCOME_CATS  = ['Salary','Freelance','Investment','Bonus','Rental','Gift','Other']
const EXPENSE_CATS = ['Rent','Groceries','Utilities','Transport','Subscriptions','Healthcare','Entertainment','Clothing','Education','Dining','Other']
const CURRENCIES   = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR']

export default function EntryForm({ type, initial, onSubmit, loading }) {
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS
  const [form, setForm] = useState({
    amount:   initial?.amount || '',
    category: initial?.category || cats[0],
    date:     fmtDateInput(initial?.date) || new Date().toISOString().slice(0, 10),
    notes:    initial?.notes || '',
    currency: initial?.currency || 'USD',
  })
  const [err, setErr] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = () => {
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setErr('Enter a valid amount.')
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
          <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={set('amount')} autoFocus />
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
          {cats.map(c => <option key={c}>{c}</option>)}
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

      <div className="modal-footer" style={{ padding: 0, paddingTop: 8 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}
