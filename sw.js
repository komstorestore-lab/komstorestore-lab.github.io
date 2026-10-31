const VERSION = "2.1.0-202610312239";
const ARCHIVOS = ["/","/estilos.css","/icono-192.png","/icono-512.png","/icono.svg","/index.html","/js/app.js","/js/calculos.js","/js/chatgpt.js","/js/estado.js","/js/importar.js","/js/materiales.js","/js/miniplano.js","/js/modelo.js","/js/modelos3d.js","/js/tiendas-comun.js","/js/ui.js","/js/vista3d.js","/js/vistas/ajustes.js","/js/vistas/calculadora.js","/js/vistas/catalogo.js","/js/vistas/ia.js","/js/vistas/imprimir.js","/js/vistas/inicio.js","/js/vistas/inspiracion.js","/js/vistas/moodboard.js","/js/vistas/plano.js","/js/vistas/proyecto.js","/js/vistas/proyectos.js","/js/vistas/recibir.js","/js/vistas/tiendas.js","/js/zip.js","/recursos/texturas/brick_wall_001_color.jpg","/recursos/texturas/brick_wall_001_normal.jpg","/recursos/texturas/brick_wall_001_rugosidad.jpg","/recursos/texturas/brown_leather_color.jpg","/recursos/texturas/brown_leather_normal.jpg","/recursos/texturas/brown_leather_rugosidad.jpg","/recursos/texturas/brown_planks_05_color.jpg","/recursos/texturas/brown_planks_05_normal.jpg","/recursos/texturas/brown_planks_05_rugosidad.jpg","/recursos/texturas/cielo_dia.hdr","/recursos/texturas/cielo_noche.hdr","/recursos/texturas/cielo_tarde.hdr","/recursos/texturas/dark_wooden_planks_color.jpg","/recursos/texturas/dark_wooden_planks_normal.jpg","/recursos/texturas/dark_wooden_planks_rugosidad.jpg","/recursos/texturas/floor_tiles_06_color.jpg","/recursos/texturas/floor_tiles_06_normal.jpg","/recursos/texturas/floor_tiles_06_rugosidad.jpg","/recursos/texturas/herringbone_parquet_color.jpg","/recursos/texturas/herringbone_parquet_normal.jpg","/recursos/texturas/herringbone_parquet_rugosidad.jpg","/recursos/texturas/hessian_230_color.jpg","/recursos/texturas/hessian_230_normal.jpg","/recursos/texturas/hessian_230_rugosidad.jpg","/recursos/texturas/laminate_floor_02_color.jpg","/recursos/texturas/laminate_floor_02_normal.jpg","/recursos/texturas/laminate_floor_02_rugosidad.jpg","/recursos/texturas/long_white_tiles_color.jpg","/recursos/texturas/long_white_tiles_normal.jpg","/recursos/texturas/long_white_tiles_rugosidad.jpg","/recursos/texturas/marble_01_color.jpg","/recursos/texturas/marble_01_normal.jpg","/recursos/texturas/marble_01_rugosidad.jpg","/recursos/texturas/rectangular_parquet_color.jpg","/recursos/texturas/rectangular_parquet_normal.jpg","/recursos/texturas/rectangular_parquet_rugosidad.jpg","/recursos/texturas/ribbed_corduroy_color.jpg","/recursos/texturas/ribbed_corduroy_normal.jpg","/recursos/texturas/ribbed_corduroy_rugosidad.jpg","/recursos/texturas/rough_linen_color.jpg","/recursos/texturas/rough_linen_normal.jpg","/recursos/texturas/rough_linen_rugosidad.jpg","/recursos/texturas/slate_floor_03_color.jpg","/recursos/texturas/slate_floor_03_normal.jpg","/recursos/texturas/slate_floor_03_rugosidad.jpg","/recursos/texturas/smooth_concrete_floor_color.jpg","/recursos/texturas/smooth_concrete_floor_normal.jpg","/recursos/texturas/smooth_concrete_floor_rugosidad.jpg","/recursos/texturas/square_tiled_wall_color.jpg","/recursos/texturas/square_tiled_wall_normal.jpg","/recursos/texturas/square_tiled_wall_rugosidad.jpg","/recursos/texturas/stone_tile_wall_color.jpg","/recursos/texturas/stone_tile_wall_normal.jpg","/recursos/texturas/stone_tile_wall_rugosidad.jpg","/recursos/texturas/terracotta_floor_tiles_color.jpg","/recursos/texturas/terracotta_floor_tiles_normal.jpg","/recursos/texturas/terracotta_floor_tiles_rugosidad.jpg","/recursos/texturas/terrazzo_tiles_color.jpg","/recursos/texturas/terrazzo_tiles_normal.jpg","/recursos/texturas/terrazzo_tiles_rugosidad.jpg","/recursos/texturas/texturas.json","/recursos/texturas/velour_velvet_color.jpg","/recursos/texturas/velour_velvet_normal.jpg","/recursos/texturas/velour_velvet_rugosidad.jpg","/recursos/texturas/white_plaster_02_color.jpg","/recursos/texturas/white_plaster_02_normal.jpg","/recursos/texturas/white_plaster_02_rugosidad.jpg","/recursos/texturas/wood_floor_color.jpg","/recursos/texturas/wood_floor_normal.jpg","/recursos/texturas/wood_floor_rugosidad.jpg","/recursos/texturas/wool_boucle_color.jpg","/recursos/texturas/wool_boucle_normal.jpg","/recursos/texturas/wool_boucle_rugosidad.jpg","/vendor/BufferGeometryUtils.js","/vendor/draco/draco_decoder.js","/vendor/draco/draco_decoder.wasm","/vendor/draco/draco_wasm_wrapper.js","/vendor/GLTFLoader.js","/vendor/jsm/environments/RoomEnvironment.js","/vendor/jsm/geometries/RoundedBoxGeometry.js","/vendor/jsm/loaders/DRACOLoader.js","/vendor/jsm/loaders/RGBELoader.js","/vendor/jsm/math/SimplexNoise.js","/vendor/jsm/postprocessing/EffectComposer.js","/vendor/jsm/postprocessing/GTAOPass.js","/vendor/jsm/postprocessing/MaskPass.js","/vendor/jsm/postprocessing/OutputPass.js","/vendor/jsm/postprocessing/Pass.js","/vendor/jsm/postprocessing/RenderPass.js","/vendor/jsm/postprocessing/ShaderPass.js","/vendor/jsm/shaders/CopyShader.js","/vendor/jsm/shaders/GTAOShader.js","/vendor/jsm/shaders/OutputShader.js","/vendor/jsm/shaders/PoissonDenoiseShader.js","/vendor/LICENCIA-model-viewer.txt","/vendor/LICENCIA-qrcode.txt","/vendor/LICENCIA-three.txt","/vendor/model-viewer.min.js","/vendor/OrbitControls.js","/vendor/PointerLockControls.js","/vendor/qrcode.js","/vendor/three.module.min.js","/manifest.webmanifest"];

