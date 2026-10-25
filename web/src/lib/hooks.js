import { useEffect, useState } from 'react';
import { apiGet } from './api.js';

// Caché en memoria por sesión: recorridos y tarifas los usan varias páginas.
const cache = new Map();

export function useApi(path) {
  const [state, setState] = useState(() => (cache.has(path)
    ? { data: cache.get(path), loading: false, error: null }
    : { data: null, loading: true, error: null }));

  useEffect(() => {
    if (cache.has(path)) return undefined;
    let alive = true;
    apiGet(path)
      .then((data) => { cache.set(path, data); if (alive) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (alive) setState({ data: null, loading: false, error }); });
    return () => { alive = false; };
  }, [path]);

  return state;
}

// Agrega .is-in a todo .reveal que entra en pantalla (una sola vez).
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Línea 126` : 'Línea 126 — Retiro ⇄ La Tablada · Cárdenas S.A.';
  }, [title]);
}
