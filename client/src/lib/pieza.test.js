import { describe, it, expect } from 'vitest';
import { wrapLines, slug, FORMATOS, titularParts, fondoDe } from './pieza';

// Ancho falso: 10 px por carácter.
const measure = (s) => s.length * 10;

describe('wrapLines', () => {
  it('corta por palabras sin pasarse del ancho', () => {
    expect(wrapLines('Ramal A desviado por obras', 120, measure)).toEqual(['Ramal A', 'desviado por', 'obras']);
  });
  it('una palabra más larga que el ancho se corta por letras', () => {
    expect(wrapLines('Larrazábal', 40, measure)).toEqual(['Larr', 'azáb', 'al']);
  });
  it('vacío → sin líneas', () => {
    expect(wrapLines('   ', 100, measure)).toEqual([]);
    expect(wrapLines(null, 100, measure)).toEqual([]);
  });
});

describe('titularParts', () => {
  it('mayúsculas y punto final aparte', () => {
    expect(titularParts('Ramal A desviado.')).toEqual({ text: 'RAMAL A DESVIADO', dot: true });
    expect(titularParts('Mañana no hay servicio')).toEqual({ text: 'MAÑANA NO HAY SERVICIO', dot: true });
  });
  it('pregunta o exclamación: sin punto', () => {
    expect(titularParts('¿Cómo llego?')).toEqual({ text: '¿CÓMO LLEGO?', dot: false });
  });
  it('vacío: sin punto', () => {
    expect(titularParts('  ')).toEqual({ text: '', dot: false });
  });
});

describe('fondoDe', () => {
  it('automático según el tipo, o el elegido', () => {
    expect(fondoDe({}, 'paro')).toBe('rojo');
    expect(fondoDe({ fondo: 'auto' }, 'desvio')).toBe('negro');
    expect(fondoDe({ fondo: 'blanco' }, 'paro')).toBe('blanco');
    expect(fondoDe({ fondo: 'x' }, 'raro')).toBe('blanco');
  });
});

describe('slug', () => {
  it('saca tildes y símbolos', () => {
    expect(slug('Desvío Ramal A: Av. Directorio')).toBe('desvio-ramal-a-av-directorio');
    expect(slug('')).toBe('novedad');
  });
});

describe('FORMATOS', () => {
  it('trae las 4 medidas, con la historia en 9:16', () => {
    expect(FORMATOS.map(f => f.id)).toEqual(['historia', 'post', 'cuadrado', 'horizontal']);
    const h = FORMATOS[0];
    expect(h.w / h.h).toBeCloseTo(9 / 16);
  });
});
