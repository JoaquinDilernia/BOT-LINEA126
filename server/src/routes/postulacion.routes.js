import { Router } from 'express';
import { listPostulaciones, updatePostulacionEstado, getPostulacionCv } from '../services/postulacion.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({ postulaciones: await listPostulaciones() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// El PDF del CV (se abre en otra pestaña con ?token=, como las imágenes de reclamos).
router.get('/:id/cv', async (req, res) => {
  try {
    const cv = await getPostulacionCv(req.params.id);
    if (!cv) return res.status(404).json({ error: 'Esta postulación no tiene CV adjunto' });
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(cv.nombre)}`);
    res.set('Cache-Control', 'private, no-store');
    res.send(cv.buffer);
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
