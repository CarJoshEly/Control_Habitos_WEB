import express from 'express';
import { db, auth, bucket } from '../config/firebase.js';
import verifyToken from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Obtener perfil
router.get('/', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ uid: req.user.uid, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar nombre
router.put('/name', verifyToken, async (req, res) => {
  const { displayName } = req.body;
  if (!displayName) return res.status(400).json({ error: 'El nombre es requerido' });

  try {
    await db.collection('users').doc(req.user.uid).update({
      displayName,
      updatedAt: new Date(),
    });
    await auth.updateUser(req.user.uid, { displayName });
    res.json({ message: 'Nombre actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subir foto de perfil
router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });

  try {
    const filename = `profile_photos/${req.user.uid}.jpg`;
    const file = bucket.file(filename);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    const photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    await db.collection('users').doc(req.user.uid).update({ photoUrl });
    await auth.updateUser(req.user.uid, { photoURL: photoUrl });

    res.json({ message: 'Foto actualizada', photoUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar preferencias
router.put('/preferences', verifyToken, async (req, res) => {
  const { notificationsEnabled } = req.body;

  try {
    await db.collection('users').doc(req.user.uid).update({
      notificationsEnabled,
    });
    res.json({ message: 'Preferencias actualizadas' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;