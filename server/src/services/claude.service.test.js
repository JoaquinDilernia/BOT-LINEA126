import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from './claude.service.js';

// buildSystemPrompt devuelve bloques (el primero va cacheado); para los
// asserts alcanza con el texto completo.
const promptText = (...args) => buildSystemPrompt(...args).map(b => b.text).join('\n');

test('buildSystemPrompt: incluye RECORRIDOS cuando hay texto', () => {
  const out = promptText({}, '', null, [], '', 'S1: Av. Directorio y Azul\nSección 1: hasta acá $742,81');
  assert.match(out, /--- RECORRIDOS Y SECCIONES ---/);
  assert.match(out, /Directorio y Azul/);
});

test('buildSystemPrompt: sin recorridos no agrega el bloque', () => {
  const out = promptText({}, '', null, [], '', '');
  assert.doesNotMatch(out, /RECORRIDOS Y SECCIONES/);
});

test('buildSystemPrompt: con knowledgeBase + recorridos, la guía NO reclama ser única fuente sobre recorridos', () => {
  const out = promptText({}, 'Info de la empresa.', null, [], '', 'S1: Av. Directorio y Azul');
  assert.doesNotMatch(out, /ÚNICA fuente de verdad sobre recorridos/);
  assert.match(out, /usá el bloque RECORRIDOS Y SECCIONES/);
});

test('buildSystemPrompt: el perfil del contacto va fuera del bloque cacheado', () => {
  const blocks = buildSystemPrompt({}, 'KB', 'Nombre: Ana', [], 'tarifas', 'recorridos');
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].cache_control);
  assert.doesNotMatch(blocks[0].text, /Nombre: Ana/);
  assert.match(blocks[1].text, /Nombre: Ana/);
});

test('buildSystemPrompt: nunca ofrece derivar a una persona', () => {
  const out = promptText({}, 'KB', null, [], '', '');
  assert.match(out, /NO HAY DERIVACIÓN A HUMANOS/);
  assert.doesNotMatch(out, /\[ESCALAR/);
});
