import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useFmt, fmtDate } from '../utils/format'
import api from '../utils/api'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'

const CURRENCIES = ['USD','EUR','GBP','JPY','KRW','AUD','CAD','SGD','INR','CNY','CHF','MYR']

function UserForm({ initial, onSubmit, loading, submitLabel, requirePassword = false }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    avatarUrl: initial?.avatarUrl || '',
    password: '',
    role: initial?.role || 'user',
    defaultCurrency: initial?.defaultCurrency || 'USD',
    theme: initial?.theme || 'light',
    isActive: initial?.isActive ?? true
  })
  const [error, setError] = useState('')
  const set = key => e => {
    const value = key === 'isActive' ? e.target.value === 'true' : e.target.value
    setForm(current => ({ ...current, [key]: value }))
  }

  const submit = () => {
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.email.trim()) return setError('Email is required.')
    if (requirePassword && form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (!requirePassword && form.password && form.password.length < 6) return setError('Password must be at least 6 characters.')

    setError('')
    const payload = {
      name: form.name,
      email: form.email,
      avatarUrl: form.avatarUrl,
      role: form.role,
      defaultCurrency: form.defaultCurrency,
      theme: form.theme,
      isActive: form.isActive
    }
    if (form.password) payload.password = form.password
    onSubmit(payload)
  }

  return (
    <div>
      {error && <div className="alert alert-error mb12">{error}</div>}

      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input className="form-input" value={form.name} onChange={set('name')} autoFocus />
      </div>

      <div className="form-grid2">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="form-group">
          <label className="form-label">{requirePassword ? 'Temporary Password' : 'Reset Password'}</label>
          <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder={requirePassword ? '' : 'Leave blank to keep current'} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Profile Picture URL <span className="text-muted">(optional)</span></label>
        <input className="form-input" placeholder="https://..." value={form.avatarUrl} onChange={set('avatarUrl')} />
      </div>

      <div className="form-grid3">
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={set('role')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select className="form-select" value={form.defaultCurrency} onChange={set('defaultCurrency')}>
            {CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Theme</label>
          <select className="form-select" value={form.theme} onChange={set('theme')}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select" value={String(form.isActive)} onChange={set('isActive')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const fmtC = useFmt()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({ q: '', role: '', status: '' })
  const [busyId, setBusyId] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const { data: overviewData, loading: overviewLoading, refetch: refetchOverview } = useApi('/admin/overview')
  const { data: userData, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApi('/admin/users', filters)

  const stats = overviewData?.stats
  const recentUsers = overviewData?.recentUsers || []
  const users = userData?.items || []

  const refreshAll = () => {
    refetchOverview()
    refetchUsers(filters)
  }

  const createUser = async payload => {
    setCreating(true)
    try {
      await api.post('/admin/users', payload)
      addToast(`${payload.role === 'admin' ? 'Admin' : 'User'} account created.`)
      setShowCreate(false)
      refreshAll()
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const saveEdit = async payload => {
    if (!editingUser) return
    setSavingEdit(true)
    try {
      await api.patch(`/admin/users/${editingUser._id}`, payload)
      addToast('User details updated.')
      setEditingUser(null)
      refreshAll()
      if (detailUser?._id === editingUser._id) {
        await openDetails(editingUser)
      }
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const updateUser = async (id, payload, successMessage) => {
    setBusyId(id)
    try {
      await api.patch(`/admin/users/${id}`, payload)
      addToast(successMessage)
      refreshAll()
      if (detailUser?._id === id) {
        await openDetails({ _id: id })
      }
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  const deleteUser = async target => {
    setBusyId(target._id)
    try {
      await api.delete(`/admin/users/${target._id}`)
      addToast('User deleted.')
      if (detailUser?._id === target._id) {
        setDetailUser(null)
        setDetailData(null)
      }
      setDeleteUserTarget(null)
      refreshAll()
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  const onFilter = key => e => {
    const value = e.target.value
    setFilters(current => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    const empty = { q: '', role: '', status: '' }
    setFilters(empty)
    refetchUsers(empty)
  }

  const openDetails = async target => {
    const userId = target._id
    setDetailUser(target)
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/users/${userId}/details`)
      setDetailData(res.data)
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
      setDetailUser(null)
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetails = () => {
    setDetailUser(null)
    setDetailData(null)
  }

  const downloadBlob = (content, fileName, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const rowsToCsv = rows => rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

  const buildExportRows = bundle => {
    const { user: exportUser, data } = bundle
    return [
      ['Section','Date','Primary','Secondary','Amount','Currency','Notes'],
      ...data.income.map(item => ['Income', fmtDate(item.date), item.category, item.organization?.name || '', item.amount, item.currency, item.notes || '']),
      ...data.expenses.map(item => ['Expense', fmtDate(item.date), item.category, '', item.amount, item.currency, item.notes || '']),
      ...data.familyTransfers.map(item => ['Family', fmtDate(item.date), item.recipient || 'Family Transfer', '', item.amount, item.currency, item.notes || '']),
      ...data.organizations.map(item => ['Organization', fmtDate(item.createdAt), item.name, item.location || '', item.hourlyRate, item.currency, `Tax ${item.taxPercent || 0}%`]),
      ...data.worklogs.map(item => ['Work', fmtDate(item.date), item.organization?.name || 'Unknown', `${item.hours}h`, item.netEarnings || 0, item.organization?.currency || '', item.notes || '']),
      ...data.loans.map(item => ['Loan', fmtDate(item.startDate), item.counterpartyName, item.direction, item.principal, item.currency, item.notes || '']),
      ['User', fmtDate(exportUser.createdAt), exportUser.name, exportUser.email, '', exportUser.defaultCurrency || '', `${exportUser.role} / ${exportUser.isActive ? 'active' : 'inactive'}`]
    ]
  }

  const exportUserData = async (target, format) => {
    setBusyId(target._id)
    try {
      const res = await api.get(`/admin/users/${target._id}/export`)
      const fileBase = `findraft-user-${target.email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
      if (format === 'json') {
        downloadBlob(JSON.stringify(res.data, null, 2), `${fileBase}.json`, 'application/json')
      } else {
        downloadBlob(rowsToCsv(buildExportRows(res.data)), `${fileBase}.csv`, 'text/csv')
      }
      addToast(`Exported ${target.email} as ${format.toUpperCase()}.`)
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  const loading = overviewLoading || usersLoading

  return (
    <div>
      <div className="flex-between mb20">
        <div>
          <h2 style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Admin Dashboard</h2>
          <div className="text-sm text-muted">Manage users, inspect account activity, and export user data.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      <div className="g4 mb20">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon="U" iconBg="var(--primary-lt)" />
        <StatCard label="Active Users" value={stats?.activeUsers || 0} icon="A" iconBg="var(--accent-lt)" valueColor="var(--accent)" />
        <StatCard label="Admins" value={stats?.adminUsers || 0} icon="★" iconBg="var(--amber-lt)" />
        <StatCard label="Tracked Records" value={stats?.totalRecords || 0} icon="Σ" iconBg="var(--surface2)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">User Management</div>
            <div className="card-subtitle">Filter, edit, activate, deactivate, inspect, export, or remove accounts</div>
          </div>
          <div className="flex-center gap8" style={{ flexWrap:'wrap' }}>
            <input className="form-input" placeholder="Search name or email" value={filters.q} onChange={onFilter('q')} style={{ width:220 }} />
            <select className="form-select" value={filters.role} onChange={onFilter('role')} style={{ width:'auto' }}>
              <option value="">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select className="form-select" value={filters.status} onChange={onFilter('status')} style={{ width:'auto' }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button className="btn btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--text3)' }}>Loading…</div>
        ) : usersError ? (
          <div className="empty">
            <div className="empty-icon">!</div>
            <div className="empty-title">Could not load users</div>
            <div className="empty-text">{usersError}</div>
          </div>
        ) : users.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🛡</div>
            <div className="empty-title">No matching users</div>
            <div className="empty-text">Try clearing filters or create a new account.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Preferences</th>
                  <th>Joined</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(item => {
                  const isSelf = item._id === user?._id
                  const pending = busyId === item._id
                  return (
                    <tr key={item._id}>
                      <td data-label="User">
                        <div className="flex-center gap8" style={{ justifyContent:'flex-start' }}>
                          <div className="avatar admin-avatar-sm">
                            {item.avatarUrl
                              ? <img src={item.avatarUrl} alt={item.name} className="avatar-img" />
                              : <span className="avatar-fallback">👤</span>}
                          </div>
                          <div>
                            <div style={{ fontWeight:600 }}>{item.name}</div>
                            <div className="text-sm text-muted">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Role">
                        <span className={`badge ${item.role === 'admin' ? 'badge-income' : 'badge-work'}`}>{item.role}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`tag ${item.isActive ? '' : 'tag-muted'}`}>{item.isActive ? 'active' : 'inactive'}</span>
                      </td>
                      <td data-label="Prefs" className="text-sm text-muted">{item.defaultCurrency || 'USD'} · {item.theme || 'light'}</td>
                      <td data-label="Joined" className="text-sm text-muted">{fmtDate(item.createdAt)}</td>
                      <td data-label="" style={{ textAlign:'right' }}>
                        <button className="btn btn-sm" style={{ marginRight:6 }} disabled={pending} onClick={() => openDetails(item)}>View</button>
                        <button className="btn btn-sm" style={{ marginRight:6 }} disabled={pending} onClick={() => setEditingUser(item)}>Edit</button>
                        <button className="btn btn-sm" style={{ marginRight:6 }} disabled={pending} onClick={() => exportUserData(item, 'json')}>JSON</button>
                        <button className="btn btn-sm" style={{ marginRight:6 }} disabled={pending} onClick={() => exportUserData(item, 'csv')}>CSV</button>
                        <button
                          className="btn btn-sm"
                          style={{ marginRight:6 }}
                          disabled={pending || isSelf}
                          onClick={() => updateUser(item._id, { isActive: !item.isActive }, item.isActive ? 'User made inactive.' : 'User reactivated.')}
                        >
                          {item.isActive ? 'Inactive' : 'Activate'}
                        </button>
                        <button className="btn btn-sm btn-danger" disabled={pending || isSelf} onClick={() => setDeleteUserTarget(item)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="g2 mb20" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Module Activity</div>
              <div className="card-subtitle">Records stored across the platform</div>
            </div>
          </div>
          <div className="org-info-grid">
            <Metric label="Income" value={stats?.modules?.income || 0} color="var(--accent)" />
            <Metric label="Expenses" value={stats?.modules?.expenses || 0} color="var(--red)" />
            <Metric label="Family" value={stats?.modules?.familyTransfers || 0} color="var(--purple)" />
            <Metric label="Organizations" value={stats?.modules?.organizations || 0} color="var(--primary)" />
            <Metric label="Work Logs" value={stats?.modules?.worklogs || 0} color="var(--amber)" />
            <Metric label="Loans" value={stats?.modules?.loans || 0} color="var(--text)" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Users</div>
              <div className="card-subtitle">Latest accounts created</div>
            </div>
          </div>
          {recentUsers.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👤</div>
              <div className="empty-text">No users found yet.</div>
            </div>
          ) : (
            <div>
              {recentUsers.map(item => (
                <div key={item._id} className="flex-between" style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                  <div className="flex-center gap8" style={{ minWidth:0 }}>
                    <div className="avatar admin-avatar-sm">
                      {item.avatarUrl
                        ? <img src={item.avatarUrl} alt={item.name} className="avatar-img" />
                        : <span className="avatar-fallback">👤</span>}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600 }}>{item.name}</div>
                      <div className="text-sm text-muted" style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{item.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div className="text-sm">{item.role}</div>
                    <div className="text-xs text-muted">{fmtDate(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <UserForm onSubmit={createUser} loading={creating} submitLabel="Create User" requirePassword />
        </Modal>
      )}

      {editingUser && (
        <Modal title={`Edit ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <UserForm initial={editingUser} onSubmit={saveEdit} loading={savingEdit} submitLabel="Save Changes" />
        </Modal>
      )}

      {deleteUserTarget && (
        <Modal title="Delete User" onClose={() => setDeleteUserTarget(null)} size="modal-compact modal-premium">
          <div className="delete-confirm">
            <div className="delete-confirm-badge">⚠</div>
            <div className="delete-confirm-title">Delete {deleteUserTarget.name}?</div>
            <div className="delete-confirm-email">{deleteUserTarget.email}</div>
            <div className="delete-confirm-note">This action is permanent and cannot be undone.</div>
            <div className="delete-confirm-actions">
              <button className="btn btn-sm" onClick={() => setDeleteUserTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-sm btn-danger"
                disabled={busyId === deleteUserTarget._id}
                onClick={() => deleteUser(deleteUserTarget)}
              >
                {busyId === deleteUserTarget._id ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {detailUser && (
        <Modal title={`User Data: ${detailUser.name || detailData?.user?.name || 'Account'}`} onClose={closeDetails} size="modal-lg">
          {detailLoading || !detailData ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--text3)' }}>Loading user data…</div>
          ) : (
            <UserDetailView detailData={detailData} fmtC={fmtC} onExportJson={() => exportUserData(detailData.user, 'json')} onExportCsv={() => exportUserData(detailData.user, 'csv')} />
          )}
        </Modal>
      )}
    </div>
  )
}

function UserDetailView({ detailData, fmtC, onExportJson, onExportCsv }) {
  const { user, stats, recent } = detailData

  return (
    <div>
      <div className="flex-between mb12" style={{ gap:12 }}>
        <div className="flex-center gap8" style={{ justifyContent:'flex-start' }}>
          <div className="avatar avatar-lg">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="avatar-img" /> : <span className="avatar-fallback">👤</span>}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
            <div className="text-sm text-muted">{user.role} · {user.isActive ? 'active' : 'inactive'} · joined {fmtDate(user.createdAt)}</div>
          </div>
        </div>
        <div className="flex-center gap8" style={{ flexWrap:'wrap' }}>
          <button className="btn btn-sm" onClick={onExportJson}>Export JSON</button>
          <button className="btn btn-sm" onClick={onExportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="g3 mb20">
        <Metric label="Income Records" value={stats.income} color="var(--accent)" />
        <Metric label="Expense Records" value={stats.expenses} color="var(--red)" />
        <Metric label="Family Transfers" value={stats.familyTransfers} color="var(--purple)" />
        <Metric label="Organizations" value={stats.organizations} color="var(--primary)" />
        <Metric label="Work Logs" value={`${stats.worklogs} / ${stats.totalWorkHours.toFixed(1)}h`} color="var(--amber)" />
        <Metric label="Loans" value={`${stats.loans} / ${fmtC(stats.totalLoanPrincipal)}`} color="var(--text)" />
      </div>

      <div className="g2">
        <DetailList title="Recent Income" items={recent.income} renderItem={item => `${fmtDate(item.date)} · ${item.category} · ${fmtC(item.amount, item.currency)}`} />
        <DetailList title="Recent Expenses" items={recent.expenses} renderItem={item => `${fmtDate(item.date)} · ${item.category} · ${fmtC(item.amount, item.currency)}`} />
        <DetailList title="Recent Family Transfers" items={recent.familyTransfers} renderItem={item => `${fmtDate(item.date)} · ${item.recipient || 'Family'} · ${fmtC(item.amount, item.currency)}`} />
        <DetailList title="Organizations" items={recent.organizations} renderItem={item => `${item.name} · ${fmtC(item.hourlyRate, item.currency)}/hr`} />
        <DetailList title="Recent Work Logs" items={recent.worklogs} renderItem={item => `${fmtDate(item.date)} · ${item.organization?.name || 'Unknown'} · ${item.hours}h · ${fmtC(item.netEarnings || 0)}`} />
        <DetailList title="Loans" items={recent.loans} renderItem={item => `${item.counterpartyName} · ${item.direction} · ${fmtC(item.principal, item.currency)}`} />
      </div>

      <div className="card" style={{ marginTop:16, background:'var(--surface2)' }}>
        <div className="card-title" style={{ marginBottom:8 }}>Financial Snapshot</div>
        <div className="org-info-grid">
          <Metric label="Income Total" value={fmtC(stats.totalIncomeAmount)} color="var(--accent)" />
          <Metric label="Expense Total" value={fmtC(stats.totalExpenseAmount)} color="var(--red)" />
          <Metric label="Family Total" value={fmtC(stats.totalFamilyAmount)} color="var(--purple)" />
          <Metric label="Work Net" value={fmtC(stats.totalWorkNet)} color="var(--primary)" />
        </div>
      </div>
    </div>
  )
}

function DetailList({ title, items, renderItem }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom:10 }}>{title}</div>
      {!items?.length ? (
        <div className="text-sm text-muted">No records.</div>
      ) : (
        <div>
          {items.map(item => (
            <div key={item._id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px' }}>
      <div className="text-xs text-muted" style={{ marginBottom:3 }}>{label}</div>
      <div style={{ fontWeight:700, fontSize:16, color }}>{value}</div>
    </div>
  )
}