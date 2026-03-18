export default function Navbar({ tab, setTab, onLogout, onAddClient }) {
  const btn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        background: tab === id ? '#3b82f6' : 'transparent',
        color: tab === id ? '#fff' : '#94a3b8',
        fontWeight: 600,
        padding: '8px 20px'
      }}
    >
      {label}
    </button>
  )

  return (
    <nav style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #334155' }}>
      <span style={{ fontWeight: 700, fontSize: 16, marginRight: 16 }}>🖥️ LinuxConnect</span>
      {btn('clients', 'Clientes & Hosts')}
      {btn('passwords', 'Passwords')}
      {tab === 'clients' && (
        <button onClick={onAddClient} style={{ background: '#16a34a', color: '#fff', fontWeight: 600 }}>+ Cliente</button>
      )}
      <button onClick={onLogout} style={{ marginLeft: 'auto', background: '#be123c', color: '#fff', fontWeight: 600 }}>Salir</button>
    </nav>
  )
}
