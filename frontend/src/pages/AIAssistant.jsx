import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { colors } from '../utils/theme'
import { getToken } from '../services/authService'

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
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! 👋 Soy tu asistente de hábitos de la UNICAH. Puedo ayudarte con tus hábitos académicos y personales. ¿En qué puedo ayudarte hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/chat`, { method: 'POST', headers, body: JSON.stringify({ mensaje: msg, historial: messages }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.result || 'Error al obtener respuesta.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión. Verifica que el backend esté corriendo.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
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
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#003087', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', backgroundColor: clr.cardBg, borderTop: `1px solid ${clr.divider}` }}>
        <input
          style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', background: clr.inputBg, color: clr.text }}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Escribe tu mensaje..." disabled={loading}
        />
        <button style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#003087', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onClick={handleSend} disabled={loading || !input.trim()}>➤</button>
      </div>
    </div>
  )
}

function ResultBox({ clr, result, loading, loadingText }) {
  if (loading) return <div style={{ backgroundColor: dark ? '#1e293b' : '#eff6ff', borderRadius: 12, padding: '14px 16px', color: '#0057B8', textAlign: 'center', marginBottom: 16 }}>⏳ {loadingText}</div>
  if (result) return (
    <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard, fontSize: 14, lineHeight: 1.7 }}>
      <MarkdownText text={result} clr={clr} />
    </div>
  )
  return null
}

function AnalyzeTab({ clr }) {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const handleAnalyze = async () => {
    setLoading(true); setResult('')
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/analyze`, { method: 'POST', headers })
      const data = await res.json()
      setResult(data.result || 'Sin resultado.')
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }
  return (
    <div style={{ padding: 16, overflowY: 'auto' }}>
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📊</div>
        <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Análisis de Productividad</h3>
        <p style={{ color: clr.textMuted, fontSize: 14, lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>La IA analizará todos tus hábitos y te dará retroalimentación personalizada.</p>
        <button style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', backgroundColor: '#003087', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analizando...' : '🔍 Analizar mis hábitos'}
        </button>
      </div>
      {loading && <div style={{ backgroundColor: clr.inputBg, borderRadius: 12, padding: '14px 16px', color: clr.accent, textAlign: 'center', marginBottom: 16, border: `1px solid ${clr.cardBorder}` }}>⏳ Procesando tu información...</div>}
      {result && !loading && <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard }}><MarkdownText text={result} clr={clr} /></div>}
    </div>
  )
}

function SuggestTab({ clr, dark }) {
  const [carrera, setCarrera] = useState('')
  const [situacion, setSituacion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: clr.inputBg, color: clr.text }
  const handleSuggest = async () => {
    if (!carrera || !situacion.trim()) return alert('Completa los campos')
    setLoading(true); setResult('')
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/suggest`, { method: 'POST', headers, body: JSON.stringify({ carrera, situacion }) })
      const data = await res.json()
      setResult(data.result || 'Sin resultado.')
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }
  return (
    <div style={{ padding: 16, overflowY: 'auto' }}>
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>💡</div>
        <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Sugeridor de Hábitos</h3>
        <p style={{ color: clr.textMuted, fontSize: 14, lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>Cuéntanos tu carrera y situación y la IA te sugerirá hábitos personalizados.</p>
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
      {result && !loading && <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard }}><MarkdownText text={result} clr={clr} /></div>}
    </div>
  )
}

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

function RoutineTab({ clr, dark }) {
  const [carrera, setCarrera] = useState('')
  const [trimestre, setTrimestre] = useState('1')
  const [diasLibres, setDiasLibres] = useState([])
  const [objetivos, setObjetivos] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${dark ? '#334155' : '#e0e0e0'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: clr.inputBg, color: clr.text }
  const toggleDia = (dia) => setDiasLibres(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])
  const handleGenerate = async () => {
    if (!carrera || !objetivos.trim()) return alert('Completa los campos requeridos')
    setLoading(true); setResult('')
    try {
      const headers = await getHeaders()
      const res = await fetch(`${API}/ai/routine`, { method: 'POST', headers, body: JSON.stringify({ carrera, trimestre, diasLibres, objetivos }) })
      const data = await res.json()
      setResult(data.result || 'Sin resultado.')
    } catch { setResult('❌ Error al conectar con el servidor.') }
    setLoading(false)
  }
  return (
    <div style={{ padding: 16, overflowY: 'auto' }}>
      <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: clr.shadowCard }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>📅</div>
        <h3 style={{ color: clr.accent, fontSize: 17, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Generador de Rutina Semanal</h3>
        <p style={{ color: clr.textMuted, fontSize: 14, lineHeight: 1.6, textAlign: 'center', margin: '0 0 16px' }}>La IA creará una rutina semanal personalizada para ti.</p>
        {[['Carrera *', <select style={inputStyle} value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Selecciona tu carrera</option>{CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}</select>],
          ['Trimestre', <select style={inputStyle} value={trimestre} onChange={e => setTrimestre(e.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}°</option>)}</select>]
        ].map(([label, input]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: clr.textLabel, marginBottom: 6 }}>{label}</label>
            {input}
          </div>
        ))}
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
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={objetivos} onChange={e => setObjetivos(e.target.value)} placeholder="Ej: Mejorar mis notas, hacer ejercicio 3 veces por semana..." />
        </div>
        <button style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', backgroundColor: '#003087', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generando...' : '📅 Generar rutina'}
        </button>
      </div>
      {loading && <div style={{ backgroundColor: clr.inputBg, borderRadius: 12, padding: '14px 16px', color: clr.accent, textAlign: 'center', marginBottom: 16 }}>⏳ Creando tu rutina personalizada...</div>}
      {result && !loading && <div style={{ backgroundColor: clr.cardBg, borderRadius: 16, padding: 20, boxShadow: clr.shadowCard }}><MarkdownText text={result} clr={clr} /></div>}
    </div>
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