import express from 'express';
import { auth, db } from '../config/firebase.js';

const router = express.Router();

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

    res.status(201).json({ message: 'Usuario creado exitosamente', uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obtener datos del usuario
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    res.json({ uid: decoded.uid, ...userDoc.data() });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;