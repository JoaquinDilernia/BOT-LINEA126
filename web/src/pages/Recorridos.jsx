import { useMemo, useState } from 'react';
import PageHero from '../components/PageHero.jsx';
import RouteMap from '../components/RouteMap.jsx';
import RamalBadge from '../components/RamalBadge.jsx';
import { IconChat, IconClock, IconInfo, IconSearch } from '../components/icons.jsx';
import { useApi, usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { RAMALES, TIPO_RAMAL } from '../data/linea.js';
import s from './Recorridos.module.css';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Recorridos() {
  usePageTitle('Recorridos');
  useReveal();
  const { openChat } = useChat();
  const { data, loading, error } = useApi('/recorridos');
  const recorridos = data?.recorridos ?? [];
  const [ramalId, setRamalId] = useState(null);
  const [sentido, setSentido] = useState('ida');
  const [q, setQ] = useState('');
  const [seccion, setSeccion] = useState(null);

  const ramal = recorridos.find((r) => r.id === ramalId) ?? recorridos[0];
  const letra = ramal?.nombre.match(/Ramal (\w)/)?.[1] ?? 'A';
  const paradas = ramal?.paradas?.[sentido] ?? [];
  const [origen, destino] = useMemo(() => {
    const m = ramal?.nombre.match(/—\s*(.+?)\s*⇄\s*(.+)$/);
    return m ? [m[1], m[2]] : ['Retiro', 'La Tablada'];
  }, [ramal]);

  const filtradas = useMemo(() => {
    const n = normalizar(q.trim());
    return n ? paradas.filter((p) => normalizar(p.nombre).includes(n)) : paradas;
  }, [paradas, q]);

  return (
    <>
      <PageHero kicker="Recorridos" title="Por dónde pasa la 126">
        Paradas, secciones y mapa de cada ramal. Los datos son los mismos que usa el asistente para responderte.
      </PageHero>

      <section className="section">
        <div className="container">
          <div className={s.toolbar}>
            <div className={s.tabs} role="tablist" aria-label="Ramal">
              {recorridos.map((r) => {
                const l = r.nombre.match(/Ramal (\w)/)?.[1];
                const activo = r.id === ramal?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    className={`${s.tab} ${activo ? s.tabActive : ''}`}
                    onClick={() => { setRamalId(r.id); setSeccion(null); }}
                  >
                    <RamalBadge letra={l} size="sm" />
                    {r.nombre.replace(/^Ramal \w\s*—\s*/, '')}
                  </button>
                );
              })}
            </div>
            <div className={s.sentido} role="group" aria-label="Sentido">
              <button type="button" className={sentido === 'ida' ? s.on : ''} aria-pressed={sentido === 'ida'} onClick={() => setSentido('ida')}>Hacia {destino}</button>
              <button type="button" className={sentido === 'vuelta' ? s.on : ''} aria-pressed={sentido === 'vuelta'} onClick={() => setSentido('vuelta')}>Hacia {origen}</button>
            </div>
          </div>

          {loading && <div className={s.loading}>Cargando recorridos…</div>}
          {error && <div className={s.loading}>No pudimos cargar los recorridos. Probá de nuevo en un rato.</div>}

          {ramal && (
            <div className={s.grid}>
              <div className={s.mapCol}>
                <RouteMap recorrido={ramal} sentido={sentido} highlight={seccion} height={620} />
                {ramal.descripcion && <p className={s.desc}><IconInfo /> {ramal.descripcion}</p>}
              </div>

              <aside className={`card ${s.list}`}>
                <div className={s.listHead}>
                  <h2><RamalBadge letra={letra} size="sm" /> {paradas.length} paradas</h2>
                  <div className={s.search}>
                    <IconSearch />
                    <label htmlFor="buscar-parada" className="srOnly">Buscar parada</label>
                    <input id="buscar-parada" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar calle o parada" />
                  </div>
                </div>
                <ol className={s.stops}>
                  {filtradas.map((p, i) => {
                    const prev = filtradas[i - 1];
                    const nuevaSeccion = !q && (!prev || prev.seccion !== p.seccion);
                    return (
                      <li key={p.orden}>
                        {nuevaSeccion && (
                          <button
                            type="button"
                            className={`${s.secHead} ${seccion === p.seccion ? s.secOn : ''}`}
                            onClick={() => setSeccion(seccion === p.seccion ? null : p.seccion)}
                          >
                            Sección {p.seccion}
                            <span>{ramal.secciones.find((x) => x.numero === p.seccion)?.nombre}</span>
                          </button>
                        )}
                        <div className={`${s.stop} ${seccion === p.seccion ? s.stopOn : ''}`}>
                          <span className={s.dot} />
                          <span className={s.stopName}>{p.nombre}</span>
                          {q && <small>Secc. {p.seccion}</small>}
                        </div>
                      </li>
                    );
                  })}
                  {filtradas.length === 0 && (
                    <li className={s.empty}>
                      No encontramos “{q}”.{' '}
                      <button type="button" onClick={() => openChat(`¿La 126 pasa por ${q}?`)}>Preguntale al asistente</button>
                    </li>
                  )}
                </ol>
              </aside>
            </div>
          )}
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Ramales</span>
            <h2>Todos los servicios de la línea</h2>
            <p>El A y el B son los servicios comunes. El C y el D son expresos por autopista: hacen el trazado del A y el B, pero sin parar en el tramo de la AU 25 de Mayo.</p>
          </div>
          <div className={s.ramales}>
            {RAMALES.map((r) => (
              <article key={r.letra} className={`card reveal ${s.ramal}`}>
                <RamalBadge letra={r.letra} tipo={r.tipo} size="lg" />
                <div>
                  <span className={s.ramalTipo}>{TIPO_RAMAL[r.tipo]}</span>
                  <h3>{r.desde} — {r.hasta}</h3>
                  <p>{r.via}</p>
                  <p className={s.ramalHorario}><IconClock /> {r.horario}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={`reveal ${s.expreso}`}>
            <RamalBadge letra="C" tipo="expreso" />
            <div>
              <h3>Cómo funcionan los expresos (C y D)</h3>
              <p>Hacia provincia no se puede subir ni bajar entre Carlos Calvo (subida a la AU 25 de Mayo) y Pitágoras y Av. Alberdi. Hacia Retiro, entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan. En el resto del recorrido paran como el servicio común.</p>
            </div>
          </div>

          <div className={`reveal ${s.help}`}>
            <p>¿No sabés en qué parada bajarte?</p>
            <button type="button" className="btn" onClick={() => openChat('¿En qué parada me tengo que bajar para ir a ')}><IconChat /> Preguntale al asistente</button>
          </div>
        </div>
      </section>
    </>
  );
}
