// Datos de la app: se cargan del servidor al abrir y se guardan solos al cambiar algo.
import { aviso } from './ui.js';

export let datos = null;
export let info = {};
let rev = 0;
let temporizador = null;
let guardando = Promise.resolve();
let bloqueado = false;
let avisadoCaido = 0;

const vacios = () => ({
  version: 1,
  estudio: { nombre: '', nif: '', direccion: '', telefono: '', email: '', web: '', logo: '', iva: 21, validez: 30, condiciones: '' },
  proyectos: [],
  catalogo: [],
  paletas: [],
  moodboards: [],
  contadorPresupuestos: 0,
});

function completar(d) {
  const base = vacios();
  const r = { ...base, ...d, estudio: { ...base.estudio, ...(d.estudio || {}) } };
  for (const clave of ['proyectos', 'catalogo', 'paletas', 'moodboards']) if (!Array.isArray(r[clave])) r[clave] = [];
  return r;
}

export async function cargar() {
  const [rd, ri] = await Promise.all([fetch('/api/datos'), fetch('/api/info')]);
  const d = await rd.json();
  if (!rd.ok) throw new Error(d.error || 'No se han podido cargar los datos');
  info = await ri.json();
  rev = Number(d._rev) || 0;
  datos = completar(d);
  return datos;
}

export function reemplazarDatos(nuevos) {
  datos = completar(nuevos);
}

export function guardar() {
  if (bloqueado) return;
  clearTimeout(temporizador);
  indicador('pendiente');
  temporizador = setTimeout(() => {
    guardando = guardando.then(guardarAhora);
  }, 500);
}

export function guardarYa() {
  clearTimeout(temporizador);
  guardando = guardando.then(guardarAhora);
  return guardando;
}

async function guardarAhora() {
  if (bloqueado) return;
  try {
    const r = await fetch('/api/datos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(rev), 'X-Panel': '1' },
      body: JSON.stringify({ ...datos, _rev: rev }),
    });
    const j = await r.json();
    if (r.status === 409) {
      bloqueado = true;
      indicador('error');
      aviso('Se han hecho cambios en otra ventana. Recarga la página (F5) para no perder nada.', 'error');
      return;
    }
    if (!r.ok) throw new Error(j.error);
    rev = j.rev;
    indicador('ok');
  } catch (e) {
    indicador('error');
    const caido = e instanceof TypeError;
    if (!caido || Date.now() - avisadoCaido > 120000) {
      aviso(caido ? 'No se ha podido guardar: la app no está en marcha. Ábrela con el acceso directo «Interiorismo» del Escritorio; lo hecho en esta ventana se guardará en cuanto vuelva.' : `No se ha podido guardar: ${e.message}`, 'error');
      if (caido) avisadoCaido = Date.now();
    }
    // Se reintenta cuando vuelva el programa, para no perder lo hecho en esta ventana.
    if (caido) setTimeout(() => guardar(), 15000);
  }
}

function indicador(estado) {
  const el = document.getElementById('estado-guardado');
  if (!el) return;
  el.dataset.estado = estado;
  el.textContent = { pendiente: 'Guardando…', ok: 'Guardado', error: 'Sin guardar' }[estado];
}

window.addEventListener('beforeunload', (e) => {
  if (temporizador && document.getElementById('estado-guardado')?.dataset.estado === 'pendiente') {
    guardarYa();
    e.preventDefault();
  }
});

// ---------- Archivos (fotos y modelos 3D) ----------

export function urlArchivo(id) {
  if (!id) return '';
  // Desde el móvil, el visor de realidad aumentada de Android descarga el modelo por su cuenta: necesita el código.
  const c = info.codigoModelos && id.endsWith('.glb') ? `?c=${info.codigoModelos}` : '';
  return `/archivos/${id}${c}`;
}

export function urlAbsoluta(id) {
  return new URL(urlArchivo(id), location.href).href;
}

// Las fotos se reducen a 2048 px como mucho: pesan menos y la IA trabaja mejor con ese tamaño.
async function reducirFoto(archivo, maximo = 2048) {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
  if (escala === 1 && archivo.size < 3 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return archivo;
  const lienzo = new OffscreenCanvas(Math.round(imagen.width * escala), Math.round(imagen.height * escala));
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return lienzo.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
}

export async function subirArchivo(archivo) {
  let cuerpo = archivo;
  let tipo = archivo.type;
  if (/\.glb$/i.test(archivo.name || '')) tipo = 'model/gltf-binary';
  else if (tipo.startsWith('image/')) {
    cuerpo = await reducirFoto(archivo);
    tipo = cuerpo.type || 'image/jpeg';
  }
  const r = await fetch('/api/archivos', { method: 'POST', headers: { 'Content-Type': tipo, 'X-Panel': '1' }, body: cuerpo });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'No se ha podido subir el archivo');
  return j.id;
}

export async function subirBlob(blob, tipo = 'image/png') {
  const r = await fetch('/api/archivos', { method: 'POST', headers: { 'Content-Type': tipo, 'X-Panel': '1' }, body: blob });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'No se ha podido guardar la imagen');
  return j.id;
}

export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const r = await fetch(ruta, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json', 'X-Panel': '1' } : { 'X-Panel': '1' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
