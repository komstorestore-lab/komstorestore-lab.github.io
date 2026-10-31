// Producto mandado desde el botón «➕ Interiorismo» del navegador. Los datos vienen de una página web:
// se enseñan como texto y el servidor los limpia antes de usarlos.
import { h, vaciar, aviso, formatoEuros, vacio } from '../ui.js';
import { urlArchivo } from '../estado.js';
import { traerProducto, enCatalogo } from '../importar.js';

export function mostrar(el, [codigo]) {
  let ficha = null;
  try {
    ficha = JSON.parse(decodeURIComponent(escape(atob(codigo || ''))));
  } catch {
    ficha = null;
  }
  // Se quita de la dirección para que al recargar no se vuelva a añadir.
  history.replaceState(null, '', '#/importar');
  if (!ficha || typeof ficha !== 'object' || !ficha.url) {
    el.append(vacio('No ha llegado ningún producto. Usa el botón «➕ Interiorismo» en la página de un producto.', h('a', { class: 'boton', href: '#/tiendas' }, 'Ir a Tiendas')));
    return;
  }
  let host = '';
  try {
    host = new URL(ficha.url).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  const zona = h('div');
  const ya = enCatalogo(ficha.url);
  const boton = h('button', { class: 'boton principal' }, '+ Añadir al catálogo');
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    vaciar(boton, h('span', { class: 'girando' }), ' Trayendo foto, medidas y modelo 3D…');
    try {
      const { producto: p } = await traerProducto({ ficha, url: ficha.url });
      vaciar(
        zona,
        h(
          'div',
          { class: 'tarjeta', style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
          p.foto ? h('img', { src: urlArchivo(p.foto), alt: '', style: { width: '160px', height: '160px', objectFit: 'contain', background: '#fff', borderRadius: '8px' } }) : null,
          h(
            'div',
            {},
            h('h2', {}, '✓ Añadido a tu catálogo'),
            h('p', {}, p.nombre),
            h('p', { style: { color: 'var(--texto-suave)' } }, `${p.ancho || '?'} × ${p.fondo || '?'} × ${p.alto || '?'} cm${p.precio ? ` · ${formatoEuros(p.precio)}` : ''}${p.modelo ? ' · con modelo 3D' : ''}`),
            !p.ancho || !p.fondo || !p.alto ? h('p', { class: 'problema' }, 'Faltan algunas medidas: complétalas en el catálogo.') : null,
            h('div', { class: 'botones izquierda' }, h('a', { class: 'boton principal', href: '#/catalogo' }, 'Ver el catálogo'), h('button', { class: 'boton', onclick: () => window.close() }, 'Cerrar esta pestaña')),
          ),
        ),
      );
    } catch (e) {
      boton.disabled = false;
      vaciar(boton, '+ Añadir al catálogo');
      aviso(e.message, 'error');
    }
  });
  vaciar(
    zona,
    h(
      'div',
      { class: 'tarjeta' },
      h('small', {}, `Desde ${host}`),
      h('h2', {}, String(ficha.nombre || 'Producto sin nombre').slice(0, 160)),
      ficha.precio ? h('p', {}, formatoEuros(Number(String(ficha.precio).replace(',', '.')) || 0)) : null,
      ya ? h('p', { class: 'problema' }, 'Ya tienes este producto en el catálogo.') : null,
      h('div', { class: 'botones izquierda' }, boton, h('a', { class: 'boton', href: '#/catalogo' }, 'Cancelar')),
    ),
  );
  el.append(h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Añadir un producto'), h('p', {}, 'Llega desde el botón de tu navegador.'))), zona);
}
