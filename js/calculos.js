// Cálculos de superficies, materiales y presupuestos.
// Las medidas del plano van en centímetros; los resultados de superficie, en metros cuadrados.

const redondear = (n, decimales = 2) => Math.round((n + Number.EPSILON) * 10 ** decimales) / 10 ** decimales;

export function distancia(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Tramos de pared de un plano: cada uno va de un punto al siguiente (y el último vuelve al primero si está cerrado).
export function tramos(plano) {
  const p = plano?.puntos || [];
  const lista = [];
  const n = plano?.cerrado ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) lista.push({ indice: i, a: p[i], b: p[(i + 1) % p.length], largo: distancia(p[i], p[(i + 1) % p.length]) });
  return lista;
}

export function areaPoligono(puntos) {
  let suma = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    suma += a.x * b.y - b.x * a.y;
  }
  return Math.abs(suma) / 2;
}

export function medidasHabitacion(plano) {
  const lista = tramos(plano);
  const perimetroCm = lista.reduce((s, t) => s + t.largo, 0);
  const sueloM2 = plano?.cerrado && plano.puntos.length >= 3 ? areaPoligono(plano.puntos) / 10000 : 0;
  const altura = Number(plano?.altura) || 250;
  const aberturas = plano?.aberturas || [];
  const huecosM2 = aberturas.reduce((s, a) => s + (Number(a.ancho) || 0) * (Number(a.alto) || 0), 0) / 10000;
  const anchoPuertas = aberturas.filter((a) => a.tipo === 'puerta').reduce((s, a) => s + (Number(a.ancho) || 0), 0);
  const paredesBrutoM2 = (perimetroCm * altura) / 10000;
  return {
    sueloM2: redondear(sueloM2),
    perimetroM: redondear(perimetroCm / 100),
    alturaM: redondear(altura / 100),
    paredesBrutoM2: redondear(paredesBrutoM2),
    huecosM2: redondear(huecosM2),
    paredesNetoM2: redondear(Math.max(0, paredesBrutoM2 - huecosM2)),
    // Para el rodapié no cuentan las puertas.
    rodapieM: redondear(Math.max(0, perimetroCm - anchoPuertas) / 100),
  };
}

// Pintura: litros = superficie × manos ÷ rendimiento (m² por litro).
export function calcularPintura({ superficie, manos = 2, rendimiento = 10, litrosBote = 4, precioBote = 0 }) {
  const litros = rendimiento > 0 ? (superficie * manos) / rendimiento : 0;
  const botes = litrosBote > 0 ? Math.max(0, Math.ceil(litros / litrosBote - 1e-9)) : 0;
  return { litros: redondear(litros, 1), botes, coste: redondear(botes * precioBote) };
}

// Suelo (tarima, laminado, vinílico...): se añade la merma y se redondea a cajas enteras.
export function calcularSuelo({ superficie, merma = 10, m2Caja = 2, precioM2 = 0 }) {
  const necesario = superficie * (1 + merma / 100);
  const cajas = m2Caja > 0 ? Math.ceil(necesario / m2Caja - 1e-9) : 0;
  const m2Comprados = cajas * m2Caja;
  return { necesarioM2: redondear(necesario), cajas, m2Comprados: redondear(m2Comprados), coste: redondear(m2Comprados * precioM2) };
}

// Papel pintado: cada rollo da tantas tiras como quepan de alto (sumando la repetición del dibujo).
export function calcularPapel({ perimetro, altura, anchoRollo = 0.53, largoRollo = 10.05, repeticion = 0, precioRollo = 0, huecosAncho = 0 }) {
  const altoTira = altura + repeticion / 100;
  const tirasPorRollo = altoTira > 0 ? Math.floor(largoRollo / altoTira + 1e-9) : 0;
  const anchoCubrir = Math.max(0, perimetro - huecosAncho);
  const tiras = anchoRollo > 0 ? Math.ceil(anchoCubrir / anchoRollo - 1e-9) : 0;
  const rollos = tirasPorRollo > 0 ? Math.ceil(tiras / tirasPorRollo - 1e-9) : 0;
  return { tiras, tirasPorRollo, rollos, coste: redondear(rollos * precioRollo) };
}

