// Pasa al catálogo un producto traído de una tienda: corrige sus medidas con su modelo 3D y le saca el color.
import { uid } from './ui.js';
import { datos, guardar, urlArchivo, pedir } from './estado.js';
import { medirModelo } from './modelos3d.js';

// Color principal de la foto de un producto (sin el fondo blanco de las fotos de tienda).
export async function colorPrincipal(archivo) {
  try {
    const img = new Image();
    img.src = urlArchivo(archivo);
    await img.decode();
    const lado = 64;
    const c = new OffscreenCanvas(lado, lado);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, lado, lado);
    const d = x.getImageData(0, 0, lado, lado).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [pr, pg, pb, pa] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      // Fuera el fondo: transparente, blanco o gris claro (las fotos de tienda suelen ser así).
      const alto = Math.max(pr, pg, pb);
      if (pa < 200 || (alto > 205 && alto - Math.min(pr, pg, pb) < 28)) continue;
      r += pr;
      g += pg;
      b += pb;
      n++;
    }
    if (n < 30) return '';
    return `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '';
  }
}

// Tamaño habitual de cada tipo de pieza (ancho, fondo y alto en cm). En las camas, el ancho es el lado corto.
const TAMANO_HABITUAL = {
  sofa: [220, 95, 85], 'sofa-l': [250, 160, 85], sillon: [80, 80, 95], puf: [45, 45, 42],
  lampara: [35, 35, 165], 'lampara-mesa': [25, 25, 45], 'lampara-techo': [40, 40, 30], aplique: [20, 15, 25],
  'mesa-centro': [90, 55, 45], mesilla: [45, 40, 55], 'mesa-auxiliar': [50, 50, 50], escritorio: [120, 60, 75],
  'mesa-redonda': [100, 100, 75], mesa: [160, 90, 75], silla: [45, 52, 85], cama: [150, 200, 100],
  armario: [100, 60, 200], comoda: [80, 48, 80], aparador: [160, 45, 80], 'mueble-tv': [180, 42, 50],
  estanteria: [80, 40, 180], alfombra: [160, 230, 1], cortina: [140, 6, 250], cojin: [45, 15, 45],
  espejo: [50, 3, 150], cuadro: [50, 3, 70], jarron: [15, 15, 30], planta: [40, 40, 120],
  encimera: [120, 60, 90], nevera: [60, 65, 185], lavabo: [80, 46, 85], banera: [170, 75, 55],
  ducha: [90, 90, 200], inodoro: [38, 65, 78], decoracion: [20, 20, 20],
};

// Medidas que faltan, con valores normales para cada tipo de pieza (el grosor de un cuadro, el fondo de una lámpara…).
export function completarMedidas(p) {
  const n = (v) => Number(v) || 0;
  const [a, f, al] = [n(p.ancho), n(p.fondo), n(p.alto)];
  const r = { ancho: a, fondo: f, alto: al };
  if (['lampara', 'lampara-mesa', 'lampara-techo', 'jarron', 'mesa-redonda'].includes(p.tipo)) {
    if (!a && f) r.ancho = f;
    if (!r.fondo && r.ancho) r.fondo = r.ancho;
  }
  if (p.tipo === 'planta') {
    const lado = Math.max(35, Math.round((al || 120) / 3));
    if (!a) r.ancho = lado;
    if (!f) r.fondo = r.ancho;
  }
  // Lo que siga faltando: el tamaño habitual de ese tipo de pieza (luego se puede cambiar).
  const [ha, hf, hal] = TAMANO_HABITUAL[p.tipo] || [r.fondo || 60, Math.min(r.ancho || 60, 60), 75];
  if (!r.ancho) r.ancho = ha;
  if (!r.fondo) r.fondo = hf;
  if (!r.alto) r.alto = hal;
  return r;
}

// Trae el producto (fotos y modelo 3D se guardan en el ordenador) y lo añade al catálogo.
// «origen»: { url } de una tienda, { ficha } del botón del navegador, y opcionalmente { pista } con el resultado de una búsqueda.
export async function traerProducto(origen) {
  const { producto, aviso } = await pedir('/api/tiendas/importar', { metodo: 'POST', cuerpo: origen });
  const p = { id: uid(), color: '', ...producto };
  if (p.modelo) {
    const medidas = await medirModelo(urlArchivo(p.modelo), p.tipo).catch(() => null);
    if (medidas) Object.assign(p, medidas);
  }
  if (p.foto) p.color = await colorPrincipal(p.foto);
  if (!p.color) p.color = '#b8a48f';
  Object.assign(p, completarMedidas(p));
  datos.catalogo.push(p);
  guardar();
  return { producto: p, aviso };
}

// ¿Está ya en el catálogo? (por su enlace)
export function enCatalogo(url) {
  const limpio = (u) => String(u || '').split(/[?#]/)[0].replace(/\/$/, '');
  return datos.catalogo.find((p) => p.enlace && limpio(p.enlace) === limpio(url));
}
