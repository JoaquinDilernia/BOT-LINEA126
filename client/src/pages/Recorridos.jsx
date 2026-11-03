// client/src/pages/Recorridos.jsx
import { useEffect, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Recorridos.module.css';

const SECCIONES_DEFAULT = [
  { numero: 1, nombre: '' }, { numero: 2, nombre: '' }, { numero: 3, nombre: '' }, { numero: 4, nombre: '' },
];
const EMPTY = {
  nombre: '', lineaNombre: '', descripcion: '', activo: true,
  secciones: SECCIONES_DEFAULT.map(s => ({ ...s })),
  cuadroTarifario: SECCIONES_DEFAULT.map(s => ({ hastaSeccion: s.numero, precio: 0 })),
  paradasIdaTexto: '', paradasVueltaTexto: '',
};

const PLACEHOLDER = `=== Sección 1 ===
Av Diego A Maradona 4920
Av Diego A Maradona y Salta
=== Sección 2 ===
Av Crovara 2840
...`;

function paradasToTexto(paradas = []) {
  let seccion = null;
  const out = [];
  for (const p of paradas) {
    if (p.seccion !== seccion) { seccion = p.seccion; out.push(`=== Sección ${seccion} ===`); }
    out.push(p.nombre);
  }
  return out.join('\n');
}

function contar(texto) {
  const lineas = String(texto).split('\n').map(l => l.trim()).filter(Boolean);
  const paradas = lineas.filter(l => !/^=+\s*secci/i.test(l));
  return paradas.length;
}

export default function Recorridos() {
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await authFetch(BASE_URL + '/api/recorridos');
      if (r.ok) setRecorridos((await r.json()).recorridos ?? []);
    } finally { setLoading(false); }
  }

  function startNew() {
    setGeoMsg('');
    setEditing({
      ...EMPTY,
      secciones: EMPTY.secciones.map(s => ({ ...s })),
      cuadroTarifario: EMPTY.cuadroTarifario.map(f => ({ ...f })),
      paradasIdaOrig: '', paradasVueltaOrig: '',
      paradasOrig: { ida: [], vuelta: [] },
    });
  }
  function startEdit(rec) {
    setGeoMsg('');
    const idaTexto = paradasToTexto(rec.paradas?.ida);
    const vueltaTexto = paradasToTexto(rec.paradas?.vuelta);
    setEditing({
      ...rec,
      paradasIdaTexto: idaTexto,
      paradasVueltaTexto: vueltaTexto,
      // Guardamos el texto y los objetos originales (con coords) para no pisar
      // el geocoding si el usuario no toca las paradas al editar.
      paradasIdaOrig: idaTexto,
      paradasVueltaOrig: vueltaTexto,
      paradasOrig: { ida: rec.paradas?.ida ?? [], vuelta: rec.paradas?.vuelta ?? [] },
    });
  }

  function setSeccionCount(n) {
    setEditing(e => {
      const secciones = Array.from({ length: n }, (_, i) => e.secciones[i] ?? { numero: i + 1, nombre: '' });
      const cuadroTarifario = Array.from({ length: n }, (_, i) => e.cuadroTarifario[i] ?? { hastaSeccion: i + 1, precio: 0 });
      return { ...e, secciones, cuadroTarifario };
    });
  }

  async function save() {
    if (!editing.nombre?.trim()) return;
    setSaving(true);
    try {
      const body = {
        nombre: editing.nombre.trim(), lineaNombre: editing.lineaNombre?.trim() ?? '',
        descripcion: editing.descripcion?.trim() ?? '', activo: editing.activo !== false,
        secciones: editing.secciones, cuadroTarifario: editing.cuadroTarifario,
      };
      // Por sentido: si el textarea NO cambió respecto del original, mandamos las
      // paradas originales (con lat/lng) en vez del texto, para no perder el
      // geocoding al editar precios / nombre / activo. Si cambió, mandamos el
      // texto nuevo (perder coords de ese sentido es correcto: las paradas cambiaron).
      const idaChanged = (editing.paradasIdaTexto ?? '') !== (editing.paradasIdaOrig ?? '');
      const vueltaChanged = (editing.paradasVueltaTexto ?? '') !== (editing.paradasVueltaOrig ?? '');
      if (idaChanged) body.paradasIdaTexto = editing.paradasIdaTexto ?? '';
      else body.paradas = { ...(body.paradas ?? {}), ida: editing.paradasOrig?.ida ?? [] };
      if (vueltaChanged) body.paradasVueltaTexto = editing.paradasVueltaTexto ?? '';
      else body.paradas = { ...(body.paradas ?? {}), vuelta: editing.paradasOrig?.vuelta ?? [] };
      const url = editing.id ? `${BASE_URL}/api/recorridos/${editing.id}` : `${BASE_URL}/api/recorridos`;
      const r = await authFetch(url, { method: editing.id ? 'PUT' : 'POST', body });
      if (r.ok) { setEditing(null); load(); }
    } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm('¿Borrar este recorrido?')) return;
    const r = await authFetch(`${BASE_URL}/api/recorridos/${id}`, { method: 'DELETE' });
    if (r.ok) load();
  }

  async function geocodificar() {
    if (!editing?.id) { setGeoMsg('Guardá el recorrido antes de geocodificar.'); return; }
    setGeoMsg('Geocodificando… (puede tardar 1-2 min)');
    const r = await authFetch(`${BASE_URL}/api/recorridos/${editing.id}/geocodificar`, { method: 'POST' });
    if (r.ok) {
      const { ok, fallidas } = await r.json();
      setGeoMsg(`${ok} paradas geocodificadas.` + (fallidas.length ? ` Sin resultado (${fallidas.length}): ${fallidas.join(', ')}` : ''));
      load();
    } else setGeoMsg('Error geocodificando.');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Recorridos</h1>
        <button className={styles.newBtn} onClick={startNew}>+ Nuevo recorrido</button>
      </div>
      <p className={styles.subtitle}>Cargá acá los recorridos parada por parada (ida y vuelta) y el cuadro tarifario por secciones. El bot lo usa para responder cuánto sale un viaje.</p>

      {loading ? <p className={styles.empty}>Cargando…</p> : (
        <div className={styles.list}>
          {recorridos.map(rec => (
            <div key={rec.id} className={styles.card}>
              <div>
                <strong>{rec.nombre}</strong> <span className={styles.linea}>{rec.lineaNombre}</span>
                <div className={styles.meta}>{(rec.paradas?.ida?.length ?? 0)} paradas ida · {(rec.paradas?.vuelta?.length ?? 0)} vuelta · {rec.secciones?.length ?? 0} secciones {rec.activo ? '' : '· inactivo'}</div>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.linkBtn} onClick={() => startEdit(rec)}>Editar</button>
                <button className={`${styles.linkBtn} ${styles.danger}`} onClick={() => remove(rec.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {recorridos.length === 0 && <p className={styles.empty}>Todavía no hay recorridos cargados.</p>}
        </div>
      )}

      {editing && (
        <div className={styles.editor}>
          <h2>{editing.id ? 'Editar recorrido' : 'Nuevo recorrido'}</h2>
          <div className={styles.row}>
            <label>Nombre<input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} placeholder="Ramal A — Retiro ⇄ La Tablada" /></label>
            <label>Línea<input value={editing.lineaNombre} onChange={e => setEditing({ ...editing, lineaNombre: e.target.value })} placeholder="Línea 126" /></label>
          </div>
          <label>Descripción<textarea rows={2} value={editing.descripcion} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} /></label>
          <label className={styles.check}><input type="checkbox" checked={editing.activo !== false} onChange={e => setEditing({ ...editing, activo: e.target.checked })} /> Activo</label>

          <h3>Secciones y cuadro tarifario</h3>
          <div className={styles.seccionCount}>
            Cantidad de secciones:
            <button onClick={() => setSeccionCount(Math.max(1, editing.secciones.length - 1))}>−</button>
            {editing.secciones.length}
            <button onClick={() => setSeccionCount(editing.secciones.length + 1)}>+</button>
          </div>
          {editing.secciones.map((s, i) => (
            <div key={i} className={styles.seccionRow}>
              <span>Sección {i + 1}</span>
              <input placeholder="Nombre del tramo" value={s.nombre} onChange={e => {
                const secciones = [...editing.secciones]; secciones[i] = { ...s, nombre: e.target.value };
                setEditing({ ...editing, secciones });
              }} />
              <span>Hasta acá $</span>
              <input type="number" value={editing.cuadroTarifario[i]?.precio ?? 0} onChange={e => {
                const cuadroTarifario = [...editing.cuadroTarifario];
                cuadroTarifario[i] = { hastaSeccion: i + 1, precio: Number(e.target.value) || 0 };
                setEditing({ ...editing, cuadroTarifario });
              }} />
            </div>
          ))}

          <h3>Paradas — Ida</h3>
          <textarea className={styles.paradas} rows={12} placeholder={PLACEHOLDER} value={editing.paradasIdaTexto} onChange={e => setEditing({ ...editing, paradasIdaTexto: e.target.value })} />
          <div className={styles.meta}>{contar(editing.paradasIdaTexto)} paradas</div>

          <h3>Paradas — Vuelta</h3>
          <textarea className={styles.paradas} rows={12} placeholder={PLACEHOLDER} value={editing.paradasVueltaTexto} onChange={e => setEditing({ ...editing, paradasVueltaTexto: e.target.value })} />
          <div className={styles.meta}>{contar(editing.paradasVueltaTexto)} paradas</div>

          <div className={styles.geo}>
            <button className={styles.linkBtn} onClick={geocodificar} disabled={saving}>Geocodificar paradas</button>
            {geoMsg && <span className={styles.geoMsg}>{geoMsg}</span>}
          </div>

          <div className={styles.editorActions}>
            <button className={styles.newBtn} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            <button className={styles.linkBtn} onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
