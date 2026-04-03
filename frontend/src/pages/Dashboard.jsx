import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../services/authService'
import { getHabits, createHabit, updateHabit, deleteHabit, toggleHabit } from '../services/habitService'
import { useTheme } from '../context/ThemeContext'

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const FREQ_LABELS = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' }

const toDateStr = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
const isSameDay = (a, b) => toDateStr(a) === toDateStr(b)
const isToday = (d) => isSameDay(d, new Date())
const isFuture = (d) => {
  const today = new Date(); today.setHours(23,59,59,999)
  return new Date(d) > today
}
const pad = (n) => String(n).padStart(2, '0')

// ─── TimePicker ────────────────────────────────────────────────────────────────
function TimePicker({ hour, minute, onChange, onClose, dark }) {
  const to12 = (h) => ({ h: h % 12 === 0 ? 12 : h % 12, period: h < 12 ? 'AM' : 'PM' })
  const to24 = (h, period) => period === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12)
  const init = to12(hour ?? 8)
  const [h, setH] = useState(init.h)
  const [min, setMin] = useState(minute ?? 0)
  const [period, setPeriod] = useState(init.period)
  const adjH = (delta) => setH(v => ((v - 1 + delta + 12) % 12) + 1)
  const adjMin = (delta) => setMin(v => (v + delta + 60) % 60)
  const handleHInput = (val) => { const n = parseInt(val); if (!isNaN(n) && n >= 1 && n <= 12) setH(n) }
  const handleMinInput = (val) => { const n = parseInt(val); if (!isNaN(n) && n >= 0 && n <= 59) setMin(n) }
  const bg = dark ? '#1e293b' : 'white'
  const inputBg = dark ? '#0f172a' : '#f0f4ff'
  const btnBg = dark ? '#334155' : '#f0f4ff'

  return (
    <div style={{ ...m.overlay, zIndex: 1100 }} onClick={onClose}>
      <div style={{ ...m.timePicker, backgroundColor: bg }} onClick={e => e.stopPropagation()}>
        <div style={m.timeHeader}>
          <span style={{ fontSize: 20 }}>⏰</span>
          <span style={{ fontWeight: 700, color: '#003087', fontSize: 17 }}>Seleccionar hora</span>
        </div>
        <div style={{ ...m.timeDisplay, background: inputBg }}>
          <input type="number" min={1} max={12} value={h} onChange={e => handleHInput(e.target.value)} style={{ ...m.timeInput, color: dark ? '#93c5fd' : '#003087' }} />
          <span style={{ ...m.timeSep, color: dark ? '#93c5fd' : '#003087' }}>:</span>
          <input type="number" min={0} max={59} value={pad(min)} onChange={e => handleMinInput(e.target.value)} style={{ ...m.timeInput, color: dark ? '#93c5fd' : '#003087' }} />
        </div>
        <div style={m.timeControls}>
          <div style={m.timeCol}>
            <button style={{ ...m.timeArrow, background: btnBg, color: dark ? '#93c5fd' : '#003087' }} onClick={() => adjH(1)}>▲</button>
            <div style={{ ...m.timeLabel, color: dark ? '#94a3b8' : '#9ca3af' }}>Hora</div>
            <button style={{ ...m.timeArrow, background: btnBg, color: dark ? '#93c5fd' : '#003087' }} onClick={() => adjH(-1)}>▼</button>
          </div>
          <div style={{ width: 32 }} />
          <div style={m.timeCol}>
            <button style={{ ...m.timeArrow, background: btnBg, color: dark ? '#93c5fd' : '#003087' }} onClick={() => adjMin(1)}>▲</button>
            <div style={{ ...m.timeLabel, color: dark ? '#94a3b8' : '#9ca3af' }}>Minutos</div>
            <button style={{ ...m.timeArrow, background: btnBg, color: dark ? '#93c5fd' : '#003087' }} onClick={() => adjMin(-1)}>▼</button>
          </div>
          <div style={{ width: 24 }} />
          <div style={m.timeCol}>
            <button style={{ ...m.timeArrow, background: period === 'AM' ? '#003087' : btnBg, color: period === 'AM' ? 'white' : (dark ? '#93c5fd' : '#003087') }} onClick={() => setPeriod('AM')}>AM</button>
            <div style={{ ...m.timeLabel, color: dark ? '#94a3b8' : '#9ca3af' }}>Período</div>
            <button style={{ ...m.timeArrow, background: period === 'PM' ? '#003087' : btnBg, color: period === 'PM' ? 'white' : (dark ? '#93c5fd' : '#003087') }} onClick={() => setPeriod('PM')}>PM</button>
          </div>
        </div>
        <div style={m.actions}>
          <button style={{ ...m.cancelBtn, background: dark ? '#334155' : 'white', color: dark ? '#e2e8f0' : '#374151', border: dark ? '1px solid #475569' : '1px solid #e0e0e0' }} onClick={onClose}>Cancelar</button>
          <button style={m.saveBtn} onClick={() => onChange(to24(h, period), min)}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

// ─── HabitModal ────────────────────────────────────────────────────────────────
function HabitModal({ habit, onClose, onSave, dark }) {
  const editing = !!habit?.id
  const [name, setName] = useState(habit?.name || '')
  const [description, setDescription] = useState(habit?.description || '')
  const [frequency, setFrequency] = useState(habit?.frequency || 'daily')
  const [reminderHour, setReminderHour] = useState(habit?.reminderHour ?? null)
  const [reminderMinute, setReminderMinute] = useState(habit?.reminderMinute ?? null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasReminder = reminderHour !== null
  const bg = dark ? '#1e293b' : 'white'
  const inputStyle = { ...m.input, background: dark ? '#0f172a' : 'white', color: dark ? '#e2e8f0' : '#111827', border: dark ? '1px solid #334155' : '1px solid #e0e0e0' }

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    await onSave({ name: name.trim(), description: description.trim(), frequency, reminderHour: hasReminder ? reminderHour : null, reminderMinute: hasReminder ? reminderMinute : null })
    setLoading(false)
  }

  return (
    <>
      <div style={m.overlay} onClick={onClose}>
        <div style={{ ...m.modal, backgroundColor: bg }} onClick={e => e.stopPropagation()}>
          <div style={m.modalHeader}>
            <span style={m.modalIcon}>{editing ? '✏️' : '➕'}</span>
            <h2 style={{ ...m.modalTitle, color: dark ? '#93c5fd' : '#003087' }}>{editing ? 'Editar Hábito' : 'Nuevo Hábito'}</h2>
          </div>
          {error && <div style={m.error}>{error}</div>}
          <div style={m.field}>
            <label style={{ ...m.label, color: dark ? '#94a3b8' : '#374151' }}>Nombre *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Hacer ejercicio" autoFocus />
          </div>
          <div style={m.field}>
            <label style={{ ...m.label, color: dark ? '#94a3b8' : '#374151' }}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. 30 minutos de cardio" />
          </div>
          <div style={m.field}>
            <label style={{ ...m.label, color: dark ? '#94a3b8' : '#374151' }}>Frecuencia</label>
            <select style={inputStyle} value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="daily">📅 Diario</option>
              <option value="weekly">📆 Semanal</option>
              <option value="monthly">🗓️ Mensual</option>
            </select>
          </div>
          <div style={m.field}>
            <label style={{ ...m.label, color: dark ? '#94a3b8' : '#374151' }}>Recordatorio</label>
            <div style={{ ...m.reminderTile, background: dark ? '#0f172a' : 'white', border: dark ? '1px solid #334155' : '1px solid #e0e0e0' }} onClick={() => setShowTimePicker(true)}>
              <div style={{ fontSize: 26 }}>{hasReminder ? '🔔' : '🔕'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: hasReminder ? '#003087' : (dark ? '#e2e8f0' : '#374151') }}>
                  {hasReminder ? `Recordatorio: ${pad(reminderHour)}:${pad(reminderMinute)}` : 'Agregar recordatorio'}
                </div>
                <div style={{ fontSize: 12, color: dark ? '#64748b' : '#9ca3af', marginTop: 2 }}>
                  {hasReminder ? 'Toca para cambiar la hora' : 'Opcional — toca para configurar'}
                </div>
              </div>
              {hasReminder
                ? <button style={m.clearBtn} onClick={e => { e.stopPropagation(); setReminderHour(null); setReminderMinute(null) }}>✕</button>
                : <span style={{ color: dark ? '#64748b' : '#9ca3af', fontSize: 22 }}>›</span>
              }
            </div>
          </div>
          <div style={m.actions}>
            <button style={{ ...m.cancelBtn, background: dark ? '#334155' : 'white', color: dark ? '#e2e8f0' : '#374151', border: dark ? '1px solid #475569' : '1px solid #e0e0e0' }} onClick={onClose}>Cancelar</button>
            <button style={m.saveBtn} onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </div>
      {showTimePicker && (
        <TimePicker dark={dark} hour={reminderHour ?? 8} minute={reminderMinute ?? 0}
          onChange={(h, min) => { setReminderHour(h); setReminderMinute(min); setShowTimePicker(false) }}
          onClose={() => setShowTimePicker(false)} />
      )}
    </>
  )
}

