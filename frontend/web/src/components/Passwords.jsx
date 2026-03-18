import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'

const apiHeaders = token => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <span className="sort-icon neutral">⇅</span>
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

const PAGE_SIZE = 10

const Passwords = forwardRef(function Passwords({ token, onUnauth }, ref) {
  const [rows, setRows] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [editIdx, setEditIdx] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showPass, setShowPass] = useState({})
  const [sort, setSort] = useState({ col: null, dir: 'asc' })
  const [colFilter, setColFilter] = useState({ host: '', user: '' })
  const [page, setPage] = useState(0)

  // Fila nueva pendiente — siempre arriba de la tabla
  const [pendingRow, setPendingRow] = useState(null)

  // Modal nueva colección
  const [newCollModal, setNewCollModal] = useState(false)
  const [newCollName, setNewCollName] = useState('')

  useImperativeHandle(ref, () => ({ addRow }))

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/passwords', { headers: apiHeaders(token) })
    if (res.status === 401) return onUnauth()
    const data = await res.json()
    setRows(data)
    const domains = [...new Set(data.map(r => r.domain).filter(Boolean))].sort()
    if (domains.length) setSelectedDomain(domains[0])
  }

  async function save() {
    // Si hay fila pendiente sin confirmar, la incluimos
    const toSave = pendingRow ? [...(rows || []), pendingRow] : rows
    setSaving(true)
    const res = await fetch('/api/passwords', { method: 'PUT', headers: apiHeaders(token), body: JSON.stringify(toSave) })
    setSaving(false)
    if (res.ok) {
      setPendingRow(null)
      setRows(toSave)
      setMsg('✔ Guardado y re-encriptado')
    } else {
      setMsg('✗ Error al guardar')
    }
    setTimeout(() => setMsg(''), 4000)
  }

  function update(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    // Crea fila pendiente visible siempre al tope; va a page 0
    setPendingRow({ domain: selectedDomain || '', host: '', user: '', pass: '' })
    setPage(0)
  }

  function confirmPending() {
    if (!pendingRow) return
    setRows(prev => [...(prev || []), pendingRow])
    setPendingRow(null)
  }

  function cancelPending() {
    setPendingRow(null)
  }

  function deleteRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx))
    if (editIdx === idx) setEditIdx(null)
  }

  function toggleSort(col) {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
    setPage(0)
  }

  function changeDomain(d) {
    setSelectedDomain(d)
    setPage(0)
    setColFilter({ host: '', user: '' })
    setSort({ col: null, dir: 'asc' })
    setPendingRow(null)
  }

  function confirmNewColl() {
    const name = newCollName.trim().toUpperCase()
    if (!name) return
    setNewCollModal(false)
    setNewCollName('')
    // Si ya existe, solo cambiar de dominio
    setSelectedDomain(name)
    setPage(0)
    setColFilter({ host: '', user: '' })
    setSort({ col: null, dir: 'asc' })
    // Abrir fila nueva en ese dominio
    setPendingRow({ domain: name, host: '', user: '', pass: '' })
  }

  if (!rows) return <p style={{ color: '#94a3b8', padding: 24 }}>Descifrando passwords...</p>

  // Dominios únicos: los del CSV + el pendiente si es nuevo
  const domainSet = [...new Set(rows.map(r => r.domain).filter(Boolean))]
  if (pendingRow?.domain && !domainSet.includes(pendingRow.domain)) {
    domainSet.push(pendingRow.domain)
  }
  domainSet.sort()

  // Filtrar por dominio seleccionado
  let filtered = rows.map((r, i) => ({ ...r, _i: i }))
    .filter(r => r.domain === selectedDomain)

  // Filtros por columna
  Object.entries(colFilter).forEach(([col, val]) => {
    if (val.trim()) filtered = filtered.filter(r => String(r[col] || '').toLowerCase().includes(val.toLowerCase()))
  })

  // Sort
  if (sort.col) {
    filtered = [...filtered].sort((a, b) => {
      const va = String(a[sort.col] || '').toLowerCase()
      const vb = String(b[sort.col] || '').toLowerCase()
      return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }

  // Paginación (solo sobre las filas existentes, la pending va siempre arriba)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const showPending = pendingRow && pendingRow.domain === selectedDomain

  const columns = [
    { key: 'host', label: 'Host' },
    { key: 'user', label: 'Usuario' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Passwords</h1>
          <span className="page-subtitle">Credenciales cifradas con GPG</span>
        </div>
        <div className="page-header-right">
          {msg && <span className={`msg ${msg.startsWith('✔') ? 'ok' : 'err'}`}>{msg}</span>}
          <button className="btn btn-save" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {/* Selector de dominio + nueva colección */}
      <div className="toolbar">
        <select
          className="domain-select"
          value={selectedDomain || ''}
          onChange={e => changeDomain(e.target.value)}
        >
          {domainSet.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-edit-domain" onClick={() => { setNewCollName(''); setNewCollModal(true) }}>
          + Nueva colección
        </button>
      </div>

      {/* Modal nueva colección */}
      {newCollModal && (
        <div className="modal-overlay" onClick={() => setNewCollModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nueva Colección</h2>
            <label className="modal-label">Nombre (dominio)</label>
            <input
              className="modal-input"
              placeholder="Ej: TUX"
              value={newCollName}
              onChange={e => setNewCollName(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && confirmNewColl()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setNewCollModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmNewColl}>Crear y agregar password</button>
            </div>
          </div>
        </div>
      )}

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
              <th>Password</th>
              <th style={{ width: 90 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila nueva SIEMPRE al tope */}
            {showPending && (
              <tr className="row-editing row-new">
                <td><input className="cell-input" placeholder="Host" value={pendingRow.host} autoFocus
                  onChange={e => setPendingRow(p => ({ ...p, host: e.target.value }))} /></td>
                <td><input className="cell-input" placeholder="Usuario" value={pendingRow.user}
                  onChange={e => setPendingRow(p => ({ ...p, user: e.target.value }))} /></td>
                <td><input className="cell-input" placeholder="Password" value={pendingRow.pass}
                  onChange={e => setPendingRow(p => ({ ...p, pass: e.target.value }))} /></td>
                <td>
                  <div className="action-btns">
                    <button className="btn-icon btn-icon-ok" onClick={confirmPending} title="Confirmar">✔</button>
                    <button className="btn-icon btn-icon-del" onClick={cancelPending} title="Cancelar">✕</button>
                  </div>
                </td>
              </tr>
            )}

            {paged.length === 0 && !showPending && (
              <tr><td colSpan={4} className="empty-row">Sin resultados</td></tr>
            )}
            {paged.map(r => {
              const idx = r._i
              const isEdit = editIdx === idx
              return (
                <tr key={idx} className={isEdit ? 'row-editing' : ''}>
                  {isEdit ? (
                    <>
                      <td><input className="cell-input" value={r.host} onChange={e => update(idx, 'host', e.target.value)} /></td>
                      <td><input className="cell-input" value={r.user} onChange={e => update(idx, 'user', e.target.value)} /></td>
                      <td><input className="cell-input" type="text" value={r.pass} onChange={e => update(idx, 'pass', e.target.value)} /></td>
                    </>
                  ) : (
                    <>
                      <td><span className="mono">{r.host}</span></td>
                      <td>{r.user}</td>
                      <td>
                        <span className="mono" style={{ letterSpacing: showPass[idx] ? 0 : 2 }}>
                          {showPass[idx] ? r.pass : '••••••••'}
                        </span>
                        <button className="btn-eye" onClick={() => setShowPass(p => ({ ...p, [idx]: !p[idx] }))}>
                          {showPass[idx] ? '🙈' : '👁'}
                        </button>
                      </td>
                    </>
                  )}
                  <td>
                    <div className="action-btns">
                      <button className={`btn-icon ${isEdit ? 'btn-icon-ok' : 'btn-icon-edit'}`}
                        onClick={() => setEditIdx(isEdit ? null : idx)} title={isEdit ? 'Guardar edición' : 'Editar'}>
                        {isEdit ? '✔' : '✏'}
                      </button>
                      <button className="btn-icon btn-icon-del" onClick={() => deleteRow(idx)} title="Eliminar">✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="table-footer">
          <span>Mostrando {filtered.length > 0 ? `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}` : '0'} registros{showPending ? ' + 1 nuevo sin confirmar' : ''}</span>
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
    </div>
  )
})

export default Passwords
