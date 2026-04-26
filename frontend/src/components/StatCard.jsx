export default function StatCard({ label, value, icon, iconBg, change, emoji, valueColor }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {icon && <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>}
        {label}
      </div>
      <div className="stat-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      {change && (
        <div className="stat-change">
          <span className={change.dir}>{change.dir === 'up' ? '↑' : '↓'} {change.pct}%</span>
          <span>vs last month</span>
        </div>
      )}
      {emoji && <div className="stat-bg">{emoji}</div>}
    </div>
  )
}
