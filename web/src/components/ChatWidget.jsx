import { Fragment, useEffect, useRef, useState } from 'react';
import { useChat } from '../lib/chat.jsx';
import { apiGet, apiPost } from '../lib/api.js';
import { IconChat, IconClose, IconSend } from './icons.jsx';
import s from './ChatWidget.module.css';

const SESSION_KEY = 'l126_chat_session';
const NUDGE_KEY = 'l126_chat_nudge';
const SUGERENCIAS = [
  '¿Cuánto sale el boleto de Retiro a La Tablada?',
  '¿Pasa por Plaza de Mayo?',
  '¿Cada cuánto pasa a la noche?',
  'Quiero hacer un reclamo',
  'Perdí algo en el colectivo',
];

function newSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// La sesión vive en el navegador del pasajero: si recarga la página sigue la
// misma conversación. Si el storage está bloqueado, dura lo que la pestaña.
let memorySession = null;
function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) { id = newSessionId(); localStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch {
    memorySession ??= newSessionId();
    return memorySession;
  }
}

// El bot escribe en formato WhatsApp: *negrita*, saltos de línea y links.
function renderText(text) {
  return String(text).replace(/\n\s*\n\s*\n+/g, '\n\n').trim().split('\n').map((line, i, arr) => (
    <Fragment key={i}>
      {line.split(/(\*[^*\n]+\*|https?:\/\/[^\s)]+)/g).map((part, j) => {
        if (/^\*[^*]+\*$/.test(part)) return <strong key={j}>{part.slice(1, -1)}</strong>;
        if (/^https?:\/\//.test(part)) return <a key={j} href={part} target="_blank" rel="noreferrer">{part}</a>;
        return part;
      })}
      {i < arr.length - 1 && <br />}
    </Fragment>
  ));
}

const hora = (ts) => {
  if (!ts) return '';
  const d = new Date(ts._seconds ? ts._seconds * 1000 : ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatWidget() {
  const { open, setOpen, draft, setDraft } = useChat();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [nudge, setNudge] = useState(false);

  // ?chat=1 abre el chat al entrar (así arranca la app instalada).
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('chat') === '1') setOpen(true);
    } catch { /* sin URL */ }
  }, [setOpen]);

  // Saludo proactivo: una vez por sesión, a los pocos segundos, si no abrió el chat.
  useEffect(() => {
    let visto = false;
    try { visto = sessionStorage.getItem(NUDGE_KEY) === '1'; } catch { /* storage bloqueado */ }
    if (visto) return undefined;
    const id = setTimeout(() => setNudge(true), 9000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (open) dismissNudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  function dismissNudge() {
    setNudge(false);
    try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch { /* storage bloqueado */ }
  }
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Historial: se pide una sola vez, al abrir por primera vez.
  useEffect(() => {
    if (!open || loaded) return;
    apiGet(`/chat/${getSessionId()}`)
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  // Un botón del sitio puede abrir el chat con un mensaje ya escrito.
  useEffect(() => {
    if (open && draft) { setText(draft); setDraft(''); }
  }, [open, draft, setDraft]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  // Scroll sólo dentro de la lista (scrollIntoView movía toda la página).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  async function send(raw) {
    const msg = String(raw ?? text).trim();
    if (!msg || sending) return;
    setText('');
    setError('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString(), pending: true }]);
    try {
      const d = await apiPost('/chat', { sessionId: getSessionId(), message: msg });
      setMessages(d.messages ?? []);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => !m.pending));
      setText(msg);
      setError(e.message || 'No pudimos enviar tu mensaje.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      <button
        type="button"
        className={`${s.fab} ${open ? s.fabHidden : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Abrir el chat de atención al pasajero"
      >
        <IconChat />
        <span className={s.fabText}>¿Dudas? Preguntanos</span>
        <span className={s.fabDot} aria-hidden="true" />
      </button>

      {nudge && !open && (
        <div className={s.nudge} role="status">
          <button type="button" className={s.nudgeBody} onClick={() => setOpen(true)}>
            <span className={s.nudgeAvatar} aria-hidden="true">126</span>
            <span>
              <strong>¡Hola! 👋</strong>
              ¿Te ayudo a llegar a algún lado? Preguntame por paradas, horarios o tarifas.
            </span>
          </button>
          <button type="button" className={s.nudgeClose} onClick={dismissNudge} aria-label="Cerrar saludo"><IconClose /></button>
        </div>
      )}

      <section className={`${s.panel} ${open ? s.panelOpen : ''}`} aria-label="Chat de atención al pasajero" aria-hidden={!open}>
        <header className={s.head}>
          <span className={s.avatar} aria-hidden="true">126</span>
          <div className={s.headText}>
            <strong>Asistente 126</strong>
            <span><i className={s.online} /> En línea · responde al instante</span>
          </div>
          <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Cerrar chat" tabIndex={open ? 0 : -1}><IconClose /></button>
        </header>

        <div className={s.list} ref={listRef} aria-live="polite">
          <div className={`${s.msg} ${s.bot}`}>
            <div className={s.bubble}>
              ¡Hola! Soy el asistente virtual de la <strong>Línea 126</strong>. Te ayudo con recorridos, paradas, horarios, tarifas, reclamos y objetos perdidos. ¿En qué te ayudo?
            </div>
          </div>
          {messages.length === 0 && loaded && (
            <div className={s.chips}>
              {SUGERENCIAS.map((q) => (
                <button key={q} type="button" className={s.chip} onClick={() => send(q)} tabIndex={open ? 0 : -1}>{q}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`${s.msg} ${m.role === 'user' ? s.user : s.bot}`}>
              <div className={s.bubble}>{renderText(m.content)}</div>
              <span className={s.time}>{hora(m.timestamp)}</span>
            </div>
          ))}
          {sending && (
            <div className={`${s.msg} ${s.bot}`}>
              <div className={`${s.bubble} ${s.typing}`} aria-label="El asistente está escribiendo"><i /><i /><i /></div>
            </div>
          )}
        </div>

        {error && <p className={s.error} role="alert">{error}</p>}

        <form className={s.composer} onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label htmlFor="chat-input" className="srOnly">Escribí tu consulta</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={text}
            maxLength={2000}
            placeholder="Escribí tu consulta…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            tabIndex={open ? 0 : -1}
          />
          <button type="submit" className={s.send} disabled={!text.trim() || sending} aria-label="Enviar" tabIndex={open ? 0 : -1}><IconSend /></button>
        </form>
        <p className={s.legal}>Asistente automático. Para emergencias llamá al 911.</p>
      </section>
    </>
  );
}
