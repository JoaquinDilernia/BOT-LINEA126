import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Links de los mails de reclamos: ?chat=1&reclamo=R126-000123 abre el chat
// con el número ya escrito (va antes del # por el HashRouter).
export const reclamoDeUrl = () => {
  const n = new URLSearchParams(window.location.search).get('reclamo') ?? '';
  return /^R126-d{6}$/i.test(n) ? n.toUpperCase() : '';
};

// Cualquier botón del sitio ("Hacer un reclamo", "Preguntale al asistente")
// abre el mismo chat, opcionalmente con un mensaje ya escrito.
const ChatContext = createContext({ open: false, draft: '', openChat: () => {}, closeChat: () => {}, setDraft: () => {} });

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const openChat = useCallback((text = '') => {
    if (text) setDraft(text);
    setOpen(true);
  }, []);
  const closeChat = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('chat') !== '1') return;
    const n = reclamoDeUrl();
    openChat(n ? `Hola, te escribo por mi reclamo N° ${n}` : '');
  }, [openChat]);

  const value = useMemo(() => ({ open, draft, openChat, closeChat, setDraft, setOpen }), [open, draft, openChat, closeChat]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
