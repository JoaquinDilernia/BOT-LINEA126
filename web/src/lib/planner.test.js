import { describe, expect, it } from 'vitest';
import { buscarParada, opcionesParadas, planificar, tarifaPlan } from './planner.js';

// Línea recta ficticia norte→sur: ida baja, vuelta sube.
const parada = (orden, lat, seccion) => ({ orden, nombre: `P${orden}`, lat, lng: -58.4, seccion });
const ida = [parada(1, -34.60, 9), parada(2, -34.62, 7), parada(3, -34.64, 5), parada(4, -34.66, 3), parada(5, -34.68, 1)];
const vuelta = ida.slice().reverse().map((p, i) => ({ ...p, orden: i + 1, nombre: `V${i + 1}` }));
const recorridos = [{
  nombre: 'Ramal A — X ⇄ Y',
  paradas: { ida, vuelta },
  cuadroTarifario: [{ hastaSeccion: 1, precio: 100 }, { hastaSeccion: 3, precio: 200 }, { hastaSeccion: 9, precio: 300 }],
}];

describe('planificar', () => {
  it('elige el sentido en el que el destino viene después del origen', () => {
    const ida1 = planificar(recorridos, [-34.60, -58.4], [-34.66, -58.4]);
    expect(ida1.sentido).toBe('ida');
    expect(ida1.d - ida1.o).toBe(3);
    const vuelta1 = planificar(recorridos, [-34.66, -58.4], [-34.60, -58.4]);
    expect(vuelta1.sentido).toBe('vuelta');
  });
  it('no propone nada si hay que caminar demasiado', () => {
    expect(planificar(recorridos, [-34.60, -58.2], [-34.66, -58.4])).toBeNull();
  });
  it('calcula secciones y precio con el cuadro del ramal', () => {
    const p = planificar(recorridos, [-34.62, -58.4], [-34.64, -58.4]);
    expect(tarifaPlan(p)).toEqual({ tramos: 3, precio: 200 });
  });
});

describe('buscador', () => {
  it('encuentra paradas sin importar tildes ni mayúsculas', () => {
    const ops = opcionesParadas(recorridos);
    expect(ops.length).toBe(10);
    expect(buscarParada(ops, 'p3')?.nombre).toBe('P3');
    expect(buscarParada(ops, 'nada')).toBeNull();
  });
});
