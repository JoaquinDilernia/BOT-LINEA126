import { useEffect, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Gestion.module.css';

// Flota: los números de interno de la línea. El asistente no toma un reclamo
// de viaje con un interno que no esté en esta lista.
export default function Flota() {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await authFetch(BASE_URL + '/api/unidades');
      if (r.ok) setUnidades((await r.json()).unidades ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function agregar() {
    if (!texto.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await authFetch(BASE_URL + '/api/unidades', { method: 'POST', body: { texto } });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { setMsg({ ok: true, text: `✓ ${data.agregados} internos cargados` }); setTexto(''); load(); }
      else setMsg({ ok: false, text: data.error ?? 'No se pudo cargar' });
    } finally {
      setSaving(false);
    }
  }

  async function quitar(interno) {
    const r = await authFetch(`${BASE_URL}/api/unidades/${interno}`, { method: 'DELETE' });
    if (r.ok) setUnidades(prev => prev.filter(u => u.interno !== interno));
  }

  const visibles = q.trim() ? unidades.filter(u => u.interno.startsWith(q.trim())) : unidades;

  return (
    <div className={styles.page} style={{ maxWidth: 880 }}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Flota</h1>
          <p className={styles.subtitle}>Números de interno de la línea. Para tomar un reclamo el asistente pide el interno y lo valida contra esta lista.</p>
        </div>
      </header>

      <div className={styles.panelBox}>
        <div className={styles.carga}>
          <label className={styles.field}>
            <span>Agregar internos — uno por línea, separados por coma o en rangos</span>
            <textarea rows={3} value={texto} onChange={e => { setTexto(e.target.value); setMsg(null); }} placeholder="Ej: 1-120, 125, 130-135" />
          </label>
          <div className={styles.actions}>
            {msg && <span className={msg.ok ? styles.ok : styles.err}>{msg.text}</span>}
            <button className={styles.primaryBtn} onClick={agregar} disabled={saving || !texto.trim()}>{saving ? 'Cargando…' : 'Agregar'}</button>
          </div>
        </div>
      </div>

      <section className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>{unidades.length} {unidades.length === 1 ? 'interno' : 'internos'}</h2>
          {unidades.length > 20 && <input className={styles.search} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar interno" inputMode="numeric" />}
        </div>
        {loading ? (
          <p className={styles.muted}>Cargando…</p>
        ) : unidades.length === 0 ? (
          <p className={styles.muted}>Todavía no hay internos cargados. Mientras la lista esté vacía, el asistente acepta cualquier número de interno.</p>
        ) : (
          <div className={styles.chips}>
            {visibles.map(u => (
              <span key={u.interno} className={styles.chip}>
                {u.interno}
                <button type="button" onClick={() => quitar(u.interno)} aria-label={`Quitar interno ${u.interno}`} title="Quitar">×</button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
