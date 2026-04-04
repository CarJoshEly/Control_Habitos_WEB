import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
} from "../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!email.endsWith("@unicah.edu")) {
      setError("Solo se permite el correo institucional @unicah.edu");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result.user.email.endsWith("@unicah.edu")) {
        await result.user.delete();
        setError("Solo se permite el correo institucional @unicah.edu");
        return;
      }
      navigate("/dashboard");
    } catch {
      setError("Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccessMsg("");
    if (!email) {
      setError("Ingresa tu correo para restablecer la contraseña");
      return;
    }
    if (!email.endsWith("@unicah.edu")) {
      setError("Solo se permite el correo institucional @unicah.edu");
      return;
    }
    try {
      await resetPassword(email);
      setSuccessMsg(
        `✓ Link de restablecimiento enviado a ${email}. Revisa tu bandeja de entrada.`,
      );
    } catch {
      setError("Error al enviar el correo. Intenta de nuevo.");
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case "auth/user-not-found":
        return "No existe una cuenta con este correo";
      case "auth/wrong-password":
        return "Contraseña incorrecta";
      case "auth/invalid-credential":
        return "Credenciales inválidas";
      case "auth/too-many-requests":
        return "Demasiados intentos. Intenta más tarde";
      default:
        return "Error de autenticación";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>🎓</div>
          <h1 style={styles.title}>Control Hábitos</h1>
          <p style={styles.subtitle}>UNICAH</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="correo@unicah.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="button"
            onClick={handleForgotPassword}
            style={styles.forgotBtn}
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>

        <div style={styles.divider}>O continúa con</div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={styles.googleBtn}
        >
          🔵 Iniciar sesión con Google
        </button>

        <p style={styles.registerText}>
          ¿No tienes cuenta?{" "}
          <Link to="/register" style={styles.link}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  header: { textAlign: "center", marginBottom: "24px" },
  logo: { fontSize: "48px" },
  title: { color: "#003087", fontSize: "24px", margin: "8px 0 4px" },
  subtitle: { color: "#C8A84B", fontWeight: "bold", margin: 0 },
  error: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "14px",
    borderLeft: "4px solid #dc2626",
  },
  success: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "500",
    borderLeft: "4px solid #16a34a",
    lineHeight: 1.5,
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e0e0e0",
    fontSize: "14px",
    outline: "none",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "#0057B8",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "right",
    padding: 0,
  },
  btn: {
    backgroundColor: "#003087",
    color: "white",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  divider: {
    textAlign: "center",
    color: "#999",
    margin: "20px 0",
    fontSize: "14px",
  },
  googleBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #003087",
    backgroundColor: "white",
    fontSize: "15px",
    cursor: "pointer",
    color: "#003087",
  },
  registerText: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#666",
  },
  link: { color: "#0057B8", fontWeight: "bold", textDecoration: "none" },
};
