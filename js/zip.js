// Archivos ZIP sencillos, sin comprimir (las fotos y los modelos 3D ya vienen comprimidos).
// Sirven para las copias completas que pasan los datos del ordenador al móvil y al revés.
// Funciona igual en el navegador, en el «service worker» del móvil y en Node.

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function fechaDos(f) {
  return {
    hora: (f.getHours() << 11) | (f.getMinutes() << 5) | Math.floor(f.getSeconds() / 2),
    fecha: ((f.getFullYear() - 1980) << 9) | ((f.getMonth() + 1) << 5) | f.getDate(),
  };
}

// entradas: [{ nombre, datos }] con datos como Blob, Uint8Array o texto. Devuelve un Blob.
export async function crearZip(entradas) {
  const codif = new TextEncoder();
  const { hora, fecha } = fechaDos(new Date());
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  for (const e of entradas) {
    const blob = e.datos instanceof Blob ? e.datos : new Blob([e.datos]);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const nombre = codif.encode(e.nombre);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin comprimir
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, blob.size, true);
    local.setUint32(22, blob.size, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    partes.push(local.buffer, nombre, blob);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, fecha, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, blob.size, true);
    c.setUint32(24, blob.size, true);
    c.setUint16(28, nombre.length, true);
    c.setUint32(42, desplazamiento, true);
    central.push(c.buffer, nombre);
    desplazamiento += 30 + nombre.length + blob.size;
  }
  const tamanoCentral = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, entradas.length, true);
  fin.setUint16(10, entradas.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);
  return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
}

// Lee un ZIP hecho por crearZip. Devuelve [{ nombre, tamano, abrir() }], donde abrir() da un Blob con el contenido.
export async function leerZip(zip) {
  const cola = new DataView(await zip.slice(Math.max(0, zip.size - 65558)).arrayBuffer());
  let fin = -1;
  for (let i = cola.byteLength - 22; i >= 0; i--) {
    if (cola.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error('El archivo no es una copia de Interiorismo (no es un ZIP)');
  const total = cola.getUint16(fin + 10, true);
  const tamanoCentral = cola.getUint32(fin + 12, true);
  const inicioCentral = cola.getUint32(fin + 16, true);
  const c = new DataView(await zip.slice(inicioCentral, inicioCentral + tamanoCentral).arrayBuffer());
  const decod = new TextDecoder();
  const entradas = [];
  for (let p = 0, n = 0; n < total; n++) {
    if (c.getUint32(p, true) !== 0x02014b50) throw new Error('La copia está dañada');
    const metodo = c.getUint16(p + 10, true);
    const tamano = c.getUint32(p + 24, true);
    const largoNombre = c.getUint16(p + 28, true);
    const largoExtra = c.getUint16(p + 30, true);
    const largoComentario = c.getUint16(p + 32, true);
    const local = c.getUint32(p + 42, true);
    const nombre = decod.decode(new Uint8Array(c.buffer, c.byteOffset + p + 46, largoNombre));
    if (metodo !== 0) throw new Error('Esta copia no la ha hecho Interiorismo (está comprimida)');
    entradas.push({
      nombre,
      tamano,
      async abrir() {
        const cabecera = new DataView(await zip.slice(local, local + 30).arrayBuffer());
        const inicio = local + 30 + cabecera.getUint16(26, true) + cabecera.getUint16(28, true);
        return zip.slice(inicio, inicio + tamano);
      },
    });
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return entradas;
}

// Qué entradas de una copia son archivos válidos (fotos y modelos) y cuál es su nombre limpio.
export const ARCHIVO_COPIA = /^archivos\/([a-f0-9]{24}\.(jpg|png|webp|glb))$/;
export const MODELO_COPIA = /^modelos\/([a-z0-9-]{2,30}\.(glb|jpg|json))$/;
