import { Router } from 'express';
import { listPostulaciones, updatePostulacionEstado } from '../services/postulacion.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({ postulaciones: await listPostulaciones() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await updatePostulacionEstado(req.params.id, req.body?.estado);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
