import { useEffect, useMemo, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import { CATEGORIAS, RAMALES, categoriaLabel, fechaCorta, mesActual, mesLabel, parseCargaMasiva } from '../lib/reclamos';
import styles from './Gestion.module.css';

// Gestión de reclamos: la carga mensual para estadísticas. Acá la línea
// completa chofer / interno / ramal de cada reclamo (aunque ya se haya
// respondido solo) y suma los que le llegaron por otros medios. Nada de esto
// se conecta con el pasajero.

const EJEMPLO = 'Fecha\tCategoría\tInterno\tRamal\tChofer\tDetalle\n03/10/2026\tNo realizó la parada\t36\tA\t4521\tDirectorio y Azul, 8:15';

function Ranking({ title, rows, unidad, extra }) {
  return (
    <section className={styles.rankCard}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.muted}>Sin datos cargados este mes.</p>
      ) : (
        <ol className={styles.rank}>
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <span className={styles.rankKey}>{unidad} {r.key}</span>
              <span className={styles.rankWhy}>{extra ? extra(r) : `${categoriaLabel(r.principal)}${r.categorias[r.principal] > 1 ? ` (${r.categorias[r.principal]})` : ''}`}</span>
              <strong className={styles.rankNum}>{r.total}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Criterios({ onSaved }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch(BASE_URL + '/api/reclamos/config').then(r => (r.ok ? r.json() : null)).then(d => d && setConfig(d.config));
  }, []);

  if (!config) return <p className={styles.muted}>Cargando…</p>;

  const toggle = (key, id) => setConfig(c => ({
    ...c,
    [key]: c[key].includes(id) ? c[key].filter(x => x !== id) : [...c[key], id],
  }));

  async function save() {
    setSaving(true);
    try {
      const r = await authFetch(BASE_URL + '/api/reclamos/config', { method: 'PUT', body: config });
      if (r.ok) { setConfig((await r.json()).config); setSaved(true); setTimeout(() => setSaved(false), 2500); onSaved?.(); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.criterios}>
      <div className={styles.critCols}>
        <fieldset>
          <legend>Son <b>graves</b> (llegan a la bandeja y se responden a mano)</legend>
          {CATEGORIAS.map(c => (
            <label key={c.id} className={styles.check}>
              <input type="checkbox" checked={config.categoriasGraves.includes(c.id)} onChange={() => toggle('categoriasGraves', c.id)} />
              {c.label}
            </label>
          ))}
          <p className={styles.hint}>Un reclamo que el asistente marca como urgente siempre es grave.</p>
        </fieldset>
        <fieldset>
          <legend>Se pueden tomar <b>sin número de interno</b></legend>
          {CATEGORIAS.map(c => (
            <label key={c.id} className={styles.check}>
              <input type="checkbox" checked={config.categoriasSinInterno.includes(c.id)} onChange={() => toggle('categoriasSinInterno', c.id)} />
              {c.label}
            </label>
          ))}
        </fieldset>
      </div>
      <label className={styles.field}>
        <span>Respuesta automática para los reclamos comunes</span>
        <textarea rows={3} value={config.respuestaAutomatica} onChange={e => setConfig({ ...config, respuestaAutomatica: e.target.value })} />
      </label>
      <div className={styles.actions}>
        {saved && <span className={styles.ok}>✓ Guardado</span>}
        <button className={styles.primaryBtn} onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar criterios'}</button>
      </div>
    </div>
  );
}

function CargaMasiva({ onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const { filas, errores } = useMemo(() => parseCargaMasiva(text), [text]);

  async function enviar() {
    if (!filas.length) return;
    setSaving(true);
    try {
      const r = await authFetch(BASE_URL + '/api/reclamos/carga', { method: 'POST', body: { rows: filas } });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { setResult(data); setText(''); onDone?.(); } else setResult({ error: data.error ?? 'No se pudo cargar' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.carga}>
      <p className={styles.hint}>
        Pegá filas copiadas de Excel o Google Sheets con estas columnas: <b>fecha, categoría, interno, ramal, chofer, detalle</b>. La primera fila puede ser el encabezado. Estos reclamos son sólo para estadísticas: no se le responde a nadie.
      </p>
      <textarea rows={7} value={text} onChange={e => { setText(e.target.value); setResult(null); }} placeholder={EJEMPLO} spellCheck={false} />
      {text && (
        <p className={styles.hint}>
          {filas.length} {filas.length === 1 ? 'fila lista' : 'filas listas'} para cargar
          {errores.length > 0 && <span className={styles.err}> · {errores.length} con error: {errores.slice(0, 3).join(' · ')}</span>}
        </p>
      )}
      {result?.creados !== undefined && <p className={styles.ok}>✓ Se cargaron {result.creados} reclamos.</p>}
      {result?.error && <p className={styles.err}>{result.error}</p>}
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={enviar} disabled={saving || !filas.length}>{saving ? 'Cargando…' : `Cargar ${filas.length || ''} reclamos`}</button>
      </div>
    </div>
  );
}

function FilaReclamo({ t, onSaved }) {
  async function patch(body) {
    const r = await authFetch(BASE_URL + `/api/reclamos/${t.id}`, { method: 'PUT', body });
    if (r.ok) onSaved((await r.json()).ticket);
  }
  const blur = (field) => (e) => {
    const v = e.target.value.trim();
    if (v !== String(t[field] ?? '')) patch({ [field]: v });
  };
  return (
    <tr>
      <td className={styles.num}>{fechaCorta(t.fechaHecho ?? t.createdAt)}</td>
      <td className={styles.mono}>{t.numero ?? <span className={styles.muted}>carga</span>}</td>
      <td>
        <span className={styles.cat}>{categoriaLabel(t.categoria)}</span>
        {t.descripcion && <span className={styles.desc} title={t.descripcion}>{t.descripcion}</span>}
      </td>
      <td><span className={`${styles.badge} ${t.gravedad === 'grave' ? styles.grave : ''}`}>{t.gravedad === 'grave' ? 'Grave' : 'Común'}</span></td>
      <td><input className={styles.cell} defaultValue={t.numeroUnidad ?? ''} onBlur={blur('numeroUnidad')} placeholder="—" inputMode="numeric" aria-label="Interno" /></td>
      <td>
        <select className={styles.cell} value={t.ramal ?? ''} onChange={e => patch({ ramal: e.target.value })} aria-label="Ramal">
          <option value="">—</option>
          {RAMALES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td><input className={styles.cell} defaultValue={t.legajoChofer ?? ''} onBlur={blur('legajoChofer')} placeholder="Legajo" aria-label="Chofer" /></td>
    </tr>
  );
}

export default function Gestion() {
  const [mes, setMes] = useState(mesActual());
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // 'carga' | 'criterios' | null
  const [soloSinChofer, setSoloSinChofer] = useState(false);

  useEffect(() => { load(); }, [mes]);

  async function load() {
    setLoading(true);
    try {
      const [rt, rs] = await Promise.all([
        authFetch(`${BASE_URL}/api/reclamos?mes=${mes}`),
        authFetch(`${BASE_URL}/api/reclamos/stats?mes=${mes}`),
      ]);
      if (rt.ok) setTickets((await rt.json()).tickets ?? []);
      if (rs.ok) setStats((await rs.json()).stats);
    } finally {
      setLoading(false);
    }
  }

  async function refreshStats() {
    const rs = await authFetch(`${BASE_URL}/api/reclamos/stats?mes=${mes}`);
    if (rs.ok) setStats((await rs.json()).stats);
  }

  function onSaved(ticket) {
    setTickets(prev => prev.map(t => (t.id === ticket.id ? ticket : t)));
    refreshStats();
  }

  const visibles = soloSinChofer ? tickets.filter(t => !String(t.legajoChofer ?? '').trim()) : tickets;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de reclamos</h1>
          <p className={styles.subtitle}>Carga mensual para estadísticas internas. No se conecta con el pasajero.</p>
        </div>
        <div className={styles.headerActions}>
          <input type="month" className={styles.month} value={mes} onChange={e => e.target.value && setMes(e.target.value)} aria-label="Mes" />
          <button className={`${styles.ghostBtn} ${panel === 'criterios' ? styles.on : ''}`} onClick={() => setPanel(p => (p === 'criterios' ? null : 'criterios'))}>Criterios</button>
          <button className={styles.primaryBtn} onClick={() => setPanel(p => (p === 'carga' ? null : 'carga'))}>+ Cargar reclamos</button>
        </div>
      </header>

      {panel && (
        <div className={styles.panelBox}>
          {panel === 'carga' ? <CargaMasiva onDone={load} /> : <Criterios onSaved={load} />}
        </div>
      )}

      {stats && (
        <div className={styles.kpis}>
          <div><strong>{stats.total}</strong><span>reclamos en {mesLabel(mes)}</span></div>
          <div><strong>{stats.graves}</strong><span>graves</span></div>
          <div><strong>{stats.comunes}</strong><span>comunes{stats.automaticos ? ` · ${stats.automaticos} respondidos solos` : ''}</span></div>
          <div className={stats.sinChofer ? styles.kpiWarn : ''}><strong>{stats.sinChofer}</strong><span>sin chofer cargado</span></div>
        </div>
      )}

      {stats && (
        <div className={styles.ranks}>
          <Ranking title="Por chofer" unidad="Legajo" rows={stats.porChofer} />
          <Ranking title="Por interno" unidad="Interno" rows={stats.porInterno} />
          <Ranking
            title="Por ramal"
            unidad="Ramal"
            rows={stats.porRamal}
            extra={(r) => (r.categorias.demora ? `${r.categorias.demora} por falta de frecuencia` : categoriaLabel(r.principal))}
          />
        </div>
      )}

      <section className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>Reclamos del mes</h2>
          <label className={styles.check}>
            <input type="checkbox" checked={soloSinChofer} onChange={e => setSoloSinChofer(e.target.checked)} />
            Sólo sin chofer
          </label>
        </div>
        {loading ? (
          <p className={styles.muted}>Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className={styles.muted}>No hay reclamos {soloSinChofer ? 'pendientes de completar ' : ''}en {mesLabel(mes)}.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>Fecha</th><th>N°</th><th>Categoría</th><th>Tipo</th><th>Interno</th><th>Ramal</th><th>Chofer</th></tr>
              </thead>
              <tbody>
                {visibles.map(t => <FilaReclamo key={t.id} t={t} onSaved={onSaved} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
