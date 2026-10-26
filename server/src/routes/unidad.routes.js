import { Router } from 'express';
import { requireAtLeastAtencionCliente } from '../middleware/requireAuth.js';
import { getAllUnidades, addUnidades, updateUnidad, deleteUnidad, parseInternos, normalizeInterno } from '../services/unidad.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({ unidades: await getAllUnidades() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carga masiva: { texto: "1-150, 201, 205" }.
router.post('/', requireAtLeastAtencionCliente, async (req, res) => {
  const internos = parseInternos(req.body?.texto);
  if (!internos.length) return res.status(400).json({ error: 'No encontramos ningún número de interno válido.' });
  try {
    res.status(201).json({ agregados: await addUnidades(internos) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:interno', requireAtLeastAtencionCliente, async (req, res) => {
  const interno = normalizeInterno(req.params.interno);
  if (!interno) return res.status(400).json({ error: 'Interno inválido' });
  try {
    await updateUnidad(interno, req.body ?? {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:interno', requireAtLeastAtencionCliente, async (req, res) => {
  const interno = normalizeInterno(req.params.interno);
  if (!interno) return res.status(400).json({ error: 'Interno inválido' });
  try {
    await deleteUnidad(interno);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
