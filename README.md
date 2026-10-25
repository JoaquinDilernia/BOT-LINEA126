# BOT-LINEA126

Demo para la **Línea 126** de colectivos (Cárdenas S.A., Retiro ⇄ La Tablada / Cementerio de Villegas):
sitio institucional con chat de atención al pasajero + panel de gestión. Mismo stack que el resto de los bots
(base BOT-TECHDI con el diseño nuevo del panel + módulos de transporte de BOT-TRANSCOLECTIVO).

```
server/  Node ESM + Express. Bot con Claude, reclamos, recorridos, tarifas, postulaciones. → Railway
client/  Panel (React + Vite). Conversaciones, Reclamos, Recorridos, Tarifario, Postulaciones, Config. → Hostinger
web/     Sitio institucional (React + Vite, HashRouter). Chat flotante, mapa, horarios, calculadora. → Hostinger
```

## Canal: chat web (sin Meta)

El sitio habla con `POST /api/public/chat` → `processIncomingMessage({ channel: 'web', from: 'web:<uuid>' })`,
el mismo pipeline que WhatsApp. Como el canal no es `whatsapp`/`instagram`, no se manda nada por Meta: la respuesta
se guarda en Firestore y vuelve por HTTP. En el panel las conversaciones aparecen con el canal "Chat web".

**Para activar WhatsApp más adelante:** cargar las variables `META_*` en Railway y configurar el webhook de Meta
apuntando a `/api/webhook`. No hace falta tocar código; el mismo bot atiende los dos canales.

### API pública (`/api/public`, sin auth, CORS abierto, con rate limit)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/chat` | Mensaje del chat web (40 / 10 min por IP) |
| GET | `/chat/:sessionId` | Historial de la sesión |
| GET | `/recorridos` | Ramales con paradas y secciones (mismos datos que usa el bot) |
| GET | `/tarifas` | Cuadro tarifario |
| GET | `/reclamos/:numero` | "Seguí tu reclamo" (`R126-000123`): estado y respuestas, sin datos del contacto |
| POST | `/postulaciones` | Formulario "Trabajá con nosotros" (5 / hora por IP) |

## Desarrollo local

```bash
cd server && npm install && cp .env.example .env   # completar claves
npm run dev          # http://localhost:3126 — al arrancar siembra agentes, áreas, KB, tarifas y recorridos si están vacíos
cd client && npm install && npm run dev   # panel
cd web && npm install && npm run dev      # sitio, http://localhost:5176
```

Tests: `server` → `npm test` · `client` → `npx vitest run`.

## Deploy

1. **Backend (Railway):** servicio nuevo desde este repo, root `server/`, con las variables de `.env.example`.
   Auto-deploy con cada push.
2. **Panel:** `client/.env.production` con `VITE_API_URL=https://<backend>` → `npm run build` → subir `client/dist` a Hostinger.
3. **Sitio:** `npm run build` en `web/` → subir `web/dist` a Hostinger y editar `config.js` en el hosting
   (`window.__L126_CONFIG__ = { API_URL: 'https://<backend>' }`). No hace falta recompilar para cambiar la URL.
4. Agregar el dominio del panel a `FRONTEND_URL` en Railway.

## Datos

- Recorridos (ramales A y B con paradas, secciones y coordenadas) y tarifas se editan desde el panel. La semilla
  está en `server/src/data/linea126.js` y en `tarifa.service.js`.
- Textos institucionales del sitio (ramales A–F, cabeceras, frecuencias, FAQ): `web/src/data/linea.js`.
- Base de conocimiento del bot: panel → Base de conocimiento (semilla en `knowledge.service.js`).

Fuentes (oct/2026): itinerario oficial de la Secretaría de Transporte (argentina.gob.ar/l/126.pdf), Boletín Oficial
(Res. 44/2023), diagramación Invierno 2026 y matriz tarifaria, RedSUBE.
