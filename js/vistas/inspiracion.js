// Paletas de colores y lista de moodboards.
import { h, vaciar, ventana, confirmar, campo, entrada, selector, pestanas, vacio, uid, aviso, elegirArchivo } from '../ui.js';
import { datos, guardar, urlArchivo } from '../estado.js';

const PALETAS_BASE = [
  ['Nórdico', ['#f4f1ea', '#d9d4cc', '#a7a39b', '#c8a27a', '#4a5560']],
  ['Japandi', ['#ede6db', '#cbbba5', '#8f7f6b', '#5b5146', '#2e2b28']],
  ['Mediterráneo', ['#fbf8f2', '#e6d3b3', '#c4703f', '#2f6c8f', '#8aa37b']],
  ['Terracota cálido', ['#f3e6d8', '#e0b796', '#c97f62', '#9a4f36', '#5c3b2e']],
  ['Verde salvia', ['#f2f1ec', '#cfd6c4', '#9fac8f', '#6f7f62', '#3e4a38']],
  ['Azul sereno', ['#f1f3f4', '#c9d6df', '#8aa3b5', '#4f6d84', '#263848']],
  ['Industrial', ['#e4e1dc', '#a19d98', '#5f5c59', '#3b3735', '#a0673f']],
  ['Lujo discreto', ['#f5f0e8', '#d8c8b0', '#b49a6e', '#4b4038', '#1f1c1a']],
];

export function mostrar(el, [pestanaInicial]) {
  let pestana = pestanaInicial === 'moodboards' ? 'moodboards' : 'paletas';
  const cuerpo = h('div');
  const pintar = () => {
    history.replaceState(null, '', `#/inspiracion/${pestana}`);
    vaciar(cuerpo, pestanas([['paletas', 'Paletas de colores'], ['moodboards', 'Moodboards']], pestana, (x) => { pestana = x; pintar(); }), pestana === 'paletas' ? paletas(pintar) : moodboards(pintar));
  };
  el.append(h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Inspiración'), h('p', {}, 'Tus paletas se pueden usar para pintar las paredes en la vista 3D.'))), cuerpo);
  pintar();
}

// ---------- Paletas ----------

function paletas(repintar) {
  const nueva = (colores, nombre = 'Paleta nueva') => {
    datos.paletas.push({ id: uid(), nombre, colores, proyectoId: '' });
    guardar();
    repintar();
  };
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'botones izquierda', style: { marginTop: 0, marginBottom: '16px' } },
      h('button', { class: 'boton principal', onclick: () => desdeFoto(nueva) }, '◐ Sacar colores de una foto'),
      h('button', { class: 'boton', onclick: () => generador(nueva) }, '✦ Generar desde un color'),
      h('button', { class: 'boton', onclick: () => nueva(['#f4f1ea', '#d9cbb8', '#9fa59a', '#5f6f7e', '#2f2b28']) }, '+ Paleta vacía'),
    ),
    datos.paletas.length ? h('div', { class: 'tarjetas' }, datos.paletas.map((p) => tarjetaPaleta(p, repintar))) : vacio('Todavía no tienes paletas. Saca una de una foto que te guste o parte de una de las de abajo.'),
    h('h2', { style: { marginTop: '24px' } }, 'Para empezar'),
    h(
      'div',
      { class: 'tarjetas' },
      PALETAS_BASE.map(([nombre, colores]) =>
        h('div', { class: 'tarjeta' }, h('div', { class: 'paleta' }, colores.map((c) => h('div', { style: { background: c } }))), h('div', { class: 'fila', style: { justifyContent: 'space-between', marginTop: '10px' } }, h('b', {}, nombre), h('button', { class: 'boton pequeno', onclick: () => nueva([...colores], nombre) }, 'Guardar en mis paletas'))),
      ),
    ),
  );
}

