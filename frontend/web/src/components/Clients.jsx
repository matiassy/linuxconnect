import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'

const apiHeaders = token => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

const Clients = forwardRef(function Clients({ token, onUnauth }, ref) {
  const [data, setData] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [editHost, setEditHost] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [addDomainModal, setAddDomainModal] = useState(false)
  const [newDomain, setNewDomain] = useState({ id: '', comment: '' })
  const [editDomainModal, setEditDomainModal] = useState(false)
  const [editDomain, setEditDomain] = useState({ id: '', comment: '' })

  // Sort & filter por columna
  const [sort, setSort] = useState({ col: null, dir: 'asc' })
  const [colFilter, setColFilter] = useState({ id: '', comment: '', ip: '', port: '', hop: '' })

  // Paginación
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  useImperativeHandle(ref, () => ({
    addDomain: () => { setNewDomain({ id: '', comment: '' }); setAddDomainModal(true) }
  }))

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/clients', { headers: apiHeaders(token) })
    if (res.status === 401) return onUnauth()
    const d = await res.json()
    setData(d)
    if (d.domain?.length) setSelectedDomain(d.domain[0].id)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/clients', { method: 'PUT', headers: apiHeaders(token), body: JSON.stringify(data) })
    setSaving(false)
    setMsg(res.ok ? '✔ Guardado' : '✗ Error al guardar')
    setTimeout(() => setMsg(''), 3000)
  }

  function updateHost(domainId, hostId, field, value) {
    setData(prev => ({
      ...prev,
      domain: prev.domain.map(d =>
        d.id !== domainId ? d : {
          ...d,
          host: d.host.map(h => h.id !== hostId ? h : { ...h, [field]: value })
        }
      )
    }))
  }

  function addHost(domainId) {
    const newHost = { id: 'nuevo', comment: '', ip: '', port: '22', hop: '' }
    setData(prev => ({
      ...prev,
      domain: prev.domain.map(d => d.id !== domainId ? d : { ...d, host: [...(d.host || []), newHost] })
    }))
    setEditHost(`${domainId}/nuevo`)
  }

  function deleteHost(domainId, hostId) {
    setData(prev => ({
      ...prev,
      domain: prev.domain.map(d => d.id !== domainId ? d : { ...d, host: d.host.filter(h => h.id !== hostId) })
    }))
  }

  function confirmAddDomain() {
    if (!newDomain.id.trim()) return
    setData(prev => ({ ...prev, domain: [...(prev.domain || []), { id: newDomain.id.trim(), comment: newDomain.comment.trim(), host: [] }] }))
    setSelectedDomain(newDomain.id.trim())
    setAddDomainModal(false)
  }

  function openEditDomain() {
    const d = (data.domain || []).find(d => d.id === selectedDomain)
    if (!d) return
    setEditDomain({ id: d.id, comment: d.comment || '' })
    setEditDomainModal(true)
  }

  function confirmEditDomain() {
    const newId = editDomain.id.trim()
    if (!newId) return
    setData(prev => ({
      ...prev,
      domain: prev.domain.map(d =>
        d.id !== selectedDomain ? d : { ...d, id: newId, comment: editDomain.comment.trim() }
      )
    }))
    setSelectedDomain(newId)
    setEditDomainModal(false)
  }

  function toggleSort(col) {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
    setPage(0)
  }

  function changeDomain(id) {
    setSelectedDomain(id)
    setPage(0)
    setColFilter({ id: '', comment: '', ip: '', port: '', hop: '' })
    setSort({ col: null, dir: 'asc' })
  }

  if (!data) return <p style={{ color: '#94a3b8', padding: 24 }}>Cargando...</p>

  const domains = data.domain || []
  const domain = domains.find(d => d.id === selectedDomain)

  // Filtrar y ordenar hosts
  let hosts = (domain?.host || []).map((h, _i) => ({ ...h, _i }))
  Object.entries(colFilter).forEach(([col, val]) => {
    if (val.trim()) hosts = hosts.filter(h => String(h[col] || '').toLowerCase().includes(val.toLowerCase()))
  })
  if (sort.col) {
    hosts = [...hosts].sort((a, b) => {
      const va = String(a[sort.col] || '').toLowerCase()
      const vb = String(b[sort.col] || '').toLowerCase()
      return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }

  const totalPages = Math.max(1, Math.ceil(hosts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pagedHosts = hosts.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'comment', label: 'Descripción' },
    { key: 'ip', label: 'IP' },
    { key: 'port', label: 'Puerto' },
    { key: 'hop', label: 'Hop' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Clientes &amp; Hosts</h1>
          <span className="page-subtitle">Gestión de conexiones SSH</span>
        </div>
        <div className="page-header-right">
          {msg && <span className={`msg ${msg.startsWith('✔') ? 'ok' : 'err'}`}>{msg}</span>}
          <button className="btn btn-save" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <select className="domain-select" value={selectedDomain || ''} onChange={e => changeDomain(e.target.value)}>
          {domains.map(d => <option key={d.id} value={d.id}>{d.id} — {d.comment}</option>)}
        </select>
        <button className="btn btn-edit-domain" onClick={openEditDomain} title="Editar cliente">✏ Editar cliente</button>
        <button className="btn btn-host" onClick={() => addHost(selectedDomain)}>+ Host</button>
      </div>

      {editDomainModal && (
        <div className="modal-overlay" onClick={() => setEditDomainModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Editar Cliente</h2>
            <label className="modal-label">ID</label>
            <input className="modal-input" placeholder="Ej: EMPRESA" value={editDomain.id}
              onChange={e => setEditDomain(p => ({ ...p, id: e.target.value.toUpperCase() }))} autoFocus />
            <label className="modal-label">Descripción</label>
            <input className="modal-input" placeholder="Ej: Empresa SRL" value={editDomain.comment}
              onChange={e => setEditDomain(p => ({ ...p, comment: e.target.value }))} />
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setEditDomainModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmEditDomain}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {addDomainModal && (
        <div className="modal-overlay" onClick={() => setAddDomainModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Cliente</h2>
            <label className="modal-label">ID</label>
            <input className="modal-input" placeholder="Ej: EMPRESA" value={newDomain.id}
              onChange={e => setNewDomain(p => ({ ...p, id: e.target.value.toUpperCase() }))} autoFocus />
            <label className="modal-label">Descripción</label>
            <input className="modal-input" placeholder="Ej: Empresa SRL" value={newDomain.comment}
              onChange={e => setNewDomain(p => ({ ...p, comment: e.target.value }))} />
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setAddDomainModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmAddDomain}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {domain && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>
                    <div className="th-inner">
                      <span className="th-label" onClick={() => toggleSort(col.key)} style={{ cursor: 'pointer' }}>
                        {col.label} <SortIcon col={col.key} sort={sort} />
                      </span>
                      <input className="col-filter" placeholder="Filtrar..."
                        value={colFilter[col.key] || ''}
                        onChange={e => setColFilter(p => ({ ...p, [col.key]: e.target.value }))} />
                    </div>
                  </th>
                ))}
                <th style={{ width: 90 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedHosts.length === 0 && (
                <tr><td colSpan={6} className="empty-row">Sin resultados</td></tr>
              )}
              {pagedHosts.map(h => {
                const key = `${domain.id}/${h.id}`
                const isEdit = editHost === key
                return (
                  <tr key={key} className={isEdit ? 'row-editing' : ''}>
                    {isEdit ? (
                      <>
                        <td><input className="cell-input" value={h.id} onChange={e => updateHost(domain.id, h.id, 'id', e.target.value)} /></td>
                        <td><input className="cell-input" value={h.comment || ''} onChange={e => updateHost(domain.id, h.id, 'comment', e.target.value)} /></td>
                        <td><input className="cell-input" value={h.ip || ''} onChange={e => updateHost(domain.id, h.id, 'ip', e.target.value)} /></td>
                        <td><input className="cell-input cell-sm" value={h.port || ''} onChange={e => updateHost(domain.id, h.id, 'port', e.target.value)} /></td>
                        <td><input className="cell-input" value={h.hop || ''} onChange={e => updateHost(domain.id, h.id, 'hop', e.target.value)} /></td>
                      </>
                    ) : (
                      <>
                        <td><span className="mono accent">{h.id}</span></td>
                        <td className="muted">{h.comment}</td>
                        <td><span className="mono">{h.ip}</span></td>
                        <td>{h.port || 22}</td>
                        <td className="muted small">{h.hop || '—'}</td>
                      </>
                    )}
                    <td>
                      <div className="action-btns">
                        <button className={`btn-icon ${isEdit ? 'btn-icon-ok' : 'btn-icon-edit'}`}
                          onClick={() => setEditHost(isEdit ? null : key)} title={isEdit ? 'Guardar edición' : 'Editar'}>
                          {isEdit ? '✔' : '✏'}
                        </button>
                        <button className="btn-icon btn-icon-del" onClick={() => deleteHost(domain.id, h.id)} title="Eliminar">✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="table-footer">
            <span>Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, hosts.length)} de {hosts.length} hosts</span>
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(0)} disabled={safePage === 0}>«</button>
              <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={`page-btn ${i === safePage ? 'page-btn-active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}>›</button>
              <button className="page-btn" onClick={() => setPage(totalPages - 1)} disabled={safePage === totalPages - 1}>»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default Clients
