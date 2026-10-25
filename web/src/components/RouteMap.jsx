import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import trazado from '../data/trazado126.json';
import s from './RouteMap.module.css';

const FALLBACK_BOUNDS = [[-34.586, -58.37], [-34.70, -58.55]];

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);
  return null;
}

// Mapa del ramal: trazado de referencia (sólo el A lo tiene completo; para el
// resto se une la secuencia de paradas) + paradas del panel con su sección.
export default function RouteMap({ recorrido, sentido = 'ida', highlight = null, height = 480 }) {
  const paradas = useMemo(
    () => (recorrido?.paradas?.[sentido] ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [recorrido, sentido],
  );
  const esRamalA = /ramal a\b/i.test(recorrido?.nombre ?? '');
  const linea = useMemo(() => {
    if (esRamalA && trazado[sentido]?.length) return trazado[sentido];
    return paradas.map((p) => [p.lat, p.lng]);
  }, [esRamalA, sentido, paradas]);
  const bounds = linea.length ? linea : FALLBACK_BOUNDS;

  return (
    <div className={s.wrap} style={{ height }}>
      <MapContainer center={[-34.63, -58.45]} zoom={12} scrollWheelZoom={false} className={s.map} attributionControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <FitBounds points={bounds} />
        <Polyline positions={linea} pathOptions={{ color: '#ffffff', weight: 9, opacity: 1 }} />
        <Polyline positions={linea} pathOptions={{ color: '#d7141a', weight: 5, opacity: 1 }} />
        {paradas.map((p, i) => {
          const extremo = i === 0 || i === paradas.length - 1;
          const marcada = highlight != null && p.seccion === highlight;
          return (
            <CircleMarker
              key={`${sentido}-${p.orden}`}
              center={[p.lat, p.lng]}
              radius={extremo ? 9 : marcada ? 7 : 5}
              pathOptions={{
                color: extremo ? '#141414' : '#d7141a',
                weight: extremo ? 4 : 2.5,
                fillColor: extremo ? '#ffffff' : marcada ? '#d7141a' : '#ffffff',
                fillOpacity: 1,
              }}
            >
              {extremo && <Tooltip permanent direction="top" offset={[0, -8]} className={s.tip}>{p.nombre.replace(/\s*\(.*\)$/, '')}</Tooltip>}
              <Popup>
                <strong>{p.nombre}</strong><br />
                Sección {p.seccion}{extremo ? (i === 0 ? ' · inicio' : ' · final') : ''}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
