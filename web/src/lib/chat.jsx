import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

  const value = useMemo(() => ({ open, draft, openChat, closeChat, setDraft, setOpen }), [open, draft, openChat, closeChat]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
