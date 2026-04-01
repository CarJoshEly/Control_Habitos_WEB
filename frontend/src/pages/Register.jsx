import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerWithEmail } from '../services/authService'
import { doc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'

export default function Register() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@unicah.edu')) {
      setError('Solo se permite el correo institucional @unicah.edu')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const credential = await registerWithEmail(email, password)
      await credential.user.sendEmailVerification()

      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName,
        email,
        photoUrl: '',
        createdAt: new Date(),
        lastLogin: new Date(),
        notificationsEnabled: true,
      })

      await auth.signOut()
      alert('Cuenta creada. Revisa tu correo @unicah.edu para verificar tu cuenta.')
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Este correo ya está registrado'
      case 'auth/invalid-email': return 'Correo electrónico inválido'
      case 'auth/weak-password': return 'La contraseña es muy débil'
      default: return 'Error al crear la cuenta'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>🎓</div>
          <h1 style={styles.title}>Crear Cuenta</h1>
          <p style={styles.subtitle}>UNICAH</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleRegister} style={styles.form}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="email"
            placeholder="correo@unicah.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p style={styles.loginText}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/" style={styles.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: { fontSize: '48px' },
  title: { color: '#003087', fontSize: '24px', margin: '8px 0 4px' },
  subtitle: { color: '#C8A84B', fontWeight: 'bold', margin: 0 },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  btn: {
    backgroundColor: '#003087',
    color: 'white',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  loginText: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#0057B8',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
}