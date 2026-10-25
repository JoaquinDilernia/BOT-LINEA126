import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-linea126_postulaciones';

export const PUESTOS = ['Chofer', 'Mecánico/a', 'Administración', 'Otro'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function invalid(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

export function validarPostulacion(body) {
  const data = {
    nombre: clean(body.nombre, 120),
    email: clean(body.email, 160).toLowerCase(),
    telefono: clean(body.telefono, 40),
    puesto: PUESTOS.includes(body.puesto) ? body.puesto : 'Otro',
    licencia: clean(body.licencia, 40),
    zona: clean(body.zona, 120),
    mensaje: clean(body.mensaje, 2000),
    cvUrl: clean(body.cvUrl, 500),
  };
  if (data.nombre.length < 3) throw invalid('Ingresá tu nombre y apellido.');
  if (!EMAIL_RE.test(data.email)) throw invalid('Ingresá un email válido.');
  if (data.telefono.replace(/\D/g, '').length < 8) throw invalid('Ingresá un teléfono de contacto.');
  if (data.cvUrl && !/^https?:\/\//i.test(data.cvUrl)) throw invalid('El link al CV tiene que empezar con http:// o https://');
  return data;
}

export async function createPostulacion(body) {
  const data = validarPostulacion(body);
  const ref = await getDb().collection(COLLECTION).add({ ...data, estado: 'nueva', createdAt: new Date() });
  return { id: ref.id };
}

export async function listPostulaciones() {
  const snap = await getDb().collection(COLLECTION).orderBy('createdAt', 'desc').limit(300).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePostulacionEstado(id, estado) {
  if (!['nueva', 'vista', 'contactada', 'descartada'].includes(estado)) throw invalid('Estado inválido');
  await getDb().collection(COLLECTION).doc(id).update({ estado, updatedAt: new Date() });
}