// ─── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ name, onClose, onConfirm, dark }) {
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.modal, maxWidth: 360, backgroundColor: dark ? '#1e293b' : 'white' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <h2 style={{ color: dark ? '#93c5fd' : '#003087', margin: '10px 0 6px' }}>¿Eliminar hábito?</h2>
          <p style={{ color: dark ? '#94a3b8' : '#666', margin: 0 }}>Se eliminará <strong>"{name}"</strong> permanentemente.</p>
        </div>
        <div style={m.actions}>
          <button style={{ ...m.cancelBtn, background: dark ? '#334155' : 'white', color: dark ? '#e2e8f0' : '#374151', border: dark ? '1px solid #475569' : '1px solid #e0e0e0' }} onClick={onClose}>Cancelar</button>
          <button style={{ ...m.saveBtn, background: '#dc2626' }} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ─── HabitCard ─────────────────────────────────────────────────────────────────
function HabitCard({ habit, selectedDate, onToggle, onEdit, onDelete, onProgress, onHistory, dark }) {
  const history = habit.completionHistory || []
  const dateStr = toDateStr(selectedDate)
  const completed = history.includes(dateStr)
  const isPast = !isFuture(selectedDate)
  const [menuOpen, setMenuOpen] = useState(false)
  const cardBg = dark ? (completed ? '#134e26' : '#1e293b') : (completed ? '#f0fdf4' : 'white')
  const cardBorder = completed ? '2px solid #16a34a' : (dark ? '2px solid #334155' : '2px solid transparent')

  return (
    <div style={{ ...c.card, backgroundColor: cardBg, border: cardBorder }}>
      <div style={c.cardTop}>
        <button
          style={{ ...c.checkbox, ...(completed ? c.checkboxDone : { border: dark ? '2px solid #475569' : '2px solid #d1d5db', background: dark ? '#0f172a' : 'white' }), ...(!isPast ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
          onClick={() => isPast && onToggle(habit.id, !completed, dateStr)}
          disabled={!isPast}
        >
          {completed ? '✓' : ''}
        </button>
        <div style={c.cardInfo}>
          <div style={{ ...c.cardName(completed), color: completed ? '#6b7280' : (dark ? '#e2e8f0' : '#111827') }}>{habit.name}</div>
          {habit.description && <div style={{ ...c.cardDesc, color: dark ? '#94a3b8' : '#6b7280' }}>{habit.description}</div>}
        </div>
        <div style={{ position: 'relative' }}>
          <button style={{ ...c.menuBtn, color: dark ? '#64748b' : '#6b7280' }} onClick={() => setMenuOpen(v => !v)}>⋮</button>
          {menuOpen && (
            <div style={{ ...c.dropdown, backgroundColor: dark ? '#1e293b' : 'white', border: dark ? '1px solid #334155' : '1px solid #f3f4f6' }} onMouseLeave={() => setMenuOpen(false)}>
              <button style={{ ...c.dropItem, color: dark ? '#e2e8f0' : '#374151' }} onClick={() => { setMenuOpen(false); onEdit(habit) }}>✏️ Editar</button>
              <button style={{ ...c.dropItem, color: dark ? '#e2e8f0' : '#374151' }} onClick={() => { setMenuOpen(false); onProgress(habit) }}>📊 Progreso</button>
              <button style={{ ...c.dropItem, color: dark ? '#e2e8f0' : '#374151' }} onClick={() => { setMenuOpen(false); onHistory(habit) }}>📋 Historial</button>
              <hr style={{ margin: '4px 0', border: 'none', borderTop: dark ? '1px solid #334155' : '1px solid #f3f4f6' }} />
              <button style={{ ...c.dropItem, color: '#dc2626' }} onClick={() => { setMenuOpen(false); onDelete(habit) }}>🗑️ Eliminar</button>
            </div>
          )}
        </div>
      </div>
      <div style={c.chips}>
        <span style={c.chip('#fff7ed', '#ea580c')}>🔥 {habit.streak || 0} días</span>
        <span style={c.chip('#f0fdf4', '#16a34a')}>✓ {habit.progress || 0}</span>
        {habit.reminderHour != null && (
          <span style={c.chip('#eff6ff', '#2563eb')}>⏰ {pad(habit.reminderHour)}:{pad(habit.reminderMinute || 0)}</span>
        )}
        <span style={{ ...c.chip('#f1f5f9', '#64748b'), marginLeft: 'auto' }}>{FREQ_LABELS[habit.frequency] || habit.frequency}</span>
      </div>
    </div>
  )
}

// ─── StatsTab ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, dark }) {
  return (
    <div style={{ ...s.statCard, backgroundColor: dark ? '#1e293b' : 'white' }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, margin: '8px 0 4px' }}>{value}</div>
      <div style={{ fontSize: 12, color: dark ? '#94a3b8' : '#6b7280', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function StatsTab({ habits, dark }) {
  if (!habits.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>📊</div>
      <div style={{
        background: dark ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #f0f4ff, #e8eeff)',
        borderRadius: 20, padding: '32px 24px', maxWidth: 320, margin: '0 auto',
        border: dark ? '1px solid #334155' : '1px solid #c7d2fe'
      }}>
        <h3 style={{ color: dark ? '#93c5fd' : '#003087', margin: '0 0 10px', fontSize: 20 }}>Sin estadísticas aún</h3>
        <p style={{ color: dark ? '#94a3b8' : '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Crea hábitos y empieza a completarlos para ver tu progreso aquí 💪
        </p>
      </div>
    </div>
  )

  const totalCompleted = habits.reduce((acc, h) => acc + (h.progress || 0), 0)
  const totalStreak = habits.reduce((acc, h) => acc + (h.streak || 0), 0)
  const bestStreak = Math.max(...habits.map(h => h.bestStreak || 0), 0)

  return (
    <div>
      <h3 style={{ ...s.sectionTitle, color: dark ? '#93c5fd' : '#003087' }}>Resumen General</h3>
      <div style={s.grid}>
        <StatCard dark={dark} icon="❤️" label="Hábitos Activos" value={habits.length} color="#ec4899" />
        <StatCard dark={dark} icon="✅" label="Total Completados" value={totalCompleted} color="#16a34a" />
        <StatCard dark={dark} icon="🔥" label="Racha Combinada" value={totalStreak} color="#ea580c" />
        <StatCard dark={dark} icon="🏆" label="Mejor Racha" value={bestStreak} color="#d97706" />
      </div>
      <h3 style={{ ...s.sectionTitle, color: dark ? '#93c5fd' : '#003087', marginTop: 28 }}>Por hábito</h3>
      {habits.map(h => (
        <div key={h.id} style={{ ...s.habitRow, backgroundColor: dark ? '#1e293b' : 'white' }}>
          <div style={{ fontWeight: 600, color: dark ? '#e2e8f0' : '#111827', fontSize: 15, marginBottom: 8 }}>{h.name}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ {h.progress || 0}</span>
            <span style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>🔥 {h.streak || 0}</span>
            <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>🏆 {h.bestStreak || 0}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('habits')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [modalHabit, setModalHabit] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { dark, toggleTheme } = useTheme()

  const fetchHabits = useCallback(async () => {
    try {
      const data = await getHabits()
      setHabits(Array.isArray(data) ? data : [])
    } catch { setHabits([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  const handleLogout = async () => { await logout(); navigate('/') }
  const handleSaveHabit = async (data) => {
    if (modalHabit?.id) await updateHabit(modalHabit.id, data)
    else await createHabit(data)
    setModalHabit(null)
    fetchHabits()
  }
  const handleDelete = async () => {
    await deleteHabit(deleteTarget.id)
    setDeleteTarget(null)
    fetchHabits()
  }
  const handleToggle = async (id, completed, date) => {
    await toggleHabit(id, completed, date)
    fetchHabits()
  }

  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 7 + i); return d
  })

  const today = new Date()
  const formattedDate = `${today.getDate()} de ${MONTHS[today.getMonth()]} ${today.getFullYear()}`
  const pageBg = dark ? '#0f172a' : '#f0f4ff'
  const calBg = dark ? '#1e293b' : 'white'
  const calBorder = dark ? '1px solid #334155' : '1px solid #e5e7eb'

  return (
    <div style={{ ...d.page, backgroundColor: pageBg }}>
      {/* Header */}
      <header style={d.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>Control Hábitos</div>
            <div style={{ color: '#C8A84B', fontSize: 12, fontWeight: 700 }}>UNICAH</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botón de tema */}
          <button style={d.iconBtn} onClick={toggleTheme} title={dark ? 'Modo claro' : 'Modo oscuro'}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button style={d.profileBtn} onClick={() => navigate('/profile')}>
            {user?.photoURL
              ? <img src={user.photoURL} alt="perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#C8A84B', fontWeight: 700, fontSize: 16 }}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
            }
          </button>
          <button style={d.iconBtn} onClick={() => navigate('/ai')}>🤖</button>
          <button style={d.iconBtn} onClick={handleLogout}>↩</button>
        </div>
      </header>

      {/* Greeting */}
      <div style={d.greeting}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Hola, {user?.displayName?.split(' ')[0] || 'Estudiante'} 👋</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.8 }}>{formattedDate}</p>
      </div>

      {/* Tabs */}
      <div style={d.tabBar}>
        <button style={d.tab(tab === 'habits')} onClick={() => setTab('habits')}>🏠 Mis Hábitos</button>
        <button style={d.tab(tab === 'stats')} onClick={() => setTab('stats')}>📊 Estadísticas</button>
      </div>

      {tab === 'habits' && (
        <>
          {/* Calendario */}
          <div style={{ ...d.calendarWrap, backgroundColor: calBg, borderBottom: calBorder }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: dark ? '#93c5fd' : '#003087', fontSize: 15 }}>
                {DAYS_SHORT[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </span>
              <button style={{ ...d.todayBtn, color: dark ? '#93c5fd' : '#0057B8', border: dark ? '1px solid #93c5fd' : '1px solid #0057B8' }} onClick={() => setSelectedDate(new Date())}>Hoy</button>
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {calendarDays.map((day, i) => {
                const selected = isSameDay(day, selectedDate)
                const todayDay = isToday(day)
                const future = isFuture(day)
                return (
                  <button key={i} style={d.dayBtn(selected, todayDay, future)}
                    onClick={() => !future && setSelectedDate(new Date(day))} disabled={future}>
                    <span style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,0.8)' : future ? '#aaa' : (dark ? '#94a3b8' : '#6b7280') }}>{DAYS_SHORT[day.getDay()]}</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: selected ? 'white' : future ? '#aaa' : (dark ? '#e2e8f0' : '#111827') }}>{day.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista de hábitos */}
          <div style={{ padding: '16px 16px 80px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={d.spinner} />
              </div>
            ) : habits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 80, marginBottom: 16 }}>🌱</div>
                <div style={{
                  background: dark ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #f0f4ff, #e8eeff)',
                  borderRadius: 20, padding: '32px 24px', maxWidth: 320, margin: '0 auto',
                  border: dark ? '1px solid #334155' : '1px solid #c7d2fe'
                }}>
                  <h3 style={{ color: dark ? '#93c5fd' : '#003087', margin: '0 0 10px', fontSize: 20 }}>¡Bienvenido!</h3>
                  <p style={{ color: dark ? '#94a3b8' : '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                    Crea tu primer hábito y empieza a construir una mejor versión de ti mismo 💪
                  </p>
                  <button style={{ ...d.addBtnLarge, width: '100%' }} onClick={() => setModalHabit({})}>➕ Crear mi primer hábito</button>
                </div>
              </div>
            ) : (
              habits.map(habit => (
                <HabitCard key={habit.id} habit={habit} selectedDate={selectedDate} dark={dark}
                  onToggle={handleToggle}
                  onEdit={(h) => setModalHabit(h)}
                  onDelete={(h) => setDeleteTarget(h)}
                  onProgress={(h) => navigate(`/habits/${h.id}/progress`, { state: { habit: h } })}
                  onHistory={(h) => navigate(`/habits/${h.id}/history`, { state: { habit: h } })}
                />
              ))
            )}
          </div>

          {habits.length > 0 && (
            <button style={d.fab} onClick={() => setModalHabit({})}>＋</button>
          )}
        </>
      )}

      {tab === 'stats' && (
        <div style={{ padding: '16px 16px 80px' }}>
          <StatsTab habits={habits} dark={dark} />
        </div>
      )}

      {modalHabit !== null && (
        <HabitModal dark={dark} habit={modalHabit.id ? modalHabit : null} onClose={() => setModalHabit(null)} onSave={handleSaveHabit} />
      )}
      {deleteTarget && (
        <ConfirmModal dark={dark} name={deleteTarget.name} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  )
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const d = {
  page: { minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  header: { backgroundColor: '#003087', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  profileBtn: { background: 'none', border: '2px solid #C8A84B', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 17, color: 'white' },
  greeting: { padding: '20px 20px 16px', background: 'linear-gradient(135deg, #003087 0%, #0057B8 100%)', color: 'white' },
  tabBar: { display: 'flex', backgroundColor: '#0057B8' },
  tab: (active) => ({ flex: 1, padding: '12px 8px', border: 'none', background: 'none', color: active ? '#C8A84B' : 'rgba(255,255,255,0.7)', fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer', borderBottom: active ? '3px solid #C8A84B' : '3px solid transparent', transition: 'all 0.2s' }),
  calendarWrap: { padding: '16px 20px' },
  todayBtn: { background: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13 },
  dayBtn: (selected, today, future) => ({
    minWidth: 52, height: 64, borderRadius: 12,
    border: today && !selected ? '2px solid #003087' : '2px solid transparent',
    background: selected ? '#003087' : 'transparent',
    cursor: future ? 'not-allowed' : 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, padding: '0 4px', flexShrink: 0, opacity: future ? 0.4 : 1, transition: 'all 0.15s'
  }),
  spinner: { width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid #003087', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  addBtnLarge: { backgroundColor: '#003087', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  fab: { position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', backgroundColor: '#003087', color: 'white', fontSize: 28, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,48,135,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
}

const c = {
  card: { borderRadius: 16, padding: '14px 16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'all 0.2s' },
  cardDone: {},
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  checkbox: { width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', color: 'white', fontWeight: 700 },
  checkboxDone: { background: '#16a34a', border: '2px solid #16a34a' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: (done) => ({ fontSize: 16, fontWeight: 600, textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  cardDesc: { fontSize: 13, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  menuBtn: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  dropdown: { position: 'absolute', right: 0, top: '100%', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 160, zIndex: 200, overflow: 'hidden' },
  dropItem: { display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14 },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  chip: (bg, color) => ({ backgroundColor: bg, color, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }),
}

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalIcon: { fontSize: 28 },
  modalTitle: { margin: 0, fontSize: 20 },
  error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  actions: { display: 'flex', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  saveBtn: { flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#003087', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  reminderTile: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#dc2626', padding: '4px 6px', borderRadius: 6 },
  timePicker: { borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' },
  timeHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  timeDisplay: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderRadius: 16, padding: '16px 24px' },
  timeNum: { fontSize: 52, fontWeight: 800, lineHeight: 1, minWidth: 64, textAlign: 'center' },
  timeSep: { fontSize: 44, fontWeight: 800, margin: '0 4px', lineHeight: 1 },
  timeControls: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  timeCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  timeArrow: { border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 18, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  timeLabel: { fontSize: 12, fontWeight: 600 },
  timeInput: { fontSize: 52, fontWeight: 800, lineHeight: 1, width: 80, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', MozAppearance: 'textfield' },
}

const s = {
  sectionTitle: { fontSize: 17, fontWeight: 700, margin: '0 0 16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  statCard: { borderRadius: 16, padding: '20px 12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  habitRow: { borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
}