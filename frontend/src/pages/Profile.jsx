import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../context/ThemeContext";
import { logout, getToken } from "../services/authService";

const API = import.meta.env.VITE_API_URL

// ─── Modal Términos y Condiciones ─────────────────────────────────────────────
function TermsModal({ dark, clr, onClose }) {
  return (
    <div style={tm.overlay} onClick={onClose}>
      <div
        style={{ ...tm.modal, backgroundColor: clr.cardBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ ...tm.header, borderBottom: `1px solid ${clr.divider}` }}>
          <h2 style={{ ...tm.title, color: clr.accent }}>
            📄 Términos y Condiciones
          </h2>
          <button
            style={{ ...tm.closeBtn, color: clr.textMuted }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={tm.body}>
          <p style={{ fontSize: 12, color: clr.textMuted, margin: "0 0 20px" }}>
            Última actualización: Abril 2026
          </p>

          {[
            [
              "1. Aceptación de los Términos",
              "Al registrarte y usar Control Hábitos UNICAH, aceptas estos términos. Si no estás de acuerdo, no utilices la aplicación.",
            ],
            [
              "2. Uso de la Aplicación",
              "Esta aplicación está diseñada exclusivamente para estudiantes de la Universidad Católica de Honduras (UNICAH). Solo se permite el registro con correos institucionales @unicah.edu.",
            ],
            [
              "3. Datos Personales",
              "Los datos que registres (hábitos, progreso, perfil) se almacenan de forma segura en Firebase y se usan únicamente para el funcionamiento de la aplicación. No compartimos tu información con terceros.",
            ],
            [
              "4. Automatizaciones (Zapier)",
              "La aplicación puede enviar notificaciones y reportes automáticos a tu correo institucional mediante Zapier. Puedes desactivar las notificaciones en cualquier momento desde tu perfil.",
            ],
            [
              "5. Inteligencia Artificial",
              "Las sugerencias, análisis y rutinas generadas por la IA son orientativas. No reemplazan el consejo de profesionales de salud o educación.",
            ],
            [
              "6. Responsabilidad del Usuario",
              "Eres responsable de mantener la confidencialidad de tu cuenta. No compartas tu contraseña ni uses la cuenta de otro usuario.",
            ],
            [
              "7. Modificaciones",
              "UNICAH se reserva el derecho de actualizar estos términos. Los cambios serán notificados dentro de la aplicación.",
            ],
            [
              "8. Contacto",
              "Para dudas o consultas sobre estos términos, contacta al equipo de desarrollo a través de tu correo institucional.",
            ],
          ].map(([title, text]) => (
            <div key={title} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontWeight: 700,
                  color: clr.accent,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                {title}
              </div>
              <p
                style={{
                  color: clr.text,
                  fontSize: 13,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {text}
              </p>
            </div>
          ))}
        </div>

        <button
          style={{ ...tm.acceptBtn, backgroundColor: "#003087" }}
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const clr = colors(dark);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [message, setMessage] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDisplayName(data.displayName || "");
      setPhotoUrl(data.photoUrl ? data.photoUrl + "?t=" + Date.now() : "");
      setNotificationsEnabled(data.notificationsEnabled ?? true);
    } catch {
      showMsg("error", "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/profile/name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: tempName.trim() }),
      });
      if (!res.ok) throw new Error();
      setDisplayName(tempName.trim());
      setEditingName(false);
      showMsg("success", "Nombre actualizado");
    } catch {
      showMsg("error", "Error al actualizar el nombre");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${API}/profile/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPhotoUrl(data.photoUrl + "?t=" + Date.now());
      await user.reload();
      showMsg("success", "Foto actualizada");
    } catch {
      showMsg("error", "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    try {
      const token = await getToken();
      await fetch(`${API}/profile/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationsEnabled: value }),
      });
    } catch {
      setNotificationsEnabled(!value);
      showMsg("error", "Error al guardar preferencias");
    }
  };

  const initials = (displayName || user?.email || "U")[0].toUpperCase();

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: clr.pageBg,
        }}
      >
        <div style={spinnerStyle} />
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: clr.pageBg,
        fontFamily: "system-ui, sans-serif",
        paddingBottom: 40,
      }}
    >
      <header style={p.header}>
        <button style={p.backBtn} onClick={() => navigate("/dashboard")}>
          ← Volver
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: 17 }}>
          Mi Perfil
        </span>
        <button style={p.iconBtn} onClick={toggleTheme}>
          {dark ? "☀️" : "🌙"}
        </button>
      </header>

      {message && (
        <div
          style={{
            ...p.toast,
            backgroundColor: message.type === "success" ? "#16a34a" : "#dc2626",
          }}
        >
          {message.type === "success" ? "✓ " : "✕ "}
          {message.text}
        </div>
      )}

      <div style={{ padding: "0 16px", maxWidth: 520, margin: "0 auto" }}>
        {/* Avatar */}
        <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="perfil"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #003087",
                }}
              />
            ) : (
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  backgroundColor: "#003087",
                  color: "white",
                  fontSize: 40,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid #C8A84B",
                }}
              >
                {initials}
              </div>
            )}
            {uploadingPhoto && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={spinnerStyle} />
              </div>
            )}
            <button
              style={p.cameraBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
            >
              📷
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
          <div
            style={{
              marginTop: 12,
              fontSize: 22,
              fontWeight: 700,
              color: clr.text,
            }}
          >
            {displayName || "Sin nombre"}
          </div>
          <div style={{ fontSize: 14, color: clr.textMuted, marginTop: 4 }}>
            {user?.email}
          </div>
        </div>

        {/* Info cuenta */}
        <Card clr={clr} title="Información de la cuenta">
          <Row clr={clr} icon="👤" label="Nombre">
            {editingName ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <input
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    width: 160,
                    background: clr.inputBg,
                    color: clr.text,
                    border: clr.inputBorder,
                  }}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                />
                <button
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    backgroundColor: "#003087",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  onClick={handleSaveName}
                  disabled={saving}
                >
                  {saving ? "..." : "✓"}
                </button>
                <button
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: clr.btnSecBg,
                    color: clr.text,
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setEditingName(false)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 15, color: clr.text, fontWeight: 500 }}>
                {displayName || "No establecido"}
              </div>
            )}
          </Row>
          {!editingName && (
            <button
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px",
                color: "#003087",
                position: "absolute",
                right: 20,
                marginTop: -40,
              }}
              onClick={() => {
                setTempName(displayName);
                setEditingName(true);
              }}
            >
              ✏️
            </button>
          )}
          <Divider clr={clr} />
          <Row clr={clr} icon="📧" label="Correo electrónico">
            <div style={{ fontSize: 15, color: clr.text, fontWeight: 500 }}>
              {user?.email}
            </div>
          </Row>
        </Card>

        {/* Preferencias */}
        <Card clr={clr} title="Preferencias">
          <ToggleRow
            clr={clr}
            icon={dark ? "🌙" : "☀️"}
            label="Tema"
            value={dark ? "Modo oscuro" : "Modo claro"}
            checked={dark}
            onChange={toggleTheme}
          />
          <Divider clr={clr} />
          <ToggleRow
            clr={clr}
            icon={notificationsEnabled ? "🔔" : "🔕"}
            label="Notificaciones"
            value={notificationsEnabled ? "Activadas" : "Desactivadas"}
            checked={notificationsEnabled}
            onChange={(e) => handleToggleNotifications(e.target.checked)}
          />
          <Divider clr={clr} />
          <MenuRow
            clr={clr}
            icon="🤖"
            label="Asistente IA"
            sub="Sugerencias y análisis"
            onClick={() => navigate("/ai")}
          />
          <Divider clr={clr} />
          {/* Términos — ahora abre modal en vez de alert */}
          <MenuRow
            clr={clr}
            icon="📄"
            label="Términos y Condiciones"
            sub="Políticas de uso y privacidad"
            onClick={() => setShowTerms(true)}
          />
        </Card>

        {/* Acerca de */}
        <Card clr={clr} title="Acerca de">
          {[
            ["Aplicación", "Control Hábitos UNICAH"],
            ["Versión", "1.0.0"],
            ["Universidad", "UNICAH"],
          ].map(([label, val], i, arr) => (
            <div key={label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  fontSize: 14,
                  color: clr.text,
                }}
              >
                <span>{label}</span>
                <span style={{ color: clr.textMuted, fontWeight: 500 }}>
                  {val}
                </span>
              </div>
              {i < arr.length - 1 && <Divider clr={clr} />}
            </div>
          ))}
        </Card>

        <button
          style={p.logoutBtn}
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          ↩ Cerrar sesión
        </button>
      </div>

      {showTerms && (
        <TermsModal dark={dark} clr={clr} onClose={() => setShowTerms(false)} />
      )}
    </div>
  );
}

function Card({ clr, title, children }) {
  return (
    <div
      style={{
        backgroundColor: clr.cardBg,
        borderRadius: 16,
        padding: "16px 20px",
        marginBottom: 16,
        boxShadow: clr.shadowCard,
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 14,
          color: clr.textMuted,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ clr, icon, label, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: clr.textMuted, marginBottom: 2 }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ clr, icon, label, value, checked, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, color: clr.textMuted, marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 15, color: clr.text, fontWeight: 500 }}>
            {value}
          </div>
        </div>
      </div>
      <label style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ display: "none" }}
        />
        <div
          style={{
            width: 46,
            height: 26,
            borderRadius: 13,
            backgroundColor: checked ? "#003087" : "#d1d5db",
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "white",
              position: "absolute",
              top: 3,
              left: checked ? 23 : 3,
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </label>
    </div>
  );
}

function MenuRow({ clr, icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px 0",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 12, color: clr.textMuted, marginBottom: 2 }}>
            {label}
          </div>
          <div style={{ fontSize: 15, color: clr.text, fontWeight: 500 }}>
            {sub}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 22, color: clr.textMuted }}>›</span>
    </button>
  );
}

function Divider({ clr }) {
  return (
    <div style={{ borderTop: `1px solid ${clr.divider}`, margin: "4px 0" }} />
  );
}

const spinnerStyle = {
  width: 36,
  height: 36,
  border: "3px solid #e5e7eb",
  borderTop: "3px solid #003087",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const p = {
  header: {
    backgroundColor: "#003087",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#C8A84B",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    padding: 0,
  },
  iconBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 16,
  },
  toast: {
    position: "fixed",
    top: 70,
    left: "50%",
    transform: "translateX(-50%)",
    color: "white",
    padding: "10px 20px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    zIndex: 200,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: "50%",
    backgroundColor: "#003087",
    border: "2px solid white",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    marginTop: 8,
  },
};

const tm = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px 16px",
  },
  title: { margin: 0, fontSize: 18 },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    padding: "4px 8px",
  },
  body: { overflowY: "auto", padding: "20px 24px", flex: 1 },
  acceptBtn: {
    margin: "0 24px 20px",
    padding: "13px",
    borderRadius: 12,
    border: "none",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
};