function tarjetaPaleta(p, repintar) {
  return h(
    'div',
    { class: 'tarjeta' },
    h(
      'div',
      { class: 'paleta' },
      p.colores.map((c, i) => {
        const selectorColor = h('input', { type: 'color', value: c, style: { position: 'absolute', opacity: 0, width: '1px', height: '1px' } });
        selectorColor.addEventListener('change', () => {
          p.colores[i] = selectorColor.value;
          guardar();
          repintar();
        });
        return h(
          'div',
          { style: { background: c, color: esOscuro(c) ? '#fff' : '#222', position: 'relative' }, title: 'Clic para cambiar el color', onclick: () => selectorColor.click() },
          selectorColor,
          c.toUpperCase(),
        );
      }),
    ),
    h('div', { class: 'fila', style: { marginTop: '10px' } }, h('div', { class: 'crece' }, entrada(p, 'nombre', { alCambiar: guardar })), selector(p, 'proyectoId', [['', 'Sin proyecto'], ...datos.proyectos.map((x) => [x.id, x.nombre])], { alCambiar: guardar, style: { width: '130px' } })),
    h(
      'div',
      { class: 'botones' },
      p.colores.length < 8 ? h('button', { class: 'boton pequeno', onclick: () => { p.colores.push('#cccccc'); guardar(); repintar(); } }, '+ Color') : null,
      p.colores.length > 2 ? h('button', { class: 'boton pequeno', onclick: () => { p.colores.pop(); guardar(); repintar(); } }, '− Color') : null,
      h('button', { class: 'boton pequeno', onclick: () => navigator.clipboard?.writeText(p.colores.join(' ')).then(() => aviso('Colores copiados')) }, 'Copiar códigos'),
      h('button', {
        class: 'boton pequeno peligro',
        onclick: async () => {
          if (!(await confirmar(`¿Borrar la paleta «${p.nombre}»?`, { si: 'Borrar', peligro: true }))) return;
          datos.paletas.splice(datos.paletas.indexOf(p), 1);
          guardar();
          repintar();
        },
      }, 'Borrar'),
    ),
  );
}

export function esOscuro(hex) {
  const [r, g, b] = hexARgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function hexARgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgbAHex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

function rgbAHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, s, l];
}

function hslAHex(hue, s, l) {
  hue = ((hue % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return rgbAHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Combinaciones clásicas a partir de un color. Se suavizan para que funcionen en interiores.
function armonia(base, tipo) {
  const [hue, s0, l0] = rgbAHsl(...hexARgb(base));
  const s = Math.min(s0, 0.55);
  const l = Math.min(Math.max(l0, 0.25), 0.7);
  const neutro = (claridad) => hslAHex(hue, Math.min(0.12, s), claridad);
  switch (tipo) {
    case 'complementaria':
      return [neutro(0.95), hslAHex(hue, s, l + 0.15), base, hslAHex(hue + 180, s * 0.7, l), neutro(0.18)];
    case 'analoga':
      return [neutro(0.94), hslAHex(hue - 30, s, l + 0.1), base, hslAHex(hue + 30, s, l - 0.05), hslAHex(hue, s * 0.6, 0.22)];
    case 'triada':
      return [neutro(0.95), base, hslAHex(hue + 120, s * 0.7, l), hslAHex(hue + 240, s * 0.7, l), neutro(0.2)];
    default:
      return [hslAHex(hue, s * 0.4, 0.94), hslAHex(hue, s * 0.6, 0.78), base, hslAHex(hue, s, Math.max(0.2, l - 0.2)), hslAHex(hue, s * 0.8, 0.14)];
  }
}

function generador(alGuardar) {
  const estado = { base: '#9fac8f', tipo: 'monocromatica' };
  const vista = h('div', { class: 'paleta', style: { marginBottom: '12px' } });
  const pintar = () => vaciar(vista, armonia(estado.base, estado.tipo).map((c) => h('div', { style: { background: c, color: esOscuro(c) ? '#fff' : '#222' } }, c.toUpperCase())));
  const color = h('input', { type: 'color', value: estado.base });
  color.addEventListener('input', () => {
    estado.base = color.value;
    pintar();
  });
  const cerrar = ventana(
    'Generar una paleta',
    h(
      'div',
      {},
      h('div', { class: 'rejilla-2' }, campo('Color de partida', color), campo('Combinación', selector(estado, 'tipo', [['monocromatica', 'Tonos del mismo color'], ['analoga', 'Colores vecinos'], ['complementaria', 'Con su contrario'], ['triada', 'Tres colores']], { alCambiar: pintar }))),
      vista,
      h('small', {}, 'Siempre incluye un tono muy claro (para paredes) y uno muy oscuro (para detalles).'),
      h('div', { class: 'botones' }, h('button', { class: 'boton principal', onclick: () => { alGuardar(armonia(estado.base, estado.tipo), 'Paleta generada'); cerrar(); } }, 'Guardar paleta')),
    ),
  );
  pintar();
}

// Colores principales de una foto (agrupación k-medias sobre una versión pequeña de la imagen).
export async function coloresDeFoto(archivoOUrl, n = 5) {
  const imagen = typeof archivoOUrl === 'string' ? await cargarImagen(archivoOUrl) : await createImageBitmap(archivoOUrl);
  const lado = 80;
  const escala = lado / Math.max(imagen.width, imagen.height);
  const c = new OffscreenCanvas(Math.max(1, Math.round(imagen.width * escala)), Math.max(1, Math.round(imagen.height * escala)));
  const x = c.getContext('2d');
  x.drawImage(imagen, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  // Se empieza por el color medio y luego, uno a uno, por el píxel más distinto de los ya elegidos.
  const distancia2 = (p, cc) => (p[0] - cc[0]) ** 2 + (p[1] - cc[1]) ** 2 + (p[2] - cc[2]) ** 2;
  const medio = px.reduce((s, p) => [s[0] + p[0] / px.length, s[1] + p[1] / px.length, s[2] + p[2] / px.length], [0, 0, 0]);
  let centros = [px.reduce((mejor, p) => (distancia2(p, medio) < distancia2(mejor, medio) ? p : mejor), px[0])];
  while (centros.length < n) {
    let lejano = px[0];
    let maximo = -1;
    for (const p of px) {
      const dmin = Math.min(...centros.map((cc) => distancia2(p, cc)));
      if (dmin > maximo) {
        maximo = dmin;
        lejano = p;
      }
    }
    centros.push(lejano);
  }
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const sumas = centros.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let mejor = 0;
      let dist = Infinity;
      centros.forEach((cc, j) => {
        const dd = (p[0] - cc[0]) ** 2 + (p[1] - cc[1]) ** 2 + (p[2] - cc[2]) ** 2;
        if (dd < dist) {
          dist = dd;
          mejor = j;
        }
      });
      const s = sumas[mejor];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    }
    centros = sumas.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centros[j]));
  }
  // De más claro a más oscuro
  return centros.map((cc) => rgbAHex(...cc)).sort((a, b) => rgbAHsl(...hexARgb(b))[2] - rgbAHsl(...hexARgb(a))[2]);
}

