import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// ZAP 1 — Hábitos completados en la última hora → Google Sheets
router.get('/habit-completed', async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const usersSnapshot = await db.collection('users').get();
    const results = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const habitsSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('habits')
        .get();

      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        if (!habit.lastCompleted) continue;

        const lastCompleted = habit.lastCompleted.toDate
          ? habit.lastCompleted.toDate()
          : new Date(habit.lastCompleted);

        if (lastCompleted >= oneHourAgo) {
          results.push({
            usuario: userData.displayName || userData.email,
            email: userData.email,
            habito: habit.name,
            fecha: lastCompleted.toLocaleDateString('es-HN'),
            hora: lastCompleted.toLocaleTimeString('es-HN'),
            racha: habit.streak || 0,
            total_completado: habit.progress || 0,
          });
        }
      }
    }

    res.json(results.length > 0 ? results : [{ mensaje: 'Sin hábitos completados en la última hora' }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP 2 — Usuarios nuevos del día → Email de bienvenida
router.get('/new-user', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection('users')
      .where('createdAt', '>=', startOfDay)
      .get();

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        nombre: data.displayName || 'Estudiante',
        email: data.email,
        fecha_registro: startOfDay.toLocaleDateString('es-HN'),
      };
    });

    res.json(users.length > 0 ? users : [{ mensaje: 'Sin usuarios nuevos hoy' }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZAP 3 — Hábitos con recordatorio para esta hora → Email recordatorio
router.get('/reminders', async (req, res) => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const usersSnapshot = await db.collection('users').get();
    const reminders = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.notificationsEnabled) continue;

      const habitsSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('habits')
        .where('reminderHour', '==', currentHour)
        .get();

      for (const habitDoc of habitsSnapshot.docs) {
        const habit = habitDoc.data();
        if (habit.reminderMinute !== currentMinute) continue;

        const today = now.toISOString().split('T')[0];
        const alreadyDone = (habit.completionHistory || []).includes(today);
        if (alreadyDone) continue;

        reminders.push({
          email: userData.email,
          nombre: userData.displayName || 'Estudiante',
          habito: habit.name,
          descripcion: habit.description || '',
          hora: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
        });
      }
    }

    res.json(reminders.length > 0 ? reminders : [{ mensaje: 'Sin recordatorios para esta hora' }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;