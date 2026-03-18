import { useState, useRef } from 'react'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Clients from './components/Clients.jsx'
import Passwords from './components/Passwords.jsx'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('lc_token'))
  const [tab, setTab] = useState('clients')
  const clientsRef = useRef(null)
  const passwordsRef = useRef(null)

  function logout() {
    localStorage.removeItem('lc_token')
    setToken(null)
  }

  if (!token) return <Login onLogin={t => { localStorage.setItem('lc_token', t); setToken(t) }} />

  function handleAdd() {
    if (tab === 'clients') clientsRef.current?.addDomain()
    if (tab === 'passwords') passwordsRef.current?.addRow()
  }

  return (
    <div className="app-layout">
      <Sidebar
        tab={tab}
        setTab={setTab}
        onLogout={logout}
        onAdd={handleAdd}
      />
      <main className="app-main">
        {tab === 'clients'   && <Clients ref={clientsRef} token={token} onUnauth={logout} />}
        {tab === 'passwords' && <Passwords ref={passwordsRef} token={token} onUnauth={logout} />}
      </main>
    </div>
  )
}
