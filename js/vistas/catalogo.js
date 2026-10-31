// Catálogo de productos: medidas, precio, foto y modelo 3D (GLB) para verlo en 3D y en realidad aumentada.
import { h, vaciar, ventana, confirmar, campo, entrada, areaTexto, selector, vacio, uid, aviso, elegirArchivo, formatoEuros } from '../ui.js';
import { datos, guardar, urlArchivo, urlAbsoluta, subirArchivo, info } from '../estado.js';
import { CATEGORIAS_CATALOGO, TIPOS_MUEBLE, tipoPorCategoria } from '../modelo.js';
import { colorPrincipal } from '../importar.js';

let visorCargado = null;
const cargarVisor = () => {
  // Los modelos de IKEA vienen comprimidos (Draco): el visor usa el descompresor de la app, no uno de internet.
  self.ModelViewerElement = self.ModelViewerElement || {};
  self.ModelViewerElement.dracoDecoderLocation = '/vendor/draco/';
  return (visorCargado ||= import('../../vendor/model-viewer.min.js'));
};

export function mostrar(el) {
  const filtro = { texto: '', categoria: '', proveedor: '' };
  const lista = h('div');
  const proveedores = [...new Set(datos.catalogo.map((p) => p.proveedor).filter(Boolean))].sort();
  const pintar = () => {
    const t = filtro.texto.toLowerCase();
    const productos = datos.catalogo.filter((p) => (!filtro.categoria || p.categoria === filtro.categoria) && (!filtro.proveedor || p.proveedor === filtro.proveedor) && (!t || `${p.nombre} ${p.proveedor} ${p.referencia} ${p.notas}`.toLowerCase().includes(t)));
    vaciar(
      lista,
      productos.length
        ? h(
            'div',
            { class: 'tarjetas' },
            productos.map((p) =>
              h(
                'div',
                { class: 'tarjeta tarjeta-enlace producto', role: 'button', tabindex: 0, onclick: () => ficha(p, pintar), onkeydown: (e) => e.key === 'Enter' && ficha(p, pintar) },
                h('div', { class: 'portada', style: p.foto ? { backgroundImage: `url("${urlArchivo(p.foto)}")` } : { background: p.color || 'var(--superficie-2)' } }, p.foto ? '' : p.modelo ? '◫ 3D' : ''),
                h(
                  'div',
                  { class: 'cuerpo' },
                  h('h3', { style: { margin: '0 0 2px' } }, p.nombre),
                  h('small', {}, [p.categoria, p.proveedor].filter(Boolean).join(' · ')),
                  h('div', { class: 'fila', style: { justifyContent: 'space-between', marginTop: '6px' } }, h('span', { class: 'precio' }, p.precio ? formatoEuros(p.precio) : ''), h('small', {}, `${p.ancho || '?'} × ${p.fondo || '?'} × ${p.alto || '?'} cm${p.modelo ? ' · 3D' : ''}`)),
                ),
              ),
            ),
          )
        : vacio(datos.catalogo.length ? 'No hay productos con ese filtro.' : 'Añade los productos que sueles usar o que vende tu tienda. Después los puedes colocar en los planos y ver en 3D.'),
    );
  };
  el.append(
    h(
      'div',
      { class: 'cabecera' },
      h('div', {}, h('h1', {}, 'Catálogo'), h('p', {}, `${datos.catalogo.length} productos. Los que tienen modelo 3D se ven con su forma real en la vista 3D y en tu casa con el móvil (realidad aumentada).`)),
      h('div', { class: 'fila' }, h('a', { class: 'boton principal', href: '#/tiendas' }, '⌕ Buscar en tiendas'), h('button', { class: 'boton', onclick: () => editar(null, pintar) }, '+ Producto a mano')),
    ),
    h(
      'div',
      { class: 'fila', style: { marginBottom: '16px' } },
      h('input', { type: 'search', placeholder: 'Buscar', style: { maxWidth: '300px' }, oninput: (e) => { filtro.texto = e.target.value; pintar(); } }),
      selector(filtro, 'categoria', [['', 'Todas las categorías'], ...CATEGORIAS_CATALOGO.map((c) => [c, c])], { alCambiar: pintar, style: { width: 'auto' } }),
      proveedores.length > 1 ? selector(filtro, 'proveedor', [['', 'Todas las tiendas'], ...proveedores.map((p) => [p, p])], { alCambiar: pintar, style: { width: 'auto' } }) : null,
    ),
    lista,
  );
  pintar();
}

