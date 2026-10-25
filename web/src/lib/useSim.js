import { useEffect, useRef, useState } from 'react';
import { ahoraSim, diaAnterior, minutoDelDia } from './sim.js';

// Reloj de la simulación. En tiempo real avanza con el reloj del navegador
// (o con ?hora= para la demo). Con `velocidad` (minutos simulados por segundo)
// recorre el día en cámara rápida.
export function useSimClock({ velocidad = 0, tickMs = 1000 } = {}) {
  const [state, setState] = useState(() => base());
  const lapse = useRef(null);

  useEffect(() => {
    if (!velocidad) {
      lapse.current = null;
      setState(base());
      const id = setInterval(() => setState(base()), tickMs);
      return () => clearInterval(id);
    }
    const inicio = base();
    lapse.current = { m0: inicio.m, t0: performance.now() };
    const id = setInterval(() => {
      const transcurrido = (performance.now() - lapse.current.t0) / 1000;
      const m = (lapse.current.m0 + transcurrido * velocidad) % 1440;
      setState({ ...inicio, m });
    }, tickMs);
    return () => clearInterval(id);
  }, [velocidad, tickMs]);

  return state;
}

function base() {
  const { date, dia } = ahoraSim();
  return { m: minutoDelDia(date), dia, diaAyer: diaAnterior(dia, date), date };
}
