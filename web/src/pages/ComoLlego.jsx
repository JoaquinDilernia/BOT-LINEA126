import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import PageHero from '../components/PageHero.jsx';
import RamalBadge from '../components/RamalBadge.jsx';
import { IconChat, IconClock, IconPin, IconSwap, IconCard, IconInfo, IconBus } from '../components/icons.jsx';
import { useApi, usePageTitle } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { useSimClock } from '../lib/useSim.js';
import { TOTAL_KM, duracionViaje, fmtHora, minutosHasta, proximosKm } from '../lib/sim.js';
import { buscarParada, minutosCaminando, opcionesParadas, planificar, tarifaPlan } from '../lib/planner.js';
import { peso } from '../data/linea.js';
import trazado from '../data/trazado126.json';
import { distKm } from '../lib/sim.js';
import s from './ComoLlego.module.css';

const simSentido = (sentido) => (sentido === 'ida' ? 'haciaTablada' : 'haciaRetiro');
const limpiar = (n) => n.replace(/\s*\(.*\)$/, '');

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function ComoLlego() {
  usePageTitle('Cómo llego');
  const { openChat } = useChat();
  const { data, loading } = useApi('/recorridos');
  const recorridos = useMemo(() => data?.recorridos ?? [], [data]);
  const opciones = useMemo(() => opcionesParadas(recorridos), [recorridos]);
  const clock = useSimClock({ tickMs: 20000 });

  const [desdeTxt, setDesdeTxt] = useState('');
  const [hastaTxt, setHastaTxt] = useState('');
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [geoEstado, setGeoEstado] = useState('');
  const [consulta, setConsulta] = useState(null);
  const [error, setError] = useState('');

  function usarUbicacion() {
    if (!navigator.geolocation) { setGeoEstado('Tu navegador no permite ubicarte.'); return; }
    setGeoEstado('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMiUbicacion([pos.coords.latitude, pos.coords.longitude]);
        setDesdeTxt('Mi ubicación');
        setGeoEstado('');
      },
      () => setGeoEstado('No pudimos obtener tu ubicación. Elegí una parada.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function buscar(e) {
    e?.preventDefault();
    setError('');
    const origen = desdeTxt === 'Mi ubicación' && miUbicacion
      ? { nombre: 'Tu ubicación', latlng: miUbicacion, propia: true }
      : buscarParada(opciones, desdeTxt);
    const destino = buscarParada(opciones, hastaTxt);
    if (!origen || !destino) {
      setConsulta(null);
      setError('Elegí origen y destino de la lista de paradas (o usá tu ubicación como origen).');
      return;
    }
    const plan = planificar(recorridos, origen.latlng, destino.latlng);
    setConsulta({ origen, destino, plan });
    if (!plan) setError('No encontramos un viaje directo en la 126 entre esos puntos.');
  }

  const invertir = () => {
    if (desdeTxt === 'Mi ubicación') return;
    setDesdeTxt(hastaTxt);
    setHastaTxt(desdeTxt);
  };

  const plan = consulta?.plan;
  const detalle = useMemo(() => {
    if (!plan) return null;
    const letra = plan.recorrido.nombre.match(/Ramal (\w)/)?.[1] ?? 'A';
    const sube = plan.stops[plan.o];
    const baja = plan.stops[plan.d];
    const tarifa = tarifaPlan(plan);
    const sS = simSentido(plan.sentido);
    const kmO = plan.fracOrigen * TOTAL_KM;
    const kmD = plan.fracDestino * TOTAL_KM;
    const arribos = letra === 'A' ? proximosKm(clock.m, clock.dia, clock.diaAyer, sS, kmO, 3) : [];
    const salidaRef = arribos[0]?.hora ?? clock.m;
    const enViaje = letra === 'A'
      ? Math.max(1, Math.round(minutosHasta(sS, salidaRef, kmD) - minutosHasta(sS, salidaRef, kmO)))
      : Math.max(1, Math.round(plan.tramoKm / (TOTAL_KM / duracionViaje(sS, clock.m))));
    const caminaO = consulta.origen.propia ? minutosCaminando(plan.caminataOrigenKm) : 0;
    const caminaD = plan.caminataDestinoKm > 0.08 ? minutosCaminando(plan.caminataDestinoKm) : 0;
    const espera = arribos[0] && arribos[0].en < 120 ? Math.max(0, arribos[0].en - caminaO) : 0;
    const destinoFinal = plan.stops[plan.stops.length - 1].nombre;
    return { letra, sube, baja, tarifa, arribos, enViaje, caminaO, caminaD, espera, total: Math.round(caminaO + espera + enViaje + caminaD), destinoFinal };
  }, [plan, clock, consulta]);

  const tramo = useMemo(() => {
    if (!plan) return [];
    const porParadas = plan.stops.slice(plan.o, plan.d + 1).map((p) => [p.lat, p.lng]);
    // Ramal A: seguir las calles del trazado real entre la parada de subida y la de bajada.
    const linea = /ramal a/i.test(plan.recorrido.nombre) ? trazado[plan.sentido] : null;
    if (!linea?.length) return porParadas;
    const masCerca = (ll) => linea.reduce((b, p, i) => (distKm(ll, p) < distKm(ll, linea[b]) ? i : b), 0);
    const i0 = masCerca(porParadas[0]);
    const i1 = masCerca(porParadas[porParadas.length - 1]);
    return i1 > i0 ? [porParadas[0], ...linea.slice(i0, i1 + 1), porParadas[porParadas.length - 1]] : porParadas;
  }, [plan]);
  const paradasIntermedias = plan ? plan.stops.slice(plan.o + 1, plan.d).map((p) => [p.lat, p.lng]) : [];
  const lineaCompleta = plan ? plan.stops.map((p) => [p.lat, p.lng]) : [];
  const encuadre = useMemo(() => {
    const pts = [...tramo];
    if (consulta?.origen?.propia) pts.push(consulta.origen.latlng);
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tramo, consulta]);

  return (
    <>
      <PageHero kicker="Planificá tu viaje" title="¿Cómo llego?">
        Elegí desde dónde salís y a dónde vas: te decimos en qué parada subir, dónde bajar, cuánto sale y cuánto tarda.
      </PageHero>

      <section className="section">
        <div className={`container ${s.grid}`}>
          <div className={s.col}>
            <form className={`card ${s.form}`} onSubmit={buscar}>
              <datalist id="paradas">
                {opciones.map((o) => <option key={o.nombre} value={o.nombre} />)}
              </datalist>
              <div className={s.inputs}>
                <span className={s.rail} aria-hidden="true"><i /><b /><i /></span>
                <div className="field">
                  <label htmlFor="desde">Desde</label>
                  <input id="desde" list="paradas" value={desdeTxt} onChange={(e) => { setDesdeTxt(e.target.value); if (e.target.value !== 'Mi ubicación') setMiUbicacion(null); }} placeholder={loading ? 'Cargando paradas…' : 'Parada o calle'} autoComplete="off" />
                </div>
                <div className="field">
                  <label htmlFor="hasta">Hasta</label>
                  <input id="hasta" list="paradas" value={hastaTxt} onChange={(e) => setHastaTxt(e.target.value)} placeholder="Parada o calle" autoComplete="off" />
                </div>
                <button type="button" className={s.swap} onClick={invertir} aria-label="Invertir origen y destino"><IconSwap /></button>
              </div>
              <div className={s.actions}>
                <button type="button" className={`btn btn--ghost btn--sm ${s.geo}`} onClick={usarUbicacion}><IconPin /> Usar mi ubicación</button>
                <button type="submit" className="btn">Buscar viaje</button>
              </div>
              {geoEstado && <p className={s.geoMsg}>{geoEstado}</p>}
            </form>

            {error && (
              <div className={s.error} role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn--sm btn--dark" onClick={() => openChat(`¿Cómo llego de ${desdeTxt || '…'} a ${hastaTxt || '…'} con la 126?`)}><IconChat /> Preguntale al asistente</button>
              </div>
            )}

            {detalle && (
              <div className={`card ${s.result}`} aria-live="polite">
                <div className={s.summary}>
                  <div>
                    <span>Viaje total aprox.</span>
                    <strong>{detalle.total} min</strong>
                  </div>
                  {detalle.tarifa && (
                    <div>
                      <span>Boleto · {detalle.tarifa.tramos} secc.</span>
                      <strong>{peso(detalle.tarifa.precio)}</strong>
                    </div>
                  )}
                </div>

                <ol className={s.steps}>
                  {consulta.origen.propia && (
                    <li className={s.walk}>
                      <span className={s.stepIcon}><IconPin /></span>
                      <div><strong>Caminá {Math.round(plan.caminataOrigenKm * 1000)} m</strong><p>hasta {limpiar(detalle.sube.nombre)} · {detalle.caminaO} min</p></div>
                    </li>
                  )}
                  <li>
                    <span className={s.stepIcon}><RamalBadge letra={detalle.letra} size="sm" /></span>
                    <div>
                      <strong>Tomá el 126 {detalle.letra} en {limpiar(detalle.sube.nombre)}</strong>
                      <p>Hacia {limpiar(detalle.destinoFinal)}</p>
                      {detalle.arribos.length > 0 && detalle.arribos[0].en < 120 && (
                        <p className={s.eta}><IconClock /> Pasa en <b>{Math.max(0, Math.round(detalle.arribos[0].en))} min</b> ({fmtHora(detalle.arribos[0].hora)}){detalle.arribos[1] && `, después en ${Math.round(detalle.arribos[1].en)} min`}</p>
                      )}
                    </div>
                  </li>
                  <li>
                    <span className={s.stepIcon}><IconBus /></span>
                    <div><strong>{plan.d - plan.o} paradas · {detalle.enViaje} min</strong><p>{plan.tramoKm.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km de viaje</p></div>
                  </li>
                  <li className={s.last}>
                    <span className={s.stepIcon}><IconPin /></span>
                    <div>
                      <strong>Bajá en {limpiar(detalle.baja.nombre)}</strong>
                      <p>{detalle.caminaD ? `y caminá ${Math.round(plan.caminataDestinoKm * 1000)} m hasta ${limpiar(consulta.destino.nombre)}` : 'Llegaste 🎉'}</p>
                    </div>
                  </li>
                </ol>
                <p className={s.fine}><IconCard /> Decile al chofer que vas hasta {limpiar(detalle.baja.nombre)} antes de apoyar la SUBE.</p>
                <p className={s.fine}><IconInfo /> Tiempos estimados con el horario programado.</p>
              </div>
            )}
          </div>

          <div className={s.mapWrap}>
            <MapContainer center={[-34.64, -58.46]} zoom={12} scrollWheelZoom={false} className={s.map}>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {!plan && opciones.length > 0 && <Fit points={opciones.map((o) => o.latlng)} />}
              {!plan && recorridos.slice(0, 1).map((r) => (
                <Polyline key={r.id} positions={(r.paradas?.ida ?? []).map((p) => [p.lat, p.lng])} pathOptions={{ color: '#d7141a', weight: 4, opacity: .5 }} />
              ))}
              {plan && (
                <>
                  <Fit points={encuadre} />
                  <Polyline positions={lineaCompleta} pathOptions={{ color: '#9aa0a6', weight: 4, opacity: .45 }} />
                  <Polyline positions={tramo} pathOptions={{ color: '#fff', weight: 10 }} />
                  <Polyline positions={tramo} pathOptions={{ color: '#d7141a', weight: 6 }} />
                  {paradasIntermedias.map((p, i) => (
                    <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#d7141a', weight: 2, fillColor: '#fff', fillOpacity: 1 }} />
                  ))}
                  <CircleMarker center={tramo[0]} radius={10} pathOptions={{ color: '#141414', weight: 4, fillColor: '#fff', fillOpacity: 1 }}>
                    <Tooltip permanent direction="top" offset={[0, -10]} className={s.tip}>Subí acá</Tooltip>
                  </CircleMarker>
                  <CircleMarker center={tramo[tramo.length - 1]} radius={10} pathOptions={{ color: '#d7141a', weight: 4, fillColor: '#d7141a', fillOpacity: 1 }}>
                    <Tooltip permanent direction="top" offset={[0, -10]} className={s.tip}>Bajá acá</Tooltip>
                  </CircleMarker>
                  {consulta.origen.propia && (
                    <>
                      <Polyline positions={[consulta.origen.latlng, tramo[0]]} pathOptions={{ color: '#1565c0', weight: 4, dashArray: '2 9', lineCap: 'round' }} />
                      <CircleMarker center={consulta.origen.latlng} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }} />
                    </>
                  )}
                </>
              )}
            </MapContainer>
            {!plan && (
              <div className={s.mapEmpty}>
                <IconPin />
                <p>Tu viaje aparece acá</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