function ficha(p, repintar) {
  const usos = datos.proyectos.flatMap((pr) => pr.habitaciones.filter((hab) => hab.plano.muebles.some((m) => m.productoId === p.id)).map((hab) => ({ pr, hab })));
  const visor = h('div');
  if (p.modelo) {
    cargarVisor()
      .then(() => {
        const mv = document.createElement('model-viewer');
        mv.setAttribute('src', urlArchivo(p.modelo));
        mv.setAttribute('alt', `Modelo 3D de ${p.nombre}`);
        mv.setAttribute('camera-controls', '');
        mv.setAttribute('shadow-intensity', '1');
        mv.setAttribute('ar', '');
        // En la app del móvil el modelo está guardado en el propio móvil: el visor de Android (Scene Viewer) no
        // podría descargarlo, así que se usa la realidad aumentada del navegador (WebXR) y, en iPhone, Quick Look.
        mv.setAttribute('ar-modes', info.movil ? 'webxr quick-look' : 'webxr scene-viewer quick-look');
        mv.setAttribute('ar-scale', 'fixed');
        const boton = h('button', { slot: 'ar-button', class: 'boton principal', style: { position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)' } }, '📱 Verlo en tu casa');
        mv.append(boton);
        visor.append(mv);
        visor.append(h('small', {}, info.local ? 'La realidad aumentada funciona al abrir la app en el móvil (Ajustes > Usar desde el móvil).' : 'Pulsa «Verlo en tu casa» y apunta la cámara al suelo. El tamaño es el real.'));
        if (!info.local) mv.setAttribute('src', urlAbsoluta(p.modelo));
      })
      .catch(() => visor.append(h('p', { class: 'problema' }, 'No se ha podido cargar el visor 3D.')));
  } else if (p.foto) {
    visor.append(h('img', { src: urlArchivo(p.foto), alt: p.nombre, style: { width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '10px', background: '#fff' } }));
  }
  const cerrar = ventana(
    p.nombre,
    h(
      'div',
      {},
      visor,
      h(
        'div',
        { class: 'rejilla-2', style: { marginTop: '12px' } },
        h('div', {}, h('b', {}, p.precio ? formatoEuros(p.precio) : 'Sin precio'), h('div', {}, `${p.ancho || '?'} × ${p.fondo || '?'} × ${p.alto || '?'} cm (ancho × fondo × alto)`), h('div', {}, [p.categoria, p.proveedor, p.referencia ? `Ref. ${p.referencia}` : ''].filter(Boolean).join(' · ')), p.enlace ? h('a', { href: p.enlace, target: '_blank', rel: 'noopener noreferrer' }, 'Ver en la web del proveedor') : null),
        h('div', {}, p.notas ? h('p', { style: { whiteSpace: 'pre-wrap' } }, p.notas) : null, usos.length ? h('small', {}, `Colocado en: ${usos.map((u) => `${u.pr.nombre} (${u.hab.nombre})`).join(', ')}`) : h('small', {}, 'Todavía no está en ningún plano. Añádelo desde el panel del plano.')),
      ),
      h('div', { class: 'botones' }, h('button', { class: 'boton', onclick: () => { cerrar(); editar(p, repintar); } }, 'Editar')),
    ),
    { ancha: true },
  );
}

function editar(original, repintar) {
  const p = original ? structuredClone(original) : { id: uid(), nombre: '', categoria: 'Sofás y sillones', tipo: 'sofa', ancho: '', fondo: '', alto: '', precio: '', proveedor: '', referencia: '', enlace: '', foto: '', modelo: '', color: '#b8a48f', notas: '' };
  p.tipo ||= tipoPorCategoria(p.categoria);
  const zonaFoto = h('div');
  const zonaModelo = h('div');
  const pintarArchivos = () => {
    vaciar(
      zonaFoto,
      p.foto ? h('img', { src: urlArchivo(p.foto), alt: '', style: { width: '100%', maxHeight: '140px', objectFit: 'contain', background: '#fff', borderRadius: '8px' } }) : null,
      h('div', { class: 'fila' }, h('button', { class: 'boton pequeno', type: 'button', onclick: async () => { const [a] = await elegirArchivo('image/*'); if (!a) return; try { p.foto = await subirArchivo(a); pintarArchivos(); } catch (e) { aviso(e.message, 'error'); } } }, p.foto ? 'Cambiar foto' : '+ Foto'), p.foto ? h('button', { class: 'boton pequeno', type: 'button', onclick: () => { p.foto = ''; pintarArchivos(); } }, 'Quitar') : null),
    );
    vaciar(
      zonaModelo,
      h('small', {}, p.modelo ? '✓ Tiene modelo 3D' : 'Archivo .glb del fabricante o de una biblioteca de modelos (revisa su licencia).'),
      h('div', { class: 'fila' }, h('button', { class: 'boton pequeno', type: 'button', onclick: async () => { const [a] = await elegirArchivo('.glb,model/gltf-binary'); if (!a) return; if (!/\.glb$/i.test(a.name)) return aviso('Tiene que ser un archivo .glb', 'error'); try { aviso('Subiendo el modelo…'); p.modelo = await subirArchivo(a); pintarArchivos(); aviso('Modelo 3D subido'); } catch (e) { aviso(e.message, 'error'); } } }, p.modelo ? 'Cambiar modelo' : '+ Modelo 3D (GLB)'), p.modelo ? h('button', { class: 'boton pequeno', type: 'button', onclick: () => { p.modelo = ''; pintarArchivos(); } }, 'Quitar') : null),
    );
  };
  pintarArchivos();
  const numero = (clave, etiqueta) => campo(etiqueta, entrada(p, clave, { tipo: 'number', min: 0, step: 'any' }));
  const cerrar = ventana(
    original ? 'Editar producto' : 'Nuevo producto',
    h(
      'form',
      {
        onsubmit: async (e) => {
          e.preventDefault();
          if (!p.nombre.trim()) return aviso('Ponle un nombre', 'error');
          // Si no se ha elegido color, se saca de la foto (sirve para teñir el mueble en 3D).
          if (p.foto && (!p.color || p.color === '#b8a48f')) p.color = (await colorPrincipal(p.foto)) || p.color;
          if (original) Object.assign(original, p);
          else datos.catalogo.push(p);
          // Si cambian las medidas, se actualizan los muebles que ya estaban en los planos.
          for (const pr of datos.proyectos)
            for (const hab of pr.habitaciones)
              for (const m of hab.plano.muebles)
                if (m.productoId === p.id) Object.assign(m, { nombre: p.nombre, tipo: p.tipo || m.tipo, ancho: Number(p.ancho) || m.ancho, fondo: Number(p.fondo) || m.fondo, alto: Number(p.alto) || m.alto, color: p.color || m.color });
          guardar();
          cerrar();
          repintar();
        },
      },
      campo('Nombre', entrada(p, 'nombre', { placeholder: 'Ej.: Sofá Oslo 3 plazas' })),
      h('div', { class: 'rejilla-2' }, campo('Categoría', selector(p, 'categoria', CATEGORIAS_CATALOGO.map((c) => [c, c]))), campo('Tipo (para el plano y el 3D)', selector(p, 'tipo', TIPOS_MUEBLE))),
      h('div', { class: 'rejilla-3' }, numero('ancho', 'Ancho (cm)'), numero('fondo', 'Fondo (cm)'), numero('alto', 'Alto (cm)')),
      h('div', { class: 'rejilla-3' }, numero('precio', 'Precio (€)'), campo('Proveedor o tienda', entrada(p, 'proveedor')), campo('Referencia', entrada(p, 'referencia'))),
      h('div', { class: 'rejilla-2' }, campo('Enlace', entrada(p, 'enlace', { tipo: 'url', placeholder: 'https://' })), campo('Color (para el plano y el 3D sencillo)', entrada(p, 'color', { tipo: 'color' }))),
      h('div', { class: 'rejilla-2' }, campo('Foto', zonaFoto), campo('Modelo 3D', zonaModelo)),
      campo('Notas', areaTexto(p, 'notas', { rows: 3, placeholder: 'Acabados, plazos de entrega, tejidos…' })),
      h(
        'div',
        { class: 'botones' },
        original
          ? h('button', {
              class: 'boton peligro',
              type: 'button',
              onclick: async () => {
                if (!(await confirmar(`¿Borrar «${original.nombre}» del catálogo? Los muebles que ya estén en los planos se quedan, pero como forma sencilla.`, { si: 'Borrar', peligro: true }))) return;
                datos.catalogo.splice(datos.catalogo.indexOf(original), 1);
                for (const pr of datos.proyectos) for (const hab of pr.habitaciones) for (const m of hab.plano.muebles) if (m.productoId === original.id) m.productoId = '';
                guardar();
                cerrar();
                repintar();
              },
            }, 'Borrar')
          : null,
        h('button', { class: 'boton principal', type: 'submit' }, 'Guardar'),
      ),
    ),
    { ancha: true },
  );
}