function cargarImagen(url) {
  return new Promise((resolver, rechazar) => {
    const i = new Image();
    i.onload = () => resolver(i);
    i.onerror = () => rechazar(new Error('No se ha podido abrir la imagen'));
    i.src = url;
  });
}

async function desdeFoto(alGuardar) {
  const [archivo] = await elegirArchivo('image/*');
  if (!archivo) return;
  try {
    const colores = await coloresDeFoto(archivo, 5);
    const url = URL.createObjectURL(archivo);
    const cerrar = ventana(
      'Colores de la foto',
      h(
        'div',
        {},
        h('img', { src: url, alt: '', style: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' } }),
        h('div', { class: 'paleta' }, colores.map((c) => h('div', { style: { background: c, color: esOscuro(c) ? '#fff' : '#222' } }, c.toUpperCase()))),
        h('div', { class: 'botones' }, h('button', { class: 'boton principal', onclick: () => { alGuardar(colores, (archivo.name || 'Foto').replace(/\.[^.]+$/, '')); cerrar(); } }, 'Guardar paleta')),
      ),
      { alCerrar: () => URL.revokeObjectURL(url) },
    );
  } catch (e) {
    aviso(e.message, 'error');
  }
}

// ---------- Moodboards ----------

function moodboards(repintar) {
  const nuevo = () => {
    const m = { id: uid(), nombre: 'Moodboard nuevo', proyectoId: '', fondo: '#ffffff', elementos: [] };
    datos.moodboards.push(m);
    guardar();
    location.hash = `#/moodboard/${m.id}`;
  };
  return h(
    'div',
    {},
    h('div', { class: 'botones izquierda', style: { marginTop: 0, marginBottom: '16px' } }, h('button', { class: 'boton principal', onclick: nuevo }, '+ Nuevo moodboard')),
    datos.moodboards.length
      ? h(
          'div',
          { class: 'tarjetas' },
          datos.moodboards.map((m) => {
            const imagenes = m.elementos.filter((e) => e.tipo === 'imagen').slice(0, 4);
            const proyecto = datos.proyectos.find((p) => p.id === m.proyectoId);
            return h(
              'a',
              { class: 'tarjeta tarjeta-enlace', href: `#/moodboard/${m.id}` },
              h('div', { class: 'portada', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', placeItems: 'stretch' } }, imagenes.length ? imagenes.map((e) => h('div', { style: { background: `center / cover url("${urlArchivo(e.archivo)}")` } })) : h('div', { style: { gridColumn: '1 / -1', display: 'grid', placeItems: 'center' } }, '◐')),
              h('div', { class: 'cuerpo' }, h('h3', { style: { margin: 0 } }, m.nombre), h('small', {}, `${m.elementos.length} elementos${proyecto ? ` · ${proyecto.nombre}` : ''}`)),
            );
          }),
        )
      : vacio('Un moodboard es un tablero donde juntas fotos, colores y notas para enseñar al cliente el ambiente que buscas.'),
  );
}
