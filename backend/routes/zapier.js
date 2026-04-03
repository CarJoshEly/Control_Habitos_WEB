import express from "express";
import { db } from "../config/firebase.js";
import verifyToken from "../middleware/authMiddleware.js";

const router = express.Router();

// ZAP 1 — Hábitos completados en la última hora → Google Sheets
router.get("/habit-completed", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const usersSnapshot = await db.collection("users").get();
    const results = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const habitsSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("habits")
        .get();

      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        if (!habit.lastCompleted) continue;

        const lastCompleted = habit.lastCompleted.toDate
          ? habit.lastCompleted.toDate()
          : new Date(habit.lastCompleted);

        if (lastCompleted >= startOfDay) {
          results.push({
            usuario: userData.displayName || userData.email,
            email: userData.email,
            habito: habit.name,
            fecha: lastCompleted.toLocaleDateString("es-HN"),
            hora: lastCompleted.toLocaleTimeString("es-HN"),
            racha: habit.streak || 0,
            total_completado: habit.progress || 0,
          });
        }
      }
    }

    res.json(
      results.length > 0
        ? results
        : [{ mensaje: 'Sin hábitos completados hoy' }]
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP  — Usuarios nuevos del día → Email de bienvenida
router.get("/new-user", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection("users")
      .where("createdAt", ">=", startOfDay)
      .get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        nombre: data.displayName || "Estudiante",
        email: data.email,
        fecha_registro: startOfDay.toLocaleDateString("es-HN"),
      };
    });

    res.json(
      users.length > 0 ? users : [{ mensaje: "Sin usuarios nuevos hoy" }],
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP 2 — Reporte diario de hábitos → Email resumen
router.get("/daily-report", async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const usersSnapshot = await db.collection("users").get();
    const reports = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.email) continue;

      const habitsSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("habits")
        .get();

      if (habitsSnapshot.empty) continue;

      const habits = habitsSnapshot.docs.map((d) => d.data());
      const totalHabitos = habits.length;
      const completadosAyer = habits.filter((h) =>
        (h.completionHistory || []).includes(yesterdayStr),
      ).length;
      const mejorRacha = Math.max(...habits.map((h) => h.bestStreak || 0), 0);

      reports.push({
        email: userData.email,
        nombre: userData.displayName || "Estudiante",
        completados: completadosAyer,
        total_habitos: totalHabitos,
        mejor_racha: mejorRacha,
        fecha: yesterdayStr,
      });
    }

    res.json(
      reports.length > 0 ? reports : [{ mensaje: "Sin usuarios con hábitos" }],
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP 3 — Recordatorios por hora → Email recordatorio
router.get("/reminders", async (req, res) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const usersSnapshot = await db.collection("users").get();
    const reminders = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.notificationsEnabled) continue;

      const habitsSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("habits")
        .where("reminderHour", "==", currentHour)
        .get();

      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        //if (habit.reminderMinute !== currentMinute) continue
        // Solo se cambia la hora, no el minuto exacto porque Zapier no corre en un minuto específico.

        const today = now.toISOString().split("T")[0];
        const alreadyDone = (habit.completionHistory || []).includes(today);
        if (alreadyDone) continue;

        reminders.push({
          email: userData.email,
          nombre: userData.displayName || "Estudiante",
          habito: habit.name,
          descripcion: habit.description || "",
          hora: `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`,
        });
      }
    }

    res.json(
      reminders.length > 0
        ? reminders
        : [{ mensaje: "Sin recordatorios para esta hora" }],
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP 2B — Webhook directo al registrarse (llamado desde Register.jsx)
router.post("/new-user-webhook", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const data = userDoc.data() || {};
    res.json({
      nombre: data.displayName || "Estudiante",
      email: req.user.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
