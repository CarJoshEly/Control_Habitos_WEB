import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerWithEmail } from "../services/authService";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

function TermsModal({ onClose }) {
  return (
    <div style={t.overlay} onClick={onClose}>
      <div style={t.modal} onClick={e => e.stopPropagation()}>
        <div style={t.header}>
          <h2 style={t.title}>📄 Términos y Condiciones</h2>
          <button style={t.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={t.body}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px' }}>Última actualización: Abril 2026</p>
          {[
            ['1. Aceptación de los Términos', 'Al registrarte y usar Control Hábitos UNICAH, aceptas estos términos. Si no estás de acuerdo, no utilices la aplicación.'],
            ['2. Uso de la Aplicación', 'Esta aplicación está diseñada exclusivamente para estudiantes de la Universidad Católica de Honduras (UNICAH). Solo se permite el registro con correos institucionales @unicah.edu.'],
            ['3. Datos Personales', 'Los datos que registres (hábitos, progreso, perfil) se almacenan de forma segura en Firebase y se usan únicamente para el funcionamiento de la aplicación. No compartimos tu información con terceros.'],
            ['4. Automatizaciones (Zapier)', 'La aplicación puede enviar notificaciones y reportes automáticos a tu correo institucional mediante Zapier. Puedes desactivar las notificaciones en cualquier momento desde tu perfil.'],
            ['5. Inteligencia Artificial', 'Las sugerencias, análisis y rutinas generadas por la IA son orientativas. No reemplazan el consejo de profesionales de salud o educación.'],
            ['6. Responsabilidad del Usuario', 'Eres responsable de mantener la confidencialidad de tu cuenta. No compartas tu contraseña ni uses la cuenta de otro usuario.'],
            ['7. Modificaciones', 'UNICAH se reserva el derecho de actualizar estos términos. Los cambios serán notificados dentro de la aplicación.'],
            ['8. Contacto', 'Para dudas sobre estos términos, contacta al equipo de desarrollo a través de tu correo institucional.'],
          ].map(([title, text]) => (
            <div key={title} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#003087', fontSize: 14, marginBottom: 6 }}>{title}</div>
              <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
        <button style={t.acceptBtn} onClick={onClose}>Entendido</button>
      </div>
    </div>
  )
}

export default function Register() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!acceptedTerms) { setError("Debes aceptar los Términos y Condiciones para registrarte"); return; }
    if (!email.endsWith("@unicah.edu")) { setError("Solo se permite el correo institucional @unicah.edu"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }

    setLoading(true);
    try {
      const credential = await registerWithEmail(email, password);
      await setDoc(doc(db, "users", credential.user.uid), {
        displayName, email, photoUrl: "", createdAt: new Date(), lastLogin: new Date(), notificationsEnabled: true,
      });
      const token = await credential.user.getIdToken();
      await fetch("http://localhost:3000/api/zapier/new-user-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      try { await credential.user.sendEmailVerification(); } catch {}
      await auth.signOut();
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case "auth/email-already-in-use": return "Este correo ya está registrado.";
      case "auth/invalid-email": return "Correo electrónico inválido";
      case "auth/weak-password": return "La contraseña es muy débil";
      default: return `Error al crear la cuenta (${code})`;
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={{ fontSize: 48 }}>🎓</div>
          <h1 style={{ color: "#003087", fontSize: "24px", margin: "8px 0 4px" }}>Crear Cuenta</h1>
          <p style={{ color: "#C8A84B", fontWeight: "bold", margin: 0 }}>UNICAH</p>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>✓ ¡Cuenta creada! Revisa tu correo para verificarla. Redirigiendo...</div>}

        <form onSubmit={handleRegister} style={{ ...s.form, opacity: success ? 0.5 : 1, pointerEvents: success ? "none" : "auto" }}>
          <input type="text" placeholder="Nombre completo" value={displayName} onChange={e => setDisplayName(e.target.value)} style={s.input} required />
          <input type="email" placeholder="correo@unicah.edu" value={email} onChange={e => setEmail(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={s.input} required />
          <input type="password" placeholder="Confirmar contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} style={s.input} required />

          <div style={s.termsRow}>
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, cursor: "pointer", accentColor: "#003087", flexShrink: 0 }} />
            <label htmlFor="terms" style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5, cursor: "pointer" }}>
              He leído y acepto los{" "}
              <button type="button" onClick={() => setShowTerms(true)} style={{ background: "none", border: "none", color: "#0057B8", fontWeight: 700, fontSize: "13px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                Términos y Condiciones
              </button>
            </label>
          </div>

          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#666" }}>
          ¿Ya tienes cuenta?{" "}<Link to="/" style={{ color: "#0057B8", fontWeight: "bold", textDecoration: "none" }}>Inicia sesión</Link>
        </p>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}

const s = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4ff" },
  card: { backgroundColor: "white", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "420px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  header: { textAlign: "center", marginBottom: "24px" },
  error: { backgroundColor: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  success: { backgroundColor: "#dcfce7", color: "#16a34a", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", fontWeight: "600", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "12px 16px", borderRadius: "10px", border: "1px solid #e0e0e0", fontSize: "14px", outline: "none" },
  termsRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" },
  btn: { backgroundColor: "#003087", color: "white", padding: "14px", borderRadius: "10px", border: "none", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
}

const t = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" },
  title: { color: "#003087", margin: 0, fontSize: 18 },
  closeBtn: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280", padding: "4px 8px" },
  body: { overflowY: "auto", padding: "20px 24px", flex: 1 },
  acceptBtn: { margin: "0 24px 20px", padding: "13px", borderRadius: 12, border: "none", backgroundColor: "#003087", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" },
}