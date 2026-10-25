import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BusArt from '../components/BusArt.jsx';
import RamalBadge from '../components/RamalBadge.jsx';
import LiveSection from '../components/LiveSection.jsx';
import RouteDraw from '../components/RouteDraw.jsx';
import {
  IconArrow, IconBag, IconCard, IconChat, IconClock, IconRoute, IconSearch, IconShield, IconMoon, IconAccessible, IconSwap, IconBriefcase, IconPin,
} from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { useCountUp, useTypewriter } from '../lib/motion.js';
import { useSimClock } from '../lib/useSim.js';
import { busesEn, esNoche } from '../lib/sim.js';
import { BARRIOS, CABECERAS, LUGARES, RAMALES, TIPO_RAMAL, peso } from '../data/linea.js';
import s from './Inicio.module.css';

const ACCESOS = [
  { to: '/como-llego', icon: IconPin, title: 'Cómo llego', text: 'Parada, precio y tiempo' },
  { to: '/recorridos', icon: IconRoute, title: 'Recorridos', text: 'Mapa, paradas y ramales' },
  { to: '/tarifas', icon: IconCard, title: 'Tarifas', text: 'Calculá tu boleto' },
  { to: '/atencion', icon: IconShield, title: 'Reclamos', text: 'Hacé y seguí tu reclamo' },
];

const EJEMPLOS = ['Hospital Santa Lucía', 'Plaza de Mayo', 'Feria de Mataderos', 'Mercado de San Telmo', 'Parque Chacabuco', 'Estación Retiro'];

function Stat({ valor, sufijo, texto, decimales = 0 }) {
  const [ref, n] = useCountUp(valor);
  return (
    <div className="reveal" ref={ref}>
      <strong>{n.toFixed(decimales)}{sufijo && <small>{sufijo}</small>}</strong>
      <span>{texto}</span>
    </div>
  );
}

