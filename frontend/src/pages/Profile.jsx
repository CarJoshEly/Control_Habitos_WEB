import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout, getToken } from '../services/authService'

const API = 'http://localhost:3000/api'

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const fileRef = useRef()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setDisplayName(data.displayName || '')
      setPhotoUrl(data.photoUrl || '')
      setNotificationsEnabled(data.notificationsEnabled ?? true)
    } catch {
      showMessage('error', 'No se pudo cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveName = async () => {
    if (!tempName.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/profile/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: tempName.trim() })
      })
      if (!res.ok) throw new Error()
      setDisplayName(tempName.trim())
      setEditingName(false)
      showMessage('success', 'Nombre actualizado')
    } catch {
      showMessage('error', 'Error al actualizar el nombre')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch(`${API}/profile/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setPhotoUrl(data.photoUrl)
      showMessage('success', 'Foto actualizada')
    } catch {
      showMessage('error', 'Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value)
    try {
      const token = await getToken()
      await fetch(`${API}/profile/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationsEnabled: value })
      })
    } catch {
      setNotificationsEnabled(!value)
      showMessage('error', 'Error al guardar preferencias')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const initials = (displayName || user?.email || 'U')[0].toUpperCase()

  if (loading) return (
    <div style={p.loadingPage}>
      <div style={p.spinner} />
    </div>
  )

  return (
    <div style={p.page}>
      <header style={p.header}>
        <button style={p.backBtn} onClick={() => navigate('/dashboard')}>← Volver</button>
        <span style={p.headerTitle}>Mi Perfil</span>
        <div style={{ width: 60 }} />
      </header>

      {message && (
        <div style={p.toast(message.type)}>
          {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
        </div>
      )}

      <div style={p.content}>
        <div style={p.avatarSection}>
          <div style={p.avatarWrap}>
            {photoUrl ? (
              <img src={photoUrl} alt="perfil" style={p.avatarImg} />
            ) : (
              <div style={p.avatarFallback}>{initials}</div>
            )}
            {uploadingPhoto && <div style={p.avatarOverlay}><div style={p.spinner} /></div>}
            <button style={p.cameraBtn} onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}>
              📷
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <div style={p.nameDisplay}>{displayName || 'Sin nombre'}</div>
          <div style={p.emailDisplay}>{user?.email}</div>
        </div>

        <div style={p.card}>
          <div style={p.cardTitle}>Información de la cuenta</div>

          <div style={p.row}>
            <div style={p.rowLeft}>
              <span style={p.rowIcon}>👤</span>
              <div>
                <div style={p.rowLabel}>Nombre</div>
                {editingName ? (
                  <div style={p.editRow}>
                    <input
                      style={p.nameInput}
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                      autoFocus
                    />
                    <button style={p.saveSmall} onClick={handleSaveName} disabled={saving}>
                      {saving ? '...' : '✓'}
                    </button>
                    <button style={p.cancelSmall} onClick={() => setEditingName(false)}>✕</button>
                  </div>
                ) : (
                  <div style={p.rowValue}>{displayName || 'No establecido'}</div>
                )}
              </div>
            </div>
            {!editingName && (
              <button style={p.editBtn} onClick={() => { setTempName(displayName); setEditingName(true) }}>
                ✏️
              </button>
            )}
          </div>

          <div style={p.divider} />

          <div style={p.row}>
            <div style={p.rowLeft}>
              <span style={p.rowIcon}>📧</span>
              <div>
                <div style={p.rowLabel}>Correo electrónico</div>
                <div style={p.rowValue}>{user?.email}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={p.card}>
          <div style={p.cardTitle}>Preferencias</div>

          <div style={p.row}>
            <div style={p.rowLeft}>
              <span style={p.rowIcon}>{notificationsEnabled ? '🔔' : '🔕'}</span>
              <div>
                <div style={p.rowLabel}>Notificaciones</div>
                <div style={p.rowValue}>{notificationsEnabled ? 'Activadas' : 'Desactivadas'}</div>
              </div>
            </div>
            <label style={p.toggle}>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={e => handleToggleNotifications(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div style={p.toggleTrack(notificationsEnabled)}>
                <div style={p.toggleThumb(notificationsEnabled)} />
              </div>
            </label>
          </div>

          <div style={p.divider} />

          <button style={p.menuRow} onClick={() => navigate('/ai')}>
            <div style={p.rowLeft}>
              <span style={p.rowIcon}>🤖</span>
              <div>
                <div style={p.rowLabel}>Asistente IA</div>
                <div style={p.rowValue}>Sugerencias y análisis</div>
              </div>
            </div>
            <span style={p.chevron}>›</span>
          </button>

          <div style={p.divider} />

          <button style={p.menuRow} onClick={() => showTerms()}>
            <div style={p.rowLeft}>
              <span style={p.rowIcon}>📄</span>
              <div>
                <div style={p.rowLabel}>Términos y Condiciones</div>
                <div style={p.rowValue}>Políticas de uso y privacidad</div>
              </div>
            </div>
            <span style={p.chevron}>›</span>
          </button>
        </div>
        <div style={p.card}>
          <div style={p.cardTitle}>Acerca de</div>
          <div style={p.infoRow}><span>Aplicación</span><span style={p.infoVal}>Control Hábitos UNICAH</span></div>
          <div style={p.divider} />
          <div style={p.infoRow}><span>Versión</span><span style={p.infoVal}>1.0.0</span></div>
          <div style={p.divider} />
          <div style={p.infoRow}><span>Universidad</span><span style={p.infoVal}>UNICAH</span></div>
        </div>

        <button style={p.logoutBtn} onClick={handleLogout}>
          ↩ Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function showTerms() {
  alert('Términos y Condiciones\n\nAl usar esta aplicación aceptas que los datos registrados se usan únicamente para tu seguimiento de hábitos. Tu información no es compartida con terceros.')
}

const p = {
  page: { minHeight: '100vh', backgroundColor: '#f0f4ff', fontFamily: 'system-ui, sans-serif', paddingBottom: 40 },
  loadingPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4ff' },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #003087', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  header: { backgroundColor: '#003087', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', color: '#C8A84B', cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: 0 },
  headerTitle: { color: 'white', fontWeight: 700, fontSize: 17 },

  toast: (type) => ({
    position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
    backgroundColor: type === 'success' ? '#16a34a' : '#dc2626',
    color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: 14,
    fontWeight: 600, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap'
  }),

  content: { padding: '0 16px', maxWidth: 520, margin: '0 auto' },

  avatarSection: { textAlign: 'center', padding: '32px 0 24px' },
  avatarWrap: { position: 'relative', display: 'inline-block' },
  avatarImg: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #003087' },
  avatarFallback: { width: 100, height: 100, borderRadius: '50%', backgroundColor: '#003087', color: 'white', fontSize: 40, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #C8A84B' },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: '50%', backgroundColor: '#003087', border: '2px solid white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nameDisplay: { marginTop: 12, fontSize: 22, fontWeight: 700, color: '#111827' },
  emailDisplay: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  card: { backgroundColor: 'white', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowIcon: { fontSize: 22, flexShrink: 0 },
  rowLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: 500 },
  editBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px', color: '#003087' },

  editRow: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 },
  nameInput: { padding: '6px 10px', borderRadius: 8, border: '1px solid #003087', fontSize: 14, outline: 'none', width: 160 },
  saveSmall: { padding: '6px 10px', borderRadius: 8, backgroundColor: '#003087', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  cancelSmall: { padding: '6px 10px', borderRadius: 8, backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer' },

  divider: { borderTop: '1px solid #f3f4f6', margin: '4px 0' },

  toggle: { cursor: 'pointer', flexShrink: 0 },
  toggleTrack: (on) => ({ width: 46, height: 26, borderRadius: 13, backgroundColor: on ? '#003087' : '#d1d5db', position: 'relative', transition: 'background 0.2s' }),
  toggleThumb: (on) => ({ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }),

  menuRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left' },
  chevron: { fontSize: 22, color: '#9ca3af' },

  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 14, color: '#374151' },
  infoVal: { color: '#6b7280', fontWeight: 500 },

  logoutBtn: { width: '100%', padding: '14px', borderRadius: 12, backgroundColor: '#dc2626', color: 'white', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 8 },
}