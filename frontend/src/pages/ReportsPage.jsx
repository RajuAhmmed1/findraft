import { useState, useEffect, useRef, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import api from '../utils/api'
import { useFmt, fmtDate, shortMonth, monthLabel, currentYear, currentMonth } from '../utils/format'

Chart.register(...registerables)

const TABS = [
  { id: 'summary',   label: '📊 Summary'   },
  { id: 'income',    label: '💰 Income'    },
  { id: 'expenses',  label: '💸 Expenses'  },
  { id: 'work',      label: '⏱ Work Hours' },
  { id: 'family',    label: '♥ Family'     },
]

const today      = new Date()
const ISO        = d => d.toISOString().slice(0,10)
const firstOfYear= new Date(today.getFullYear(), 0, 1)

export default function ReportsPage() {
  const fmtC = useFmt()

  // ── Filter state ─────────────────────────────────────────────
  const [tab,       setTab]       = useState('summary')
  const [mode,      setMode]      = useState('year')          // 'year' | 'month' | 'range'
  const [year,      setYear]      = useState(currentYear())
  const [month,     setMonth]     = useState(currentMonth())
  const [startDate, setStartDate] = useState(ISO(firstOfYear))
  const [endDate,   setEndDate]   = useState(ISO(today))
  const [filterOrg, setFilterOrg] = useState('')

  // ── Data state ───────────────────────────────────────────────
  const [summary,   setSummary]   = useState(null)
  const [income,    setIncome]    = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [worklogs,  setWorklogs]  = useState([])
  const [family,    setFamily]    = useState([])
  const [orgs,      setOrgs]      = useState([])
  const [loading,   setLoading]   = useState(true)

  // ── Chart refs ───────────────────────────────────────────────
  const trendRef = useRef(null); const trendInst = useRef(null)
  const pieRef   = useRef(null); const pieInst   = useRef(null)
  const barRef   = useRef(null); const barInst   = useRef(null)

  // ── Build query params from current filter state ─────────────
  const buildParams = useCallback((extra = {}) => {
    const p = { ...extra }
    if (mode === 'year')  { p.year = year }
    if (mode === 'month') { p.month = month; p.year = year }
    if (mode === 'range') { p.startDate = startDate; p.endDate = endDate }
    if (filterOrg) p.orgId = filterOrg
    return p
  }, [mode, year, month, startDate, endDate, filterOrg])

  // ── Fetch all data ───────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const p = buildParams()
      const summaryP = { year: mode === 'range' ? new Date(startDate).getFullYear() : year }

      const [sumRes, incRes, expRes, wkRes, famRes, orgRes] = await Promise.all([
        api.get('/reports/summary', { params: summaryP }),
        api.get('/income',          { params: { ...p, limit:500 } }),
        api.get('/expenses',        { params: { ...p, limit:500 } }),
        api.get('/worklogs',        { params: { ...p, limit:500 } }),
        api.get('/family',          { params: { ...p, limit:500 } }),
        api.get('/organizations'),
      ])
      setSummary(sumRes.data)
      setIncome(incRes.data.items   || [])
      setExpenses(expRes.data.items || [])
      setWorklogs(wkRes.data.items  || [])
      setFamily(famRes.data.items   || [])
      setOrgs(orgRes.data.items     || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [buildParams])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Draw charts ──────────────────────────────────────────────
  useEffect(() => {
    if (!summary || tab !== 'summary') return
    const months = summary.months
    const active = months.filter(m => m.income > 0 || m.expenses > 0)
    const labels = active.map(m => shortMonth(m.month))

    // Trend line
    if (trendRef.current) {
      trendInst.current?.destroy()
      trendInst.current = new Chart(trendRef.current, {
        type:'line',
        data:{ labels, datasets:[
          { label:'Income',   data:active.map(m=>m.income),   borderColor:'#0ca678', backgroundColor:'rgba(12,166,120,.08)', fill:true,  tension:.4, pointRadius:3 },
          { label:'Expenses', data:active.map(m=>m.expenses), borderColor:'#e03131', backgroundColor:'rgba(224,49,49,.05)', fill:false, tension:.4, pointRadius:3 },
          { label:'Savings',  data:active.map(m=>m.savings),  borderColor:'#3b5bdb', backgroundColor:'rgba(59,91,219,.07)', fill:true,  tension:.4, pointRadius:3, borderDash:[4,3] },
        ]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{size:11}, boxWidth:10 } } }, scales:{ x:{ grid:{display:false} }, y:{ grid:{color:'rgba(128,128,128,.1)'}, ticks:{ callback:v=>'$'+(Math.abs(v)>=1000?(v/1000).toFixed(0)+'k':v) } } } }
      })
    }

    // Expense category pie
    const catMap = expenses.reduce((a,e) => { a[e.category]=(a[e.category]||0)+e.amount; return a }, {})
    const catKeys = Object.keys(catMap)
    if (pieRef.current && catKeys.length) {
      pieInst.current?.destroy()
      const COLORS = ['#3b5bdb','#0ca678','#e03131','#e67700','#6741d9','#1098ad','#495057','#e64980']
      pieInst.current = new Chart(pieRef.current, {
        type:'doughnut',
        data:{ labels:catKeys, datasets:[{ data:catKeys.map(k=>catMap[k]), backgroundColor:COLORS.slice(0,catKeys.length), borderWidth:0, hoverOffset:4 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'58%', plugins:{ legend:{ position:'right', labels:{ font:{size:11}, padding:10, boxWidth:10 } } } }
      })
    }

    // Work by org bar
    const orgMap = worklogs.reduce((a,l) => {
      const name = l.organization?.name || 'Unknown'
      if (!a[name]) a[name] = { net:0, hours:0 }
      a[name].net   += l.netEarnings   || 0
      a[name].hours += l.hours || 0
      return a
    }, {})
    const orgKeys = Object.keys(orgMap)
    if (barRef.current && orgKeys.length) {
      barInst.current?.destroy()
      barInst.current = new Chart(barRef.current, {
        type:'bar',
        data:{ labels:orgKeys, datasets:[
          { label:'Net Earnings', data:orgKeys.map(k=>Math.round(orgMap[k].net)),   backgroundColor:'#3b5bdb', borderRadius:5 },
          { label:'Hours',        data:orgKeys.map(k=>orgMap[k].hours),             backgroundColor:'#0ca678', borderRadius:5 },
        ]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{size:11}, boxWidth:10 } } }, scales:{ x:{ grid:{display:false} }, y:{ grid:{color:'rgba(128,128,128,.1)'} } } }
      })
    }

    return () => { trendInst.current?.destroy(); pieInst.current?.destroy(); barInst.current?.destroy() }
  }, [summary, expenses, worklogs, tab])

  // ── Computed totals ──────────────────────────────────────────
  const totalIncome  = income.reduce((a,i) => a+i.amount, 0)
  const totalExp     = expenses.reduce((a,e) => a+e.amount, 0)
  const totalFamily  = family.reduce((a,f) => a+f.amount, 0)
  const totalHours   = worklogs.reduce((a,w) => a+w.hours, 0)
  const totalNet     = worklogs.reduce((a,w) => a+(w.netEarnings||0), 0)
  const totalGross   = worklogs.reduce((a,w) => a+(w.grossEarnings||0), 0)
  const netSavings   = totalIncome - totalExp - totalFamily

  // ── Export helpers ───────────────────────────────────────────
  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename+'.csv'; a.click()
  }

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename+'.json'; a.click()
  }

  const exportCurrent = (format) => {
    const label = mode==='year' ? year : mode==='month' ? `${year}-${String(month).padStart(2,'0')}` : `${startDate}_${endDate}`
    if (tab === 'summary') {
      const rows = [
        ['Month','Income','Expenses','Family Transfers','Savings','Work Hours','Work Net','Savings Rate %'],
        ...(summary?.months||[]).map(m => [monthLabel(m.month, m.year), m.income, m.expenses, m.familyTransfers, m.savings, m.workHours, m.workNet, m.savingsRate])
      ]
      if (format==='csv') downloadCSV(rows, `findraft-summary-${label}`)
      else downloadJSON({ period:label, totals:summary?.totals, months:summary?.months }, `findraft-summary-${label}`)
    }
    if (tab === 'income') {
      const rows = [['Date','Category','Organization','Amount','Currency','Notes'], ...income.map(i=>[fmtDate(i.date),i.category,i.organization?.name||'',i.amount,i.currency,i.notes||''])]
      if (format==='csv') downloadCSV(rows, `findraft-income-${label}`)
      else downloadJSON(income, `findraft-income-${label}`)
    }
    if (tab === 'expenses') {
      const rows = [['Date','Category','Amount','Currency','Notes'], ...expenses.map(e=>[fmtDate(e.date),e.category,e.amount,e.currency,e.notes||''])]
      if (format==='csv') downloadCSV(rows, `findraft-expenses-${label}`)
      else downloadJSON(expenses, `findraft-expenses-${label}`)
    }
    if (tab === 'work') {
      const rows = [['Date','Organization','Hours','Rate/hr','Gross','Net','Tax %','Notes'], ...worklogs.map(w=>[fmtDate(w.date),w.organization?.name||'',w.hours,w.hourlyRateSnapshot,Math.round(w.grossEarnings||0),Math.round(w.netEarnings||0),w.taxPercentSnapshot,w.notes||''])]
      if (format==='csv') downloadCSV(rows, `findraft-workhours-${label}`)
      else downloadJSON(worklogs, `findraft-workhours-${label}`)
    }
    if (tab === 'family') {
      const rows = [['Date','Recipient','Amount','Currency','Notes'], ...family.map(f=>[fmtDate(f.date),f.recipient||'',f.amount,f.currency,f.notes||''])]
      if (format==='csv') downloadCSV(rows, `findraft-family-${label}`)
      else downloadJSON(family, `findraft-family-${label}`)
    }
  }

  const exportAll = (format) => {
    const label = mode==='year' ? year : `${startDate}_${endDate}`
    const bundle = {
      exported: new Date().toISOString(),
      period: { mode, year, month, startDate, endDate },
      summary: { totalIncome, totalExpenses:totalExp, totalFamily, netSavings, totalHours, totalGross, totalNet },
      income, expenses, worklogs, family
    }
    if (format==='csv') {
      downloadCSV([['Section','Date','Description','Amount','Currency','Notes'],
        ...income.map(i=>   ['Income',   fmtDate(i.date), i.category,                          i.amount, i.currency, i.notes||'']),
        ...expenses.map(e=> ['Expense',  fmtDate(e.date), e.category,                         -e.amount, e.currency, e.notes||'']),
        ...family.map(f=>   ['Family',   fmtDate(f.date), f.recipient||'Family Transfer',      -f.amount, f.currency, f.notes||'']),
        ...worklogs.map(w=> ['Work',     fmtDate(w.date), w.organization?.name||'Work',        Math.round(w.netEarnings||0), 'NET', w.notes||'']),
      ], `findraft-all-data-${label}`)
    } else {
      downloadJSON(bundle, `findraft-all-data-${label}`)
    }
  }

  const monthNames = Array.from({length:12},(_,i)=>({ value:i+1, label:new Date(2024,i,1).toLocaleString('default',{month:'long'}) }))
  const yearOptions = [currentYear(), currentYear()-1, currentYear()-2]

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* ── Top filter bar ── */}
      <div className="card mb20">
        <div className="report-filter-bar">
          {/* Time range mode */}
          <div style={{ minWidth:200 }}>
            <div className="form-label mb4">Time Range</div>
            <div style={{ display:'flex', gap:4 }}>
              {['year','month','range'].map(m => (
                <button key={m} className={`btn btn-sm ${mode===m?'btn-primary':''}`} onClick={()=>setMode(m)}>
                  {m==='year'?'Year':m==='month'?'Month':'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Year picker */}
          {(mode==='year' || mode==='month') && (
            <div>
              <div className="form-label mb4">Year</div>
              <select className="form-select" style={{padding:'6px 10px'}} value={year} onChange={e=>setYear(+e.target.value)}>
                {yearOptions.map(y=><option key={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Month picker */}
          {mode==='month' && (
            <div>
              <div className="form-label mb4">Month</div>
              <select className="form-select" style={{padding:'6px 10px'}} value={month} onChange={e=>setMonth(+e.target.value)}>
                {monthNames.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          {/* Custom date range */}
          {mode==='range' && (
            <>
              <div>
                <div className="form-label mb4">From</div>
                <input className="form-input" type="date" style={{padding:'6px 10px'}} value={startDate} onChange={e=>setStartDate(e.target.value)} />
              </div>
              <div>
                <div className="form-label mb4">To</div>
                <input className="form-input" type="date" style={{padding:'6px 10px'}} value={endDate} onChange={e=>setEndDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Org filter */}
          <div>
            <div className="form-label mb4">Organization</div>
            <select className="form-select" style={{padding:'6px 10px'}} value={filterOrg} onChange={e=>setFilterOrg(e.target.value)}>
              <option value="">All Organizations</option>
              {orgs.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" onClick={loadAll} style={{alignSelf:'flex-end'}}>Apply Filters</button>
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          <MiniStat label="Total Income"  value={fmtC(totalIncome)}  color="var(--accent)"  />
          <MiniStat label="Total Expenses"value={fmtC(totalExp)}     color="var(--red)"     />
          <MiniStat label="Family Sent"   value={fmtC(totalFamily)}  color="var(--purple)"  />
          <MiniStat label="Net Savings"   value={fmtC(netSavings)}   color={netSavings>=0?'var(--accent)':'var(--red)'} />
          <MiniStat label="Work Hours"    value={`${totalHours.toFixed(1)}h`} color="var(--primary)" />
          <MiniStat label="Work Net"      value={fmtC(totalNet)}     color="var(--accent)"  />
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="report-tabs-bar">
        {TABS.map(t => (
          <button key={t.id} className={`btn ${tab===t.id?'btn-primary':''}`} style={{fontSize:12}} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
        {/* Export buttons */}
        <div className="report-export-btns">
          <button className="btn btn-sm" onClick={()=>exportCurrent('csv')} title="Export current tab as CSV">↓ CSV</button>
          <button className="btn btn-sm" onClick={()=>exportCurrent('json')} title="Export current tab as JSON">↓ JSON</button>
          <button className="btn btn-sm" onClick={()=>exportAll('csv')}      title="Export ALL data as one CSV">↓ All CSV</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--text3)', fontSize:14 }}>Loading report…</div>
      ) : (
        <>
          {/* ── SUMMARY TAB ── */}
          {tab==='summary' && (
            <>
              <div className="g2 mb20">
                <div className="card">
                  <div className="card-header"><div className="card-title">Monthly Trend</div></div>
                  <div className="chart-wrap-lg">
                    {summary?.months?.some(m=>m.income>0||m.expenses>0)
                      ? <canvas ref={trendRef}/>
                      : <div className="empty"><div className="empty-icon">📈</div><div className="empty-text">No data for selected period</div></div>
                    }
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Expense Categories</div></div>
                  <div className="chart-wrap-lg">
                    {expenses.length
                      ? <canvas ref={pieRef}/>
                      : <div className="empty"><div className="empty-icon">📂</div><div className="empty-text">No expense data</div></div>
                    }
                  </div>
                </div>
              </div>
              <div className="card mb20">
                <div className="card-header"><div className="card-title">Work Earnings by Organization</div></div>
                <div className="chart-wrap">
                  {worklogs.length
                    ? <canvas ref={barRef}/>
                    : <div className="empty"><div className="empty-icon">⏱️</div><div className="empty-text">No work data for period</div></div>
                  }
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Monthly Breakdown</div></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>Month</th>
                      <th style={{textAlign:'right'}}>Income</th>
                      <th style={{textAlign:'right'}}>Expenses</th>
                      <th style={{textAlign:'right'}}>Family</th>
                      <th style={{textAlign:'right'}}>Savings</th>
                      <th style={{textAlign:'right'}}>Work Hrs</th>
                      <th style={{textAlign:'right'}}>Work Net</th>
                      <th style={{textAlign:'right'}}>Rate</th>
                    </tr></thead>
                    <tbody>
                      {(summary?.months||[]).map(m=>(
                        <tr key={m.month} style={{opacity:m.income===0&&m.expenses===0?.4:1}}>
                          <td data-label="Month" style={{fontWeight:500}}>{monthLabel(m.month,year)}</td>
                          <td data-label="Income" className="pos">{m.income>0?'+'+fmtC(m.income):'—'}</td>
                          <td data-label="Expenses" className="neg">{m.expenses>0?'-'+fmtC(m.expenses):'—'}</td>
                          <td data-label="Family" style={{color:'var(--purple)'}}>{m.familyTransfers>0?'-'+fmtC(m.familyTransfers):'—'}</td>
                          <td data-label="Savings" className={m.savings>0?'pos':m.savings<0?'neg':''}>{m.savings!==0?(m.savings>0?'+':'')+fmtC(m.savings):'—'}</td>
                          <td data-label="Work Hrs" className="text-muted">{m.workHours>0?m.workHours+'h':'—'}</td>
                          <td data-label="Work Net" className={m.workNet>0?'pos':''}>{m.workNet>0?'+'+fmtC(m.workNet):'—'}</td>
                          <td data-label="Rate">
                            {m.income>0?<span className={`badge ${m.savingsRate>=20?'badge-income':m.savingsRate>=0?'badge-amber':'badge-expense'}`}>{m.savingsRate}%</span>:'—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                        <td style={{padding:'10px 14px'}}>Total</td>
                        <td style={{textAlign:'right',padding:'10px 14px'}} className="pos">{fmtC(summary?.totals?.income||0)}</td>
                        <td style={{textAlign:'right',padding:'10px 14px'}} className="neg">{fmtC(summary?.totals?.expenses||0)}</td>
                        <td style={{textAlign:'right',padding:'10px 14px',color:'var(--purple)'}}>{fmtC(summary?.totals?.familyTransfers||0)}</td>
                        <td style={{textAlign:'right',padding:'10px 14px'}} className={(summary?.totals?.savings||0)>=0?'pos':'neg'}>{fmtC(summary?.totals?.savings||0)}</td>
                        <td style={{textAlign:'right',padding:'10px 14px'}} className="text-muted">{summary?.totals?.workHours||0}h</td>
                        <td style={{textAlign:'right',padding:'10px 14px'}} className="pos">{fmtC(summary?.totals?.workNet||0)}</td>
                        <td style={{padding:'10px 14px'}}>
                          {(summary?.totals?.income||0)>0
                            ? <span className="badge badge-income">{Math.round(((summary?.totals?.savings||0)/(summary?.totals?.income||1))*100)}%</span>
                            : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── INCOME TAB ── */}
          {tab==='income' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Income Entries</div><div className="card-subtitle">{income.length} entries · {fmtC(totalIncome)} total</div></div>
              </div>
              {income.length===0 ? <div className="empty"><div className="empty-icon">💰</div><div className="empty-text">No income in selected period</div></div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Date</th><th>Category</th><th>Organization</th><th>Notes</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {income.map(i=>(
                      <tr key={i._id}>
                        <td data-label="Date" className="text-sm text-muted">{fmtDate(i.date)}</td>
                        <td data-label="Category"><span className="badge badge-income">{i.category}</span></td>
                        <td data-label="Org" className="text-sm">{i.organization?.name||<span className="text-muted">—</span>}</td>
                        <td data-label="Notes" className="text-muted text-sm" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.notes||'—'}</td>
                        <td data-label="Amount" className="pos">+{fmtC(i.amount,i.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                    <td colSpan={4} style={{padding:'10px 14px'}}>Total ({income.length})</td>
                    <td style={{textAlign:'right',padding:'10px 14px'}} className="pos">+{fmtC(totalIncome)}</td>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* ── EXPENSES TAB ── */}
          {tab==='expenses' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Expense Entries</div><div className="card-subtitle">{expenses.length} entries · {fmtC(totalExp)} total</div></div>
              </div>
              {expenses.length===0 ? <div className="empty"><div className="empty-icon">💸</div><div className="empty-text">No expenses in selected period</div></div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Date</th><th>Category</th><th>Notes</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {expenses.map(e=>(
                      <tr key={e._id}>
                        <td data-label="Date" className="text-sm text-muted">{fmtDate(e.date)}</td>
                        <td data-label="Category"><span className="badge badge-expense">{e.category}</span></td>
                        <td data-label="Notes" className="text-muted text-sm" style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.notes||'—'}</td>
                        <td data-label="Amount" className="neg">-{fmtC(e.amount,e.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                    <td colSpan={3} style={{padding:'10px 14px'}}>Total ({expenses.length})</td>
                    <td style={{textAlign:'right',padding:'10px 14px'}} className="neg">-{fmtC(totalExp)}</td>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* ── WORK TAB ── */}
          {tab==='work' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Work Hour Logs</div><div className="card-subtitle">{worklogs.length} entries · {totalHours.toFixed(1)}h · {fmtC(totalNet)} net</div></div>
              </div>
              {worklogs.length===0 ? <div className="empty"><div className="empty-icon">⏱️</div><div className="empty-text">No work hours in selected period</div></div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Date</th><th>Organization</th><th>Hours</th><th>Rate</th><th>Gross</th><th style={{color:'var(--accent)'}}>Net</th><th>Tax</th><th>Notes</th></tr></thead>
                  <tbody>
                    {worklogs.map(w=>{
                      const org=w.organization
                      return (
                        <tr key={w._id}>
                          <td data-label="Date" className="text-sm text-muted">{fmtDate(w.date)}</td>
                          <td data-label="Org"><span className="badge" style={{background:org?.color?org.color+'22':'var(--primary-lt)',color:org?.color||'var(--primary)'}}>{org?.name||'Unknown'}</span></td>
                          <td data-label="Hours" style={{fontWeight:600}}>{w.hours}h</td>
                          <td data-label="Rate" className="text-muted text-sm mono">{fmtC(w.hourlyRateSnapshot)}/hr</td>
                          <td data-label="Gross" className="neu">{fmtC(w.grossEarnings||0)}</td>
                          <td data-label="Net" className="pos">{fmtC(w.netEarnings||0)}</td>
                          <td data-label="Tax" className="text-muted text-sm">{w.taxPercentSnapshot}%</td>
                          <td data-label="Notes" className="text-muted text-sm" style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.notes||'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot><tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                    <td colSpan={2} style={{padding:'10px 14px'}}>Total ({worklogs.length})</td>
                    <td style={{padding:'10px 14px'}}>{totalHours.toFixed(1)}h</td>
                    <td/>
                    <td style={{padding:'10px 14px'}} className="neu">{fmtC(totalGross)}</td>
                    <td style={{padding:'10px 14px'}} className="pos">{fmtC(totalNet)}</td>
                    <td colSpan={2}/>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* ── FAMILY TAB ── */}
          {tab==='family' && (
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Family Transfers</div><div className="card-subtitle">{family.length} entries · {fmtC(totalFamily)} total sent</div></div>
              </div>
              {family.length===0 ? <div className="empty"><div className="empty-icon">♥</div><div className="empty-text">No family transfers in selected period</div></div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Date</th><th>Recipient</th><th>Notes</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
                  <tbody>
                    {family.map(f=>(
                      <tr key={f._id}>
                        <td data-label="Date" className="text-sm text-muted">{fmtDate(f.date)}</td>
                        <td data-label="Recipient">{f.recipient||<span className="text-muted">—</span>}</td>
                        <td data-label="Notes" className="text-muted text-sm" style={{maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.notes||'—'}</td>
                        <td data-label="Amount" className="neg">-{fmtC(f.amount,f.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{borderTop:'2px solid var(--border)',fontWeight:600,background:'var(--surface2)'}}>
                    <td colSpan={3} style={{padding:'10px 14px'}}>Total ({family.length})</td>
                    <td style={{textAlign:'right',padding:'10px 14px'}} className="neg">-{fmtC(totalFamily)}</td>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
      <div className="text-xs text-muted mb4" style={{ fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}
