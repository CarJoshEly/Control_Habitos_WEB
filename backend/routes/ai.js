import express from 'express';
import { db } from '../config/firebase.js';
import verifyToken from '../middleware/authMiddleware.js';
import openai from '../config/openai.js';

const router = express.Router();

const systemContext = `Eres un asistente personal de productividad y bienestar para estudiantes de la UNICAH 
(Universidad Católica de Honduras). Tu objetivo es ayudar a los estudiantes a mejorar en dos áreas:

1. ÁMBITO UNIVERSITARIO: Hábitos de estudio, organización académica, manejo del estrés de exámenes, 
rendimiento en clase y todo lo relacionado con la vida universitaria de la UNICAH. 
La universidad trabaja por trimestres, no semestres.

2. ÁMBITO PERSONAL: Hábitos de salud como tomar medicamentos, hacer ejercicio, dormir bien, 
hidratarse, alimentarse correctamente, salud mental, rutinas de autocuidado y cualquier 
hábito positivo del día a día que mejore la calidad de vida del estudiante.

Siempre responde en español, de forma amigable, motivadora y concisa.
Adapta tus respuestas al contexto hondureño.
Cuando un estudiante mencione un hábito de salud como tomar una medicina, darte seguimiento 
a una rutina física o cuidar su bienestar, trátalo con la misma importancia que un hábito académico.`;

// Sugeridor de hábitos
router.post('/suggest', verifyToken, async (req, res) => {
  const { carrera, situacion } = req.body;

  if (!carrera || !situacion) {
    return res.status(400).json({ error: 'Carrera y situación son requeridos' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContext },
        {
          role: 'user',
          content: `Un estudiante de ${carrera} en la UNICAH tiene esta situación: "${situacion}".
Sugiere 5 hábitos específicos y prácticos que le ayuden, considerando tanto su vida universitaria 
como su bienestar personal del día a día (salud, medicamentos, ejercicio, descanso, etc.).
Para cada hábito incluye:
- Nombre corto del hábito
- Si es un hábito universitario o personal
- Por qué es útil para su situación
- Frecuencia recomendada (diario/semanal)
Formato con emojis para hacerlo visual.`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Análisis de productividad
router.post('/analyze', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('habits')
      .get();

    const habits = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name,
        progress: data.progress ?? 0,
        streak: data.streak ?? 0,
        bestStreak: data.bestStreak ?? 0,
        frequency: data.frequency,
      };
    });

    if (habits.length === 0) {
      return res.json({
        result: '¡Aún no tienes hábitos registrados! Crea algunos para que pueda analizar tu productividad. 💪',
      });
    }

    const habitosTexto = habits
      .map(h => `- Hábito: ${h.name}\n  Completados: ${h.progress} veces\n  Racha actual: ${h.streak} días\n  Mejor racha: ${h.bestStreak} días\n  Frecuencia: ${h.frequency}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContext },
        {
          role: 'user',
          content: `Analiza los siguientes hábitos de un estudiante de la UNICAH. 
Los hábitos pueden ser tanto universitarios (estudio, clases, tareas) como personales 
(salud, medicamentos, ejercicio, descanso, alimentación). Trátalos a todos con la misma importancia.\n\n${habitosTexto}\n\nProporciona:\n1. 📊 Un análisis general considerando ambos ámbitos\n2. 💪 Sus fortalezas (tanto académicas como personales)\n3. ⚠️ Áreas de mejora en ambos ámbitos\n4. 🎯 3 recomendaciones concretas y personalizadas\n5. 🏆 Una frase motivadora final`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat motivacional
// Chat motivacional
router.post('/chat', verifyToken, async (req, res) => {
  const { mensaje, historial } = req.body;

  if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' });

  try {
    const now = new Date();
    const today = now.toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

    const messages = [{ 
      role: 'system', 
      content: systemContext + `\n\nFecha actual: ${today}. Hora actual: ${time}.` 
    }];

    if (historial && historial.length > 0) {
      const recent = historial.slice(-10);
      for (const msg of recent) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: mensaje });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.8,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generador de rutinas
router.post('/routine', verifyToken, async (req, res) => {
  const { carrera, trimestre, diasLibres, objetivos } = req.body;

  if (!carrera || !objetivos) {
    return res.status(400).json({ error: 'Carrera y objetivos son requeridos' });
  }

  try {
    const dias = diasLibres?.length > 0 ? diasLibres.join(', ') : 'No especificados';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContext },
        {
          role: 'user',
          content: `Crea una rutina semanal detallada para un estudiante de ${carrera}, en ${trimestre} trimestre de la UNICAH.
Días con más tiempo libre: ${dias}
Objetivos: "${objetivos}"

La rutina debe equilibrar ambos ámbitos:
1. 📅 Horario día por día (Lunes a Domingo)
2. Bloques de: estudio, ejercicio, descanso, vida social y cuidado personal
3. Espacio para hábitos de salud personal (medicamentos, hidratación, alimentación, etc.)
4. Hábitos académicos específicos para cada día
5. Consejos para mantener la rutina en ambos ámbitos

Hazlo práctico y realista para un universitario hondureño. Usa emojis y formato claro.`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;