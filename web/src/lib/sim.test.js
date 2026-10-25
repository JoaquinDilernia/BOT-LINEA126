import { describe, expect, it } from 'vitest';
import {
  TOTAL_KM, busesEn, duracionViaje, kmTras, minutosHasta, parseCada, proximos, puntoEnRuta, salidas,
} from './sim.js';

describe('parseCada', () => {
  it('promedia rangos y acepta coma decimal', () => {
    expect(parseCada('9 a 10 min')).toBe(9.5);
    expect(parseCada('6,5 min')).toBe(6.5);
    expect(parseCada('cada 15 min')).toBe(15);
  });
});

describe('salidas', () => {
  it('genera una cantidad de servicios cercana a la diagramación oficial', () => {
    // Oficial: 158 a Retiro y 156 a La Tablada en día hábil; 107 por sentido el sábado.
    expect(salidas('habil', 'haciaRetiro').length).toBeGreaterThan(140);
    expect(salidas('habil', 'haciaRetiro').length).toBeLessThan(175);
    expect(salidas('sabado', 'haciaTablada').length).toBeGreaterThan(95);
    expect(salidas('sabado', 'haciaTablada').length).toBeLessThan(120);
  });
  it('arranca a la hora de inicio del servicio', () => {
    expect(salidas('habil', 'haciaRetiro')[0]).toBe(45);
    expect(salidas('domingo', 'haciaRetiro')[0]).toBe(360);
  });
});

describe('viaje', () => {
  it('dura lo que suman los tiempos de marcha (82 valle / 100 pico)', () => {
    expect(duracionViaje('haciaRetiro', 12 * 60)).toBe(82);
    expect(duracionViaje('haciaRetiro', 8 * 60)).toBe(100);
  });
  it('kmTras y minutosHasta son inversas', () => {
    const km = kmTras('haciaTablada', 600, 37);
    expect(minutosHasta('haciaTablada', 600, km)).toBeCloseTo(37, 5);
    expect(kmTras('haciaTablada', 600, 82)).toBeCloseTo(TOTAL_KM, 5);
    expect(kmTras('haciaTablada', 600, 90)).toBeNull();
  });
  it('el punto inicial de cada sentido es su terminal', () => {
    const { latlng } = puntoEnRuta('haciaTablada', 0);
    expect(latlng[0]).toBeCloseTo(-34.586, 2); // Retiro
    expect(puntoEnRuta('haciaRetiro', 0).latlng[0]).toBeCloseTo(-34.696, 2); // La Tablada
  });
});

describe('flota', () => {
  it('a las 12 de un día hábil hay unos 25-30 colectivos andando', () => {
    const n = busesEn(12 * 60, 'habil', 'habil').length;
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(35);
  });
  it('a las 3 de la mañana hay pocos (servicio nocturno)', () => {
    const n = busesEn(3 * 60, 'habil', 'habil').length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(8);
  });
  it('sigue mostrando los que salieron antes de medianoche', () => {
    // Domingo 00:30: el servicio de domingo arranca a las 6, pero los del sábado siguen.
    expect(busesEn(30, 'domingo', 'sabado').length).toBeGreaterThan(0);
  });
  it('los próximos arribos están ordenados y en el futuro', () => {
    const p = proximos(12 * 60, 'habil', 'habil', 'haciaRetiro', 5, 3);
    expect(p).toHaveLength(3);
    expect(p[0].en).toBeGreaterThanOrEqual(0);
    expect(p[1].en).toBeGreaterThan(p[0].en);
    expect(p[0].en).toBeLessThan(7);
  });
});
