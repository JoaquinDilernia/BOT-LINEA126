import { useEffect, useState } from 'react';

// Chrome/Android disparan `beforeinstallprompt` una sola vez: lo guardamos a
// nivel módulo para que cualquier botón "Instalar app" lo pueda usar.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(Boolean(deferred)));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

export function useInstallPrompt() {
  const [disponible, setDisponible] = useState(Boolean(deferred));
  useEffect(() => {
    listeners.add(setDisponible);
    return () => listeners.delete(setDisponible);
  }, []);
  const instalar = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    notify();
  };
  return { disponible, instalar };
}

export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
