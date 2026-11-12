import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import { IconAccessible, IconArrow, IconBus, IconClock, IconRoute, IconShield, IconFace } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { EMPRESA, FOTOS, HISTORIA } from '../data/linea.js';
import s from './Empresa.module.css';

const VALORES = [
  { icon: IconShield, title: 'Seguridad', text: 'Capacitación permanente de choferes, controles técnicos y mantenimiento preventivo de toda la flota en taller propio.' },
  { icon: IconClock, title: 'Puntualidad', text: 'Diagramación pensada para cada franja horaria y control de frecuencias en los puntos de control del recorrido.' },
  { icon: IconFace, title: 'Buen trato', text: 'Escuchamos a cada pasajero: todos los reclamos se registran, se responden y se usan para mejorar el servicio.' },
  { icon: IconAccessible, title: 'Accesibilidad', text: 'Incorporamos unidades de piso bajo con rampa y espacio reservado, y respetamos el pase libre con CUD.' },
];

function Foto({ foto, className = '' }) {
  return (
    <figure className={`${s.foto} ${className}`}>
      <img src={foto.src} width={foto.w} height={foto.h} alt={foto.alt} loading="lazy" />
      <figcaption>{foto.pie}</figcaption>
    </figure>
  );
}

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
            <span className="kicker">Nuestra historia</span>
            <h2 className={s.h2}>Una línea con raíces en La Tablada</h2>
            {HISTORIA.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
          <div className="reveal">
            <Foto foto={FOTOS.clasico} />
          </div>
        </div>
      </section>

      <section className={s.numbers}>
        <div className={`container ${s.numbersGrid}`}>
          <div className="reveal"><IconRoute /><strong>27 km</strong><span>de Retiro a La Tablada</span></div>
          <div className="reveal"><IconBus /><strong>4 ramales</strong><span>2 comunes y 2 expresos por autopista</span></div>
          <div className="reveal"><IconClock /><strong>24 h</strong><span>de servicio, todos los días</span></div>
          <div className="reveal"><IconShield /><strong>Nacional</strong><span>permiso de la Secretaría de Transporte</span></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">La flota</span>
            <h2>Rojos, blancos y fileteados</h2>
            <p>Cada unidad pasa por nuestro taller de La Tablada. Las cuidamos como lo que son: la cara de la línea en la calle.</p>
          </div>
          <div className={s.gallery}>
            <Foto foto={FOTOS.unidad} className={`reveal ${s.galleryMain}`} />
            <Foto foto={FOTOS.frente} className="reveal" />
            <div className={`reveal ${s.quien}`}>
              <h3>Quiénes somos</h3>
              <p>Choferes, mecánicos, inspectores y personal administrativo que todos los días hacen posible cada viaje.</p>
              <p>La 126 es una línea de jurisdicción nacional: cruza la Av. General Paz y presta servicio bajo la regulación de la Secretaría de Transporte de la Nación, con la fiscalización de la CNRT.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--soft">
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

      <section className="section">
        <div className={`container ${s.datos}`}>
          <div className="reveal">
            <span className="kicker">Datos de la empresa</span>
            <h2 className={s.h2}>Información institucional</h2>
          </div>
          <dl className={`card reveal ${s.dl}`}>
            <div><dt>Razón social</dt><dd>{EMPRESA.nombre}</dd></div>
            <div><dt>CUIT</dt><dd>{EMPRESA.cuit}</dd></div>
            <div><dt>Sede y terminal</dt><dd>{EMPRESA.direccion}</dd></div>
            <div><dt>Administración</dt><dd>{EMPRESA.telefono} · {EMPRESA.horarioOficina.toLowerCase()}</dd></div>
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
