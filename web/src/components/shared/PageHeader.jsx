export default function PageHeader({ title, actions, extra }) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {extra}
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
