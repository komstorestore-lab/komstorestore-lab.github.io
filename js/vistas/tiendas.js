// Buscar productos en tiendas y traerlos al catálogo.
import { h, vaciar, campo, aviso, formatoEuros, vacio } from '../ui.js';
import { pedir, urlArchivo } from '../estado.js';
import { traerProducto, enCatalogo } from '../importar.js';

const SUGERENCIAS = ['sofá 3 plazas', 'sillón', 'mesa de centro', 'mesa de comedor', 'silla', 'cama 150', 'mesita de noche', 'armario', 'cómoda', 'estantería', 'mueble tv', 'alfombra', 'lámpara de pie', 'lámpara de techo', 'cortinas', 'cojín', 'cuadro', 'espejo', 'planta artificial', 'jarrón'];
let ultima = { tienda: 'ikea', q: '' };

export async function mostrar(el) {
  let tiendas = {};
  let movil = false;
  try {
    ({ tiendas, movil } = await pedir('/api/tiendas'));
  } catch (e) {
    el.append(vacio(e.message));
    return;
  }
  const estado = { ...ultima };
  const resultados = h('div');
  const consulta = h('input', { type: 'search', value: estado.q, placeholder: 'Ej.: sofá 3 plazas, lámpara de pie, alfombra 160x230…', style: { maxWidth: '420px' } });
  const pastillas = h('div', { class: 'fila', style: { marginBottom: '12px' } });

  const pintarPastillas = () =>
    vaciar(
      pastillas,
      Object.entries(tiendas).map(([id, t]) => h('button', { class: `boton pequeno${estado.tienda === id ? ' activo' : ''}`, onclick: () => { estado.tienda = id; pintarPastillas(); if (consulta.value.trim()) buscar(); else pintarBloqueada(); } }, t.nombre, t.buscar ? '' : ' ↗')),
    );

  const pintarBloqueada = () => {
    const t = tiendas[estado.tienda];
    if (t.buscar) return vaciar(resultados);
    vaciar(
      resultados,
      h(
        'div',
        { class: 'tarjeta' },
        h('h2', {}, movil ? `${t.nombre}: añádelo a mano` : `${t.nombre}: desde tu navegador`),
        movil
          ? h('p', {}, `Desde el móvil no se puede buscar en ${t.nombre}. Ábrela, haz una captura de pantalla del producto que te guste y añádelo en el Catálogo con «+ Producto a mano» (la captura sirve como foto).`)
          : h('p', {}, `${t.nombre} no deja que la app busque por su cuenta. Ábrela en tu navegador, entra en el producto que te guste y pulsa el botón «➕ Interiorismo» de tu barra de favoritos: se añadirá aquí con su foto, precio y medidas.`),
        h('div', { class: 'botones izquierda' }, h('a', { class: 'boton principal', href: `${t.buscarEnWeb}${encodeURIComponent(consulta.value.trim())}`, target: '_blank', rel: 'noopener noreferrer' }, `Abrir ${consulta.value.trim() ? `«${consulta.value.trim()}»` : 'la tienda'} en ${t.nombre} ↗`)),
      ),
    );
  };

  const tarjeta = (r) => {
    const ya = enCatalogo(r.url);
    const boton = h('button', { class: `boton pequeno${ya ? '' : ' principal'}`, disabled: Boolean(ya) }, ya ? '✓ En tu catálogo' : '+ Añadir al catálogo');
    boton.addEventListener('click', async () => {
      boton.disabled = true;
      vaciar(boton, h('span', { class: 'girando' }), ' Trayendo…');
      try {
        const { producto, aviso: nota } = await traerProducto({ url: r.url, pista: r });
        vaciar(boton, '✓ En tu catálogo');
        aviso(`Añadido: ${producto.nombre}${producto.modelo ? ' (con modelo 3D)' : ''}`);
        if (nota) aviso(nota);
      } catch (e) {
        boton.disabled = false;
        vaciar(boton, '+ Añadir al catálogo');
        aviso(e.message, 'error');
      }
    });
    return h(
      'div',
      { class: 'tarjeta tarjeta-enlace producto' },
      h('div', { class: 'portada', style: r.imagen ? { backgroundImage: `url("${r.imagen}")` } : {} }),
      h(
        'div',
        { class: 'cuerpo' },
        h('h3', { style: { margin: '0 0 2px', fontSize: '14px' } }, r.nombre),
        h('small', {}, r.detalle),
        h('div', { class: 'fila', style: { justifyContent: 'space-between', marginTop: '8px' } }, h('span', { class: 'precio' }, r.precio ? formatoEuros(r.precio) : ''), h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '13px' } }, 'Ver en la tienda ↗')),
        h('div', { class: 'botones', style: { marginTop: '8px' } }, boton),
      ),
    );
  };

  const buscar = async () => {
    estado.q = consulta.value.trim();
    ultima = { ...estado };
    if (!estado.q) return;
    if (!tiendas[estado.tienda]?.buscar) return pintarBloqueada();
    vaciar(resultados, h('p', {}, h('span', { class: 'girando' }), ` Buscando en ${tiendas[estado.tienda].nombre}…`));
    try {
      const { resultados: lista } = await pedir(`/api/tiendas/buscar?tienda=${estado.tienda}&q=${encodeURIComponent(estado.q)}&cantidad=36`);
      vaciar(resultados, lista.length ? h('div', { class: 'tarjetas' }, lista.map(tarjeta)) : vacio('No hay resultados. Prueba con otras palabras.'));
    } catch (e) {
      vaciar(resultados, vacio(e.message));
    }
  };
  consulta.addEventListener('keydown', (e) => e.key === 'Enter' && buscar());

  // Enlace de un producto de cualquier tienda
  const enlace = h('input', { type: 'url', placeholder: 'https://… (la página de un producto)' });
  const traerEnlace = async (boton) => {
    const url = enlace.value.trim();
    if (!/^https?:\/\//.test(url)) return aviso('Pega la dirección completa de la página del producto', 'error');
    boton.disabled = true;
    try {
      const { producto } = await traerProducto({ url });
      aviso(`Añadido: ${producto.nombre}`);
      enlace.value = '';
    } catch (e) {
      aviso(e.message, 'error');
    }
    boton.disabled = false;
  };
  const botonEnlace = h('button', { class: 'boton', onclick: () => traerEnlace(botonEnlace) }, 'Traer');

  el.append(
    h('div', { class: 'cabecera' }, h('div', {}, h('div', { class: 'miga' }, h('a', { href: '#/catalogo' }, 'Catálogo'), ' ›'), h('h1', {}, 'Tiendas'), h('p', {}, movil ? 'Busca muebles y decoración de IKEA y añádelos a tu catálogo con foto, precio y medidas. En el 3D se ven con un mueble del mismo tipo, de su color.' : 'Busca muebles y decoración y añádelos a tu catálogo con foto, precio, medidas y, si la tienda lo tiene, su modelo 3D real.')), h('a', { class: 'boton', href: '#/catalogo' }, 'Ver mi catálogo')),
    h(
      'div',
      { class: 'tarjeta' },
      pastillas,
      h('div', { class: 'fila' }, consulta, h('button', { class: 'boton principal', onclick: buscar }, 'Buscar')),
      h('div', { class: 'fila', style: { marginTop: '10px', gap: '6px' } }, SUGERENCIAS.map((s) => h('button', { class: 'boton pequeno', onclick: () => { consulta.value = s; buscar(); } }, s))),
    ),
    resultados,
    h(
      'div',
      { class: 'rejilla-2', style: { marginTop: '18px' } },
      h('div', { class: 'tarjeta' }, h('h2', {}, 'Pegar el enlace de un producto'), h('p', { style: { color: 'var(--texto-suave)' } }, movil ? 'Desde el móvil funciona con enlaces de IKEA. Los de otras tiendas, añádelos a mano en el Catálogo.' : 'Funciona con IKEA, JYSK y muchas otras tiendas. Si una tienda no lo permite, usa el botón del navegador.'), h('div', { class: 'fila' }, h('div', { class: 'crece' }, enlace), botonEnlace)),
      movil ? h('div', { class: 'tarjeta' }, h('h2', {}, 'Productos de otras tiendas'), h('p', {}, 'Haz una captura de pantalla del producto en la web o la app de la tienda y añádelo en el Catálogo con «+ Producto a mano». En la vista 3D se verá con un mueble del mismo tipo, de su color.'), h('a', { class: 'boton', href: '#/catalogo' }, 'Ir al catálogo')) : botonNavegador(),
    ),
  );
  pintarPastillas();
  if (estado.q) buscar();
  else pintarBloqueada();
}

