import { useEffect, useMemo, useRef, useState } from 'react';
import trazado from '../data/trazado126.json';
import { SECCIONADOS } from '../data/linea.js';
import { distKm, TOTAL_KM } from '../lib/sim.js';
import s from './RouteDraw.module.css';

// El recorrido real (ida, Retiro → La Tablada) proyectado a un SVG propio:
// la línea roja se dibuja a medida que scrolleás y los barrios se encienden
// cuando la línea llega. Sección "sticky": el scroll se vuelve el viaje.
const W = 1000;
const H = 640;
const PAD = 60;

function proyectar(points) {
  const lat0 = points.reduce((a, p) => a + p[0], 0) / points.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = points.map((p) => p[1] * k);
  const ys = points.map((p) => -p[0]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const esc = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
  const offX = (W - (maxX - minX) * esc) / 2;
  const offY = (H - (maxY - minY) * esc) / 2;
  return points.map((_, i) => [offX + (xs[i] - minX) * esc, offY + (ys[i] - minY) * esc]);
}

export default function RouteDraw() {
  const ref = useRef(null);
  const pathRef = useRef(null);
  const [p, setP] = useState(0);
  const [len, setLen] = useState(0);
  const [head, setHead] = useState([0, 0]);

  const { d, hitos } = useMemo(() => {
    const pts = proyectar(trazado.ida);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    // Fracción real (en km) de cada vértice, para ubicar los hitos.
    const cum = [0];
    for (let i = 1; i < trazado.ida.length; i++) cum.push(cum[i - 1] + distKm(trazado.ida[i - 1], trazado.ida[i]));
    const total = cum[cum.length - 1];
    const cumFrac = cum.map((c) => c / total);
    const hitos = SECCIONADOS.slice().reverse().map((h) => {
      const frac = (TOTAL_KM - h.km) / TOTAL_KM;
      let i = cumFrac.findIndex((f) => f >= frac);
      if (i < 0) i = pts.length - 1;
      return { ...h, frac, x: pts[i][0], y: pts[i][1], kmDesdeRetiro: TOTAL_KM - h.km };
    });
    // Etiquetas sin superposición: prueba derecha, izquierda, arriba y abajo.
    const cajas = [];
    const choca = (b) => cajas.some((c) => b.x0 < c.x1 && b.x1 > c.x0 && b.y0 < c.y1 && b.y1 > c.y0);
    for (const h of hitos) {
      const txt = h.etiqueta ?? h.barrio;
      const w = txt.length * 12.5 + 8;
      const opciones = [
        { dx: 16, dy: 5, anchor: 'start', box: { x0: h.x + 12, x1: h.x + 16 + w, y0: h.y - 14, y1: h.y + 10 } },
        { dx: -16, dy: 5, anchor: 'end', box: { x0: h.x - 16 - w, x1: h.x - 12, y0: h.y - 14, y1: h.y + 10 } },
        { dx: 0, dy: -18, anchor: 'middle', box: { x0: h.x - w / 2, x1: h.x + w / 2, y0: h.y - 38, y1: h.y - 12 } },
        { dx: 0, dy: 32, anchor: 'middle', box: { x0: h.x - w / 2, x1: h.x + w / 2, y0: h.y + 12, y1: h.y + 38 } },
      ];
      const preferida = h.x > W * 0.62 ? [1, 0, 2, 3] : [0, 1, 2, 3];
      const elegida = preferida.map((i) => opciones[i]).find((o) => !choca(o.box)) ?? opciones[preferida[0]];
      cajas.push(elegida.box, { x0: h.x - 12, x1: h.x + 12, y0: h.y - 12, y1: h.y + 12 });
      h.label = { x: h.x + elegida.dx, y: h.y + elegida.dy, anchor: elegida.anchor, txt };
    }
    return { d, hitos };
  }, []);

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [d]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setP(1); return undefined; }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const recorrido = r.height - window.innerHeight;
        const v = recorrido > 0 ? -r.top / recorrido : 0;
        setP(Math.min(Math.max(v, 0), 1));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  // El trazo avanza por longitud de dibujo; convertimos la fracción de km a
  // fracción de longitud SVG (casi iguales, pero así los hitos coinciden).
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !len) return;
    const pt = path.getPointAtLength(len * p);
    setHead([pt.x, pt.y]);
  }, [p, len]);

  const actual = [...hitos].reverse().find((h) => h.frac <= p + 0.001) ?? hitos[0];
  const km = p * TOTAL_KM;

  return (
    <section ref={ref} className={s.scrolly} aria-label="Recorrido de la Línea 126">
      <div className={s.sticky}>
        <div className={`container ${s.inner}`}>
          <div className={s.text}>
            <span className="kicker">Por dónde pasamos</span>
            <h2 className={s.title}>De Retiro a La Tablada, barrio por barrio</h2>
            <div className={s.meter}>
              <strong>{km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
              <span>km</span>
            </div>
            <p className={s.now}>
              <span>Ahora pasando por</span>
              <b key={actual.barrio}>{actual.barrio}</b>
              <small>{actual.nombre}</small>
            </p>
            <div className={s.progress} aria-hidden="true"><i style={{ transform: `scaleX(${p})` }} /></div>
            <p className={s.hint}>{p < 0.98 ? 'Seguí bajando para recorrer la línea ↓' : '27 km · 82 a 100 minutos de punta a punta'}</p>
          </div>

          <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa esquemático del recorrido">
            <path d={d} className={s.ghost} />
            <path
              ref={pathRef}
              d={d}
              className={s.line}
              style={len ? { strokeDasharray: len, strokeDashoffset: len * (1 - p) } : undefined}
            />
            {hitos.map((h, i) => {
              const on = h.frac <= p + 0.001;
              return (
                <g key={h.nombre} className={`${s.hito} ${on ? s.on : ''} ${h === actual ? s.current : ''}`}>
                  <circle cx={h.x} cy={h.y} r={i === 0 || i === hitos.length - 1 ? 11 : 7.5} />
                  <text x={h.label.x} y={h.label.y} textAnchor={h.label.anchor}>{h.label.txt}</text>
                </g>
              );
            })}
            {p > 0.002 && p < 0.998 && (
              <g transform={`translate(${head[0]} ${head[1]})`} className={s.head}>
                <circle r="16" className={s.halo} />
                <circle r="9" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}
