import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

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

// Registro
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email.endsWith('@unicah.edu')) {
    return res.status(400).json({ error: 'Solo se permite el correo institucional @unicah.edu' });
  }

  try {
    const userRecord = await auth.createUser({ email, password, displayName });

    await db.collection('users').doc(userRecord.uid).set({
      displayName: displayName ?? '',
      email,
      photoUrl: '',
      createdAt: new Date(),
      lastLogin: new Date(),
      notificationsEnabled: true,
    });

    // Notificar a Zapier para enviar email de bienvenida
    await sendToZapier(process.env.ZAPIER_USER_WEBHOOK, {
      displayName,
      email,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;