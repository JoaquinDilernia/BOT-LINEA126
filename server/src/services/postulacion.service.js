import { getDb } from './firebase.service.js';
import { analizarPostulacion } from './postulacionAnalisis.js';

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

// CV en PDF: Railway no tiene disco persistente y el proyecto no usa
// Storage, así que el archivo se guarda en Firestore partido en trozos
// (un doc no puede pasar de 1 MiB) en la subcolección cv/ de la postulación.
export const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_CHUNK_BYTES = 900 * 1024;

export function validarCv(file) {
  if (!file) return null;
  if (file.size > CV_MAX_BYTES) throw invalid('El CV no puede pesar más de 5 MB.');
  // Se chequea el contenido, no sólo la extensión/mimetype que manda el navegador.
  if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw invalid('El CV tiene que ser un archivo PDF.');
  const nombre = clean(file.originalname, 120).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, '_') || 'cv.pdf';
  return { nombre: /\.pdf$/i.test(nombre) ? nombre : nombre + '.pdf', size: file.size };
}

export async function createPostulacion(body, file = null) {
  const data = validarPostulacion(body);
  const cv = validarCv(file);
  const db = getDb();
  const ref = db.collection(COLLECTION).doc();
  const batch = db.batch();
  if (cv) {
    cv.chunks = Math.ceil(file.size / CV_CHUNK_BYTES);
    for (let i = 0; i < cv.chunks; i++) {
      batch.set(ref.collection('cv').doc(String(i)), { data: file.buffer.subarray(i * CV_CHUNK_BYTES, (i + 1) * CV_CHUNK_BYTES) });
    }
  }
  batch.set(ref, { ...data, cv, estado: 'nueva', analisis: { status: 'pending' }, createdAt: new Date() });
  await batch.commit();
  // Resumen + puntaje con IA en segundo plano: el postulante no espera.
  analizarPostulacion(data, cv ? file.buffer : null)
    .then(analisis => ref.update({ analisis: { ...analisis, analizadoAt: new Date() } }))
    .catch(err => console.error('[postulaciones] No se guardó el análisis:', err.message));
  return { id: ref.id };
}

export async function getPostulacionCv(id) {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  const cv = doc.exists ? doc.data().cv : null;
  if (!cv?.chunks) return null;
  const snap = await ref.collection('cv').get();
  const parts = snap.docs.sort((a, b) => Number(a.id) - Number(b.id)).map(d => Buffer.from(d.data().data));
  return { nombre: cv.nombre, buffer: Buffer.concat(parts) };
}

export async function listPostulaciones() {
  const snap = await getDb().collection(COLLECTION).orderBy('createdAt', 'desc').limit(300).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePostulacionEstado(id, estado) {
  if (!['nueva', 'vista', 'contactada', 'descartada'].includes(estado)) throw invalid('Estado inválido');
  await getDb().collection(COLLECTION).doc(id).update({ estado, updatedAt: new Date() });
}

export async function reanalizarPostulacion(id) {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) { const e = new Error('Postulación no encontrada'); e.status = 404; throw e; }
  const cv = await getPostulacionCv(id);
  const analisis = { ...(await analizarPostulacion(doc.data(), cv?.buffer ?? null)), analizadoAt: new Date() };
  await ref.update({ analisis });
  return analisis;
}
