// Partes de la lectura de tiendas que usan tanto el servidor del ordenador como la app del móvil:
// lista de tiendas, búsqueda en IKEA, medidas y clasificación de productos. Sin nada de Node ni del navegador.

export const TIENDAS = {
  ikea: { nombre: 'IKEA', web: 'https://www.ikea.com/es/es/', buscar: true },
  jysk: { nombre: 'JYSK', web: 'https://jysk.es/', buscar: true },
  leroy: { nombre: 'Leroy Merlin', web: 'https://www.leroymerlin.es/', buscar: false, buscarEnWeb: 'https://www.leroymerlin.es/search?q=' },
  kave: { nombre: 'Kave Home', web: 'https://kavehome.com/es/es/', buscar: false, buscarEnWeb: 'https://kavehome.com/es/es/search?q=' },
  maisons: { nombre: 'Maisons du Monde', web: 'https://www.maisonsdumonde.com/ES/es', buscar: false, buscarEnWeb: 'https://www.maisonsdumonde.com/ES/es/search?keywords=' },
  sklum: { nombre: 'Sklum', web: 'https://www.sklum.com/es/', buscar: false, buscarEnWeb: 'https://www.sklum.com/es/buscar?q=' },
  zarahome: { nombre: 'Zara Home', web: 'https://www.zarahome.com/es/', buscar: false, buscarEnWeb: 'https://www.zarahome.com/es/search?searchTerm=' },
  conforama: { nombre: 'Conforama', web: 'https://www.conforama.es/', buscar: false, buscarEnWeb: 'https://www.conforama.es/search?text=' },
};

export function tiendaDeUrl(url) {
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
export function imagenIkea(url, tamano = 'xl') {
  return url ? `${url.split('?')[0]}?f=${tamano}` : '';
}

export function urlBusquedaIkea(q, cantidad = 24) {
  return `https://sik.search.blue.cdtapps.com/es/es/search-result-page?q=${encodeURIComponent(q)}&size=${Math.min(48, cantidad)}&types=PRODUCT&autocorrect=true&c=sr&v=20240110`;
}

// Medidas a partir del texto corto de la búsqueda de IKEA («140x200 cm», «182 cm», «60x62x237 cm»).
// Qué es cada cifra depende del tipo de mueble: en una estantería «77x147» es ancho y alto; en una lámpara
// de pie, «182 cm» es la altura; en una lámpara de techo o una mesa redonda, el diámetro.
export function medidasCortas(texto, tipo) {
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
export function resultadosIkea(j) {
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
export function orientarMedidas(m, tipo) {
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
export function interpretarMedidas(pares, texto = '') {
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

export function clasificar(texto) {
  for (const [re, categoria, tipo] of REGLAS) if (re.test(texto)) return { categoria, tipo };
  return { categoria: 'Otros', tipo: 'caja' };
}
