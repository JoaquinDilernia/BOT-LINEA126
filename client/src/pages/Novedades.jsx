import { useEffect, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import { toDate } from '../lib/reclamos';
import PiezaEditor from '../components/PiezaEditor';
import styles from './Gestion.module.css';

// Novedades: desvíos, cortes, paros y datos de la empresa. Lo vigente sale
// en el banner del sitio y el asistente lo usa para responder.

const EMPTY = { tipo: 'desvio', titulo: '', texto: '', desde: '', hasta: '', activo: true, destacado: false, crearImagen: true };

// Lo que necesita el editor de imágenes (fechas como ISO, no Timestamp de Firestore).
const paraPieza = (n) => ({
  id: n.id, tipo: n.tipo, titulo: n.titulo, texto: n.texto ?? '', pieza: n.pieza ?? null,
  desde: toDate(n.desde)?.toISOString() ?? null, hasta: toDate(n.hasta)?.toISOString() ?? null,
});

// Date → valor de <input type="datetime-local"> en hora local.
function toLocalInput(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fmt = (ts) => toDate(ts)?.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function vigente(n, now = new Date()) {
  if (n.activo === false) return false;
  const desde = toDate(n.desde);
  const hasta = toDate(n.hasta);
  return !(desde && now < desde) && !(hasta && now > hasta);
}

export default function Novedades() {
  const [novedades, setNovedades] = useState([]);
  const [tipos, setTipos] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [piezaDe, setPiezaDe] = useState(null);
  const [ordenando, setOrdenando] = useState(false);
  const [antes, setAntes] = useState(null); // lo que había antes de "Ordenar con IA", para deshacer
  const [avisoIA, setAvisoIA] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await authFetch(BASE_URL + '/api/novedades');
      if (r.ok) {
        const data = await r.json();
        setNovedades(data.novedades ?? []);
        setTipos(data.tipos ?? {});
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!editing.titulo.trim()) return;
    setSaving(true);
    try {
      const { crearImagen, pieza: _pieza, ...datos } = editing;
      const body = {
        ...datos,
        desde: editing.desde ? new Date(editing.desde).toISOString() : null,
        hasta: editing.hasta ? new Date(editing.hasta).toISOString() : null,
      };
      const url = editing.id ? `${BASE_URL}/api/novedades/${editing.id}` : `${BASE_URL}/api/novedades`;
      const r = await authFetch(url, { method: editing.id ? 'PUT' : 'POST', body });
      if (r.ok) {
        const { novedad } = await r.json();
        setEditing(null);
        load();
        if (crearImagen && novedad) setPiezaDe(paraPieza(novedad));
      }
    } finally {
      setSaving(false);
    }
  }

  async function quick(n, patch) {
    const r = await authFetch(`${BASE_URL}/api/novedades/${n.id}`, { method: 'PUT', body: patch });
    if (r.ok) load();
  }

  async function remove(n) {
    if (!window.confirm(`¿Borrar "${n.titulo}"?`)) return;
    const r = await authFetch(`${BASE_URL}/api/novedades/${n.id}`, { method: 'DELETE' });
    if (r.ok) load();
  }

  // El equipo escribe el detalle como le sale y la IA lo deja claro (y arma
  // el título si falta). Sólo cambia el form: se guarda con "Guardar".
  async function ordenar() {
    setOrdenando(true);
    setAvisoIA('');
    try {
      const r = await authFetch(`${BASE_URL}/api/novedades/redactar`, {
        method: 'POST',
        body: {
          tipo: editing.tipo, titulo: editing.titulo, texto: editing.texto,
          desde: editing.desde ? new Date(editing.desde).toISOString() : null,
          hasta: editing.hasta ? new Date(editing.hasta).toISOString() : null,
        },
      });
      const data = r.ok ? await r.json() : null;
      if (!data?.ia) { setAvisoIA('La IA no está disponible ahora. Probá de nuevo en un rato.'); return; }
      setAntes({ titulo: editing.titulo, texto: editing.texto });
      setEditing((e) => ({ ...e, titulo: data.titulo, texto: data.texto }));
    } catch {
      setAvisoIA('No se pudo conectar. Probá de nuevo.');
    } finally {
      setOrdenando(false);
    }
  }

  function deshacer() {
    setEditing((e) => ({ ...e, ...antes }));
    setAntes(null);
  }

  function abrir(n) {
    setAntes(null);
    setAvisoIA('');
    setEditing(n);
  }

  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className={styles.page} style={{ maxWidth: 880 }}>
      {piezaDe && <PiezaEditor novedad={piezaDe} onClose={() => setPiezaDe(null)} onSaved={load} />}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Novedades</h1>
          <p className={styles.subtitle}>Desvíos, cortes, paros y avisos. Lo vigente aparece en el banner del sitio y el asistente lo usa para responder.</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => abrir({ ...EMPTY })}>+ Nueva novedad</button>
      </header>

      {editing && (
        <div className={styles.panelBox}>
          <div className={styles.criterios}>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Tipo</span>
                <select value={editing.tipo} onChange={set('tipo')}>
                  {Object.entries(tipos).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Desde (opcional)</span>
                <input type="datetime-local" value={editing.desde} onChange={set('desde')} />
              </label>
              <label className={styles.field}>
                <span>Hasta (opcional)</span>
                <input type="datetime-local" value={editing.hasta} onChange={set('hasta')} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Título — lo que se lee en el banner</span>
              <input value={editing.titulo} onChange={set('titulo')} maxLength={140} placeholder="Ej: Ramal A desviado por obras en Av. Directorio" />
            </label>
            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label htmlFor="novedad-texto">Detalle — escribilo como te salga y tocá "Ordenar con IA"</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {antes && <button type="button" className={styles.ghostBtn} onClick={deshacer} disabled={ordenando}>Deshacer</button>}
                  <button type="button" className={styles.ghostBtn} onClick={ordenar} disabled={ordenando || saving || (!editing.texto.trim() && !editing.titulo.trim())}>
                    {ordenando ? 'Ordenando…' : '✨ Ordenar con IA'}
                  </button>
                </div>
              </div>
              <textarea id="novedad-texto" rows={4} value={editing.texto} onChange={set('texto')} disabled={ordenando} placeholder="Ej: ramal a desviado x obras en directorio entre larrazabal y escalada, va x eva peron. paradas de directorio sin servicio" />
              {antes && <small>Revisá que esté todo bien antes de guardar. Si no te gusta, tocá "Deshacer".</small>}
              {avisoIA && <small style={{ color: 'var(--color-error)' }}>{avisoIA}</small>}
            </div>
            <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label className={styles.check}><input type="checkbox" checked={editing.activo} onChange={set('activo')} /> Publicada</label>
                <label className={styles.check}><input type="checkbox" checked={editing.destacado} onChange={set('destacado')} /> Destacada (aviso emergente en el sitio)</label>
                <label className={styles.check}><input type="checkbox" checked={editing.crearImagen} onChange={set('crearImagen')} /> {editing.pieza ? 'Abrir las imágenes para redes' : 'Crear también las imágenes para redes'}</label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.ghostBtn} onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
                <button className={styles.primaryBtn} onClick={save} disabled={saving || !editing.titulo.trim()}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.muted}>Cargando…</p>
      ) : novedades.length === 0 ? (
        <p className={styles.muted}>No hay novedades cargadas. Cuando haya un desvío, corte o paro, cargalo acá y aparece en el sitio al instante.</p>
      ) : (
        <div className={styles.list}>
          {novedades.map(n => {
            const live = vigente(n);
            return (
              <article key={n.id} className={`${styles.item} ${live ? '' : styles.off}`}>
                <div>
                  <div className={styles.itemTop}>
                    <span className={`${styles.badge} ${live ? styles.live : ''}`}>{live ? 'En el sitio' : n.activo === false ? 'Despublicada' : 'Fuera de fecha'}</span>
                    <span className={styles.badge}>{tipos[n.tipo] ?? n.tipo}</span>
                    {n.destacado && <span className={`${styles.badge} ${styles.grave}`}>Destacada</span>}
                    {(n.desde || n.hasta) && <span className={styles.hint}>{n.desde ? `desde ${fmt(n.desde)}` : ''} {n.hasta ? `hasta ${fmt(n.hasta)}` : ''}</span>}
                  </div>
                  <h3>{n.titulo}</h3>
                  {n.texto && <p>{n.texto}</p>}
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.ghostBtn} onClick={() => quick(n, { activo: n.activo === false })}>{n.activo === false ? 'Publicar' : 'Despublicar'}</button>
                  <button className={styles.ghostBtn} onClick={() => setPiezaDe(paraPieza(n))}>{n.pieza ? 'Imágenes ✓' : 'Imágenes'}</button>
                  <button className={styles.ghostBtn} onClick={() => abrir({ ...EMPTY, ...n, crearImagen: false, desde: toLocalInput(n.desde), hasta: toLocalInput(n.hasta) })}>Editar</button>
                  <button className={styles.dangerBtn} onClick={() => remove(n)}>Borrar</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
