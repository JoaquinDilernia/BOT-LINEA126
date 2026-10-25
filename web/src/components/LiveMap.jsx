import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import trazado from '../data/trazado126.json';
import { busesEn } from '../lib/sim.js';
import s from './LiveMap.module.css';

const TERMINALES = [
  { nombre: 'Retiro', latlng: trazado.ida[0] },
  { nombre: 'La Tablada', latlng: trazado.vuelta[0] },
];
const BOUNDS = [...trazado.ida, ...trazado.vuelta];

function busIcon(sentido) {
  return L.divIcon({
    className: `${s.bus} ${sentido === 'haciaRetiro' ? s.toRetiro : s.toTablada}`,
    html: `<span class="${s.arrow}"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 2l6 4-6 4z" fill="currentColor"/></svg></span><b>126</b>`,
    iconSize: [44, 22],
    iconAnchor: [22, 11],
  });
}

// Capa imperativa: crear/mover/sacar marcadores sin re-renderizar React en
// cada tick (con decenas de colectivos a 10 fps, el DOM lo agradece).
function BusLayer({ clock, fast }) {
  const map = useMap();
  const markers = useRef(new Map());

  useEffect(() => () => {
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
  }, []);

  useEffect(() => {
    map.getContainer().classList.toggle(s.fast, fast);
  }, [map, fast]);

  useEffect(() => {
    const buses = busesEn(clock.m, clock.dia, clock.diaAyer);
    const vivos = new Set();
    for (const b of buses) {
      vivos.add(b.id);
      let mk = markers.current.get(b.id);
      if (!mk) {
        mk = L.marker(b.latlng, { icon: busIcon(b.sentido), keyboard: false, interactive: false }).addTo(map);
        markers.current.set(b.id, mk);
        requestAnimationFrame(() => mk.getElement()?.classList.add(s.in));
      } else {
        mk.setLatLng(b.latlng);
      }
      const arrow = mk.getElement()?.firstElementChild;
      if (arrow) arrow.style.transform = `rotate(${b.angle}deg)`;
    }
    for (const [id, mk] of markers.current) {
      if (!vivos.has(id)) { mk.remove(); markers.current.delete(id); }
    }
  }, [map, clock]);

  return null;
}

function Fit() {
  const map = useMap();
  useEffect(() => { map.fitBounds(BOUNDS, { padding: [24, 24] }); }, [map]);
  return null;
}

export default function LiveMap({ clock, fast = false, height = 560 }) {
  const lineas = useMemo(() => [trazado.ida, trazado.vuelta], []);
  return (
    <div className={s.wrap} style={{ height }}>
      <MapContainer center={[-34.64, -58.46]} zoom={12} scrollWheelZoom={false} className={s.map} zoomControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Fit />
        {lineas.map((l, i) => (
          <Polyline key={`c${i}`} positions={l} pathOptions={{ color: '#fff', weight: 8, opacity: 1 }} />
        ))}
        {lineas.map((l, i) => (
          <Polyline key={`r${i}`} positions={l} pathOptions={{ color: '#d7141a', weight: 4, opacity: .85 }} />
        ))}
        {TERMINALES.map((t) => (
          <CircleMarker key={t.nombre} center={t.latlng} radius={8} pathOptions={{ color: '#141414', weight: 4, fillColor: '#fff', fillOpacity: 1 }}>
            <Tooltip permanent direction="top" offset={[0, -8]} className={s.tip}>{t.nombre}</Tooltip>
          </CircleMarker>
        ))}
        <BusLayer clock={clock} fast={fast} />
      </MapContainer>
    </div>
  );
}
