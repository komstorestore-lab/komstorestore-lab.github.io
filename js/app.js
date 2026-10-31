// Arranque de la app y navegación entre pantallas (la dirección va después de «#»).
import { h, vaciar } from './ui.js';
import { cargar } from './estado.js';

const PANTALLAS = {
  '': () => import('./vistas/inicio.js'),
  proyectos: () => import('./vistas/proyectos.js'),
  proyecto: () => import('./vistas/proyecto.js'),
  plano: () => import('./vistas/plano.js'),
  catalogo: () => import('./vistas/catalogo.js'),
  tiendas: () => import('./vistas/tiendas.js'),
  importar: () => import('./vistas/recibir.js'),
  inspiracion: () => import('./vistas/inspiracion.js'),
  moodboard: () => import('./vistas/moodboard.js'),
  calculadora: () => import('./vistas/calculadora.js'),
  ia: () => import('./vistas/ia.js'),
  ajustes: () => import('./vistas/ajustes.js'),
  imprimir: () => import('./vistas/imprimir.js'),
};

const MENU = [
  ['', 'Inicio', '⌂'],
  ['proyectos', 'Proyectos', '▦'],
  ['catalogo', 'Catálogo', '◫'],
  ['tiendas', 'Tiendas', '⌕'],
  ['inspiracion', 'Inspiración', '◐'],
  ['calculadora', 'Materiales', '▤'],
  ['ia', 'Rediseño con IA', '✦'],
  ['ajustes', 'Ajustes', '⚙'],
];

let limpiar = null;
const principal = h('main', { id: 'principal' });

function construir() {
  const menu = h(
    'nav',
    { class: 'menu', 'aria-label': 'Menú' },
    h('div', { class: 'marca' }, h('span', { class: 'marca-logo' }, '◇'), h('span', {}, 'Interiorismo')),
    MENU.map(([ruta, texto, icono]) => h('a', { href: `#/${ruta}`, 'data-ruta': ruta }, h('span', { class: 'menu-icono', 'aria-hidden': 'true' }, icono), h('span', {}, texto))),
    h('div', { class: 'menu-pie' }, h('span', { id: 'estado-guardado', 'data-estado': 'ok' }, 'Guardado')),
  );
  vaciar(document.getElementById('app'), menu, principal);
}

async function navegar() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const nombre = PANTALLAS[partes[0]] ? partes[0] : '';
  const raiz = { proyecto: 'proyectos', plano: 'proyectos', moodboard: 'inspiracion', imprimir: 'proyectos', importar: 'tiendas' }[nombre] ?? nombre;
  for (const a of document.querySelectorAll('.menu a')) a.classList.toggle('activo', a.dataset.ruta === raiz);
  document.body.dataset.pantalla = nombre || 'inicio';
  try {
    limpiar?.();
  } catch {
    // La pantalla anterior ya no existe.
  }
  limpiar = null;
  vaciar(principal);
  window.scrollTo(0, 0);
  try {
    const modulo = await PANTALLAS[nombre]();
    limpiar = (await modulo.mostrar(principal, partes.slice(1))) || null;
  } catch (e) {
    console.error(e);
    // Lo normal es que se haya cerrado el programa de la app (el que guarda los datos).
    const enMarcha = MOVIL || (await fetch('/api/info', { cache: 'no-store' }).then((r) => r.ok).catch(() => false));
    vaciar(
      principal,
      enMarcha
        ? h('div', { class: 'vacio' }, h('p', {}, 'No se ha podido abrir esta pantalla.'), h('pre', {}, String(e.message || e)), h('button', { class: 'boton', onclick: () => location.reload() }, 'Volver a cargar'))
        : sinServidor(),
    );
  }
}

function sinServidor() {
  return h(
    'div',
    { class: 'tarjeta vacio', style: { maxWidth: '560px', margin: '40px auto' } },
    h('h2', {}, 'La app no está en marcha'),
    h('p', {}, 'Esta ventana se ha quedado abierta, pero el programa de la app (el que guarda tus datos) está cerrado.'),
    h('p', {}, 'Ábrela con doble clic en «Interiorismo», en el Escritorio, y luego pulsa «Volver a cargar».'),
    h('button', { class: 'boton principal', onclick: () => location.reload() }, 'Volver a cargar'),
  );
}

// En la app del móvil no hay servidor: lo hace sw.js (guarda los datos en el propio móvil).
const MOVIL = document.querySelector('meta[name="modo"]')?.content === 'movil';

async function prepararMovil() {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador no puede guardar la app en el móvil. Ábrela con Chrome (Android) o Safari (iPhone).');
  const habia = Boolean(navigator.serviceWorker.controller);
  const registro = await navigator.serviceWorker.register('/sw.js');
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolver, rechazar) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolver, { once: true });
      const nuevo = registro.installing || registro.waiting;
      // Si la descarga se corta, el motor nuevo se descarta y no llegaría nunca.
      nuevo?.addEventListener('statechange', () => {
        if (nuevo.state === 'redundant') rechazar(new Error('No se ha podido descargar la app. Comprueba la conexión a internet y vuelve a intentarlo.'));
      });
      if (!nuevo) registro.active?.postMessage('reclamar');
    });
  }
  // Cuando se publica una versión nueva, la app se recarga sola para usarla.
  if (habia) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  // Que el navegador no borre los datos por falta de espacio.
  navigator.storage?.persist?.().catch(() => {});
}

async function iniciar() {
  try {
    if (MOVIL) {
      vaciar(document.getElementById('app'), h('p', { class: 'cargando' }, 'Preparando la app… (la primera vez tarda un poco: se guarda en el móvil para funcionar sin internet)'));
      await prepararMovil();
    }
    await cargar();
  } catch (e) {
    if (MOVIL) {
      vaciar(document.getElementById('app'), h('div', { class: 'vacio' }, h('h1', {}, 'No se ha podido abrir la app'), h('p', {}, e.message), h('button', { class: 'boton principal', onclick: () => location.reload() }, 'Volver a intentarlo')));
      return;
    }
    const enMarcha = await fetch('/api/info').then((r) => r.ok).catch(() => false);
    vaciar(document.getElementById('app'), enMarcha ? h('div', { class: 'vacio' }, h('h1', {}, 'No se pueden cargar los datos'), h('p', {}, e.message)) : sinServidor());
    return;
  }
  construir();
  window.addEventListener('hashchange', navegar);
  navegar();
}

iniciar();
