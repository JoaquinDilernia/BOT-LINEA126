import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRedactarPrompt, redactarNovedad } from './novedadRedactar.service.js';

test('buildRedactarPrompt: incluye lo cargado, el tipo y la regla de no inventar', () => {
  const pr = buildRedactarPrompt({ tipo: 'desvio', titulo: '', texto: 'ramal a x eva peron', desde: '2026-11-28T11:00:00Z' });
  assert.match(pr, /ramal a x eva peron/);
  assert.match(pr, /Título cargado: \(vacío\)/);
  assert.match(pr, /No inventes/);
  assert.match(pr, /sábado 28\/11/);
});

test('redactarNovedad: sin nada cargado no llama a la IA', async () => {
  assert.deepEqual(await redactarNovedad({ titulo: ' ', texto: '' }), { titulo: '', texto: '', ia: false });
});