// ----- zip.js -----
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

function crc32(bytes) {
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
async function crearZip(entradas) {
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
async function leerZip(zip) {
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
const ARCHIVO_COPIA = /^archivos\/([a-f0-9]{24}\.(jpg|png|webp|glb))$/;
const MODELO_COPIA = /^modelos\/([a-z0-9-]{2,30}\.(glb|jpg|json))$/;

// ----- tiendas-comun.js -----
// Partes de la lectura de tiendas que usan tanto el servidor del ordenador como la app del móvil:
// lista de tiendas, búsqueda en IKEA, medidas y clasificación de productos. Sin nada de Node ni del navegador.

const TIENDAS = {
  ikea: { nombre: 'IKEA', web: 'https://www.ikea.com/es/es/', buscar: true },
  jysk: { nombre: 'JYSK', web: 'https://jysk.es/', buscar: true },
  leroy: { nombre: 'Leroy Merlin', web: 'https://www.leroymerlin.es/', buscar: false, buscarEnWeb: 'https://www.leroymerlin.es/search?q=' },
  kave: { nombre: 'Kave Home', web: 'https://kavehome.com/es/es/', buscar: false, buscarEnWeb: 'https://kavehome.com/es/es/search?q=' },
  maisons: { nombre: 'Maisons du Monde', web: 'https://www.maisonsdumonde.com/ES/es', buscar: false, buscarEnWeb: 'https://www.maisonsdumonde.com/ES/es/search?keywords=' },
  sklum: { nombre: 'Sklum', web: 'https://www.sklum.com/es/', buscar: false, buscarEnWeb: 'https://www.sklum.com/es/buscar?q=' },
  zarahome: { nombre: 'Zara Home', web: 'https://www.zarahome.com/es/', buscar: false, buscarEnWeb: 'https://www.zarahome.com/es/search?searchTerm=' },
  conforama: { nombre: 'Conforama', web: 'https://www.conforama.es/', buscar: false, buscarEnWeb: 'https://www.conforama.es/search?text=' },
};

function tiendaDeUrl(url) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return { id: '', nombre: '' };
  }
  const conocidas = { 'ikea.com': 'ikea', 'jysk.es': 'jysk', 'leroymerlin.es': 'leroy', 'kavehome.com': 'kave', 'maisonsdumonde.com': 'maisons', 'sklum.com': 'sklum', 'zarahome.com': 'zarahome', 'conforama.es': 'conforama' };
  const id = Object.entries(conocidas).find(([dominio]) => host === dominio || host.endsWith(`.${dominio}`))?.[1] || '';
  const nombre = id ? TIENDAS[id].nombre : host.split('.').slice(-2, -1)[0]?.replace(/^./, (c) => c.toUpperCase()) || host;
  return { id, nombre };
}

// IKEA sirve la misma foto en varios tamaños.
function imagenIkea(url, tamano = 'xl') {
  return url ? `${url.split('?')[0]}?f=${tamano}` : '';
}

function urlBusquedaIkea(q, cantidad = 24) {
  return `https://sik.search.blue.cdtapps.com/es/es/search-result-page?q=${encodeURIComponent(q)}&size=${Math.min(48, cantidad)}&types=PRODUCT&autocorrect=true&c=sr&v=20240110`;
}

// Medidas a partir del texto corto de la búsqueda de IKEA («140x200 cm», «182 cm», «60x62x237 cm»).
// Qué es cada cifra depende del tipo de mueble: en una estantería «77x147» es ancho y alto; en una lámpara
// de pie, «182 cm» es la altura; en una lámpara de techo o una mesa redonda, el diámetro.
function medidasCortas(texto, tipo) {
  const t = String(texto || '').match(/(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*cm\b/i);
  if (!t) return {};
  const n = [t[1], t[2], t[3]].filter(Boolean).map((v) => Number(v.replace(',', '.')));
  if (n.length === 3) return { ancho: n[0], fondo: n[1], alto: n[2] };
  if (n.length === 2) {
    if (['estanteria', 'armario', 'espejo', 'cuadro', 'cortina'].includes(tipo)) return { ancho: n[0], alto: n[1] };
    return { ancho: Math.max(...n), fondo: Math.min(...n) };
  }
  if (['lampara', 'lampara-mesa', 'aplique'].includes(tipo)) return { alto: n[0] };
  if (['lampara-techo', 'mesa-redonda', 'jarron', 'planta', 'puf'].includes(tipo)) return { ancho: n[0], fondo: n[0] };
  return { ancho: n[0] };
}

// Resultados de la búsqueda de IKEA en el formato de la app.
function resultadosIkea(j) {
  const items = j?.searchResultPage?.products?.main?.items || [];
  return items
    .map((i) => i.product)
    .filter((p) => p?.pipUrl)
    .map((p) => ({
      tienda: 'ikea',
      id: p.itemNoGlobal || p.itemNo || p.id,
      nombre: [p.name, p.typeName].filter(Boolean).join(' '),
      detalle: [p.validDesignText, p.itemMeasureReferenceText].filter(Boolean).join(' · '),
      precio: Number(p.salesPrice?.numeral) || 0,
      imagen: imagenIkea(p.mainImageUrl),
      url: p.pipUrl,
    }));
}

// Las camas se miden de lado a lado (ancho) y de la cabecera a los pies (fondo): el ancho es el lado corto.
function orientarMedidas(m, tipo) {
  if (tipo === 'cama' && m.ancho && m.fondo && m.ancho > m.fondo) return { ...m, ancho: m.fondo, fondo: m.ancho };
  return m;
}

// Pasa a centímetros un texto como «200 cm», «1,5 m» o «850 mm».
function aCentimetros(texto) {
  const m = String(texto).replace(/\s/g, ' ').match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/i) || String(texto).match(/^\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return 0;
  const n = Number(m[1].replace(',', '.'));
  const unidad = (m[2] || 'cm').toLowerCase();
  return Math.round((unidad === 'mm' ? n / 10 : unidad === 'm' ? n * 100 : n) * 10) / 10;
}

// De una lista de pares «etiqueta, valor» saca ancho, fondo y alto. Si no hay, busca «200x90x85 cm» en el texto.
function interpretarMedidas(pares, texto = '') {
  const m = { ancho: 0, fondo: 0, alto: 0 };
  const poner = (clave, valor) => {
    if (!m[clave] && valor > 0 && valor < 2000) m[clave] = valor;
  };
  const ignorar = /(cajón|cajon|asiento|respaldo|reposabrazos|colchón|colchon|pata|paquete|empaquet|embalaje|caja|desmontado|cable|pantalla|interior|balda|hueco|peso|superficie|grosor|cabecero|almohad|brazo|pelo|moldura|marco|bombilla|puerta|acceso|libre)/i;
  for (const [etiquetaBruta, valor] of pares) {
    const etiqueta = String(etiquetaBruta).toLowerCase();
    if (ignorar.test(etiqueta)) continue;
    const cm = aCentimetros(valor);
    // Algunas tiendas ponen todo junto: «Ancho 76 cm, Longitud 76 cm, Altura 42 cm».
    if (/(ancho|largo|longitud|alto|altura|fondo|profundidad).*\d.*(ancho|largo|longitud|alto|altura|fondo|profundidad)/i.test(valor)) {
      for (const trozo of String(valor).split(/[,;]/)) {
        const t = trozo.match(/([a-záéíóúñ]+)\D*?(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/i);
        if (!t) continue;
        const et = t[1].toLowerCase();
        const v = aCentimetros(`${t[2]} ${t[3] || 'cm'}`);
        if (/^anch/.test(et)) poner('ancho', v);
        else if (/^(fondo|profund)/.test(et)) poner('fondo', v);
        else if (/^(alto|altura)/.test(et)) poner('alto', v);
        else if (/^(largo|longitud)/.test(et)) m.largo = m.largo || v;
      }
      continue;
    }
    if (!cm) continue;
    if (/^(ancho|anchura|width)/.test(etiqueta)) poner('ancho', cm);
    else if (/^(fondo|profundidad|depth)/.test(etiqueta)) poner('fondo', cm);
    else if (/^(alto|altura|height)/.test(etiqueta)) poner('alto', cm);
    else if (/^(largo|longitud|length)/.test(etiqueta)) m.largo = m.largo || cm;
    else if (/^(diámetro|diametro)/.test(etiqueta)) m.diametro = m.diametro || cm;
  }
  // El largo de una cama o una mesa hace de ancho si no hay ancho, o de fondo si ya lo hay.
  if (m.largo) {
    if (!m.ancho) m.ancho = m.largo;
    else if (!m.fondo) {
      m.fondo = Math.min(m.ancho, m.largo);
      m.ancho = Math.max(m.ancho, m.largo);
    }
  }
  if (m.diametro) {
    poner('ancho', m.diametro);
    poner('fondo', m.diametro);
  }
  delete m.largo;
  delete m.diametro;
  if (!m.ancho || !m.fondo || !m.alto) {
    const t = String(texto).replace(/&nbsp;/g, ' ');
    const tres = t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/i);
    // «Ø70 x A42 cm»: se prefiere la mención que también trae la altura.
    const diametros = [...t.matchAll(/[Øø]\s*(\d+(?:[.,]\d+)?)\s*(?:(?:cm)?\s*x\s*A?\s*(\d+(?:[.,]\d+)?))?/g)];
    const diametro = diametros.find((d) => d[2]) || diametros[0];
    const dos = t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/i);
    const num = (v, u) => aCentimetros(`${v} ${u || 'cm'}`);
    if (diametro && !tres) {
      poner('ancho', num(diametro[1]));
      poner('fondo', num(diametro[1]));
      if (diametro[2]) poner('alto', num(diametro[2]));
    } else if (tres || dos) {
      // «200x90x85 cm»: las cifras que ya se conocen (por ejemplo, la altura) se quitan, y el resto
      // se reparte en el orden habitual (ancho, fondo, alto).
      const cifras = tres ? [tres[1], tres[2], tres[3]].map((v) => num(v, tres[4])) : [dos[1], dos[2]].map((v) => num(v, dos[3]));
      for (const clave of ['ancho', 'fondo', 'alto']) {
        const i = cifras.findIndex((c) => m[clave] && Math.abs(c - m[clave]) < 0.6);
        if (i >= 0) cifras.splice(i, 1);
      }
      for (const clave of ['ancho', 'fondo', 'alto']) if (!m[clave] && cifras.length) poner(clave, cifras.shift());
    }
  }
  return m;
}

// Categoría del catálogo y forma 3D a partir del nombre del producto.
const REGLAS = [
  [/sof[aá][ -]cama/i, 'Sofás y sillones', 'sofa'],
  [/(chaise ?longue|chaiselongue|rinconera|esquinero|sof[aá] (en )?l\b|sof[aá] de esquina|esquina)/i, 'Sofás y sillones', 'sofa-l'],
  [/sof[aá]/i, 'Sofás y sillones', 'sofa'],
  [/(sill[oó]n|butaca|mecedora|orejero)/i, 'Sofás y sillones', 'sillon'],
  [/(puf|reposapi[eé]s|otomana)/i, 'Sofás y sillones', 'puf'],
  // Las plantas van antes que las lámparas: hay plantas «colgantes» que no son lámparas.
  [/(planta|maceta|macetero|[aá]rbol artificial)/i, 'Plantas', 'planta'],
  [/(l[aá]mpara de pie|lámpara luz indirecta|lampara de pie|pie de l[aá]mpara)/i, 'Iluminación', 'lampara'],
  [/(l[aá]mpara de techo|colgante|suspensi[oó]n|plaf[oó]n|ara[ñn]a|lámpara techo)/i, 'Iluminación', 'lampara-techo'],
  [/(l[aá]mpara de mesa|sobremesa|flexo|l[aá]mpara de escritorio|l[aá]mpara mesita)/i, 'Iluminación', 'lampara-mesa'],
  [/aplique/i, 'Iluminación', 'aplique'],
  [/l[aá]mpara/i, 'Iluminación', 'lampara-mesa'],
  [/(mesa de centro|mesa centro|mesas de centro)/i, 'Mesas', 'mesa-centro'],
  [/(mesita de noche|mesilla|mesa de noche|mesitas de noche)/i, 'Almacenaje', 'mesilla'],
  [/(mesa auxiliar|mesita)/i, 'Mesas', 'mesa-auxiliar'],
  [/escritorio/i, 'Mesas', 'escritorio'],
  [/(mesa.*(redond|[Øø]))|((redond).*mesa)/i, 'Mesas', 'mesa-redonda'],
  [/mesa/i, 'Mesas', 'mesa'],
  [/(silla|taburete|banqueta|banco)/i, 'Sillas', 'silla'],
  [/(estructura de cama|\bcama\b|canap[eé]|litera|cabecero)/i, 'Camas', 'cama'],
  [/(armario|ropero|guardarropa|vitrina)/i, 'Almacenaje', 'armario'],
  [/(c[oó]moda|cajonera|zapatero)/i, 'Almacenaje', 'comoda'],
  [/(aparador|buf[eé]|consola)/i, 'Almacenaje', 'aparador'],
  [/(mueble (de )?tv|mueble para tv|banco tv|mueble television)/i, 'Almacenaje', 'mueble-tv'],
  [/(estanter[ií]a|librer[ií]a|estante|balda)/i, 'Almacenaje', 'estanteria'],
  [/alfombra/i, 'Textil y alfombras', 'alfombra'],
  [/(cortina|visillo|estor)/i, 'Textil y alfombras', 'cortina'],
  [/coj[ií]n/i, 'Textil y alfombras', 'cojin'],
  [/(espejo)/i, 'Cuadros y espejos', 'espejo'],
  [/(cuadro|l[aá]mina|p[oó]ster|marco|lienzo)/i, 'Cuadros y espejos', 'cuadro'],
  [/(jarr[oó]n|florero)/i, 'Decoración', 'jarron'],
  [/(isla de cocina|m[oó]dulo de cocina|mueble de cocina|encimera)/i, 'Cocina', 'encimera'],
  [/(frigor[ií]fico|nevera|combi)/i, 'Cocina', 'nevera'],
  [/(mueble de baño|mueble lavabo|lavabo)/i, 'Baño', 'lavabo'],
  [/bañera/i, 'Baño', 'banera'],
  [/(plato de ducha|mampara|ducha)/i, 'Baño', 'ducha'],
  [/(inodoro|wc)/i, 'Baño', 'inodoro'],
  [/(vela|portavelas|figura|decorativ|reloj|bandeja|cesta|caja)/i, 'Decoración', 'decoracion'],
];

function clasificar(texto) {
  for (const [re, categoria, tipo] of REGLAS) if (re.test(texto)) return { categoria, tipo };
  return { categoria: 'Otros', tipo: 'caja' };
}

// ----- motor del móvil -----
// App del móvil: hace dentro del navegador lo que en el ordenador hace servidor.js.
// Guarda los datos, las fotos y los modelos 3D en el propio móvil (IndexedDB), deja usar la app
// sin conexión y atiende las mismas direcciones /api/... que el servidor, así el resto de la app no cambia.
// preparar-movil.mjs añade delante VERSION y ARCHIVOS, y el código de zip.js y tiendas-comun.js.
/* global VERSION, ARCHIVOS, crearZip, leerZip, ARCHIVO_COPIA, MODELO_COPIA, TIENDAS, resultadosIkea, urlBusquedaIkea, clasificar, interpretarMedidas, orientarMedidas, medidasCortas, tiendaDeUrl */

const CACHE = `interiorismo-${VERSION}`;
const APP = 'interiorismo';

// ---------- Instalación y sin conexión ----------

// Los archivos se piden siempre a la web (no a la caché del navegador, que en GitHub guarda 10 minutos la versión anterior).
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Una página abierta sin el motor (por ejemplo, al recargar forzando) pide que se le dé el control.
self.addEventListener('message', (e) => {
  if (e.data === 'reclamar') e.waitUntil(self.clients.claim());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith('interiorismo-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return e.respondWith(api(e.request, url).catch((err) => json(500, { error: err.message || 'Error en la app' })));
  if (url.pathname.startsWith('/archivos/')) return e.respondWith(archivo('archivos', url.pathname.slice(10)));
  if (url.pathname.startsWith('/recursos/modelos/')) return e.respondWith(archivo('modelos', url.pathname.slice(18)));
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).catch(() => caches.match('/index.html'))),
  );
});

