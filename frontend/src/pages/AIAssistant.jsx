import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { colors } from '../utils/theme'
import { getToken } from '../services/authService'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, setDoc, getDoc, deleteDoc, limit } from 'firebase/firestore'
import { createHabit } from '../services/habitService'

const API = import.meta.env.VITE_API_URL

const getHeaders = async () => {
  const token = await getToken()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

const TABS = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'analyze', icon: '📊', label: 'Análisis' },
  { id: 'suggest', icon: '💡', label: 'Sugerencias' },
  { id: 'routine', icon: '📅', label: 'Rutina' },
]

const CARRERAS = ['Ingeniería en Sistemas','Administración de Empresas','Medicina','Derecho','Psicología','Arquitectura','Contaduría Pública','Marketing','Enfermería','Otra']

// Modal de confirmación personalizado
function ConfirmModal({ message, onConfirm, onCancel, dark, clr }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 20, padding: 28, maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <p style={{ color: clr.text, fontSize: 16, textAlign: 'center', margin: '0 0 24px', fontWeight: 500 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${clr.divider}`, background: clr.inputBg, color: clr.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#dc2626', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function MarkdownText({ text, clr }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const parts = line.split(/\*\*(.+?)\*\*/g)
        const rendered = parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)
        if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '12px 0 4px', color: clr.accent, fontSize: 16 }}>{line.slice(2)}</h2>
        if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '10px 0 4px', color: '#0057B8', fontSize: 15 }}>{line.slice(3)}</h3>
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ display: 'flex', gap: 6, margin: '2px 0', color: clr.text }}><span>•</span><span>{rendered.slice(1)}</span></div>
        if (line.match(/^\d+\./)) return <div key={i} style={{ margin: '4px 0', color: clr.text }}>{rendered}</div>
        if (line.trim() === '') return <br key={i} />
        return <p key={i} style={{ margin: '4px 0', color: clr.text }}>{rendered}</p>
      })}
    </div>
  )
}

function ChatTab({ clr, dark }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return
      try {
        const q = query(collection(db, 'users', user.uid, 'chat_history'), orderBy('createdAt', 'asc'), limit(50))
        const snapshot = await getDocs(q)
        const history = snapshot.docs.map(d => ({ ...d.data(), _id: d.id }))
        setMessages(history.length > 0 ? history : [{ role: 'assistant', content: '¡Hola! 👋 Soy tu asistente de hábitos de la UNICAH. ¿En qué puedo ayudarte hoy?' }])
      } catch {
        setMessages([{ role: 'assistant', content: '¡Hola! 👋 Soy tu asistente de hábitos de la UNICAH. ¿En qué puedo ayudarte hoy?' }])
      }
      setLoadingHistory(false)
    }
    loadHistory()
  }, [user])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const saveMessage = async (msg) => {
    if (!user) return
    try { await addDoc(collection(db, 'users', user.uid, 'chat_history'), { ...msg, createdAt: serverTimestamp() }) } catch {}
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    await saveMessage(userMsg)
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/chat`, { method: 'POST', headers, body: JSON.stringify({ mensaje: msg, historial: messages.slice(-10) }) })
      const data = await res.json()
      const assistantMsg = { role: 'assistant', content: data.result || 'Error al obtener respuesta.' }
      setMessages(prev => [...prev, assistantMsg])
      await saveMessage(assistantMsg)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión.' }])
    }
    setLoading(false)
  }

  const handleClearHistory = async () => {
    if (!user) return
    try {
      const q = query(collection(db, 'users', user.uid, 'chat_history'))
      const snapshot = await getDocs(q)
      await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)))
      setMessages([{ role: 'assistant', content: '¡Historial limpiado! 🧹 ¿En qué puedo ayudarte?' }])
    } catch (e) {
      console.error('Error al limpiar historial:', e)
    }
    setShowConfirm(false)
  }

  if (loadingHistory) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTop: '3px solid #003087', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message="¿Borrar todo el historial del chat? Esta acción no se puede deshacer."
          clr={clr}
          dark={dark}
          onConfirm={handleClearHistory}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0', backgroundColor: clr.pageBg }}>
          <button onClick={() => setShowConfirm(true)} style={{ background: 'none', border: `1px solid ${clr.divider}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: clr.textMuted, cursor: 'pointer' }}>
            🗑️ Limpiar historial
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#003087', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>🤖</div>
              )}
              <div style={msg.role === 'user'
                ? { maxWidth: '75%', backgroundColor: '#003087', color: 'white', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 14, lineHeight: 1.5 }
                : { maxWidth: '80%', backgroundColor: clr.cardBg, padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontSize: 14, lineHeight: 1.6, boxShadow: clr.shadowCard }
              }>
                {msg.role === 'assistant' ? <MarkdownText text={msg.content} clr={clr} /> : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#003087', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div style={{ backgroundColor: clr.cardBg, padding: '14px 18px', borderRadius: '18px 18px 18px 4px', boxShadow: clr.shadowCard }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#003087', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', backgroundColor: clr.cardBg, borderTop: `1px solid ${clr.divider}` }}>
          <input style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', background: clr.inputBg, color: clr.text }}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Escribe tu mensaje..." disabled={loading} />
          <button style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#003087', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onClick={handleSend} disabled={loading || !input.trim()}>➤</button>
        </div>
      </div>
    </>
  )
}

function AnalyzeTab({ clr, dark }) {
  const { user } = useAuth()
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'ai_data', 'last_analysis'))
        if (snap.exists()) setLastAnalysis(snap.data())
      } catch {}
    }
    load()
  }, [user])

  const handleAnalyze = async () => {
    setLoading(true); setResult('')
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/analyze`, { method: 'POST', headers })
      const data = await res.json()
      const analysis = data.result || 'Sin resultado.'
      setResult(analysis)
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'ai_data', 'last_analysis'), { result: analysis, date: new Date().toISOString() })
        setLastAnalysis({ result: analysis, date: new Date().toISOString() })
      }
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }

  const handleClear = async () => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'ai_data', 'last_analysis'))
      setLastAnalysis(null)
      setResult('')
    } catch {}
    setShowConfirm(false)
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {showConfirm && (
        <ConfirmModal message="¿Borrar el análisis guardado?" clr={clr} dark={dark} onConfirm={handleClear} onCancel={() => setShowConfirm(false)} />
      )}
      <div style={{ padding: 16, overflowY: 'auto' }}>
        <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📊</div>
          <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Análisis de Productividad</h3>
          {lastAnalysis?.date && <p style={{ color: clr.textMuted, fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>Último análisis: {fmt(lastAnalysis.date)}</p>}
          <p style={{ color: clr.textMuted, fontSize: 14, lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>La IA analizará todos tus hábitos y te dará retroalimentación personalizada.</p>
          <button style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', backgroundColor: '#003087', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: lastAnalysis ? 8 : 0 }} onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analizando...' : lastAnalysis ? '🔄 Analizar de nuevo' : '🔍 Analizar mis hábitos'}
          </button>
          {lastAnalysis && (
            <button onClick={() => setShowConfirm(true)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: `1px solid ${clr.divider}`, background: 'none', color: clr.textMuted, fontSize: 13, cursor: 'pointer' }}>
              🗑️ Borrar análisis guardado
            </button>
          )}
        </div>
        {loading && <div style={{ backgroundColor: clr.inputBg, borderRadius: 12, padding: '14px 16px', color: clr.accent, textAlign: 'center', marginBottom: 16 }}>⏳ Procesando...</div>}
        {result && !loading && <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard, marginBottom: 16 }}><MarkdownText text={result} clr={clr} /></div>}
        {!result && !loading && lastAnalysis?.result && (
          <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard }}>
            <p style={{ color: clr.textMuted, fontSize: 12, margin: '0 0 12px' }}>📅 Análisis del {fmt(lastAnalysis.date)}</p>
            <MarkdownText text={lastAnalysis.result} clr={clr} />
          </div>
        )}
      </div>
    </>
  )
}

