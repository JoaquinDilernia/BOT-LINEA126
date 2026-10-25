import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import BusArt from '../components/BusArt.jsx';
import { IconAccessible, IconArrow, IconBus, IconClock, IconRoute, IconShield, IconFace } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { EMPRESA } from '../data/linea.js';
import s from './Empresa.module.css';

const VALORES = [
  { icon: IconShield, title: 'Seguridad', text: 'Capacitación permanente de choferes, controles técnicos y mantenimiento preventivo de toda la flota en taller propio.' },
  { icon: IconClock, title: 'Puntualidad', text: 'Diagramación pensada para cada franja horaria y control de frecuencias en los puntos de control del recorrido.' },
  { icon: IconFace, title: 'Buen trato', text: 'Escuchamos a cada pasajero: todos los reclamos se registran, se responden y se usan para mejorar el servicio.' },
  { icon: IconAccessible, title: 'Accesibilidad', text: 'Incorporamos unidades de piso bajo con rampa y espacio reservado, y respetamos el pase libre con CUD.' },
];

export default function Empresa() {
  usePageTitle('La empresa');
  useReveal();

  return (
    <>
      <PageHero kicker="La empresa" title="Cárdenas S.A.">
        La empresa de transportes que opera la Línea 126 desde La Tablada, uniendo La Matanza con el centro de la Ciudad de Buenos Aires.
      </PageHero>

      <section className="section">
        <div className={`container ${s.intro}`}>
          <div className="reveal">
            <span className="kicker">Quiénes somos</span>
            <h2 className={s.h2}>Una línea con raíces en La Tablada</h2>
            <p>Desde nuestra terminal de la Av. Diego A. Maradona —la histórica Mons. Bufano— salen todos los días los colectivos que llevan a miles de vecinos de La Matanza, Mataderos, Flores, Caballito, Boedo y San Telmo hasta Plaza de Mayo y Retiro.</p>
            <p>La 126 es una línea de jurisdicción nacional: cruza la Av. General Paz y presta servicio bajo la regulación de la Secretaría de Transporte de la Nación, con la fiscalización de la CNRT.</p>
            <p>Somos una empresa de trabajadores del transporte: choferes, mecánicos, inspectores y personal administrativo que todos los días hacen posible cada viaje.</p>
          </div>
          <div className={`reveal ${s.introArt}`}>
            <BusArt className={s.bus} ramal="B" />
          </div>
        </div>
      </section>

      <section className={s.numbers}>
        <div className={`container ${s.numbersGrid}`}>
          <div className="reveal"><IconRoute /><strong>27 km</strong><span>de Retiro a La Tablada</span></div>
          <div className="reveal"><IconBus /><strong>6 ramales</strong><span>comunes, de días hábiles y expresos</span></div>
          <div className="reveal"><IconClock /><strong>23 h</strong><span>de servicio cada día hábil</span></div>
          <div className="reveal"><IconShield /><strong>Nacional</strong><span>permiso de la Secretaría de Transporte</span></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Nuestro compromiso</span>
            <h2>Lo que nos importa en cada viaje</h2>
          </div>
          <div className={s.valores}>
            {VALORES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="card reveal">
                <Icon />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className={`container ${s.datos}`}>
          <div className="reveal">
            <span className="kicker">Datos de la empresa</span>
            <h2 className={s.h2}>Información institucional</h2>
          </div>
          <dl className={`card reveal ${s.dl}`}>
            <div><dt>Razón social</dt><dd>{EMPRESA.nombre}</dd></div>
            <div><dt>CUIT</dt><dd>{EMPRESA.cuit}</dd></div>
            <div><dt>Sede y terminal</dt><dd>{EMPRESA.direccion}</dd></div>
            <div><dt>Atención al pasajero</dt><dd>{EMPRESA.telefono0800} · {EMPRESA.telefono}</dd></div>
            <div><dt>Jurisdicción</dt><dd>Nacional · Secretaría de Transporte / CNRT</dd></div>
            <div><dt>Servicio</dt><dd>{EMPRESA.permiso}</dd></div>
          </dl>
        </div>
      </section>

      <section className="section">
        <div className={`container ${s.join}`}>
          <h2 className="display">¿Querés ser parte?</h2>
          <Link to="/trabaja" className="btn btn--light">Trabajá con nosotros <IconArrow /></Link>
        </div>
      </section>
    </>
  );
}
