export default function Sidebar({ tab, setTab, onLogout, onAdd }) {
  const addLabel = tab === 'clients' ? '+ Nuevo Cliente' : '+ Nuevo Password'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">🖥</span>
        <span className="sidebar-title">LinuxConnect</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${tab === 'clients' ? 'active' : ''}`}
          onClick={() => setTab('clients')}
        >
          <span className="sidebar-icon">🗂</span>
          Clientes
        </button>
        <button
          className={`sidebar-item ${tab === 'passwords' ? 'active' : ''}`}
          onClick={() => setTab('passwords')}
        >
          <span className="sidebar-icon">🔑</span>
          Passwords
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="btn-add-main" onClick={onAdd}>
          {addLabel}
        </button>
        <button className="btn-logout" onClick={onLogout}>
          Salir
        </button>
      </div>
    </aside>
  )
}
