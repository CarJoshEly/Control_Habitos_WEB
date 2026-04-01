import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../services/authService'
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabit,
} from '../services/habitService'

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

function HabitModal({ habit, onClose, onSave }) {
  const editing = !!habit?.id
  const [name, setName] = useState(habit?.name || '')
  const [description, setDescription] = useState(habit?.description || '')
  const [frequency, setFrequency] = useState(habit?.frequency || 'daily')
  const [reminderHour, setReminderHour] = useState(habit?.reminderHour ?? '')
  const [reminderMinute, setReminderMinute] = useState(habit?.reminderMinute ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true)
    const data = {
      name: name.trim(),
      description: description.trim(),
      frequency,
      reminderHour: reminderHour !== '' ? parseInt(reminderHour) : null,
      reminderMinute: reminderMinute !== '' ? parseInt(reminderMinute) : null,
    }
    await onSave(data)
    setLoading(false)
  }

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>
        <div style={m.modalHeader}>
          <span style={m.modalIcon}>{editing ? '✏️' : '➕'}</span>
          <h2 style={m.modalTitle}>{editing ? 'Editar Hábito' : 'Nuevo Hábito'}</h2>
        </div>

        {error && <div style={m.error}>{error}</div>}

        <div style={m.field}>
          <label style={m.label}>Nombre *</label>
          <input
            style={m.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej. Hacer ejercicio"
            autoFocus
          />
        </div>

        <div style={m.field}>
          <label style={m.label}>Descripción</label>
          <textarea
            style={{ ...m.input, minHeight: 70, resize: 'vertical' }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ej. 30 minutos de cardio"
          />
        </div>

        <div style={m.field}>
          <label style={m.label}>Frecuencia</label>
          <select style={m.input} value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="daily">📅 Diario</option>
            <option value="weekly">📆 Semanal</option>
            <option value="monthly">🗓️ Mensual</option>
          </select>
        </div>

        <div style={m.field}>
          <label style={m.label}>⏰ Recordatorio (opcional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...m.input, width: '50%' }}
              type="number"
              min="0" max="23"
              placeholder="Hora (0-23)"
              value={reminderHour}
              onChange={e => setReminderHour(e.target.value)}
            />
            <input
              style={{ ...m.input, width: '50%' }}
              type="number"
              min="0" max="59"
              placeholder="Minuto (0-59)"
              value={reminderMinute}
              onChange={e => setReminderMinute(e.target.value)}
            />
          </div>
        </div>

        <div style={m.actions}>
          <button style={m.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={m.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ name, onClose, onConfirm }) {
  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ color: '#003087', margin: '8px 0' }}>¿Eliminar hábito?</h2>
          <p style={{ color: '#666' }}>Se eliminará <strong>"{name}"</strong> permanentemente.</p>
        </div>
        <div style={m.actions}>
          <button style={m.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={{ ...m.saveBtn, backgroundColor: '#dc2626' }} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function HabitCard({ habit, selectedDate, onToggle, onEdit, onDelete, onProgress, onHistory }) {
  const history = habit.completionHistory || []
  const dateStr = toDateStr(selectedDate)
  const completed = history.includes(dateStr)
  const isPast = !isFuture(selectedDate)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ ...c.card, ...(completed ? c.cardDone : {}) }}>
      <div style={c.cardTop}>        <button
          style={{ ...c.checkbox, ...(completed ? c.checkboxDone : {}), ...((!isPast) ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
          onClick={() => isPast && onToggle(habit.id, !completed, dateStr)}
          disabled={!isPast}
          title={!isPast ? 'No puedes marcar fechas futuras' : ''}
        >
          {completed ? '✓' : ''}
        </button>
        <div style={c.cardInfo}>
          <div style={c.cardName(completed)}>{habit.name}</div>
          {habit.description && <div style={c.cardDesc}>{habit.description}</div>}
        </div>
        <div style={{ position: 'relative' }}>
          <button style={c.menuBtn} onClick={() => setMenuOpen(v => !v)}>⋮</button>
          {menuOpen && (
            <div style={c.dropdown} onMouseLeave={() => setMenuOpen(false)}>
              <button style={c.dropItem} onClick={() => { setMenuOpen(false); onEdit(habit) }}>✏️ Editar</button>
              <button style={c.dropItem} onClick={() => { setMenuOpen(false); onProgress(habit) }}>📊 Progreso</button>
              <button style={c.dropItem} onClick={() => { setMenuOpen(false); onHistory(habit) }}>📋 Historial</button>
              <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <button style={{ ...c.dropItem, color: '#dc2626' }} onClick={() => { setMenuOpen(false); onDelete(habit) }}>🗑️ Eliminar</button>
            </div>
          )}
        </div>
      </div>
      <div style={c.chips}>
        <span style={c.chip('#fff7ed', '#ea580c')}>🔥 {habit.streak || 0} días</span>
        <span style={c.chip('#f0fdf4', '#16a34a')}>✓ {habit.progress || 0} total</span>
        {habit.reminderHour != null && (
          <span style={c.chip('#eff6ff', '#2563eb')}>
            ⏰ {String(habit.reminderHour).padStart(2,'0')}:{String(habit.reminderMinute||0).padStart(2,'0')}
          </span>
        )}
        <span style={{ ...c.chip('#f8fafc', '#64748b'), marginLeft: 'auto' }}>
          {FREQ_LABELS[habit.frequency] || habit.frequency}
        </span>
      </div>
    </div>
  )
}

function StatsTab({ habits }) {
  if (!habits.length) return (
    <div style={s.empty}>
      <div style={{ fontSize: 64 }}>📊</div>
      <h3 style={s.emptyTitle}>Sin estadísticas</h3>
      <p style={s.emptyText}>Crea hábitos para ver tu progreso</p>
    </div>
  )

  const totalCompleted = habits.reduce((acc, h) => acc + (h.progress || 0), 0)
  const totalStreak = habits.reduce((acc, h) => acc + (h.streak || 0), 0)
  const bestStreak = Math.max(...habits.map(h => h.bestStreak || 0), 0)

  return (
    <div style={s.container}>
      <h3 style={s.sectionTitle}>Resumen General</h3>
      <div style={s.grid}>
        <StatCard icon="❤️" label="Hábitos Activos" value={habits.length} color="#ec4899" />
        <StatCard icon="✅" label="Total Completados" value={totalCompleted} color="#16a34a" />
        <StatCard icon="🔥" label="Racha Combinada" value={`${totalStreak} días`} color="#ea580c" />
        <StatCard icon="🏆" label="Mejor Racha" value={`${bestStreak} días`} color="#d97706" />
      </div>

      <h3 style={{ ...s.sectionTitle, marginTop: 32 }}>Progreso por Hábito</h3>
      {habits.map(h => (
        <div key={h.id} style={s.habitRow}>
          <div style={s.habitRowName}>{h.name}</div>
          <div style={s.habitRowStats}>
            <span style={s.miniStat('#16a34a')}>✓ {h.progress || 0}</span>
            <span style={s.miniStat('#ea580c')}>🔥 {h.streak || 0}</span>
            <span style={s.miniStat('#d97706')}>🏆 {h.bestStreak || 0}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

// ─── Main Dashboard
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('habits') // 'habits' | 'stats'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [modalHabit, setModalHabit] = useState(null) // null=closed, {}=new, {id,...}=edit
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchHabits = useCallback(async () => {
    try {
      const data = await getHabits()
      setHabits(Array.isArray(data) ? data : [])
    } catch { setHabits([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSaveHabit = async (data) => {
    if (modalHabit?.id) {
      await updateHabit(modalHabit.id, data)
    } else {
      await createHabit(data)
    }
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

  // Generar los últimos 7 días + 7 próximos para el calendario
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 7 + i)
    return d
  })

  const today = new Date()
  const formattedDate = `${today.getDate()} de ${MONTHS[today.getMonth()]} ${today.getFullYear()}`

  return (
    <div style={d.page}>
      <header style={d.header}>
        <div style={d.headerLeft}>
          <span style={d.logo}>🎓</span>
          <div>
            <div style={d.appName}>Control Hábitos</div>
            <div style={d.unicah}>UNICAH</div>
          </div>
        </div>
        <div style={d.headerRight}>
          <button style={d.profileBtn} onClick={() => navigate('/profile')} title="Perfil">
            {user?.photoURL
              ? <img src={user.photoURL} alt="perfil" style={d.avatar} />
              : <span style={d.avatarFallback}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
            }
          </button>
          <button style={d.aiBtn} onClick={() => navigate('/ai')} title="Asistente IA">🤖</button>
          <button style={d.logoutBtn} onClick={handleLogout} title="Cerrar sesión">↩</button>
        </div>
      </header>

      <div style={d.greeting}>
        <h1 style={d.greetTitle}>
          Hola, {user?.displayName?.split(' ')[0] || 'Estudiante'} 👋
        </h1>
        <p style={d.greetDate}>{formattedDate}</p>
      </div>

      <div style={d.tabBar}>
        <button style={d.tab(tab === 'habits')} onClick={() => setTab('habits')}>🏠 Mis Hábitos</button>
        <button style={d.tab(tab === 'stats')} onClick={() => setTab('stats')}>📊 Estadísticas</button>
      </div>

      {tab === 'habits' && (
        <>
          <div style={d.calendarWrap}>
            <div style={d.calHeader}>
              <span style={d.calTitle}>
                {DAYS_SHORT[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </span>
              <button style={d.todayBtn} onClick={() => setSelectedDate(new Date())}>Hoy</button>
            </div>
            <div style={d.calStrip}>
              {calendarDays.map((day, i) => {
                const selected = isSameDay(day, selectedDate)
                const todayDay = isToday(day)
                const future = isFuture(day)
                return (
                  <button
                    key={i}
                    style={d.dayBtn(selected, todayDay, future)}
                    onClick={() => !future && setSelectedDate(new Date(day))}
                    disabled={future}
                  >
                    <span style={d.dayName(selected, future)}>{DAYS_SHORT[day.getDay()]}</span>
                    <span style={d.dayNum(selected, future)}>{day.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={d.content}>
            {loading ? (
              <div style={d.center}><div style={d.spinner} /></div>
            ) : habits.length === 0 ? (
              <div style={d.emptyState}>
                <div style={{ fontSize: 72, marginBottom: 16 }}>🌱</div>
                <h3 style={{ color: '#003087', margin: '0 0 8px' }}>¡Bienvenido!</h3>
                <p style={{ color: '#666', margin: '0 0 24px' }}>Crea tu primer hábito para comenzar</p>
                <button style={d.addBtnLarge} onClick={() => setModalHabit({})}>
                  ➕ Crear Hábito
                </button>
              </div>
            ) : (
              habits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  selectedDate={selectedDate}
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
        <div style={d.content}>
          <StatsTab habits={habits} />
        </div>
      )}

      {modalHabit !== null && (
        <HabitModal
          habit={modalHabit.id ? modalHabit : null}
          onClose={() => setModalHabit(null)}
          onSave={handleSaveHabit}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

// Estilos

const d = {
  page: { minHeight: '100vh', backgroundColor: '#f0f4ff', fontFamily: 'system-ui, sans-serif', paddingBottom: 80 },
  header: { backgroundColor: '#003087', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 28 },
  appName: { color: 'white', fontWeight: 'bold', fontSize: 16, lineHeight: 1 },
  unicah: { color: '#C8A84B', fontSize: 12, fontWeight: 'bold' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  profileBtn: { background: 'none', border: '2px solid #C8A84B', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', overflow: 'hidden', padding: 0 },
  avatar: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarFallback: { color: '#C8A84B', fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  aiBtn: { background: 'rgba(200,168,75,0.2)', border: '1px solid #C8A84B', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18 },
  logoutBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18, color: 'white' },
  greeting: { padding: '20px 20px 8px', background: 'linear-gradient(135deg, #003087 0%, #0057B8 100%)', color: 'white' },
  greetTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  greetDate: { margin: '4px 0 0', fontSize: 14, opacity: 0.8 },
  tabBar: { display: 'flex', backgroundColor: '#0057B8', padding: '0 20px' },
  tab: (active) => ({ flex: 1, padding: '12px 8px', border: 'none', background: 'none', color: active ? '#C8A84B' : 'rgba(255,255,255,0.7)', fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer', borderBottom: active ? '3px solid #C8A84B' : '3px solid transparent', transition: 'all 0.2s' }),
  calendarWrap: { backgroundColor: 'white', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calTitle: { fontWeight: 600, color: '#003087', fontSize: 15 },
  todayBtn: { background: 'none', border: '1px solid #0057B8', color: '#0057B8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13 },
  calStrip: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 },
  dayBtn: (selected, today, future) => ({
    minWidth: 52, height: 64, borderRadius: 12, border: today && !selected ? '2px solid #003087' : '2px solid transparent',
    background: selected ? '#003087' : 'transparent', cursor: future ? 'not-allowed' : 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 4px', flexShrink: 0,
    opacity: future ? 0.4 : 1, transition: 'all 0.15s'
  }),
  dayName: (selected, future) => ({ fontSize: 11, color: selected ? 'rgba(255,255,255,0.8)' : future ? '#aaa' : '#6b7280' }),
  dayNum: (selected, future) => ({ fontSize: 20, fontWeight: 700, color: selected ? 'white' : future ? '#aaa' : '#111827' }),
  content: { padding: '16px 16px 0' },
  center: { display: 'flex', justifyContent: 'center', padding: 40 },
  spinner: { width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid #003087', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  addBtnLarge: { backgroundColor: '#003087', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  fab: { position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', backgroundColor: '#003087', color: 'white', fontSize: 28, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,48,135,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, transition: 'transform 0.15s', lineHeight: 1 },
}

const c = {
  card: { backgroundColor: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '2px solid transparent', transition: 'all 0.2s' },
  cardDone: { border: '2px solid #16a34a', backgroundColor: '#f0fdf4' },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  checkbox: { width: 28, height: 28, borderRadius: 8, border: '2px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', color: 'white', fontWeight: 'bold' },
  checkboxDone: { background: '#16a34a', border: '2px solid #16a34a' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: (done) => ({ fontSize: 16, fontWeight: 600, color: done ? '#6b7280' : '#111827', textDecoration: done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  menuBtn: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', padding: '0 4px', lineHeight: 1 },
  dropdown: { position: 'absolute', right: 0, top: '100%', backgroundColor: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 160, zIndex: 200, overflow: 'hidden', border: '1px solid #f3f4f6' },
  dropItem: { display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#374151', transition: 'background 0.1s' },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  chip: (bg, color) => ({ backgroundColor: bg, color, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }),
}

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { backgroundColor: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalIcon: { fontSize: 28 },
  modalTitle: { color: '#003087', margin: 0, fontSize: 20 },
  error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  actions: { display: 'flex', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e0e0e0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  saveBtn: { flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#003087', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
}

const s = {
  container: { padding: '0 0 20px' },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#003087', margin: '0 0 16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  statCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  statValue: { fontSize: 28, fontWeight: 800, margin: '8px 0 4px' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
  habitRow: { backgroundColor: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  habitRowName: { fontWeight: 600, color: '#111827', fontSize: 15, marginBottom: 8 },
  habitRowStats: { display: 'flex', gap: 12 },
  miniStat: (color) => ({ fontSize: 13, color, fontWeight: 600 }),
  empty: { textAlign: 'center', padding: '60px 20px' },
  emptyTitle: { fontSize: 20, color: '#003087', margin: '8px 0 4px' },
  emptyText: { color: '#6b7280', margin: 0 },
}