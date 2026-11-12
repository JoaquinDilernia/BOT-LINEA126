import { useMemo, useState } from 'react';
import PageHero from '../components/PageHero.jsx';
import RamalBadge from '../components/RamalBadge.jsx';
import { IconChat, IconClock, IconInfo } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { FRECUENCIAS, RAMALES, SECCIONADOS } from '../data/linea.js';
import NextBus from '../components/NextBus.jsx';
import { useSimClock } from '../lib/useSim.js';
import s from './Horarios.module.css';

const DIAS = [
  { id: 'habil', label: 'Días hábiles' },
  { id: 'sabado', label: 'Sábados' },
  { id: 'domingo', label: 'Domingos y feriados' },
];

const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function diaDeHoy(d = new Date()) {
  const w = d.getDay();
  return w === 0 ? 'domingo' : w === 6 ? 'sabado' : 'habil';
}

// Índice de la franja en curso según la hora local (null si fuera de servicio).
function franjaActual(franjas, d = new Date()) {
  const now = d.getHours() * 60 + d.getMinutes();
  return franjas.findIndex((f) => {
    const [a, b] = f.horario.split('–').map((t) => aMin(t.trim()));
    return now >= a && now < (b === 0 ? 1440 : b);
  });
}

export default function Horarios() {
  usePageTitle('Horarios');
  useReveal();
  const { openChat } = useChat();
  const clock = useSimClock({ tickMs: 15000 });
  const hoy = diaDeHoy();
  const [dia, setDia] = useState(hoy);
  const datos = FRECUENCIAS[dia];
  const actual = useMemo(() => (dia === hoy ? franjaActual(datos.franjas) : -1), [dia, hoy, datos]);
  const porSentido = Array.isArray(datos.franjas[0]?.cada);

  const tramos = SECCIONADOS.slice(0, -1);
  const totalPico = tramos.reduce((a, t) => a + t.pico, 0);
  const totalValle = tramos.reduce((a, t) => a + t.valle, 0);

  return (
    <>
      <PageHero kicker="Horarios" title="Cada cuánto pasa">
        Frecuencias programadas del ramal A según la diagramación vigente (Invierno 2026). Pueden variar por tránsito, cortes o feriados especiales.
      </PageHero>

      <section className="section">
        <div className="container">
          <div className={s.tabs} role="tablist" aria-label="Día">
            {DIAS.map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={dia === d.id} className={`${s.tab} ${dia === d.id ? s.tabOn : ''}`} onClick={() => setDia(d.id)}>
                {d.label}{d.id === hoy && <span className={s.hoy}>Hoy</span>}
              </button>
            ))}
          </div>

          <div className={s.grid}>
            <div className={`card ${s.table}`}>
              <div className={s.tableHead}>
                <div>
                  <h2>{datos.titulo}</h2>
                  <p>Servicio {datos.servicio}{datos.servicios ? ` · ${datos.servicios}` : ''}</p>
                </div>
                <RamalBadge letra="A" />
              </div>
              <div className={`${s.row} ${s.rowHead} ${porSentido ? s.three : ''}`}>
                <span>Franja horaria</span>
                {porSentido ? <><span>Hacia Retiro</span><span>Hacia La Tablada</span></> : <span>Frecuencia</span>}
              </div>
              {datos.franjas.map((f, i) => (
                <div key={f.horario} className={`${s.row} ${porSentido ? s.three : ''} ${i === actual ? s.now : ''}`}>
                  <span className={s.franja}>
                    {f.horario}
                    {f.nota && <em>{f.nota}</em>}
                    {i === actual && <b className={s.nowTag}>Ahora</b>}
                  </span>
                  {porSentido
                    ? <><span>cada {f.cada[0]}</span><span>cada {f.cada[1]}</span></>
                    : <span>{f.cada}</span>}
                </div>
              ))}
            </div>

            <aside className={s.side}>
              <NextBus clock={clock} />
              <div className={`card ${s.sideCard}`}>
                <h3><IconClock /> Servicios especiales</h3>
                <ul>
                  {RAMALES.filter((r) => r.tipo !== 'comun').map((r) => (
                    <li key={r.letra}>
                      <RamalBadge letra={r.letra} tipo={r.tipo} size="sm" />
                      <div>
                        <strong>{r.desde} — {r.hasta}</strong>
                        <span>{r.horario}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.ask}>
                <p>¿Querés saber cuándo pasa por tu parada?</p>
                <button type="button" className="btn btn--light btn--sm" onClick={() => openChat('¿Cada cuánto pasa la 126 por ')}><IconChat /> Preguntar</button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Tiempos de viaje</span>
            <h2>De La Tablada a Retiro en {totalValle}–{totalPico} minutos</h2>
            <p>Tiempo programado entre cada punto de control, en horario pico y fuera de pico.</p>
          </div>
          <ol className={`reveal ${s.timeline}`}>
            {SECCIONADOS.map((t, i) => (
              <li key={t.nombre}>
                <span className={s.tlDot}>{i + 1}</span>
                <div className={s.tlBody}>
                  <strong>{t.nombre}</strong>
                  <span>{t.barrio} · km {t.km.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>
                </div>
                {t.pico != null && (
                  <span className={s.tlTime}>
                    <b>{t.valle}–{t.pico}</b> min
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className={`reveal ${s.note}`}><IconInfo /> Los tiempos son de la programación oficial; el viaje real depende del tránsito. En sentido contrario los tiempos son similares.</p>
        </div>
      </section>
    </>
  );
}
