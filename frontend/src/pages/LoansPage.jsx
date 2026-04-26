import { useState, useCallback } from 'react'
import { useApi, useCrud } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useFmt, fmtDate, fmtDateInput, currentMonth, currentYear } from '../utils/format'
import api from '../utils/api'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import ConfirmModal from '../components/ConfirmModal'

const CURRENCIES = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']
const DIRECTION_OPTIONS = [
  { value: 'borrowed', label: 'Borrowed (I took a loan)' },
  { value: 'lent', label: 'Lent (I gave a loan)' }
]
const COUNTERPARTY_TYPES = ['person', 'organization']
const INTEREST_PERIODS = ['monthly', 'annually']
const INTEREST_METHODS = ['flat', 'reducing']
const INSTALLMENT_FREQ = ['monthly', 'quarterly', 'annually', 'custom']
const PAYMENT_METHODS = ['cash', 'bank', 'mobile', 'card', 'other']

const MONTH = currentMonth()
const YEAR = currentYear()

function LoanForm({ initial, orgs, onSubmit, loading }) {
  const [form, setForm] = useState({
    direction: initial?.direction || 'borrowed',
    counterpartyType: initial?.counterpartyType || 'person',
    counterpartyName: initial?.counterpartyName || '',
    organization: initial?.organization?._id || initial?.organization || '',
    principal: initial?.principal || '',
    interestRate: initial?.interestRate ?? 0,
    interestPeriod: initial?.interestPeriod || 'annually',
    interestMethod: initial?.interestMethod || 'reducing',
    installmentFrequency: initial?.installmentFrequency || 'monthly',
    installmentAmount: initial?.installmentAmount || '',
    startDate: fmtDateInput(initial?.startDate) || new Date().toISOString().slice(0, 10),
    dueDate: fmtDateInput(initial?.dueDate) || '',
    status: initial?.status || 'active',
    currency: initial?.currency || 'USD',
    notes: initial?.notes || ''
  })

  const [err, setErr] = useState('')
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const onCounterpartyType = e => {
    const nextType = e.target.value
    setForm(f => ({
      ...f,
      counterpartyType: nextType,
      organization: nextType === 'organization' ? f.organization : ''
    }))
  }

  const onOrganization = e => {
    const value = e.target.value
    const found = orgs.find(o => o._id === value)
    setForm(f => ({
      ...f,
      organization: value,
      counterpartyName: found ? found.name : f.counterpartyName
    }))
  }

  const submit = () => {
    if (!form.principal || Number(form.principal) <= 0) return setErr('Principal must be greater than zero.')
    if (!form.counterpartyName.trim()) return setErr('Counterparty name is required.')
    if (!form.startDate) return setErr('Start date is required.')
    if (form.interestRate < 0) return setErr('Interest rate cannot be negative.')
    if (form.installmentAmount && Number(form.installmentAmount) < 0) return setErr('Installment amount cannot be negative.')

    setErr('')
    onSubmit({
      ...form,
      principal: Number(form.principal),
      interestRate: Number(form.interestRate || 0),
      installmentAmount: Number(form.installmentAmount || 0),
      organization: form.counterpartyType === 'organization' ? (form.organization || null) : null,
      dueDate: form.dueDate || null
    })
  }

  return (
    <div>
      {err && <div className="alert alert-error mb12">{err}</div>}

      <div className="form-group">
        <label className="form-label">Direction</label>
        <select className="form-select" value={form.direction} onChange={set('direction')}>
          {DIRECTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Counterparty Type</label>
          <select className="form-select" value={form.counterpartyType} onChange={onCounterpartyType}>
            {COUNTERPARTY_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-select" value={form.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {form.counterpartyType === 'organization' && orgs.length > 0 && (
        <div className="form-group">
          <label className="form-label">Organization</label>
          <select className="form-select" value={form.organization} onChange={onOrganization}>
            <option value="">Select organization</option>
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
          <div className="form-hint">You can still edit the display name below if needed.</div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Counterparty Name</label>
        <input className="form-input" value={form.counterpartyName} onChange={set('counterpartyName')} placeholder="Person or organization name" />
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Principal</label>
          <input className="form-input" type="number" min="0.01" step="0.01" value={form.principal} onChange={set('principal')} />
        </div>
        <div className="form-group">
          <label className="form-label">Installment Amount</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.installmentAmount} onChange={set('installmentAmount')} placeholder="Optional" />
        </div>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Interest Percentage</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.interestRate} onChange={set('interestRate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Period</label>
          <select className="form-select" value={form.interestPeriod} onChange={set('interestPeriod')}>
            {INTEREST_PERIODS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Interest Method</label>
          <select className="form-select" value={form.interestMethod} onChange={set('interestMethod')}>
            {INTEREST_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Installment Frequency</label>
          <select className="form-select" value={form.installmentFrequency} onChange={set('installmentFrequency')}>
            {INSTALLMENT_FREQ.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date <span className="text-muted">(optional)</span></label>
          <input className="form-input" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select" value={form.status} onChange={set('status')}>
          <option value="active">active</option>
          <option value="closed">closed</option>
          <option value="defaulted">defaulted</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
        <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Any loan terms, method, or agreement notes" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving...' : 'Save Loan'}
        </button>
      </div>
    </div>
  )
}

function PaymentForm({ loan, onSubmit, loading }) {
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'bank',
    note: ''
  })
  const [err, setErr] = useState('')
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return setErr('Payment amount must be greater than zero.')
    if (!form.date) return setErr('Payment date is required.')
    setErr('')
    onSubmit({ ...form, amount: Number(form.amount) })
  }

  const payments = loan?.payments || []

  return (
    <div>
      {err && <div className="alert alert-error mb12">{err}</div>}
      <div className="mb12" style={{ background: 'var(--surface2)', padding: 12, borderRadius: 10 }}>
        <div className="text-sm text-muted">Counterparty</div>
        <div style={{ fontWeight: 600 }}>{loan?.counterpartyName}</div>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Payment Amount</label>
          <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={form.date} onChange={set('date')} />
        </div>
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select className="form-select" value={form.method} onChange={set('method')}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Note <span className="text-muted">(optional)</span></label>
          <input className="form-input" value={form.note} onChange={set('note')} />
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mb12">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Previous Payments</div>
          <div className="table-wrap" style={{ maxHeight: 180, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                  <tr key={p._id}>
                    <td data-label="Date" className="text-sm text-muted">{fmtDate(p.date)}</td>
                    <td data-label="Method">{p.method}</td>
                    <td data-label="Note" className="text-muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note || '-'}</td>
                    <td data-label="Amount" style={{ textAlign: 'right' }}>{p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving...' : 'Add Payment'}
        </button>
      </div>
    </div>
  )
}

export default function LoansPage() {
  const fmtC = useFmt()
  const { addToast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payingLoan, setPayingLoan] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [filterMonth, setFilterMonth] = useState(MONTH)
  const [filterYear, setFilterYear] = useState(YEAR)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDirection, setFilterDirection] = useState('')

  const params = {
    month: filterMonth,
    year: filterYear,
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterDirection ? { direction: filterDirection } : {})
  }

  const { data, loading, refetch } = useApi('/loans', params)
  const { data: orgData } = useApi('/organizations')
  const crud = useCrud('/loans')

  const items = data?.items || []
  const orgs = orgData?.items || []

  const totalBorrowed = items.filter(i => i.direction === 'borrowed').reduce((sum, i) => sum + (i.principal || 0), 0)
  const totalLent = items.filter(i => i.direction === 'lent').reduce((sum, i) => sum + (i.principal || 0), 0)
  const totalRemaining = items.reduce((sum, i) => sum + (i.stats?.remainingAmount || 0), 0)

  const closeLoanModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const closePayModal = () => {
    setShowPayModal(false)
    setPayingLoan(null)
  }

  const saveLoan = useCallback(async payload => {
    try {
      if (editing) {
        await crud.update(editing._id, payload)
        addToast('Loan updated.')
      } else {
        await crud.create(payload)
        addToast('Loan added.')
      }
      closeLoanModal()
      refetch(params)
    } catch (e) {
      addToast(e.message, 'error')
    }
  }, [editing, filterMonth, filterYear, filterStatus, filterDirection])

  const removeLoan = async () => {
    if (!deleteTarget?._id) return
    try {
      await crud.remove(deleteTarget._id)
      addToast('Loan deleted.')
      setDeleteTarget(null)
      refetch(params)
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const addPayment = async payload => {
    if (!payingLoan) return
    try {
      await api.post(`/loans/${payingLoan._id}/payments`, payload)
      addToast('Payment recorded.')
      closePayModal()
      refetch(params)
    } catch (e) {
      addToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleString('default', { month: 'long' })
  }))

  return (
    <div>
      <div className="flex-between mb20">
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Loans</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add Loan</button>
      </div>

      <div className="g3 mb20">
        <StatCard label="Borrowed" value={fmtC(totalBorrowed)} icon="B" iconBg="var(--red-lt)" valueColor="var(--red)" />
        <StatCard label="Lent" value={fmtC(totalLent)} icon="L" iconBg="var(--accent-lt)" valueColor="var(--accent)" />
        <StatCard label="Remaining" value={fmtC(totalRemaining)} icon="R" iconBg="var(--primary-lt)" valueColor="var(--primary)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Loan Records</div>
          <div className="flex-center gap8" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={filterDirection}
              onChange={e => {
                setFilterDirection(e.target.value)
                refetch({
                  month: filterMonth,
                  year: filterYear,
                  ...(filterStatus ? { status: filterStatus } : {}),
                  ...(e.target.value ? { direction: e.target.value } : {})
                })
              }}
            >
              <option value="">All Directions</option>
              <option value="borrowed">borrowed</option>
              <option value="lent">lent</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value)
                refetch({
                  month: filterMonth,
                  year: filterYear,
                  ...(filterDirection ? { direction: filterDirection } : {}),
                  ...(e.target.value ? { status: e.target.value } : {})
                })
              }}
            >
              <option value="">All Status</option>
              <option value="active">active</option>
              <option value="closed">closed</option>
              <option value="defaulted">defaulted</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={filterMonth}
              onChange={e => {
                const next = Number(e.target.value)
                setFilterMonth(next)
                refetch({
                  month: next,
                  year: filterYear,
                  ...(filterStatus ? { status: filterStatus } : {}),
                  ...(filterDirection ? { direction: filterDirection } : {})
                })
              }}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={filterYear}
              onChange={e => {
                const next = Number(e.target.value)
                setFilterYear(next)
                refetch({
                  month: filterMonth,
                  year: next,
                  ...(filterStatus ? { status: filterStatus } : {}),
                  ...(filterDirection ? { direction: filterDirection } : {})
                })
              }}
            >
              {[YEAR, YEAR - 1, YEAR - 2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">LN</div>
            <div className="empty-title">No loans found</div>
            <div className="empty-text">Add your first loan to track interest, payments, and remaining balance.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Counterparty</th>
                  <th>Principal</th>
                  <th>Paid Off</th>
                  <th>Remaining</th>
                  <th>Installments</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id}>
                    <td data-label="Direction">
                      <span className={`badge ${item.direction === 'borrowed' ? 'badge-expense' : 'badge-income'}`}>
                        {item.direction}
                      </span>
                    </td>
                    <td data-label="Counterparty">
                      <div style={{ fontWeight: 500 }}>{item.counterpartyName}</div>
                      <div className="text-sm text-muted">{item.counterpartyType} | {fmtDate(item.startDate)}</div>
                    </td>
                    <td data-label="Principal">{fmtC(item.principal, item.currency)}</td>
                    <td data-label="Paid" className="pos">{fmtC(item.stats?.paidAmount || 0, item.currency)}</td>
                    <td data-label="Remaining" className="neg">{fmtC(item.stats?.remainingAmount || 0, item.currency)}</td>
                    <td data-label="Installment">
                      {item.installmentAmount > 0
                        ? `${fmtC(item.installmentAmount, item.currency)} / ${item.installmentFrequency}`
                        : '-'}
                      {item.stats?.installmentsRemaining !== null && (
                        <div className="text-sm text-muted">{item.stats.installmentsRemaining} left</div>
                      )}
                    </td>
                    <td data-label="Status"><span className="tag">{item.status}</span></td>
                    <td data-label="" style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm" style={{ marginRight: 6 }} onClick={() => { setPayingLoan(item); setShowPayModal(true) }}>Pay</button>
                      <button className="btn btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditing(item); setShowModal(true) }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(item)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Loan' : 'Add Loan'} onClose={closeLoanModal}>
          <LoanForm initial={editing} orgs={orgs} onSubmit={saveLoan} loading={crud.loading} />
        </Modal>
      )}

      {showPayModal && payingLoan && (
        <Modal title="Record Installment / Payment" onClose={closePayModal}>
          <PaymentForm loan={payingLoan} onSubmit={addPayment} loading={false} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Loan"
          message={`Delete loan with ${deleteTarget.counterpartyName}?`}
          note="All payment records linked to this loan will be permanently removed."
          confirmLabel="Delete"
          loading={crud.loading}
          danger
          onConfirm={removeLoan}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
