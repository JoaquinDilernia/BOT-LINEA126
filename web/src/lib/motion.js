import { useEffect, useRef, useState } from 'react';

const reduce = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Placeholder que se "escribe" solo con ejemplos, mientras el campo está vacío.
export function useTypewriter(frases, { activo = true, prefijo = '' } = {}) {
  const [texto, setTexto] = useState(prefijo + frases[0]);
  useEffect(() => {
    if (!activo || reduce()) { setTexto(prefijo + frases[0]); return undefined; }
    let i = 0;
    let j = 0;
    let borrando = false;
    let id;
    const paso = () => {
      const f = frases[i];
      if (!borrando) {
        j++;
        setTexto(prefijo + f.slice(0, j));
        if (j >= f.length) { borrando = true; id = setTimeout(paso, 1700); return; }
        id = setTimeout(paso, 55 + Math.random() * 45);
      } else {
        j--;
        setTexto(prefijo + f.slice(0, j));
        if (j <= 0) { borrando = false; i = (i + 1) % frases.length; id = setTimeout(paso, 350); return; }
        id = setTimeout(paso, 28);
      }
    };
    j = 0;
    id = setTimeout(paso, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
  return texto;
}

// Número que cuenta hasta `valor` cuando entra en pantalla.
export function useCountUp(valor, { duracion = 1400 } = {}) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduce() || !('IntersectionObserver' in window)) { setN(valor); return undefined; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min((t - t0) / duracion, 1);
        setN(valor * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [valor, duracion]);
  return [ref, n];
}
