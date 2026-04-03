import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { colors } from '../utils/theme'

const MONTHS_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAYS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function groupByMonth(dates) {
  const groups = {}
  const sorted = [...dates].sort((a, b) => new Date(b) - new Date(a))
  sorted.forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push({ dateStr, d })
  })
  return groups
}

export default function HabitHistory() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { dark } = useTheme()
  const clr = colors(dark)
  const habit = state?.habit

  if (!habit) return (
    <div style={{ minHeight: '100vh', backgroundColor: clr.pageBg, fontFamily: 'system-ui, sans-serif' }}>
      <header style={h.header}>
        <button style={h.backBtn} onClick={() => navigate('/dashboard')}>← Volver</button>
        <span style={h.headerTitle}>Historial</span>
        <div style={{ width: 80 }} />
      </header>
      <div style={{ textAlign: 'center', padding: '80px 20px', color: clr.textMuted }}>
        <div style={{ fontSize: 64 }}>😕</div>
        <p>No se encontró el hábito.</p>
        <button style={h.btnBack} onClick={() => navigate('/dashboard')}>Ir al dashboard</button>
      </div>
    </div>
  )

  const history = habit.completionHistory || []
  const groups = groupByMonth(history)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: clr.pageBg, fontFamily: 'system-ui, sans-serif', paddingBottom: 32 }}>
      <header style={h.header}>
        <button style={h.backBtn} onClick={() => navigate('/dashboard')}>← Volver</button>
        <span style={h.headerTitle}>📋 Historial</span>
        <button style={h.progressBtn} onClick={() => navigate(`/habits/${habit.id}/progress`, { state: { habit } })}>📊</button>
      </header>

      <div style={{ background: 'linear-gradient(135deg, #003087, #0057B8)', padding: '20px 16px 24px', color: 'white' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{habit.name}</h2>
        {habit.description && <p style={{ margin: '0 0 16px', opacity: 0.85, fontSize: 14 }}>{habit.description}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{history.length}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Completados</span>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{habit.streak || 0}🔥</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Racha actual</span>
          </div>
          <div style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{habit.bestStreak || 0}🏆</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Mejor racha</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: clr.textMuted }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>📭</div>
            <h3 style={{ color: clr.accent, margin: '0 0 8px' }}>Sin registros aún</h3>
            <p style={{ margin: 0 }}>Marca el hábito como completado para verlo aquí</p>
          </div>
        ) : (
          Object.entries(groups).map(([key, entries]) => {
            const [year, month] = key.split('-')
            const monthLabel = `${MONTHS_FULL[parseInt(month) - 1]} ${year}`
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: clr.accent }}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
                  <span style={{ fontSize: 13, color: clr.textMuted, backgroundColor: dark ? '#334155' : '#e5e7eb', padding: '2px 10px', borderRadius: 20 }}>
                    {entries.length} {entries.length === 1 ? 'vez' : 'veces'}
                  </span>
                </div>
                {entries.map(({ dateStr, d }) => {
                  const isTodayEntry = dateStr === today
                  return (
                    <div key={dateStr} style={{
                      backgroundColor: isTodayEntry ? (dark ? '#1e3a5f' : '#eff6ff') : clr.cardBg,
                      border: isTodayEntry ? `2px solid #003087` : `2px solid ${dark ? '#334155' : 'transparent'}`,
                      borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: clr.shadowCard
                    }}>
                      <div style={{ fontSize: 22, flexShrink: 0 }}>{isTodayEntry ? '⭐' : '✅'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: clr.text }}>{DAYS_FULL[d.getDay()]}</div>
                        <div style={{ fontSize: 12, color: clr.textMuted, marginTop: 2 }}>
                          {d.getDate()} de {MONTHS_FULL[d.getMonth()]} {d.getFullYear()}{isTodayEntry ? ' · Hoy' : ''}
                        </div>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>✓</div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const h = {
  header: { backgroundColor: '#003087', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14 },
  headerTitle: { color: 'white', fontWeight: 700, fontSize: 16 },
  progressBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 18 },
  btnBack: { marginTop: 16, backgroundColor: '#003087', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontSize: 15 },
}