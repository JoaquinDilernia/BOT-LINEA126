import { useEffect, useMemo, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Postulaciones.module.css';

const ESTADOS = [
  { id: 'nueva', label: 'Nueva' },
  { id: 'vista', label: 'Vista' },
  { id: 'contactada', label: 'Contactada' },
  { id: 'descartada', label: 'Descartada' },
];

function fecha(ts) {
  const ms = ts?._seconds ? ts._seconds * 1000 : ts ? new Date(ts).getTime() : NaN;
  if (Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// CVs que llegan desde "Trabajá con nosotros" del sitio institucional.
export default function Postulaciones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [puesto, setPuesto] = useState('');
  const [estado, setEstado] = useState('');
  const [orden, setOrden] = useState('fecha');
  const [analizando, setAnalizando] = useState(null);

  useEffect(() => {
    authFetch(BASE_URL + '/api/postulaciones')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('No se pudieron cargar las postulaciones'))))
      .then(d => setItems(d.postulaciones ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const puestos = useMemo(() => [...new Set(items.map(i => i.puesto))].sort(), [items]);
  const visibles = items
    .filter(i => (!puesto || i.puesto === puesto) && (!estado || i.estado === estado))
    .sort((a, b) => (orden === 'puntaje' ? (b.analisis?.score ?? -1) - (a.analisis?.score ?? -1) : 0));

  async function reanalizar(id) {
    setAnalizando(id);
    try {
      const r = await authFetch(`${BASE_URL}/api/postulaciones/${id}/analizar`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'No se pudo analizar');
      setItems(list => list.map(i => (i.id === id ? { ...i, analisis: d.analisis } : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalizando(null);
    }
  }

  async function cambiarEstado(id, nuevo) {
    const prev = items;
    setItems(list => list.map(i => (i.id === id ? { ...i, estado: nuevo } : i)));
    const r = await authFetch(`${BASE_URL}/api/postulaciones/${id}`, { method: 'PUT', body: { estado: nuevo } });
    if (!r.ok) { setItems(prev); setError('No se pudo guardar el estado'); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Postulaciones</h1>
          <p className={styles.subtitle}>Lo que llega desde "Trabajá con nosotros" del sitio.</p>
        </div>
        <div className={styles.filters}>
          <select value={puesto} onChange={e => setPuesto(e.target.value)} aria-label="Filtrar por puesto">
            <option value="">Todos los puestos</option>
            {puestos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={orden} onChange={e => setOrden(e.target.value)} aria-label="Ordenar">
            <option value="fecha">Más nuevas primero</option>
            <option value="puntaje">Mejor puntaje primero</option>
          </select>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className={styles.empty}>{items.length ? 'No hay postulaciones con esos filtros.' : 'Todavía no llegó ninguna postulación.'}</p>
      ) : (
        <ul className={styles.list}>
          {visibles.map(p => (
            <li key={p.id} className={`${styles.card} ${p.estado === 'nueva' ? styles.cardNew : ''}`}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.name}>{p.nombre}</p>
                  <p className={styles.meta}>
                    <span className={styles.chip}>{p.puesto}</span>
                    {p.licencia && <span>Licencia {p.licencia}</span>}
                    {p.zona && <span>{p.zona}</span>}
                    <span>{fecha(p.createdAt)}</span>
                  </p>
                </div>
                <div className={styles.headRight}>
                  {p.analisis?.status === 'ok' && (
                    <span className={`${styles.score} ${p.analisis.score >= 70 ? styles.scoreAlto : p.analisis.score >= 40 ? styles.scoreMedio : styles.scoreBajo}`} title={`Puntaje IA para ${p.puesto}`}>
                      {p.analisis.score}
                    </span>
                  )}
                <select className={styles.estado} value={p.estado ?? 'nueva'} onChange={e => cambiarEstado(p.id, e.target.value)} aria-label="Estado">
                  {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                </div>
              </div>
              <p className={styles.contact}>
                <a href={`mailto:${p.email}`}>{p.email}</a>
                <a href={`tel:${p.telefono}`}>{p.telefono}</a>
                {p.cv?.chunks > 0 && (
                  <a href={`${BASE_URL}/api/postulaciones/${p.id}/cv?token=${encodeURIComponent(localStorage.getItem('linea126_token') ?? '')}`} target="_blank" rel="noopener noreferrer">
                    Ver CV (PDF) ↗
                  </a>
                )}
                {!p.cv && p.cvUrl && <a href={p.cvUrl} target="_blank" rel="noopener noreferrer">Ver CV ↗</a>}
              </p>
              {p.mensaje && <p className={styles.msg}>{p.mensaje}</p>}
              <AnalisisIA p={p} analizando={analizando === p.id} onReanalizar={() => reanalizar(p.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalisisIA({ p, analizando, onReanalizar }) {
  const a = p.analisis;
  const boton = (
    <button type="button" className={styles.linkBtn} onClick={onReanalizar} disabled={analizando}>
      {analizando ? 'Analizando…' : a?.status === 'ok' ? 'Volver a analizar' : 'Analizar con IA'}
    </button>
  );
  if (!a || a.status === 'pending') {
    return <div className={styles.ia}><span className={styles.iaLabel}>Análisis IA</span><div className={styles.iaFoot}><span>{a ? 'Analizando… (recargá en unos segundos)' : 'Sin analizar'}</span>{boton}</div></div>;
  }
  if (a.status !== 'ok') {
    return <div className={styles.ia}><span className={styles.iaLabel}>Análisis IA</span><div className={styles.iaFoot}><span>No se pudo analizar.</span>{boton}</div></div>;
  }
  return (
    <div className={styles.ia}>
      <span className={styles.iaLabel}>Análisis IA {a.conCv ? '(con CV)' : '(sin CV, sólo el formulario)'}</span>
      <p className={styles.iaResumen}>{a.resumen}</p>
      <p className={styles.iaMotivo}><strong>{a.score}/100:</strong> {a.motivo}</p>
      {a.puestoSugerido && a.puestoSugerido !== p.puesto && <p className={styles.iaMotivo}>💡 Encaja mejor como <strong>{a.puestoSugerido}</strong>.</p>}
      {a.alertas?.length > 0 && <ul className={styles.iaAlertas}>{a.alertas.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      <div className={styles.iaFoot}>
        <span>{[a.aniosExperiencia != null && `${a.aniosExperiencia} años de experiencia`, a.licencia && `Licencia ${a.licencia}`].filter(Boolean).join(' · ')}</span>
        {boton}
      </div>
    </div>
  );
}