// ---------- Almacén del móvil ----------

let base = null;
function abrir() {
  base ||= new Promise((resolver, rechazar) => {
    const p = indexedDB.open('interiorismo', 1);
    p.onupgradeneeded = () => {
      for (const almacen of ['datos', 'archivos', 'modelos']) if (!p.result.objectStoreNames.contains(almacen)) p.result.createObjectStore(almacen);
    };
    p.onsuccess = () => resolver(p.result);
    p.onerror = () => rechazar(p.error);
  });
  return base;
}

async function operar(almacen, modo, fn) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(almacen, modo);
    const peticion = fn(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(peticion?.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error || new Error('No se ha podido guardar en el móvil (¿falta espacio?)'));
  });
}
const leer = (almacen, clave) => operar(almacen, 'readonly', (s) => s.get(clave));
const escribir = (almacen, clave, valor) => operar(almacen, 'readwrite', (s) => s.put(valor, clave));
const claves = (almacen) => operar(almacen, 'readonly', (s) => s.getAllKeys());

const json = (estado, cuerpo) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', glb: 'model/gltf-binary', json: 'application/json' };
const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'model/gltf-binary': 'glb' };

async function archivo(almacen, nombre) {
  const blob = await leer(almacen, decodeURIComponent(nombre)).catch(() => null);
  if (!blob) return new Response('No encontrado', { status: 404 });
  return new Response(blob, { headers: { 'Content-Type': TIPOS[nombre.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-store' } });
}

function idNuevo(extension) {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return `${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}.${extension}`;
}

async function guardarArchivo(blob, tipo) {
  const extension = EXTENSIONES[tipo];
  if (!extension) throw new Error('Solo se pueden guardar fotos (JPG, PNG, WEBP) y modelos 3D (GLB)');
  const id = idNuevo(extension);
  await escribir('archivos', id, new Blob([blob], { type: tipo }));
  return id;
}

// Los guardados se hacen de uno en uno para que nunca se pisen.
let cola = Promise.resolve();
function enCola(fn) {
  const r = cola.then(fn);
  cola = r.catch(() => {});
  return r;
}

// ---------- Direcciones /api ----------

const SOLO_ORDENADOR = 'Esto solo se puede hacer en la app del ordenador.';

async function api(req, url) {
  const ruta = url.pathname;
  const m = req.method;
  if (ruta === '/api/info') return json(200, { app: APP, version: VERSION, movil: true, local: false, carpetaDatos: '', copias: [], codigoModelos: '' });
  if (ruta === '/api/datos' && m === 'GET') return json(200, (await leer('datos', 'principal')) || { _rev: 0 });
  if (ruta === '/api/datos' && m === 'PUT') return guardarDatos(req);
  if (ruta === '/api/archivos' && m === 'POST') {
    const tipo = (req.headers.get('content-type') || '').split(';')[0].trim();
    const blob = await req.blob();
    if (!blob.size) return json(400, { error: 'El archivo está vacío' });
    return json(200, { id: await guardarArchivo(blob, tipo) });
  }
  if (ruta === '/api/ia' && m === 'GET') return json(200, { movil: true, hayClave: false, proveedor: 'gemini', modelo: '', calidad: '2K', proveedores: {} });
  if (ruta.startsWith('/api/ia')) return json(400, { error: 'En la app del móvil, usa «Hacerlo con mi ChatGPT».' });
  if (ruta === '/api/tiendas' && m === 'GET') return json(200, { tiendas: tiendasMovil(), movil: true });
  if (ruta === '/api/tiendas/buscar' && m === 'GET') return buscarMovil(url);
  if (ruta === '/api/tiendas/ficha') return json(409, { codigo: 'bloqueada', error: 'Desde el móvil no se pueden leer las páginas de las tiendas. Añade el producto a mano.' });
  if (ruta === '/api/tiendas/importar' && m === 'POST') return importarMovil(req);
  if (ruta === '/api/copia' && m === 'GET') return copiaCompleta();
  if (ruta === '/api/copia' && m === 'POST') return recuperarCopia(req);
  return json(400, { error: SOLO_ORDENADOR });
}

async function guardarDatos(req) {
  let datos;
  try {
    datos = await req.json();
  } catch {
    return json(400, { error: 'Los datos no son válidos' });
  }
  if (!datos || !Array.isArray(datos.proyectos)) return json(400, { error: 'Los datos no son válidos' });
  const esperada = Number(req.headers.get('if-match'));
  return enCola(async () => {
    const actual = Number((await leer('datos', 'principal'))?._rev) || 0;
    if (esperada !== actual) return json(409, { error: 'Los datos han cambiado en otra ventana', rev: actual });
    datos._rev = actual + 1;
    datos._guardado = new Date().toISOString();
    await escribir('datos', 'principal', datos);
    return json(200, { rev: datos._rev });
  });
}

// Desde el móvil solo deja buscar IKEA (las demás tiendas no dejan que otra web lea sus datos).
function tiendasMovil() {
  const t = structuredClone(TIENDAS);
  for (const [id, tienda] of Object.entries(t)) {
    tienda.buscar = id === 'ikea';
    if (id === 'jysk') tienda.buscarEnWeb = 'https://jysk.es/search?query=';
  }
  return t;
}

async function buscarMovil(url) {
  const tienda = url.searchParams.get('tienda') || 'ikea';
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  if (tienda !== 'ikea') return json(409, { codigo: 'bloqueada', error: `Desde el móvil no se puede buscar en ${TIENDAS[tienda]?.nombre || 'esa tienda'}. Añade el producto a mano en el Catálogo.` });
  if (!q) return json(200, { resultados: [] });
  try {
    const r = await fetch(urlBusquedaIkea(q, Number(url.searchParams.get('cantidad')) || 24));
    if (!r.ok) throw new Error();
    return json(200, { resultados: resultadosIkea(await r.json()) });
  } catch {
    return json(502, { error: 'No se puede buscar en IKEA ahora mismo. ¿Hay conexión a internet?' });
  }
}

async function importarMovil(req) {
  const cuerpo = await req.json().catch(() => ({}));
  let pista = cuerpo.pista;
  // Un enlace de IKEA pegado: se busca el producto por su referencia (los 8 números del final).
  if (!pista && /ikea\.com/.test(cuerpo.url || '')) {
    const ref = (cuerpo.url.match(/(\d{8})\/?(?:[?#].*)?$/) || [])[1];
    if (ref) {
      const r = await fetch(urlBusquedaIkea(ref, 3)).catch(() => null);
      pista = r?.ok ? resultadosIkea(await r.json())[0] : null;
    }
  }
  if (!pista?.nombre) return json(409, { codigo: 'bloqueada', error: 'Desde el móvil solo se pueden traer productos de IKEA. Este, añádelo a mano en el Catálogo.' });
  let foto = '';
  try {
    const r = await fetch(pista.imagen);
    const blob = await r.blob();
    if (r.ok && EXTENSIONES[blob.type]) foto = await guardarArchivo(blob, blob.type);
  } catch {
    // Sin foto: se añade igual.
  }
  const clase = clasificar(pista.nombre);
  const corta = medidasCortas(pista.detalle, clase.tipo);
  const larga = interpretarMedidas([], `${pista.nombre} ${pista.detalle || ''}`);
  const medidas = orientarMedidas({ ancho: corta.ancho || larga.ancho, fondo: corta.fondo || larga.fondo, alto: corta.alto || larga.alto }, clase.tipo);
  return json(200, {
    aviso: '',
    producto: {
      nombre: pista.nombre,
      ...clase,
      ancho: medidas.ancho || '',
      fondo: medidas.fondo || '',
      alto: medidas.alto || '',
      precio: Number(pista.precio) || '',
      proveedor: tiendaDeUrl(pista.url).nombre || 'IKEA',
      tienda: 'ikea',
      enlace: pista.url,
      referencia: String(pista.id || ''),
      foto,
      fotos: foto ? [foto] : [],
      modelo: '',
      acabado: '',
      notas: pista.detalle || '',
    },
  });
}

// ---------- Copias completas (para pasar los datos al ordenador o a otro móvil) ----------

async function copiaCompleta() {
  const entradas = [
    { nombre: 'interiorismo.json', datos: JSON.stringify({ app: APP, version: VERSION, fecha: new Date().toISOString(), origen: 'movil' }) },
    { nombre: 'datos.json', datos: JSON.stringify((await leer('datos', 'principal')) || { proyectos: [] }) },
  ];
  for (const id of await claves('archivos')) entradas.push({ nombre: `archivos/${id}`, datos: await leer('archivos', id) });
  for (const id of await claves('modelos')) entradas.push({ nombre: `modelos/${id}`, datos: await leer('modelos', id) });
  const zip = await crearZip(entradas);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(zip, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="interiorismo-movil-${fecha}.zip"` } });
}

async function recuperarCopia(req) {
  try {
    const entradas = await leerZip(await req.blob());
    const texto = async (nombre) => (await entradas.find((e) => e.nombre === nombre)?.abrir())?.text();
    const meta = JSON.parse((await texto('interiorismo.json')) || '{}');
    if (meta.app !== APP) throw new Error('Esa copia no es de Interiorismo');
    const datos = JSON.parse((await texto('datos.json')) || 'null');
    if (!datos || !Array.isArray(datos.proyectos)) throw new Error('La copia no tiene datos válidos');
    let nuevos = 0;
    for (const e of entradas) {
      const a = e.nombre.match(ARCHIVO_COPIA);
      const mo = e.nombre.match(MODELO_COPIA);
      if (!a && !mo) continue;
      const almacen = a ? 'archivos' : 'modelos';
      const nombre = (a || mo)[1];
      const existente = await leer(almacen, nombre);
      if (existente?.size === e.tamano) continue;
      const blob = await e.abrir();
      await escribir(almacen, nombre, new Blob([blob], { type: TIPOS[nombre.split('.').pop()] || '' }));
      nuevos++;
    }
    const rev = await enCola(async () => {
      const anterior = await leer('datos', 'principal');
      if (anterior) await escribir('datos', 'antes-de-recuperar', anterior);
      datos._rev = (Number(anterior?._rev) || 0) + 1;
      await escribir('datos', 'principal', datos);
      return datos._rev;
    });
    return json(200, { ok: true, rev, nuevos, origen: meta.origen, fecha: meta.fecha });
  } catch (e) {
    return json(400, { error: e.message || 'No se ha podido recuperar la copia' });
  }
}
