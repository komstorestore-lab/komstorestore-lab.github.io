// Calculadora de materiales: pintura, suelo, papel pintado y azulejo.
import { h, vaciar, campo, selector, formatoEuros, formatoNumero, formatoM2, aviso, uid } from '../ui.js';
import { datos, guardar } from '../estado.js';
import { buscarProyecto } from '../modelo.js';
import { medidasHabitacion, calcularPintura, calcularSuelo, calcularPapel, calcularAzulejo } from '../calculos.js';

export function mostrar(el, [pid, hid]) {
  const eleccion = { proyecto: pid || datos.proyectos[datos.proyectos.length - 1]?.id || '', espacio: hid || '' };
  const zona = h('div');

  const pintar = () => {
    const proyecto = buscarProyecto(eleccion.proyecto);
    if (proyecto && !proyecto.habitaciones.some((x) => x.id === eleccion.espacio)) eleccion.espacio = proyecto.habitaciones[0]?.id || '';
    const hab = proyecto?.habitaciones.find((x) => x.id === eleccion.espacio);
    const md = hab ? medidasHabitacion(hab.plano) : null;
    const aberturas = hab?.plano.aberturas || [];
    const huecosAncho = aberturas.reduce((s, a) => s + (Number(a.ancho) || 0), 0) / 100;

    const medidas = {
      suelo: md?.sueloM2 || 12,
      paredes: md?.paredesNetoM2 || 30,
      perimetro: md?.perimetroM || 14,
      altura: md?.alturaM || 2.5,
      huecosAncho: md ? huecosAncho : 0,
    };

    const anadirAlPresupuesto = (concepto, cantidad, unidad, precio) => {
      if (!proyecto) return aviso('Elige primero un proyecto arriba', 'error');
      proyecto.presupuesto.lineas.push({ id: uid(), concepto, cantidad, unidad, precio: Math.round(precio * 100) / 100, iva: Number(datos.estudio.iva) || 21 });
      guardar();
      aviso(`Añadido al presupuesto de «${proyecto.nombre}»`);
    };

    vaciar(
      zona,
      h(
        'div',
        { class: 'tarjeta' },
        h('h2', {}, 'Medidas'),
        h(
          'div',
          { class: 'rejilla' },
          campo('Proyecto', selector(eleccion, 'proyecto', [['', '— Sin proyecto: medidas a mano —'], ...datos.proyectos.map((p) => [p.id, p.nombre])], { alCambiar: pintar })),
          proyecto ? campo('Espacio', selector(eleccion, 'espacio', proyecto.habitaciones.map((x) => [x.id, x.nombre]), { alCambiar: pintar })) : null,
        ),
        md
          ? h('p', { style: { color: 'var(--texto-suave)', margin: 0 } }, `Del plano de «${hab.nombre}»: suelo ${formatoM2(md.sueloM2)}, paredes ${formatoM2(md.paredesNetoM2)} (ya sin puertas ni ventanas), perímetro ${formatoNumero(md.perimetroM)} m, altura ${formatoNumero(md.alturaM)} m. Puedes cambiar las cifras en cada calculadora.`)
          : h('p', { style: { color: 'var(--texto-suave)', margin: 0 } }, 'Escribe las medidas en cada calculadora, o elige un proyecto para usar las de su plano.'),
      ),
      h(
        'div',
        { class: 'tarjetas', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' } },
        calculadora('Pintura', [
          ['superficie', 'Superficie a pintar (m²)', medidas.paredes],
          ['manos', 'Manos', 2],
          ['rendimiento', 'Rendimiento (m² por litro)', 10, 'Lo pone el bote; suele ser de 8 a 12.'],
          ['litrosBote', 'Litros por bote', 4],
          ['precioBote', 'Precio del bote (€)', 30],
        ], (v) => {
          const r = calcularPintura(v);
          return {
            lineas: [`${formatoNumero(r.litros, 1)} litros`, `${r.botes} botes de ${formatoNumero(v.litrosBote)} L`, `Coste: ${formatoEuros(r.coste)}`],
            presupuesto: () => anadirAlPresupuesto(`Pintura (${formatoM2(v.superficie)}, ${v.manos} manos)`, r.botes, 'bote', v.precioBote),
          };
        }),
        calculadora('Suelo (tarima, laminado, vinílico)', [
          ['superficie', 'Superficie (m²)', medidas.suelo],
          ['merma', 'Merma por cortes (%)', 10, 'Un 5-10 % en colocación recta; un 15 % en diagonal o espiga.'],
          ['m2Caja', 'm² por caja', 2.2],
          ['precioM2', 'Precio por m² (€)', 25],
        ], (v) => {
          const r = calcularSuelo(v);
          return {
            lineas: [`Hacen falta ${formatoM2(r.necesarioM2)}`, `${r.cajas} cajas (${formatoM2(r.m2Comprados)})`, `Coste: ${formatoEuros(r.coste)}`],
            presupuesto: () => anadirAlPresupuesto(`Suelo (${r.cajas} cajas)`, r.m2Comprados, 'm²', v.precioM2),
          };
        }),
        calculadora('Papel pintado', [
          ['perimetro', 'Ancho de pared a empapelar (m)', medidas.perimetro, 'El perímetro, o solo la pared que vayas a empapelar.'],
          ['huecosAncho', 'Menos huecos de puertas y ventanas (m)', medidas.huecosAncho],
          ['altura', 'Altura (m)', medidas.altura],
          ['anchoRollo', 'Ancho del rollo (m)', 0.53],
          ['largoRollo', 'Largo del rollo (m)', 10.05],
          ['repeticion', 'Repetición del dibujo (cm)', 0, 'Viene en la etiqueta del rollo. 0 si es liso.'],
          ['precioRollo', 'Precio del rollo (€)', 25],
        ], (v) => {
          const r = calcularPapel(v);
          return {
            lineas: [`${r.tiras} tiras · ${r.tirasPorRollo} por rollo`, `${r.rollos} rollos`, `Coste: ${formatoEuros(r.coste)}`],
            presupuesto: () => anadirAlPresupuesto(`Papel pintado (${r.rollos} rollos)`, r.rollos, 'rollo', v.precioRollo),
          };
        }),
        calculadora('Azulejo o baldosa', [
          ['superficie', 'Superficie (m²)', medidas.suelo, 'Para un baño, suma la superficie de las paredes que vayas a alicatar.'],
          ['largo', 'Largo de la pieza (cm)', 60],
          ['ancho', 'Ancho de la pieza (cm)', 60],
          ['merma', 'Merma (%)', 10],
          ['piezasCaja', 'Piezas por caja', 4],
          ['precioM2', 'Precio por m² (€)', 30],
        ], (v) => {
          const r = calcularAzulejo(v);
          return {
            lineas: [`${r.piezas} piezas`, `${r.cajas} cajas (${formatoM2(r.m2Comprados)})`, `Coste: ${formatoEuros(r.coste)}`],
            presupuesto: () => anadirAlPresupuesto(`Azulejo ${v.largo}×${v.ancho} (${r.cajas} cajas)`, r.m2Comprados, 'm²', v.precioM2),
          };
        }),
        md
          ? h(
              'div',
              { class: 'tarjeta' },
              h('h2', {}, 'Rodapié y otros'),
              h('p', {}, `Rodapié: ${formatoNumero(md.rodapieM)} m (sin contar puertas). Compra un 10 % más: ${formatoNumero(Math.ceil(md.rodapieM * 1.1))} m.`),
              h('p', {}, `Techo: ${formatoM2(md.sueloM2)} (para pintarlo, usa esta cifra en la calculadora de pintura).`),
              h('p', { style: { margin: 0 } }, `Volumen: ${formatoNumero(md.sueloM2 * md.alturaM)} m³ (útil para calcular la potencia de la climatización).`),
            )
          : null,
      ),
    );
  };

  el.append(h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Calcular materiales'), h('p', {}, 'Cuánto comprar y cuánto cuesta, con las medidas del plano o a mano.'))), zona);
  pintar();
}

function calculadora(titulo, campos, calcular) {
  const valores = Object.fromEntries(campos.map(([clave, , valor]) => [clave, Number(valor) || 0]));
  const resultado = h('div', { style: { background: 'var(--superficie-2)', borderRadius: '8px', padding: '10px 12px', marginTop: '4px' } });
  let accion = null;
  const recalcular = () => {
    const r = calcular(valores);
    accion = r.presupuesto;
    vaciar(resultado, r.lineas.map((l, i) => h('div', { style: i === r.lineas.length - 1 ? { fontWeight: 650 } : {} }, l)));
  };
  const tarjeta = h(
    'div',
    { class: 'tarjeta' },
    h('h2', {}, titulo),
    h(
      'div',
      { class: 'rejilla-2' },
      campos.map(([clave, etiqueta, , ayuda]) => {
        const el = h('input', { type: 'number', step: 'any', min: 0, value: valores[clave] });
        el.addEventListener('input', () => {
          valores[clave] = Number(el.value) || 0;
          recalcular();
        });
        return campo(etiqueta, el, ayuda);
      }),
    ),
    resultado,
    h('div', { class: 'botones' }, h('button', { class: 'boton', onclick: () => accion?.() }, '+ Añadir al presupuesto')),
  );
  recalcular();
  return tarjeta;
}