// Botón para la barra de favoritos: lee la ficha del producto que se está viendo y la manda a la app.
function botonNavegador() {
  const destino = `${location.origin}/#/importar/`;
  const codigo = `(()=>{try{const d={url:location.href,imagenes:[],pares:[]};const ld=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>{try{const j=JSON.parse(s.textContent);return [].concat(j,j&&j['@graph']||[])}catch(e){return[]}});const p=ld.find(x=>x&&[].concat(x['@type']).some(t=>String(t).toLowerCase()==='product'))||{};const m=n=>(document.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]')||{}).content||'';d.nombre=p.name||m('og:title')||document.title;d.descripcion=String(p.description||m('og:description')||'').slice(0,600);const o=[].concat(p.offers||[])[0]||{};d.precio=o.price||o.lowPrice||m('product:price:amount')||'';d.referencia=p.sku||p.mpn||'';d.categoria=[].concat(p.category||[])[0]||'';d.imagenes=[].concat(p.image||[]).map(i=>typeof i==='string'?i:i&&(i.url||i.contentUrl)).filter(Boolean);if(m('og:image'))d.imagenes.push(m('og:image'));d.imagenes=d.imagenes.map(u=>new URL(u,location.href).href).slice(0,6);const g=document.documentElement.innerHTML.match(/"contentUrl"\\s*:\\s*"(https:[^"]+?\\.glb[^"]*)"/);d.modelo=g?g[1]:'';document.querySelectorAll('tr,li,dl>div,dt').forEach(e=>{const t=(e.innerText||'').trim();if(t.length<120&&/(ancho|alto|altura|fondo|profundidad|largo|longitud|di.metro)/i.test(t)&&/\\d/.test(t)){const k=t.split(/\\n|\\t|:/).map(s=>s.trim()).filter(Boolean);d.pares.push(k.length>1?[k[0],k.slice(1).join(' ')]:[t,t])}});d.pares=d.pares.slice(0,150);window.open('${destino}'+btoa(unescape(encodeURIComponent(JSON.stringify(d)))),'_blank')}catch(e){alert('Interiorismo: no se ha podido leer este producto ('+e.message+')')}})()`;
  const marcador = h('a', { class: 'boton principal', href: `javascript:${encodeURIComponent(codigo)}`, title: 'Arrástrame a la barra de favoritos', onclick: (e) => { e.preventDefault(); aviso('Arrastra este botón a la barra de favoritos del navegador; no se pulsa aquí.'); } }, '➕ Interiorismo');
  return h(
    'div',
    { class: 'tarjeta' },
    h('h2', {}, 'Botón para tu navegador (cualquier tienda)'),
    h('ol', { style: { margin: '0 0 12px', paddingLeft: '20px', color: 'var(--texto-suave)' } }, h('li', {}, 'Enseña la barra de favoritos: Ctrl + Mayús + B.'), h('li', {}, 'Arrastra este botón a esa barra:'), h('li', {}, 'En la página de un producto de Leroy Merlin, Kave Home, Maisons du Monde o cualquier tienda, pulsa el botón en la barra. Se abrirá la app con el producto listo para añadir.')),
    marcador,
  );
}
