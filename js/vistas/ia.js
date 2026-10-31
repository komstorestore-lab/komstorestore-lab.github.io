// Rediseño de una habitación a partir de una foto, con un servicio de IA externo (de pago).
import { h, vaciar, campo, selector, areaTexto, aviso, elegirArchivo, uid, hoy, ventana } from '../ui.js';
import { datos, guardar, urlArchivo, subirArchivo, pedir } from '../estado.js';
import { ESTILOS_IA } from '../modelo.js';
import { comparador } from './proyecto.js';
import { ayudanteChatGPT, textoChatGPT } from '../chatgpt.js';

export async function mostrar(el, [pid]) {
  let ajustes = { hayClave: false };
  try {
    ajustes = await pedir('/api/ia');
  } catch {
    // Sin conexión con el servidor: se avisa al intentar crear la imagen.
  }
  const estado = { proyecto: pid || '', foto: '', estilo: 'nordico', instrucciones: '', conservar: false, referencias: [] };
  const zonaReferencias = h('div');
  const pintarReferencias = () =>
    vaciar(
      zonaReferencias,
      h(
        'div',
        { class: 'fila' },
        estado.referencias.map((p) => h('span', { class: 'etiqueta', title: p.nombre }, p.foto ? h('img', { src: urlArchivo(p.foto), alt: '', style: { width: '22px', height: '22px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '4px', background: '#fff' } }) : null, p.nombre.slice(0, 28), ' ', h('button', { class: 'boton-icono', 'aria-label': `Quitar ${p.nombre}`, style: { padding: '0 4px' }, onclick: () => { estado.referencias = estado.referencias.filter((x) => x !== p); pintarReferencias(); } }, '✕'))),
        estado.referencias.length < 3 ? h('button', { class: 'boton pequeno', onclick: elegirReferencias }, '+ Elegir del catálogo') : null,
      ),
    );
  const elegirReferencias = () => {
    const conFoto = datos.catalogo.filter((p) => p.foto);
    if (!conFoto.length) return aviso('Tu catálogo no tiene productos con foto. Añádelos desde Tiendas.', 'error');
    const filtro = h('input', { type: 'search', placeholder: 'Buscar en el catálogo', style: { marginBottom: '10px' } });
    const rejilla = h('div', { class: 'galeria' });
    const pintar = () => {
      const t = filtro.value.toLowerCase();
      vaciar(
        rejilla,
        conFoto
          .filter((p) => !t || `${p.nombre} ${p.proveedor} ${p.categoria}`.toLowerCase().includes(t))
          .slice(0, 60)
          .map((p) =>
            h(
              'button',
              { class: 'foto', style: { border: estado.referencias.includes(p) ? '3px solid var(--acento)' : '1px solid var(--borde)', padding: 0, cursor: 'pointer', background: '#fff' }, title: p.nombre, onclick: () => { if (!estado.referencias.includes(p) && estado.referencias.length < 3) estado.referencias.push(p); pintarReferencias(); cerrar(); } },
              h('img', { src: urlArchivo(p.foto), alt: p.nombre, style: { objectFit: 'contain' } }),
              h('div', { class: 'pie' }, h('span', {}, p.nombre.slice(0, 40))),
            ),
          ),
      );
    };
    filtro.addEventListener('input', pintar);
    const cerrar = ventana('Elegir un producto', h('div', {}, filtro, rejilla), { ancha: true });
    pintar();
  };
  pintarReferencias();
  const zonaFoto = h('div', { class: 'foto-elegida', role: 'button', tabindex: 0 });
  const resultados = h('div');
  const boton = h('button', { class: `boton${ajustes.hayClave ? ' principal' : ''}`, style: { width: '100%', justifyContent: 'center', marginTop: '6px' } }, ajustes.hayClave ? '✦ Crear propuesta' : '✦ Crear con la clave de IA (automático, de pago)');
  // Con tu propia suscripción de ChatGPT, a mano: la app prepara las indicaciones y las fotos.
  const botonChatGPT = h('button', { class: `boton${ajustes.hayClave ? '' : ' principal'}`, style: { width: '100%', justifyContent: 'center', marginTop: '6px' } }, '✦ Hacerlo con mi ChatGPT (sin coste extra)');

  const pintarFoto = () => vaciar(zonaFoto, estado.foto ? h('img', { src: urlArchivo(estado.foto), alt: 'Foto elegida' }) : h('div', { style: { padding: '30px', textAlign: 'center' } }, '📷', h('br'), 'Haz clic para elegir una foto de la habitación', h('br'), h('small', {}, 'Mejor con buena luz y desde una esquina')));
  const elegir = async () => {
    const [a] = await elegirArchivo('image/*');
    if (!a) return;
    try {
      vaciar(zonaFoto, h('span', { class: 'girando' }));
      estado.foto = await subirArchivo(a);
      const p = datos.proyectos.find((x) => x.id === estado.proyecto);
      if (p && !p.fotos.some((f) => f.archivo === estado.foto)) {
        p.fotos.push({ id: uid(), archivo: estado.foto, tipo: 'antes', nota: 'Foto original para la IA', fecha: hoy() });
        guardar();
      }
    } catch (e) {
      aviso(e.message, 'error');
    }
    pintarFoto();
  };
  zonaFoto.addEventListener('click', elegir);
  zonaFoto.addEventListener('keydown', (e) => e.key === 'Enter' && elegir());

  const historial = () => {
    const p = datos.proyectos.find((x) => x.id === estado.proyecto);
    const propuestas = p ? p.fotos.filter((f) => f.tipo === 'ia').reverse() : [];
    if (!propuestas.length) return null;
    return h('div', { class: 'tarjeta' }, h('h2', {}, `Propuestas anteriores de «${p.nombre}»`), h('div', { class: 'galeria' }, propuestas.map((f) => h('div', { class: 'foto' }, h('img', { src: urlArchivo(f.archivo), alt: f.nota, loading: 'lazy', onclick: () => { if (f.original) vaciar(resultados, tarjetaResultado(f.original, f.archivo, f.nota), historial()); } }), h('div', { class: 'pie' }, h('span', {}, f.nota))))));
  };

  boton.addEventListener('click', async () => {
    if (!estado.foto) return aviso('Elige primero una foto', 'error');
    if (!ajustes.hayClave) return aviso('Falta la clave del servicio de IA: ponla en Ajustes', 'error');
    boton.disabled = true;
    vaciar(boton, h('span', { class: 'girando' }), ' Creando… (tarda entre 10 y 60 segundos)');
    try {
      const referencias = estado.referencias.map((p) => ({ archivo: p.foto, nombre: `${p.nombre}${p.proveedor ? ` (${p.proveedor})` : ''}`, medidas: p.ancho && p.fondo && p.alto ? `${p.ancho} x ${p.fondo} x ${p.alto} cm` : '' }));
      const { id } = await pedir('/api/ia/redisenar', { metodo: 'POST', cuerpo: { foto: estado.foto, estilo: estado.estilo, instrucciones: estado.instrucciones, conservar: estado.conservar, referencias } });
      const estilo = ESTILOS_IA.find(([x]) => x === estado.estilo)?.[1] || 'Propuesta';
      const nota = `IA · ${estilo}${estado.instrucciones ? ` · ${estado.instrucciones.slice(0, 40)}` : ''}`;
      const p = datos.proyectos.find((x) => x.id === estado.proyecto);
      if (p) {
        p.fotos.push({ id: uid(), archivo: id, tipo: 'ia', nota, fecha: hoy(), original: estado.foto });
        guardar();
      }
      vaciar(resultados, tarjetaResultado(estado.foto, id, nota, !p), historial());
    } catch (e) {
      aviso(e.message, 'error');
    }
    boton.disabled = false;
    boton.textContent = '✦ Crear otra propuesta';
  });

  botonChatGPT.addEventListener('click', () => {
    if (!estado.foto) return aviso('Elige primero una foto', 'error');
    const referencias = estado.referencias.map((p) => ({ archivo: p.foto, nombre: `${p.nombre}${p.proveedor ? ` (${p.proveedor})` : ''}`, medidas: p.ancho && p.fondo && p.alto ? `${p.ancho} x ${p.fondo} x ${p.alto} cm` : '' }));
    const estilo = ESTILOS_IA.find(([x]) => x === estado.estilo)?.[1] || 'Propuesta';
    ayudanteChatGPT({
      fotos: [{ archivo: estado.foto, nombre: 'habitacion' }, ...referencias.map((r) => ({ archivo: r.archivo, nombre: r.nombre }))],
      texto: textoChatGPT({ estilo: estado.estilo, instrucciones: estado.instrucciones, conservar: estado.conservar, referencias }),
      alAnadir: (id) => {
        const nota = `ChatGPT · ${estilo}${estado.instrucciones ? ` · ${estado.instrucciones.slice(0, 40)}` : ''}`;
        const p = datos.proyectos.find((x) => x.id === estado.proyecto);
        if (p) {
          p.fotos.push({ id: uid(), archivo: id, tipo: 'ia', nota, fecha: hoy(), original: estado.foto });
          guardar();
        }
        vaciar(resultados, tarjetaResultado(estado.foto, id, nota, !p), historial());
      },
    });
  });

  pintarFoto();
  el.append(
    h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Rediseño con IA'), h('p', {}, 'Sube una foto de una habitación y la IA propone cómo quedaría, manteniendo paredes, ventanas y perspectiva.'))),
    ajustes.movil
      ? h('div', { class: 'tarjeta', style: { borderColor: '#e0b45a', background: '#fffaf0' } }, h('b', {}, 'Con tu ChatGPT. '), 'La app te prepara las indicaciones y las fotos; tú las subes a ChatGPT y luego traes aquí la imagen que te dé.')
      : ajustes.hayClave
      ? null
      : h(
          'div',
          { class: 'tarjeta', style: { borderColor: '#e0b45a', background: '#fffaf0' } },
          h('b', {}, 'Dos formas de hacerlo. '),
          'Con tu ChatGPT: la app te prepara las indicaciones y las fotos, tú las subes a ChatGPT y luego traes aquí la imagen (sin coste extra si tienes suscripción). ',
          'O automático: con una clave de pago de Google Gemini u OpenAI en ',
          h('a', { href: '#/ajustes' }, 'Ajustes'),
          ' (unos céntimos por imagen). En los dos casos, las fotos se envían a ese servicio.',
        ),
    h(
      'div',
      { class: 'ia-columnas' },
      h(
        'div',
        { class: 'tarjeta' },
        campo('Guardar en el proyecto', selector(estado, 'proyecto', [['', '— No guardar en ningún proyecto —'], ...datos.proyectos.map((p) => [p.id, p.nombre])], { alCambiar: () => vaciar(resultados, historial()) })),
        campo('Foto', zonaFoto),
        campo('Estilo', selector(estado, 'estilo', ESTILOS_IA)),
        campo('Productos de tu catálogo para ponerlos en la foto (opcional)', zonaReferencias, 'Hasta 3. La IA intenta colocar esos productos tal cual son.'),
        campo('Indicaciones (opcional)', areaTexto(estado, 'instrucciones', { rows: 4, placeholder: 'Ej.: Pared del fondo verde salvia, sofá de lino beige, suelo de roble claro, más plantas y luz cálida.' })),
        h('label', { class: 'marcar' }, h('input', { type: 'checkbox', onchange: (e) => { estado.conservar = e.target.checked; } }), 'Mantener los muebles grandes donde están'),
        ajustes.movil ? botonChatGPT : ajustes.hayClave ? [boton, botonChatGPT] : [botonChatGPT, boton],
        h('small', {}, `${ajustes.hayClave ? `Servicio automático: ${ajustes.proveedores?.[ajustes.proveedor]?.nombre || '—'}${ajustes.modelo ? ` (${ajustes.modelo})` : ''}. ` : ''}Es una idea orientativa: la IA puede inventar detalles o cambiar medidas.`),
      ),
      resultados,
    ),
  );
  vaciar(resultados, historial());
}

function tarjetaResultado(original, resultado, nota, sinProyecto) {
  return h(
    'div',
    { class: 'tarjeta' },
    h('h2', {}, 'Propuesta'),
    comparador(urlArchivo(original), urlArchivo(resultado), ['Ahora', 'Propuesta']),
    h(
      'div',
      { class: 'botones' },
      sinProyecto ? h('small', { class: 'crece' }, 'No se ha guardado en ningún proyecto; descárgala si la quieres conservar.') : h('small', { class: 'crece' }, 'Guardada en las fotos del proyecto.'),
      h('a', { class: 'boton', href: urlArchivo(resultado), download: `${nota.replace(/[^\w áéíóúñ·-]/gi, '')}${resultado.slice(-4)}` }, '⤓ Descargar'),
    ),
  );
}
