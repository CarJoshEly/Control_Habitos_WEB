import express from 'express';
import { db } from '../config/firebase.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

const ZAPIER_HABIT_WEBHOOK = process.env.ZAPIER_HABIT_WEBHOOK;

const sendToZapier = async (url, data) => {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Error enviando a Zapier:', e.message);
  }
};

// Obtener todos los hábitos del usuario
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .orderBy('createdAt', 'desc')
      .get();

    const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear hábito
router.post('/', verifyToken, async (req, res) => {
  const { name, description, frequency, reminderHour, reminderMinute, reminderType } = req.body;

  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

  try {
    const docRef = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .add({
        name,
        description: description ?? '',
        frequency: frequency ?? 'daily',
        progress: 0,
        streak: 0,
        bestStreak: 0,
        completionHistory: [],
        reminderHour: reminderHour ?? null,
        reminderMinute: reminderMinute ?? null,
        reminderType: reminderType ?? null,
        lastCompleted: null,
        createdAt: new Date(),
      });

    res.status(201).json({ id: docRef.id, message: 'Hábito creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar hábito
router.put('/:id', verifyToken, async (req, res) => {
  const { name, description, frequency, reminderHour, reminderMinute, reminderType } = req.body;

  try {
    await db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .doc(req.params.id)
      .update({
        name,
        description,
        frequency,
        reminderHour: reminderHour ?? null,
        reminderMinute: reminderMinute ?? null,
        reminderType: reminderType ?? null,
      });

    res.json({ message: 'Hábito actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar hábito
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .doc(req.params.id)
      .delete();

    res.json({ message: 'Hábito eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar/desmarcar hábito como completado en una fecha
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  const { completed, date } = req.body;

  try {
    const docRef = db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .doc(req.params.id);

    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Hábito no encontrado' });

    const data = doc.data();
    let history = data.completionHistory ?? [];
    let progress = data.progress ?? 0;

    if (completed) {
      if (!history.includes(date)) {
        history.push(date);
        progress++;
      }
    } else {
      history = history.filter(d => d !== date);
      progress = progress > 0 ? progress - 1 : 0;
    }

    const streak = calculateStreak(history);
    const bestStreak = streak > (data.bestStreak ?? 0) ? streak : (data.bestStreak ?? 0);

    await docRef.update({
      completionHistory: history,
      progress,
      streak,
      bestStreak,
      lastCompleted: completed ? new Date() : data.lastCompleted,
    });

    // Notificar a Zapier cuando se completa un hábito
    if (completed) {
      await sendToZapier(ZAPIER_HABIT_WEBHOOK, {
        habitName: data.name,
        date,
        streak,
        progress,
        userId: req.user.uid,
        email: req.user.email,
      });
    }

    res.json({ message: 'Hábito actualizado', streak, progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calcula la racha actual
function calculateStreak(history) {
  if (history.length === 0) return 0;

  const dates = history
    .map(d => new Date(d))
    .sort((a, b) => b - a);

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const date of dates) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));

    if (diff === 0 || diff === 1) {
      streak++;
      checkDate = d;
    } else {
      break;
    }
  }

  return streak;
}

export default router;