function SuggestTab({ clr, dark }) {
  const [carrera, setCarrera] = useState('')
  const [situacion, setSituacion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [adding, setAdding] = useState({})
  const [added, setAdded] = useState({})
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: clr.inputBg, color: clr.text }

  const handleSuggest = async () => {
    if (!carrera || !situacion.trim()) return alert('Completa los campos')
    setLoading(true); setResult(''); setSuggestions([]); setAdded({})
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/suggest`, { method: 'POST', headers, body: JSON.stringify({ carrera, situacion }) })
      const data = await res.json()
      const text = data.result || 'Sin resultado.'
      setResult(text)
      // Solo captura las líneas numeradas principales
      const lines = text.split('\n').filter(l => l.match(/^\d+\.\s+\*{0,2}[A-ZÁÉÍÓÚ]/))
      setSuggestions(lines.slice(0, 5))
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }

  const handleAddHabit = async (suggestion, index) => {
    setAdding(prev => ({ ...prev, [index]: true }))
    try {
      const name = suggestion
        .replace(/^\d+\.\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .split(/[:–\-]/)[0]
        .trim()
        .slice(0, 50)
      await createHabit({ name, description: '', frequency: 'daily' })
      setAdded(prev => ({ ...prev, [index]: true }))
    } catch {}
    setAdding(prev => ({ ...prev, [index]: false }))
  }

  return (
    <div style={{ padding: 16, overflowY: 'auto' }}>
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>💡</div>
        <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Sugeridor de Hábitos</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>Carrera</label>
          <select style={inputStyle} value={carrera} onChange={e => setCarrera(e.target.value)}>
            <option value="">Selecciona tu carrera</option>
            {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>¿Cuál es tu situación actual?</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={situacion} onChange={e => setSituacion(e.target.value)} placeholder="Ej: Tengo exámenes la próxima semana..." />
        </div>
        <button style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', backgroundColor: '#003087', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={handleSuggest} disabled={loading}>
          {loading ? 'Generando...' : '✨ Sugerir hábitos'}
        </button>
      </div>
      {loading && <div style={{ backgroundColor: clr.inputBg, borderRadius: 12, padding: '14px 16px', color: clr.accent, textAlign: 'center', marginBottom: 16 }}>⏳ Generando sugerencias...</div>}
      {result && !loading && (
        <>
          <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard, marginBottom: 16 }}>
            <MarkdownText text={result} clr={clr} />
          </div>
          {suggestions.length > 0 && (
            <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 16, boxShadow: clr.shadowCard }}>
              <p style={{ color: clr.textMuted, fontSize: 13, margin: '0 0 12px', fontWeight: 600 }}>➕ Agregar hábito al dashboard:</p>
              {suggestions.map((s, i) => {
                const name = s.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').split(/[:–\-]/)[0].trim().slice(0, 40)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < suggestions.length - 1 ? `1px solid ${clr.divider}` : 'none' }}>
                    <span style={{ fontSize: 13, color: clr.text, flex: 1, marginRight: 8 }}>{name}</span>
                    <button onClick={() => handleAddHabit(s, i)} disabled={adding[i] || added[i]}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: added[i] ? '#16a34a' : '#003087', color: 'white', fontSize: 12, fontWeight: 600, cursor: added[i] ? 'default' : 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                      {adding[i] ? '...' : added[i] ? '✓ Agregado' : '+ Agregar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

function RoutineTab({ clr, dark }) {
  const { user } = useAuth()
  const [carrera, setCarrera] = useState('')
  const [trimestre, setTrimestre] = useState('1')
  const [diasLibres, setDiasLibres] = useState([])
  const [objetivos, setObjetivos] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedRoutine, setSavedRoutine] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: clr.inputBg, color: clr.text }

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'ai_data', 'routine'))
        if (snap.exists()) setSavedRoutine(snap.data())
      } catch {}
    }
    load()
  }, [user])

  const toggleDia = (dia) => setDiasLibres(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])

  const handleGenerate = async () => {
    if (!carrera || !objetivos.trim()) return alert('Completa los campos requeridos')
    setLoading(true); setResult('')
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/routine`, { method: 'POST', headers, body: JSON.stringify({ carrera, trimestre, diasLibres, objetivos }) })
      const data = await res.json()
      const routine = data.result || 'Sin resultado.'
      setResult(routine)
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'ai_data', 'routine'), { result: routine, carrera, trimestre, date: new Date().toISOString() })
        setSavedRoutine({ result: routine, carrera, trimestre, date: new Date().toISOString() })
      }
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }

  const handleClear = async () => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'ai_data', 'routine'))
      setSavedRoutine(null)
      setResult('')
    } catch {}
    setShowConfirm(false)
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'long' })

  return (
    <>
      {showConfirm && (
        <ConfirmModal message="¿Borrar la rutina guardada?" clr={clr} dark={dark} onConfirm={handleClear} onCancel={() => setShowConfirm(false)} />
      )}
      <div style={{ padding: 16, overflowY: 'auto' }}>
        <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📅</div>
          <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Generador de Rutina Semanal</h3>
          {savedRoutine?.date && !result && <p style={{ color: clr.textMuted, fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>Última rutina: {fmt(savedRoutine.date)} — {savedRoutine.carrera}</p>}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>Carrera *</label>
            <select style={inputStyle} value={carrera} onChange={e => setCarrera(e.target.value)}>
              <option value="">Selecciona tu carrera</option>
              {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>Trimestre</label>
            <select style={inputStyle} value={trimestre} onChange={e => setTrimestre(e.target.value)}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}°</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>Días con más tiempo libre</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIAS.map(dia => (
                <button key={dia} onClick={() => toggleDia(dia)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${diasLibres.includes(dia) ? '#003087' : (dark ? '#334155' : '#d1d5db')}`, background: diasLibres.includes(dia) ? '#003087' : clr.inputBg, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: diasLibres.includes(dia) ? 'white' : clr.text }}>
                  {dia.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>Objetivos *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={objetivos} onChange={e => setObjetivos(e.target.value)} placeholder="Ej: Mejorar mis notas, hacer ejercicio 3 veces..." />
          </div>
          <button style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', backgroundColor: '#003087', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: savedRoutine ? 8 : 0 }} onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generando...' : savedRoutine ? '🔄 Generar nueva rutina' : '📅 Generar rutina'}
          </button>
          {savedRoutine && (
            <button onClick={() => setShowConfirm(true)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: `1px solid ${clr.divider}`, background: 'none', color: clr.textMuted, fontSize: 13, cursor: 'pointer' }}>
              🗑️ Borrar rutina guardada
            </button>
          )}
        </div>
        {loading && <div style={{ backgroundColor: clr.inputBg, borderRadius: 12, padding: '14px 16px', color: clr.accent, textAlign: 'center', marginBottom: 16 }}>⏳ Creando tu rutina personalizada...</div>}
        {(result || (!result && !loading && savedRoutine?.result)) && (
          <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard }}>
            {!result && savedRoutine?.date && <p style={{ color: clr.textMuted, fontSize: 12, margin: '0 0 12px' }}>📅 Rutina guardada del {fmt(savedRoutine.date)}</p>}
            <MarkdownText text={result || savedRoutine.result} clr={clr} />
            <button onClick={() => { navigator.clipboard.writeText(result || savedRoutine.result); alert('¡Rutina copiada!') }}
              style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${clr.divider}`, background: clr.inputBg, color: clr.text, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
              📋 Copiar rutina
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('chat')
  const navigate = useNavigate()
  const { dark } = useTheme()
  const clr = colors(dark)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: clr.pageBg, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: '#003087', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14 }} onClick={() => navigate('/dashboard')}>← Volver</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: 16, lineHeight: 1 }}>Asistente IA</div>
            <div style={{ color: '#C8A84B', fontSize: 12, fontWeight: 'bold' }}>UNICAH</div>
          </div>
        </div>
        <div style={{ width: 64 }} />
      </header>
      <div style={{ display: 'flex', backgroundColor: '#0057B8' }}>
        {TABS.map(tab => (
          <button key={tab.id}
            style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'none', color: activeTab === tab.id ? '#C8A84B' : 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 18, borderBottom: activeTab === tab.id ? '3px solid #C8A84B' : '3px solid transparent', transition: 'all 0.2s' }}
            onClick={() => setActiveTab(tab.id)}>
            <span>{tab.icon}</span>
            <span style={{ fontSize: 12 }}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && <ChatTab clr={clr} dark={dark} />}
        {activeTab === 'analyze' && <AnalyzeTab clr={clr} dark={dark} />}
        {activeTab === 'suggest' && <SuggestTab clr={clr} dark={dark} />}
        {activeTab === 'routine' && <RoutineTab clr={clr} dark={dark} />}
      </div>
    </div>
  )
}