export default function Inicio() {
  usePageTitle(null);
  useReveal();
  const { openChat } = useChat();
  const [destino, setDestino] = useState('');
  const [foco, setFoco] = useState(false);
  const placeholder = useTypewriter(EJEMPLOS, { activo: !destino && !foco, prefijo: '¿A dónde vas? ' });
  const clock = useSimClock({ tickMs: 15000 });
  const enCalle = useMemo(() => busesEn(clock.m, clock.dia, clock.diaAyer).length, [clock]);
  const noche = esNoche(clock.date);

  const preguntar = (e) => {
    e.preventDefault();
    const d = destino.trim();
    openChat(d ? `¿Cómo llego a ${d} con la 126?` : '');
  };

  return (
    <>
      {/* HERO */}
      <section className={`${s.hero} ${noche ? s.night : ''}`}>
        <div className={s.heroBg} aria-hidden="true">
          {noche && <><span className={s.stars} /><span className={s.moon} /></>}
          <span className={s.heroSlash} />
          <span className={s.heroNum}>126</span>
        </div>
        <div className={`container ${s.heroInner}`}>
          <div className={s.heroText}>
            <button type="button" className={s.heroTag} onClick={() => document.getElementById('en-vivo')?.scrollIntoView({ behavior: 'smooth' })}>
              {noche ? <IconMoon className={s.tagMoon} /> : <i />}
              {enCalle > 0
                ? <><b>{enCalle}</b> colectivos en la calle ahora{noche ? ' · servicio nocturno' : ''}</>
                : 'Servicio todos los días · nocturno en días hábiles'}
            </button>
            <h1 className={`display ${s.heroTitle}`}>
              De Retiro<br /><span className={s.nw}>a La Tablada</span><span>.</span>
            </h1>
            <p className={s.heroLead}>
              La Línea 126 une el centro porteño con La Matanza pasando por Plaza de Mayo, San Telmo, Boedo, Caballito, Flores y Mataderos{noche ? ', también de madrugada' : ''}.
            </p>
            <form className={s.ask} onSubmit={preguntar}>
              <IconSearch className={s.askIcon} />
              <label htmlFor="destino" className="srOnly">¿A dónde vas?</label>
              <input
                id="destino"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                onFocus={() => setFoco(true)}
                onBlur={() => setFoco(false)}
                placeholder={foco ? '¿A dónde vas? Ej: Hospital Santa Lucía' : placeholder}
                autoComplete="off"
              />
              <button type="submit" className="btn">Preguntar</button>
            </form>
            <p className={s.askHint}><IconChat /> Te responde el asistente virtual al instante, las 24 horas.</p>
          </div>
          <div className={s.heroArt}>
            <div className={s.stage}>
              <div className={s.streaks} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
              <div className={s.road} aria-hidden="true" />
              <div className={s.busWrap}><BusArt className={s.bus} animated night={noche} /></div>
            </div>
          </div>
        </div>
        <div className={`container ${s.accesos}`}>
          {ACCESOS.map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} className={s.acceso}>
              <span className={s.accesoIcon}><Icon /></span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <IconArrow className={s.accesoArrow} />
            </Link>
          ))}
        </div>
      </section>

      {/* DATOS */}
      <section className={s.stats}>
        <div className={`container ${s.statsGrid}`}>
          <Stat valor={27} sufijo="km" texto="de recorrido de punta a punta" />
          <Stat valor={6} texto="ramales, comunes y expresos" />
          <Stat valor={314} texto="servicios cada día hábil" />
          <Stat valor={6} sufijo="min" texto="de frecuencia en hora pico" />
        </div>
      </section>

      {/* EN VIVO */}
      <LiveSection />

      {/* RAMALES */}
      <section className="section">
        <div className="container">
          <div className={`sectionHead reveal`}>
            <span className="kicker">Nuestros ramales</span>
            <h2>Un recorrido, seis formas de viajar</h2>
            <p>Mirá el cartel del colectivo: la letra te dice el ramal. Los expresos usan la Autopista 25 de Mayo en horario pico.</p>
          </div>
          <div className={s.ramales}>
            {RAMALES.map((r) => (
              <article key={r.letra} className={`card reveal ${s.ramal}`}>
                <div className={s.ramalTop}>
                  <RamalBadge letra={r.letra} tipo={r.tipo} />
                  <span className={`${s.ramalTipo} ${s[`tipo_${r.tipo}`]}`}>{TIPO_RAMAL[r.tipo]}</span>
                </div>
                <h3 className={s.ramalRuta}>
                  {r.desde} <IconSwap /> {r.hasta}
                </h3>
                <p className={s.ramalVia}>{r.via}</p>
                <p className={s.ramalHorario}><IconClock /> {r.horario}</p>
              </article>
            ))}
          </div>
          <div className={s.center}>
            <Link to="/recorridos" className="btn btn--dark">Ver recorridos y paradas <IconArrow /></Link>
          </div>
        </div>
      </section>

      {/* RECORRIDO CON SCROLL */}
      <RouteDraw />

      {/* LUGARES */}
      <section className="section">
        <div className={`container ${s.mapGrid}`}>
          <div className="reveal">
            <span className="kicker">18 barrios</span>
            <h2 className={s.h2}>De la Ciudad a La Matanza</h2>
            <ul className={s.barrios}>
              {BARRIOS.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <Link to="/como-llego" className={`btn btn--dark ${s.planBtn}`}><IconPin /> Planificá tu viaje</Link>
          </div>
          <div className="reveal">
            <h3 className={s.h3}>Te deja cerca de</h3>
            <ul className={s.lugares}>
              {LUGARES.map((l) => (
                <li key={l.nombre}>
                  <span>{l.tipo}</span>
                  <button type="button" onClick={() => openChat(`¿Cómo llego a ${l.nombre} con la 126?`)}>{l.nombre}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ASISTENTE */}
      <section className="section section--dark">
        <div className={`container ${s.botGrid}`}>
          <div className="reveal">
            <span className="kicker">Atención al pasajero 24 h</span>
            <h2 className={`${s.h2} ${s.h2Light}`}>Preguntale al asistente de la 126</h2>
            <p className={s.botLead}>Contestá tus dudas en segundos, sin esperas ni llamadas. Conoce todos los recorridos, paradas y tarifas, y si tuviste un problema registra tu reclamo con número de seguimiento.</p>
            <ul className={s.botList}>
              <li><IconRoute /> ¿Me deja cerca? ¿Dónde lo tomo?</li>
              <li><IconCard /> ¿Cuánto sale mi boleto?</li>
              <li><IconShield /> Reclamos con número de seguimiento</li>
              <li><IconBag /> Objetos perdidos</li>
            </ul>
            <button type="button" className="btn" onClick={() => openChat()}><IconChat /> Empezar a chatear</button>
          </div>
          <div className={`reveal ${s.phone}`} aria-hidden="true">
            <div className={s.phoneHead}><span>126</span><div><strong>Asistente 126</strong><small>En línea</small></div></div>
            <div className={s.phoneBody}>
              <p className={s.pUser}>Hola, ¿el 126 me deja en el Hospital Santa Lucía?</p>
              <p className={s.pBot}>¡Sí! Bajate en <strong>Av. San Juan y Sarandí</strong>, a media cuadra del hospital. Desde La Tablada son 7 secciones: el boleto sale <strong>{peso(1151.36)}</strong> con SUBE registrada.</p>
              <p className={s.pUser}>Genial, ¿y cada cuánto pasa a la tarde?</p>
              <p className={s.pBot}>Entre las 17 y las 19:30 pasa cada <strong>6 a 7 minutos</strong> 🚌</p>
            </div>
          </div>
        </div>
      </section>

      {/* TARIFA + VENTAJAS */}
      <section className="section">
        <div className="container">
          <div className={s.tarifaBand}>
            <div className="reveal">
              <span className="kicker">Tarifa con SUBE registrada</span>
              <p className={s.tarifaPrecio}><small>desde</small> {peso(742.81)}</p>
              <p className={s.tarifaText}>El boleto depende de cuántas secciones viajás. Registrá tu SUBE: sin registrar pagás el doble.</p>
              <Link to="/tarifas" className="btn btn--light">Calculá tu boleto <IconArrow /></Link>
            </div>
            <div className={s.tarifaNotes}>
              <div><strong>55%</strong><span>de descuento con Tarifa Social Federal</span></div>
              <div><strong>Sin cargo</strong><span>con Certificado Único de Discapacidad</span></div>
              <div><strong>Red SUBE</strong><span>descuento al combinar en 2 horas</span></div>
            </div>
          </div>

          <div className={s.features}>
            <div className="reveal"><IconMoon /><h3>Servicio nocturno</h3><p>En días hábiles el ramal A funciona toda la noche, desde las 00:45.</p></div>
            <div className="reveal"><IconAccessible /><h3>Unidades accesibles</h3><p>Pisos bajos, rampa y espacio reservado para sillas de ruedas.</p></div>
            <div className="reveal"><IconRoute /><h3>Conexión con todo</h3><p>Trenes Mitre, San Martín y Belgrano en Retiro, subtes y Metrobús en el centro.</p></div>
          </div>
        </div>
      </section>

      {/* CABECERAS */}
      <section className="section section--soft">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Cabeceras</span>
            <h2>Dónde empieza y termina cada viaje</h2>
          </div>
          <div className={s.cabeceras}>
            {CABECERAS.map((c) => (
              <article key={c.nombre} className={`card reveal ${s.cabecera}`}>
                <h3>{c.nombre}</h3>
                <p>{c.detalle}</p>
                <small>{c.combina}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ATENCIÓN + EMPLEO */}
      <section className="section">
        <div className={`container ${s.ctaGrid}`}>
          <article className={`reveal ${s.cta} ${s.ctaRed}`}>
            <IconShield />
            <h3>¿Tuviste un problema en un viaje?</h3>
            <p>Hacé tu reclamo en minutos y seguilo con tu número.</p>
            <div className={s.ctaActions}>
              <button type="button" className="btn btn--light" onClick={() => openChat('Quiero hacer un reclamo')}>Hacer un reclamo</button>
              <Link to="/atencion#seguimiento" className={s.ctaLink}>Seguí tu reclamo <IconArrow /></Link>
            </div>
          </article>
          <article className={`reveal ${s.cta}`}>
            <IconBriefcase />
            <h3>Sumate a la 126</h3>
            <p>Buscamos choferes, mecánicos y personal administrativo.</p>
            <div className={s.ctaActions}>
              <Link to="/trabaja" className="btn btn--dark">Trabajá con nosotros</Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
