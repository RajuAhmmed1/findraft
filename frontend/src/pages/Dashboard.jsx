import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import api from '../utils/api'
import StatCard from '../components/StatCard'
import { useFmt, fmt, fmtDate, shortMonth, deltaLabel, currentMonth, currentYear } from '../utils/format'

Chart.register(...registerables)

const MONTH = currentMonth()
const YEAR  = currentYear()

export default function Dashboard() {
  const fmtC = useFmt()
  const [summary,   setSummary]   = useState(null)
  const [expCats,   setExpCats]   = useState([])
  const [workOrgs,  setWorkOrgs]  = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [recent,    setRecent]    = useState([])
  const [loading,   setLoading]   = useState(true)

  const barRef   = useRef(null)
  const lineRef  = useRef(null)
  const pieRef   = useRef(null)
  const donutRef = useRef(null)
  const barInst   = useRef(null)
  const lineInst  = useRef(null)
  const pieInst   = useRef(null)
  const donutInst = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, catRes, wkRes, analyticsRes, incRes, expRes, famRes] = await Promise.allSettled([
          api.get('/reports/summary',              { params: { year: YEAR } }),
          api.get('/reports/expenses-by-category', { params: { month: MONTH, year: YEAR } }),
          api.get('/reports/work-by-org',          { params: { month: MONTH, year: YEAR } }),
          api.get('/reports/analytics',            { params: { year: YEAR } }),
          api.get('/income',   { params: { month: MONTH, year: YEAR, limit: 5 } }),
          api.get('/expenses', { params: { month: MONTH, year: YEAR, limit: 5 } }),
          api.get('/family',   { params: { month: MONTH, year: YEAR, limit: 3 } }),
        ])

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
        if (catRes.status === 'fulfilled') setExpCats(catRes.value.data.data || [])
        if (wkRes.status === 'fulfilled') setWorkOrgs(wkRes.value.data.data || [])
        if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data)

        const combined = [
          ...((incRes.status === 'fulfilled' ? incRes.value.data.items : []) || []).map(i => ({ ...i, _type: 'income' })),
          ...((expRes.status === 'fulfilled' ? expRes.value.data.items : []) || []).map(i => ({ ...i, _type: 'expense' })),
          ...((famRes.status === 'fulfilled' ? famRes.value.data.items : []) || []).map(i => ({ ...i, _type: 'transfer', category: 'Family' })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
        setRecent(combined)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!summary) return
    const months = summary.months
    const labels = months.map(m => shortMonth(m.month))

    // 1. Bar — Income vs Expenses
    if (barRef.current) {
      barInst.current?.destroy()
      barInst.current = new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Income',   data: months.map(m => m.income),   backgroundColor: 'rgba(12,166,120,.75)', borderRadius: 4 },
            { label: 'Expenses', data: months.map(m => m.expenses), backgroundColor: 'rgba(224,49,49,.55)',  borderRadius: 4 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { font: { size: 11 }, boxWidth: 10 } } },
          scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(128,128,128,.1)' }, ticks: { callback: v => '$'+(v>=1000?(v/1000).toFixed(0)+'k':v) } } }
        }
      })
    }

    // 2. Line — Monthly savings trend (SPEC requirement)
    if (lineRef.current) {
      lineInst.current?.destroy()
      lineInst.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Income',   data: months.map(m => m.income),   borderColor:'#0ca678', backgroundColor:'rgba(12,166,120,.07)', tension:.4, fill:true,  pointRadius:3 },
            { label: 'Expenses', data: months.map(m => m.expenses), borderColor:'#e03131', backgroundColor:'rgba(224,49,49,.05)', tension:.4, fill:false, pointRadius:3 },
            { label: 'Savings',  data: months.map(m => m.savings),  borderColor:'#3b5bdb', backgroundColor:'rgba(59,91,219,.07)', tension:.4, fill:true,  pointRadius:3, borderDash:[4,3] },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { font: { size: 11 }, boxWidth: 10 } } },
          scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(128,128,128,.1)' }, ticks: { callback: v => '$'+(v>=1000?(v/1000).toFixed(0)+'k':v) } } }
        }
      })
    }

    // 3. Doughnut — expense by category (SPEC requirement)
    if (pieRef.current && expCats.length) {
      pieInst.current?.destroy()
      const COLORS = ['#3b5bdb','#0ca678','#e03131','#e67700','#6741d9','#1098ad','#495057']
      pieInst.current = new Chart(pieRef.current, {
        type: 'doughnut',
        data: { labels: expCats.map(c => c._id), datasets: [{ data: expCats.map(c => c.total), backgroundColor: COLORS.slice(0,expCats.length), borderWidth:0, hoverOffset:4 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'60%', plugins: { legend: { position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:10 } } } }
      })
    }

    // 4. Doughnut — earnings by org (SPEC requirement)
    if (donutRef.current && workOrgs.length) {
      donutInst.current?.destroy()
      donutInst.current = new Chart(donutRef.current, {
        type: 'doughnut',
        data: { labels: workOrgs.map(w => w.org?.name||'Unknown'), datasets: [{ data: workOrgs.map(w => Math.round(w.totalNet)), backgroundColor:['#3b5bdb','#0ca678','#e67700','#6741d9','#1098ad'], borderWidth:0, hoverOffset:4 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'62%', plugins: { legend: { position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:10 } } } }
      })
    }

    return () => { barInst.current?.destroy(); lineInst.current?.destroy(); pieInst.current?.destroy(); donutInst.current?.destroy() }
  }, [summary, expCats, workOrgs])

  if (loading) return <Skeleton />

  const cur  = summary?.months?.find(m => m.month === MONTH) || {}
  const prev = summary?.months?.find(m => m.month === MONTH - 1) || {}
  const savingsRate = cur.income > 0 ? Math.round((cur.savings / cur.income) * 100) : 0

  return (
    <div>
      {/* ── Primary stat cards ── */}
      <div className="g4 mb20">
        <StatCard label="Monthly Income"  value={fmtC(cur.income)}          icon="💰" iconBg="var(--accent-lt)"  emoji="💰" change={deltaLabel(cur.income,   prev.income)} />
        <StatCard label="Total Expenses"  value={fmtC(cur.expenses)}        icon="💸" iconBg="var(--red-lt)"     emoji="💸" change={deltaLabel(cur.expenses, prev.expenses)} />
        <StatCard label="Net Savings"     value={fmtC(cur.savings)}         icon="🏦" iconBg="var(--primary-lt)" emoji="🏦" valueColor={cur.savings>=0?'var(--accent)':'var(--red)'} change={deltaLabel(cur.savings, prev.savings)} />
        <StatCard label="Family Support"  value={fmtC(cur.familyTransfers)} icon="♥"  iconBg="var(--purple-lt)"  emoji="♥"  change={deltaLabel(cur.familyTransfers, prev.familyTransfers)} />
      </div>

      {/* ── Work stat cards ── */}
      <div className="g3 mb20">
        <StatCard label="Hours Worked (Month)"   value={`${(cur.workHours||0).toFixed(1)}h`} icon="⏱" iconBg="var(--primary-lt)" />
        <StatCard label="Gross Earnings (Month)" value={fmtC(cur.workGross||0)}               icon="💼" iconBg="var(--amber-lt)"   />
        <StatCard label="Net Earnings (Month)"   value={fmtC(cur.workNet||0)}                 icon="💰" iconBg="var(--accent-lt)"  valueColor="var(--accent)" />
      </div>

      {/* ── Charts row 1: Bar + Line ── */}
      <div className="g2 mb20">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Income vs Expenses</div><div className="card-subtitle">{YEAR} — monthly</div></div>
          </div>
          <div className="chart-wrap"><canvas ref={barRef} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Monthly Trend</div><div className="card-subtitle">{YEAR} — income, expenses &amp; savings</div></div>
          </div>
          <div className="chart-wrap"><canvas ref={lineRef} /></div>
        </div>
      </div>

      {/* ── Charts row 2: Expense pie + Work earnings ── */}
      <div className="g2 mb20">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Expense Breakdown</div><div className="card-subtitle">This month by category</div></div>
          </div>
          <div className="chart-wrap">
            {expCats.length
              ? <canvas ref={pieRef} />
              : <div className="empty"><div className="empty-icon">📂</div><div className="empty-text">No expenses logged this month</div></div>
            }
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Earnings by Organization</div><div className="card-subtitle">This month — net after tax</div></div>
          </div>
          {workOrgs.length ? (
            <>
              <div className="chart-wrap chart-wrap-sm"><canvas ref={donutRef} /></div>
              <div style={{ marginTop:12, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                {workOrgs.map(w => (
                  <div key={w._id} className="flex-between" style={{ padding:'5px 0', fontSize:13 }}>
                    <span className="text-muted">{w.org?.name||'Unknown'}</span>
                    <span className="flex-center gap8">
                      <span className="text-muted text-sm">{w.totalHours}h</span>
                      <span className="pos text-bold">{fmtC(w.totalNet)}</span>
                    </span>
                  </div>
                ))}
                <div className="flex-between" style={{ paddingTop:8, fontSize:13, fontWeight:600, borderTop:'1px solid var(--border)', marginTop:4 }}>
                  <span>Total net</span><span className="pos">{fmtC(workOrgs.reduce((a,w)=>a+w.totalNet,0))}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty"><div className="empty-icon">⏱️</div><div className="empty-text">No work hours logged this month</div></div>
          )}
        </div>
      </div>

      {/* ── Analytics Insights (SPEC: monthly trends, most profitable org, highest expense category) ── */}
      {analytics?.insights?.length > 0 && (
        <div className="card mb20">
          <div className="card-header">
            <div className="card-title">💡 Analytics Insights</div>
            <span className="text-sm text-muted">{YEAR} year to date</span>
          </div>
          <div className="g3">
            {analytics.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        </div>
      )}

      {/* ── Recent Activity + Budget Health ── */}
      <div className="g2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
            <span className="text-sm text-muted">Last 8 entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Description</th><th>Date</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={4}><div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No entries yet — start by adding income or an expense.</div></div></td></tr>
                )}
                {recent.map(item => (
                  <tr key={item._id+item._type}>
                    <td><span className={`badge badge-${item._type}`}>{item._type}</span></td>
                    <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.category||item.recipient||'—'}</td>
                    <td className="text-sm text-muted">{fmtDate(item.date)}</td>
                    <td style={{textAlign:'right'}} className={item._type==='income'?'pos':'neg'}>
                      {item._type==='income'?'+':'-'}{fmt(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Budget Health</div>
            <span className="text-sm text-muted">This month</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:18}}>
            <BudgetBar label="Savings Rate"      value={savingsRate}                                                                      color="var(--accent)"  />
            <BudgetBar label="Expenses / Income" value={cur.income>0?Math.round(cur.expenses/cur.income*100):0}                          color="var(--red)"     />
            <BudgetBar label="Family / Income"   value={cur.income>0?Math.round((cur.familyTransfers||0)/cur.income*100):0}              color="var(--purple)"  />
            <BudgetBar label="Work Net / Income" value={cur.income>0?Math.round((cur.workNet||0)/cur.income*100):0}                      color="var(--primary)" />
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightCard({ insight }) {
  const icons  = { top_org:'🏆', top_expense:'📊', trend:'📈' }
  const colors = { top_org:{bg:'var(--accent-lt)',text:'var(--accent)'}, top_expense:{bg:'var(--amber-lt)',text:'var(--amber)'}, trend:{bg:'var(--primary-lt)',text:'var(--primary)'} }
  const c = colors[insight.type] || colors.trend
  return (
    <div style={{background:c.bg,borderRadius:12,padding:'16px 18px'}}>
      <div style={{fontSize:24,marginBottom:8}}>{icons[insight.type]}</div>
      <div style={{fontSize:10,fontWeight:600,color:c.text,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>{insight.title}</div>
      <div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>{insight.value}</div>
      <div style={{fontSize:12,color:'var(--text3)'}}>{insight.detail}</div>
    </div>
  )
}

function BudgetBar({ label, value, color }) {
  return (
    <div>
      <div className="flex-between mb8">
        <span className="text-sm" style={{fontWeight:500}}>{label}</span>
        <span className="text-sm text-muted">{Math.min(value,999)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{width:`${Math.min(100,Math.max(0,value))}%`,background:color}} />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div>
      <div className="g4 mb20">
        {[...Array(4)].map((_,i)=>(
          <div key={i} className="stat-card" style={{minHeight:100}}>
            <div style={{height:11,width:'55%',background:'var(--surface2)',borderRadius:5,marginBottom:12}} />
            <div style={{height:26,width:'75%',background:'var(--surface2)',borderRadius:5}} />
          </div>
        ))}
      </div>
      <div className="g3 mb20">
        {[...Array(3)].map((_,i)=>(
          <div key={i} className="stat-card" style={{minHeight:80}}>
            <div style={{height:11,width:'55%',background:'var(--surface2)',borderRadius:5,marginBottom:10}} />
            <div style={{height:22,width:'65%',background:'var(--surface2)',borderRadius:5}} />
          </div>
        ))}
      </div>
      <div className="g2 mb20">
        {[...Array(2)].map((_,i)=>(
          <div key={i} className="card" style={{height:280}}>
            <div style={{height:13,width:'40%',background:'var(--surface2)',borderRadius:5,marginBottom:18}} />
            <div style={{height:210,background:'var(--surface2)',borderRadius:8}} />
          </div>
        ))}
      </div>
    </div>
  )
}
