import { Router } from 'express';
import {
  getAllRecorridos, getRecorridoById, createRecorrido, updateRecorrido, deleteRecorrido, geocodeRecorrido,
} from '../services/recorrido.service.js';
import { requireAdmin } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', async (req, res) => {
  try { res.json({ recorridos: await getAllRecorridos() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const recorrido = await getRecorridoById(req.params.id);
    if (!recorrido) return res.status(404).json({ error: 'Recorrido no encontrado' });
    res.json({ recorrido });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  if (!req.body?.nombre?.trim()) return res.status(400).json({ error: 'nombre es requerido' });
  try { res.status(201).json({ recorrido: await createRecorrido(req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try { res.json({ recorrido: await updateRecorrido(req.params.id, req.body) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try { await deleteRecorrido(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/geocodificar', requireAdmin, async (req, res) => {
  try { res.json(await geocodeRecorrido(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