// Azulejo o baldosa: piezas según el tamaño, más la merma, redondeado a cajas.
export function calcularAzulejo({ superficie, largo = 60, ancho = 60, merma = 10, piezasCaja = 4, precioM2 = 0 }) {
  const areaPieza = (largo * ancho) / 10000;
  const piezas = areaPieza > 0 ? Math.ceil((superficie * (1 + merma / 100)) / areaPieza - 1e-9) : 0;
  const cajas = piezasCaja > 0 ? Math.ceil(piezas / piezasCaja - 1e-9) : 0;
  const m2Comprados = cajas * piezasCaja * areaPieza;
  return { piezas, cajas, m2Comprados: redondear(m2Comprados), coste: redondear(m2Comprados * precioM2) };
}

// Totales de un presupuesto, con el IVA desglosado por tipo.
export function totalesPresupuesto({ lineas = [], descuento = 0 }) {
  const porIva = new Map();
  let subtotal = 0;
  for (const l of lineas) {
    const importe = redondear((Number(l.cantidad) || 0) * (Number(l.precio) || 0));
    subtotal += importe;
    const iva = Number(l.iva) || 0;
    porIva.set(iva, (porIva.get(iva) || 0) + importe);
  }
  const factor = 1 - (Number(descuento) || 0) / 100;
  const ivas = [...porIva.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tipo, base]) => ({ tipo, base: redondear(base * factor), cuota: redondear(base * factor * tipo / 100) }));
  const descuentoImporte = redondear(subtotal - subtotal * factor);
  const base = redondear(subtotal - descuentoImporte);
  const cuotas = redondear(ivas.reduce((s, i) => s + i.cuota, 0));
  return { subtotal: redondear(subtotal), descuentoImporte, base, ivas, cuotas, total: redondear(base + cuotas) };
}

// Rectángulo de un mueble girado, en coordenadas del plano.
export function esquinasMueble(m) {
  const r = ((Number(m.rot) || 0) * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const w = m.ancho / 2;
  const d = m.fondo / 2;
  return [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, y]) => ({ x: m.x + x * c - y * s, y: m.y + x * s + y * c }));
}

export function puntoDentro(p, poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

function proyectar(puntos, eje) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of puntos) {
    const v = p.x * eje.x + p.y * eje.y;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

// ¿Se solapan dos rectángulos girados? (teorema del eje separador; tocarse no cuenta)
export function sesolapan(a, b) {
  const pa = esquinasMueble(a);
  const pb = esquinasMueble(b);
  for (const pol of [pa, pb]) {
    for (let i = 0; i < 2; i++) {
      const p1 = pol[i];
      const p2 = pol[i + 1];
      const eje = { x: -(p2.y - p1.y), y: p2.x - p1.x };
      const [amin, amax] = proyectar(pa, eje);
      const [bmin, bmax] = proyectar(pb, eje);
      const largo = Math.hypot(eje.x, eje.y) || 1;
      if (amax <= bmin + largo * 0.5 || bmax <= amin + largo * 0.5) return false;
    }
  }
  return true;
}

// Piezas que no chocan con los muebles: van encima de otros, colgadas en la pared o en el techo.
export const SIN_CHOQUE = new Set(['alfombra', 'cuadro', 'espejo', 'aplique', 'lampara-techo', 'cortina', 'cojin', 'jarron', 'decoracion', 'lampara-mesa']);
const noChoca = (m) => SIN_CHOQUE.has(m.tipo) || Number(m.elevacion) > 0;

// Muebles con problemas: los que se salen de la habitación y los que chocan con otro.
export function problemasMuebles(plano) {
  const muebles = plano?.muebles || [];
  const problemas = new Map();
  const cerrado = plano?.cerrado && plano.puntos.length >= 3;
  for (const m of muebles) {
    // Las cortinas y lo que va en la pared puede tocar la línea de la pared.
    if (cerrado && !['cortina', 'cuadro', 'espejo', 'aplique'].includes(m.tipo) && esquinasMueble(m).some((p) => !puntoDentro(p, plano.puntos))) problemas.set(m.id, 'Se sale de la habitación');
  }
  for (let i = 0; i < muebles.length; i++) {
    for (let j = i + 1; j < muebles.length; j++) {
      const a = muebles[i];
      const b = muebles[j];
      if (noChoca(a) || noChoca(b)) continue;
      if (sesolapan(a, b)) {
        if (!problemas.has(a.id)) problemas.set(a.id, `Choca con ${b.nombre}`);
        if (!problemas.has(b.id)) problemas.set(b.id, `Choca con ${a.nombre}`);
      }
    }
  }
  return problemas;
}
