export default function EmptyState({ icon, title, description }) {
  const Icon = icon
  return (
    <div className="empty-state">
      {Icon && <Icon size={36} strokeWidth={1.5} />}
      <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
      {description && <div style={{ fontSize: 13 }}>{description}</div>}
    </div>
  )
}
