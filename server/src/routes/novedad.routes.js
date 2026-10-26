import { Router } from 'express';
import { requireAtLeastAtencionCliente } from '../middleware/requireAuth.js';
import { getAllNovedades, createNovedad, updateNovedad, deleteNovedad, TIPOS_NOVEDAD } from '../services/novedad.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({ novedades: await getAllNovedades(), tipos: TIPOS_NOVEDAD });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAtLeastAtencionCliente, async (req, res) => {
  try {
    res.status(201).json({ novedad: await createNovedad(req.body ?? {}) });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.put('/:id', requireAtLeastAtencionCliente, async (req, res) => {
  try {
    res.json({ novedad: await updateNovedad(req.params.id, req.body ?? {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAtLeastAtencionCliente, async (req, res) => {
  try {
    await deleteNovedad(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
