// Rediseño con tu propio ChatGPT, a mano: la app prepara las indicaciones y las fotos,
// tú las subes a ChatGPT y luego añades aquí la imagen que te devuelva.
// La app no entra en tu cuenta ni manda nada a ChatGPT por su cuenta.
import { h, ventana, aviso, elegirArchivo } from './ui.js';
import { urlArchivo, subirArchivo } from './estado.js';

const ESTILOS = {
  nordico: 'nórdico: maderas claras, blancos y grises suaves, textiles naturales, acogedor y sencillo',
  japandi: 'japandi: mezcla japonesa y escandinava, muebles bajos de madera natural, colores neutros y terrosos, líneas limpias y calma',
  industrial: 'industrial: materiales a la vista, metal negro, madera oscura, cuero, texturas de cemento y luz cálida',
  mediterraneo: 'mediterráneo: paredes encaladas, terracota, fibras naturales como el ratán y el yute, toques de azul, luminoso y fresco',
  moderno: 'moderno: líneas limpias, colores neutros con un color de acento, muebles elegantes y buena iluminación',
  clasico: 'clásico elegante: molduras, tejidos refinados, simetría, colores neutros cálidos y muebles atemporales',
  boho: 'boho: textiles en capas, plantas, ratán, colores cálidos y terrosos y decoración ecléctica',
  minimalista: 'minimalista: muy pocas piezas, sin recargar, colores neutros y almacenaje oculto',
  rustico: 'rústico: vigas de madera natural, piedra, textiles cálidos y ambiente de casa de campo',
  vintage: 'años 50 (mid-century): patas cónicas, madera de nogal, toques mostaza y verde azulado, lámparas retro',
};

// Las mismas indicaciones que la app manda a la IA de pago, pero en español para pegarlas en ChatGPT.
export function textoChatGPT({ modo = 'redisenar', estilo, instrucciones, conservar, referencias = [] }) {
  const partes = [];
  if (modo === 'realista') {
    partes.push(
      'La primera imagen es un render 3D sencillo de una habitación, hecho con un programa de planos.',
      'Conviértelo en una fotografía realista de exactamente la misma habitación: la misma distribución, los mismos muebles en el mismo sitio y con el mismo tamaño, los mismos colores de paredes, suelo y muebles, las mismas puertas y ventanas y el mismo punto de vista.',
      'Haz que los materiales, los tejidos, la luz, las sombras y los reflejos parezcan reales. No añadas ni quites muebles.',
    );
  } else {
    partes.push(
      'Actúa como interiorista. Rediseña la habitación de la primera foto y devuélveme una sola imagen fotorrealista de la misma habitación.',
      'Mantén exactamente el mismo punto de vista, la perspectiva, la forma de la habitación, las paredes, la altura del techo y la posición de puertas y ventanas.',
    );
    if (ESTILOS[estilo]) partes.push(`Estilo ${ESTILOS[estilo]}.`);
    if (conservar) partes.push('Deja los muebles grandes donde están: cambia solo acabados, colores, textiles y decoración.');
  }
  if (referencias.length) {
    const lista = referencias.map((r, i) => `foto ${i + 2}: ${r.nombre}${r.medidas ? ` (${r.medidas})` : ''}`).join('; ');
    partes.push(`Las demás fotos son productos reales que quiero ver en esta habitación (${lista}). Colócalos tal cual son, con su forma, color, material y proporciones reales, en lugar de los muebles parecidos cuando tenga sentido.`);
  }
  if (instrucciones) partes.push(`Además: ${instrucciones}`);
  partes.push('Luz y materiales realistas, calidad de revista de interiorismo. Sin textos ni marcas de agua.');
  return partes.join(' ');
}

function nombreArchivo(nombre, archivo) {
  const base = String(nombre || 'foto')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .toLowerCase();
  return `${base || 'foto'}${archivo.slice(archivo.lastIndexOf('.'))}`;
}

