import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import PageHero from '../components/PageHero.jsx';
import { IconChat, IconClock, IconPhone, IconPin, IconShield } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { EMPRESA } from '../data/linea.js';
import s from './Contacto.module.css';

// Pin propio: el ícono por defecto de Leaflet necesita imágenes sueltas que
// Vite no copia.
const pin = L.divIcon({
  className: '',
  html: '<div style="width:40px;height:40px;border-radius:50% 50% 50% 0;background:#d7141a;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.3);border:3px solid #fff"><span style="transform:rotate(45deg);color:#fff;font:800 13px Barlow Condensed,sans-serif">126</span></div>',
  iconSize: [40, 40],
  iconAnchor: [6, 40],
});

export default function Contacto() {
  usePageTitle('Contacto');
  useReveal();
  const { openChat } = useChat();

  return (
    <>
      <PageHero kicker="Contacto" title="Hablemos">
        La forma más rápida es el asistente virtual: responde al instante, las 24 horas, y registra reclamos con número de seguimiento.
      </PageHero>

      <section className="section">
        <div className={`container ${s.grid}`}>
          <div className={s.cards}>
            <button type="button" className={`reveal ${s.card} ${s.cardRed}`} onClick={() => openChat()}>
              <IconChat />
              <strong>Asistente virtual</strong>
              <span>Consultas y reclamos las 24 h</span>
            </button>
            <a className={`reveal ${s.card}`} href={EMPRESA.telefono0800Href}>
              <IconPhone />
              <strong>{EMPRESA.telefono0800}</strong>
              <span>Atención al pasajero · gratuito</span>
            </a>
            <a className={`reveal ${s.card}`} href={EMPRESA.telefonoHref}>
              <IconPhone />
              <strong>{EMPRESA.telefono}</strong>
              <span>Administración</span>
            </a>
            <div className={`reveal ${s.card}`}>
              <IconClock />
              <strong>Oficinas</strong>
              <span>{EMPRESA.horarioOficina}</span>
            </div>
          </div>

          <div className="reveal">
            <div className={s.map}>
              <MapContainer center={EMPRESA.coords} zoom={15} scrollWheelZoom={false} style={{ height: '100%' }}>
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker position={EMPRESA.coords} icon={pin} />
              </MapContainer>
            </div>
            <div className={s.address}>
              <IconPin />
              <div>
                <strong>Sede y terminal La Tablada</strong>
                <p>{EMPRESA.direccion}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${EMPRESA.coords.join(',')}`} target="_blank" rel="noreferrer">Cómo llegar →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className={`container ${s.cnrt}`}>
          <IconShield />
          <div>
            <h2>¿Tu reclamo no fue resuelto?</h2>
            <p>La 126 es una línea nacional fiscalizada por la Comisión Nacional de Regulación del Transporte. Podés presentar tu denuncia en la CNRT al 0800-333-0300 o en argentina.gob.ar/cnrt.</p>
          </div>
          <a className="btn btn--dark" href="https://www.argentina.gob.ar/cnrt" target="_blank" rel="noreferrer">Ir a la CNRT</a>
        </div>
      </section>
    </>
  );
}
