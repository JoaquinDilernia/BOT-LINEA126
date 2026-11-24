import { useMemo, useState } from 'react';
import PageHero from '../components/PageHero.jsx';
import RamalBadge from '../components/RamalBadge.jsx';
import { IconChat, IconClock, IconInfo, IconSwap } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { CABECERA_EXPRESO, FRECUENCIAS, HORARIOS_EXPRESOS, RAMALES, SECCIONADOS } from '../data/linea.js';
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

// Próxima salida del expreso (índice) si hoy es hábil; -1 si ya no hay.
function proximaSalida(salidas, d = new Date()) {
  if (diaDeHoy(d) !== 'habil') return -1;
  const now = d.getHours() * 60 + d.getMinutes();
  return salidas.findIndex((x) => aMin(x[1]) >= now);
}

function Expresos() {
  const [turno, setTurno] = useState(() => (new Date().getHours() < 13 ? 'manana' : 'tarde'));
  return (
    <section className="section section--soft">
      <div className="container">
        <div className="sectionHead reveal">
          <span className="kicker">Expresos por autopista</span>
          <h2>Horarios del C y el D</h2>
          <p>Sólo días hábiles. A la mañana van hacia Retiro y a la tarde vuelven a provincia. El C es el de La Tablada y el D, el de Villegas.</p>
        </div>
        <div className={s.tabs} role="tablist" aria-label="Turno">
          {Object.entries(HORARIOS_EXPRESOS).map(([id, x]) => (
            <button key={id} type="button" role="tab" aria-selected={turno === id} className={`${s.tab} ${turno === id ? s.tabOn : ''}`} onClick={() => setTurno(id)}>
              {x.titulo} · {x.sentido}
            </button>
          ))}
        </div>
        {/* Las dos tablas van siempre en el HTML (las lee Google); la pestaña sólo oculta una. */}
        {Object.entries(HORARIOS_EXPRESOS).map(([id, t]) => {
          const prox = proximaSalida(t.salidas);
          return (
            <div key={id} className={`card ${s.xWrap}`} hidden={turno !== id}>
              <table className={s.xTable}>
                <caption className="sr-only">Expresos de la Línea 126, {t.titulo.toLowerCase()} ({t.sentido.toLowerCase()}), días hábiles</caption>
                <thead>
                  <tr>
                    <th>{id === 'manana' ? 'Sale de' : 'Va a'}</th>
                    {t.puntos.map((p) => <th key={p}>{p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {t.salidas.map(([ramal, ...horas], i) => (
                    <tr key={`${ramal}${horas[0]}`} className={i === prox ? s.now : ''}>
                      <td><div className={s.xRamal}>
                        <RamalBadge letra={ramal} tipo="expreso" size="sm" />
                        <span>{CABECERA_EXPRESO[ramal]}</span>
                        {i === prox && <b className={s.nowTag}>Próximo</b>}
                      </div></td>
                      {horas.map((h, j) => <td key={j} className={j === 0 ? s.xSalida : ''}>{h}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        <p className={`reveal ${s.note}`}><IconInfo /> Horarios programados por la empresa; el tránsito puede generar demoras. En el tramo por autopista no se puede subir ni bajar.</p>
      </div>
    </section>
  );
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
                        <strong className={s.ramalRuta}>{r.desde} <IconSwap /> {r.hasta}</strong>
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

      <Expresos />

      <section className="section">
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