async function copiar(texto, area) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Desde el móvil (sin conexión segura) no hay portapapeles moderno: se usa el método antiguo.
    area.select();
    return document.execCommand('copy');
  }
}

// Ventana con los pasos. «fotos»: [{ archivo, nombre }] (la primera, la habitación).
// «alAnadir» recibe el archivo de la imagen que devolvió ChatGPT, ya guardada en la app.
export function ayudanteChatGPT({ titulo = 'Hacerlo con tu ChatGPT', fotos, texto, alAnadir }) {
  const area = h('textarea', { rows: 7, 'aria-label': 'Indicaciones para ChatGPT', style: { fontSize: '13px' } });
  area.value = texto;
  const botonCopiar = h('button', { class: 'boton principal' }, '⧉ Copiar las indicaciones');
  botonCopiar.addEventListener('click', async () => {
    if (await copiar(area.value, area)) {
      botonCopiar.textContent = '✓ Copiadas';
      setTimeout(() => (botonCopiar.textContent = '⧉ Copiar las indicaciones'), 2500);
    } else aviso('No se han podido copiar: selecciona el texto y cópialo con Ctrl + C.', 'error');
  });
  const enlaces = fotos.map((f, i) => h('a', { class: 'boton pequeno', href: urlArchivo(f.archivo), download: nombreArchivo(i === 0 ? f.nombre || 'habitacion' : `${i + 1}-${f.nombre}`, f.archivo) }, `⤓ ${i === 0 ? 'Foto de la habitación' : `Foto ${i + 1}: ${String(f.nombre).slice(0, 40)}`}`));
  const descargarTodas = h('button', { class: 'boton pequeno' }, '⤓ Descargar todas');
  descargarTodas.addEventListener('click', () => enlaces.forEach((a, i) => setTimeout(() => a.click(), i * 400)));
  const botonAnadir = h('button', { class: 'boton principal' }, '+ Añadir el resultado');
  botonAnadir.addEventListener('click', async () => {
    const [a] = await elegirArchivo('image/*');
    if (!a) return;
    botonAnadir.disabled = true;
    try {
      const id = await subirArchivo(a);
      cerrar();
      alAnadir(id);
    } catch (e) {
      aviso(e.message, 'error');
      botonAnadir.disabled = false;
    }
  });
  const paso = (numero, textoPaso, ...contenido) => h('div', { class: 'seccion' }, h('h3', {}, `${numero}. ${textoPaso}`), contenido);
  const cerrar = ventana(
    titulo,
    h(
      'div',
      { class: 'panel-chatgpt' },
      h('p', { style: { color: 'var(--texto-suave)' } }, 'Usas tu suscripción de ChatGPT, así que no cuesta nada más. La app no entra en tu cuenta: tú subes las fotos y pegas las indicaciones.'),
      paso(1, 'Copia las indicaciones (puedes cambiarlas antes)', area, h('div', { class: 'botones izquierda' }, botonCopiar)),
      paso(2, `Descarga ${fotos.length > 1 ? 'las fotos' : 'la foto'}`, h('div', { class: 'fila' }, enlaces, fotos.length > 1 ? descargarTodas : null), h('small', {}, 'Se guardan en la carpeta Descargas.')),
      paso(
        3,
        'Pídeselo a ChatGPT',
        h('p', { style: { margin: '0 0 8px' } }, `Abre ChatGPT, pulsa «+» para subir ${fotos.length > 1 ? 'las fotos (la de la habitación, la primera)' : 'la foto'}, pega las indicaciones con Ctrl + V y envía.`),
        h('a', { class: 'boton', href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer' }, 'Abrir ChatGPT ↗'),
      ),
      paso(4, 'Trae aquí la imagen que te dé', h('p', { style: { margin: '0 0 8px' } }, 'Descárgala desde ChatGPT y añádela: se guarda en el proyecto con el comparador de antes y después.'), botonAnadir),
    ),
    { ancha: true },
  );
  return cerrar;
}
