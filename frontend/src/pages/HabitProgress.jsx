import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { colors } from '../utils/theme'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function HabitProgress() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { dark } = useTheme()
  const clr = colors(dark)
  const habit = state?.habit

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  if (!habit) return (
    <div style={{ minHeight: '100vh', backgroundColor: clr.pageBg, fontFamily: 'system-ui, sans-serif' }}>
      <header style={pr.header}>
        <button style={pr.backBtn} onClick={() => navigate('/dashboard')}>← Volver</button>
        <span style={pr.headerTitle}>Progreso</span>
        <div style={{ width: 80 }} />
      </header>
      <div style={{ textAlign: 'center', padding: '80px 20px', color: clr.textMuted }}>
        <div style={{ fontSize: 64 }}>😕</div>
        <p>No se encontró el hábito.</p>
        <button style={pr.btnBack} onClick={() => navigate('/dashboard')}>Ir al dashboard</button>
      </div>
    </div>
  )

  const history = habit.completionHistory || []
  const calDays = getCalendarDays(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    const isCurrent = viewYear === today.getFullYear() && viewMonth === today.getMonth()
    if (isCurrent) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const completedThisMonth = calDays.filter(day => day && history.includes(toDateStr(viewYear, viewMonth, day))).length
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const completionPct = Math.round((completedThisMonth / daysInMonth) * 100)

  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (27 - i)); return d.toISOString().split('T')[0]
  })

  const todayStr = today.toISOString().split('T')[0]
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: clr.pageBg, fontFamily: 'system-ui, sans-serif', paddingBottom: 32 }}>
      <header style={pr.header}>
        <button style={pr.backBtn} onClick={() => navigate('/dashboard')}>← Volver</button>
        <span style={pr.headerTitle}>📊 Progreso</span>
        <div style={{ width: 80 }} />
      </header>

      <div style={{ backgroundColor: '#0057B8', padding: '20px 16px 24px', color: 'white' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{habit.name}</h2>
        {habit.description && <p style={{ margin: '0 0 12px', opacity: 0.85, fontSize: 14 }}>{habit.description}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['🔥', `Racha: ${habit.streak || 0} días`], ['🏆', `Mejor: ${habit.bestStreak || 0} días`], ['✅', `Total: ${habit.progress || 0}`]].map(([icon, label]) => (
            <span key={label} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{icon} {label}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '16px 16px 0' }}>
        {[['#003087', habit.streak || 0, 'Racha actual'], ['#d97706', habit.bestStreak || 0, 'Mejor racha'], ['#16a34a', habit.progress || 0, 'Total veces'], ['#7c3aed', `${completionPct}%`, 'Este mes']].map(([color, val, lbl]) => (
          <div key={lbl} style={{ backgroundColor: clr.cardBg, borderRadius: 14, padding: '14px 8px', textAlign: 'center', boxShadow: clr.shadowCard }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 11, color: clr.textMuted, marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Heatmap últimas 4 semanas */}
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, margin: '16px 16px 0', padding: 16, boxShadow: clr.shadowCard }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: clr.accent }}>Últimas 4 semanas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: clr.textMuted }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array(new Date(last28[0] + 'T12:00:00').getDay()).fill(null).map((_, i) => (
            <div key={`pad-${i}`} style={{ height: 30, borderRadius: 6, backgroundColor: dark ? '#1e293b' : '#f3f4f6' }} />
          ))}
          {last28.map(date => {
            const done = history.includes(date)
            const isToday = date === todayStr
            return (
              <div key={date} style={{ height: 30, borderRadius: 6, backgroundColor: done ? '#16a34a' : (dark ? '#1e293b' : '#f3f4f6'), border: isToday ? '2px solid #003087' : '2px solid transparent', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={date}>
                {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#003087' }} />}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 8 }}>
          <span style={{ color: clr.textMuted, fontSize: 12 }}>Menos</span>
          {[dark ? '#1e293b' : '#e5e7eb', '#86efac', '#4ade80', '#16a34a', '#166534'].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
          ))}
          <span style={{ color: clr.textMuted, fontSize: 12 }}>Más</span>
        </div>
      </div>

      {/* Calendario mensual */}
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, margin: '16px 16px 0', padding: 16, boxShadow: clr.shadowCard }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button style={{ background: 'none', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 18, color: clr.accent }} onClick={prevMonth}>‹</button>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: clr.accent }}>{MONTHS[viewMonth]} {viewYear}</h3>
          <button style={{ background: 'none', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 18, color: clr.accent, opacity: isCurrentMonth ? 0.3 : 1 }} onClick={nextMonth}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: clr.textMuted, padding: '4px 0', fontWeight: 600 }}>{d}</div>)}
          {calDays.map((day, i) => {
            if (!day) return <div key={`b-${i}`} />
            const dateStr = toDateStr(viewYear, viewMonth, day)
            const done = history.includes(dateStr)
            const isTodayCell = dateStr === todayStr
            const isFutureCell = new Date(dateStr) > today
            return (
              <div key={dateStr} style={{ aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: done ? '#16a34a' : isTodayCell ? (dark ? '#1e3a5f' : '#eff6ff') : 'transparent', border: isTodayCell && !done ? '2px solid #003087' : '2px solid transparent', opacity: isFutureCell ? 0.35 : 1 }}>
                <span style={{ fontSize: 13, fontWeight: done || isTodayCell ? 700 : 400, color: done ? 'white' : isTodayCell ? '#003087' : clr.text }}>{day}</span>
                {done && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ color: clr.textMuted, fontSize: 14 }}>Completado {completedThisMonth} de {daysInMonth} días ({completionPct}%)</span>
        </div>
      </div>
    </div>
  )
}

const pr = {
  header: { backgroundColor: '#003087', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14 },
  headerTitle: { color: 'white', fontWeight: 700, fontSize: 16 },
  btnBack: { marginTop: 16, backgroundColor: '#003087', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontSize: 15 },
}