import { useEffect, useRef, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import { FORMATOS, FONDOS, renderPieza, loadFuentes, canvasToBlob, slug } from '../lib/pieza';
import styles from './PiezaEditor.module.css';

// Imágenes para redes de una novedad: un boceto (textos cortos) que la IA
// sugiere a partir de la novedad y la persona ajusta, dibujado en todas las
// medidas (historia/estado, post, cuadrado, horizontal) para descargar y
// subir a mano. Más adelante: publicar la historia directo en IG.

const EMPTY = { etiqueta: '', titular: '', bajada: '', puntos: [], cuando: '', cierre: '', fondo: 'auto' };

function Preview({ formato, pieza, tipo, foto, ready, onCanvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ready && ref.current) renderPieza(ref.current, formato, pieza, { tipo, foto });
  }, [ready, formato, pieza, tipo, foto]);
  useEffect(() => { onCanvas(formato.id, ref.current); }, [formato.id, onCanvas]);
  return <canvas ref={ref} className={styles.canvas} style={{ aspectRatio: `${formato.w} / ${formato.h}` }} />;
}

export default function PiezaEditor({ novedad, onClose, onSaved }) {
  const [pieza, setPieza] = useState(novedad.pieza ? { ...EMPTY, ...novedad.pieza } : null);
  const [puntosText, setPuntosText] = useState((novedad.pieza?.puntos ?? []).join('\n'));
  const [foto, setFoto] = useState(null);
  const [ready, setReady] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);
  const canvases = useRef({});
  const onCanvas = useRef((id, el) => { canvases.current[id] = el; }).current;
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  useEffect(() => { loadFuentes().finally(() => setReady(true)); }, []);
  // Una sola sugerencia al abrir (StrictMode corre los efectos dos veces en dev).
  const sugerido = useRef(false);
  useEffect(() => {
    if (novedad.pieza || sugerido.current) return;
    sugerido.current = true;
    sugerir();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sugerir() {
    setSuggesting(true);
    setStatus('');
    try {
      const r = await authFetch(`${BASE_URL}/api/novedades/pieza/sugerir`, { method: 'POST', body: novedad });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo armar el boceto');
      setPieza((prev) => ({ ...EMPTY, ...data.pieza, fondo: prev?.fondo ?? 'auto' }));
      setPuntosText((data.pieza.puntos ?? []).join('\n'));
      setDirty(true);
      if (!data.ia) setStatus('La IA no respondió: armé el boceto con lo que cargaste. Ajustalo a mano.');
    } catch (err) {
      setStatus(err.message);
      setPieza((p) => p ?? { ...EMPTY, titular: novedad.titulo ?? '', bajada: novedad.texto ?? '' });
    } finally {
      setSuggesting(false);
    }
  }

  const set = (k) => (e) => { setPieza({ ...pieza, [k]: e.target.value }); setDirty(true); };
  function setPuntos(e) {
    setPuntosText(e.target.value);
    setPieza({ ...pieza, puntos: e.target.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4) });
    setDirty(true);
  }

  function pickFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setFoto(img);
    img.src = url;
  }

  async function guardar({ silent = false } = {}) {
    if (!novedad.id || !pieza) return;
    const r = await authFetch(`${BASE_URL}/api/novedades/${novedad.id}`, { method: 'PUT', body: { pieza } });
    if (r.ok) {
      setDirty(false);
      if (!silent) setStatus('Boceto guardado.');
      onSaved?.();
    } else if (!silent) setStatus('No se pudo guardar el boceto.');
  }

  const fileName = (f) => `linea126-${slug(pieza?.titular || novedad.titulo)}-${f.id}.png`;

  async function descargar(f, { guardarBoceto = true } = {}) {
    const blob = await canvasToBlob(canvases.current[f.id]);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(f);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (guardarBoceto && dirty) guardar({ silent: true });
  }

  async function descargarTodas() {
    if (dirty) guardar({ silent: true });
    for (const f of FORMATOS) {
      await descargar(f, { guardarBoceto: false });
      await new Promise(r => setTimeout(r, 350)); // el navegador frena descargas en ráfaga
    }
  }

  // En el celular: abre el menú de compartir (Instagram, WhatsApp…) con la imagen.
  async function compartir(f) {
    const blob = await canvasToBlob(canvases.current[f.id]);
    const file = new File([blob], fileName(f), { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return descargar(f);
    try {
      await navigator.share({ files: [file] });
      if (dirty) guardar({ silent: true });
    } catch { /* canceló */ }
  }

  function cerrar() {
    if (dirty && novedad.id) guardar({ silent: true });
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className={styles.modal} role="dialog" aria-label="Imágenes para redes">
        <header className={styles.head}>
          <div>
            <h2>Imágenes para redes</h2>
            <p>{novedad.titulo}</p>
          </div>
          <button className={styles.close} onClick={cerrar} aria-label="Cerrar">×</button>
        </header>

        <div className={styles.body}>
          <section className={styles.form}>
            <div className={styles.formTop}>
              <strong>Boceto</strong>
              <button className={styles.ghostBtn} onClick={sugerir} disabled={suggesting}>
                {suggesting ? 'Pensando…' : '✨ Sugerir con IA'}
              </button>
            </div>
            {!pieza ? (
              <p className={styles.hint}>{suggesting ? 'La IA está resumiendo la novedad…' : ''}</p>
            ) : (
              <>
                <label className={styles.field}><span>Fondo</span>
                  <select value={pieza.fondo ?? 'auto'} onChange={set('fondo')}>
                    {Object.entries(FONDOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label className={styles.field}><span>Etiqueta</span>
                  <input value={pieza.etiqueta} onChange={set('etiqueta')} maxLength={24} />
                </label>
                <label className={styles.field}><span>Titular — va en mayúsculas, con el punto final de la marca</span>
                  <textarea rows={2} value={pieza.titular} onChange={set('titular')} maxLength={70} />
                </label>
                <label className={styles.field}><span>Bajada (opcional)</span>
                  <textarea rows={3} value={pieza.bajada} onChange={set('bajada')} maxLength={160} />
                </label>
                <label className={styles.field}><span>Puntos — uno por línea, hasta 4 (opcional)</span>
                  <textarea rows={4} value={puntosText} onChange={setPuntos} placeholder={'Ramal A\nSigue por Av. Eva Perón'} />
                </label>
                <label className={styles.field}><span>Cuándo (opcional)</span>
                  <input value={pieza.cuando} onChange={set('cuando')} maxLength={60} placeholder="Sábado 28/11, de 8 a 18 h" />
                </label>
                <label className={styles.field}><span>Cierre</span>
                  <input value={pieza.cierre} onChange={set('cierre')} maxLength={60} />
                </label>
                <label className={styles.field}><span>Foto (opcional — no se guarda, sólo va en la imagen)</span>
                  <input type="file" accept="image/*" onChange={pickFoto} />
                </label>
                {foto && <button className={styles.linkBtn} onClick={() => setFoto(null)}>Sacar la foto</button>}
              </>
            )}
            {status && <p className={styles.hint}>{status}</p>}
            <div className={styles.formActions}>
              {novedad.id && <button className={styles.ghostBtn} onClick={() => guardar()} disabled={!pieza || !dirty}>Guardar boceto</button>}
              <button className={styles.primaryBtn} onClick={descargarTodas} disabled={!pieza || !ready}>Descargar todas</button>
            </div>
          </section>

          <section className={styles.previews}>
            {pieza && FORMATOS.map(f => (
              <figure key={f.id} className={`${styles.preview} ${styles[f.id] ?? ''}`}>
                <Preview formato={f} pieza={pieza} tipo={novedad.tipo} foto={foto} ready={ready} onCanvas={onCanvas} />
                <figcaption>
                  <div><strong>{f.label}</strong><span>{f.medida}</span></div>
                  <div className={styles.figActions}>
                    {canShare && <button className={styles.ghostBtn} onClick={() => compartir(f)}>Compartir</button>}
                    <button className={styles.ghostBtn} onClick={() => descargar(f)}>Descargar</button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
