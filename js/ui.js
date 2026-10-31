// Utilidades para pintar la interfaz.

// h('div', { class: 'x', onclick: fn }, 'texto', otroNodo) crea un elemento.
export function h(etiqueta, atributos = {}, ...hijos) {
  const svg = ['svg', 'g', 'path', 'rect', 'line', 'circle', 'polygon', 'polyline', 'text', 'defs', 'pattern', 'tspan'].includes(etiqueta);
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', etiqueta) : document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor);
    else if (clave === 'style' && typeof valor === 'object') Object.assign(el.style, valor);
    else if (clave === 'value' && !svg) el.value = valor;
    else if (clave === 'checked' && !svg) el.checked = valor;
    else el.setAttribute(clave, valor === true ? '' : valor);
  }
  anadir(el, hijos);
  return el;
}

function anadir(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
}

export function vaciar(el, ...hijos) {
  el.replaceChildren();
  anadir(el, hijos);
  return el;
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const numero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const formatoEuros = (n) => euros.format(Number(n) || 0);
export const formatoNumero = (n, decimales = 2) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimales }).format(Number(n) || 0);
export const formatoM2 = (n) => `${numero.format(Number(n) || 0)} m²`;

export function formatoFecha(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function hoy() {
  const f = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Aviso breve abajo a la derecha.
export function aviso(texto, tipo = 'ok') {
  let zona = document.getElementById('avisos');
  if (!zona) {
    zona = h('div', { id: 'avisos', 'aria-live': 'polite' });
    document.body.append(zona);
  }
  const el = h('div', { class: `aviso aviso-${tipo}` }, texto);
  zona.append(el);
  setTimeout(() => el.classList.add('fuera'), tipo === 'error' ? 6000 : 3000);
  setTimeout(() => el.remove(), tipo === 'error' ? 6500 : 3500);
}

// Ventana encima de la página. Devuelve una función para cerrarla.
export function ventana(titulo, contenido, { ancha = false, alCerrar } = {}) {
  const fondo = h('div', { class: 'ventana-fondo' });
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener('keydown', teclas);
    alCerrar?.();
  };
  const teclas = (e) => {
    if (e.key === 'Escape') cerrar();
  };
  const caja = h(
    'div',
    { class: `ventana${ancha ? ' ancha' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'ventana-cabecera' }, h('h2', {}, titulo), h('button', { class: 'boton-icono', 'aria-label': 'Cerrar', onclick: cerrar }, '✕')),
    h('div', { class: 'ventana-cuerpo' }, contenido),
  );
  fondo.append(caja);
  fondo.addEventListener('mousedown', (e) => {
    if (e.target === fondo) cerrar();
  });
  document.addEventListener('keydown', teclas);
  document.body.append(fondo);
  caja.querySelector('input, select, textarea')?.focus();
  return cerrar;
}

export function confirmar(texto, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let respuesta = false;
    const cerrar = ventana(
      'Confirmar',
      h(
        'div',
        {},
        h('p', {}, texto),
        h(
          'div',
          { class: 'botones' },
          h('button', { class: 'boton', onclick: () => cerrar() }, no),
          h('button', { class: `boton ${peligro ? 'peligro' : 'principal'}`, onclick: () => { respuesta = true; cerrar(); } }, si),
        ),
      ),
      { alCerrar: () => resolver(respuesta) },
    );
  });
}

// Campo de formulario con su etiqueta.
export function campo(etiqueta, control, ayuda) {
  return h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, etiqueta), control, ayuda ? h('small', {}, ayuda) : null);
}

// Entrada enlazada a una propiedad de un objeto: al cambiar, guarda.
export function entrada(objeto, clave, { tipo = 'text', alCambiar, ...resto } = {}) {
  const el = h('input', { type: tipo, value: objeto[clave] ?? '', ...resto });
  el.addEventListener(tipo === 'color' ? 'input' : 'change', () => {
    objeto[clave] = tipo === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    alCambiar?.(objeto[clave]);
  });
  return el;
}

export function areaTexto(objeto, clave, { alCambiar, ...resto } = {}) {
  const el = h('textarea', { ...resto });
  el.value = objeto[clave] ?? '';
  el.addEventListener('change', () => {
    objeto[clave] = el.value;
    alCambiar?.(el.value);
  });
  return el;
}

export function selector(objeto, clave, opciones, { alCambiar, ...resto } = {}) {
  const el = h(
    'select',
    resto,
    opciones.map(([valor, texto]) => h('option', { value: valor, selected: String(objeto[clave]) === String(valor) }, texto)),
  );
  el.addEventListener('change', () => {
    objeto[clave] = el.value;
    alCambiar?.(el.value);
  });
  return el;
}

export function pestanas(lista, activa, alElegir) {
  return h(
    'div',
    { class: 'pestanas', role: 'tablist' },
    lista.map(([id, texto]) =>
      h('button', { class: `pestana${id === activa ? ' activa' : ''}`, role: 'tab', 'aria-selected': String(id === activa), onclick: () => alElegir(id) }, texto),
    ),
  );
}

export function vacio(texto, ...extra) {
  return h('div', { class: 'vacio' }, h('p', {}, texto), extra);
}

// Pide un archivo al usuario.
export function elegirArchivo(accept, { multiple = false, capture } = {}) {
  return new Promise((resolver) => {
    const el = h('input', { type: 'file', accept, multiple, capture, style: { display: 'none' } });
    el.addEventListener('change', () => {
      resolver([...el.files]);
      el.remove();
    });
    document.body.append(el);
    el.click();
  });
}

export function descargar(nombre, blob) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
