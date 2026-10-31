import { h, formatoEuros } from '../ui.js';
import { datos } from '../estado.js';
import { ESTADOS_PROYECTO } from '../modelo.js';
import { totalesPresupuesto } from '../calculos.js';
import { tarjetaProyecto, crearProyecto } from './proyectos.js';

export function mostrar(el) {
  const activos = datos.proyectos.filter((p) => p.estado !== 'terminado');
  const pendienteCobro = datos.proyectos.reduce((s, p) => s + p.pagos.filter((x) => !x.cobrado).reduce((a, x) => a + (Number(x.importe) || 0), 0), 0);
  const presupuestado = activos.reduce((s, p) => s + totalesPresupuesto(p.presupuesto).total, 0);
  const recientes = [...datos.proyectos].reverse().slice(0, 6);

  el.append(
    h(
      'div',
      { class: 'cabecera' },
      h('div', {}, h('h1', {}, datos.estudio.nombre ? `Hola, ${datos.estudio.nombre}` : 'Interiorismo'), h('p', {}, 'Tus proyectos, planos, inspiración y presupuestos en un solo sitio.')),
      h('button', { class: 'boton principal', onclick: crearProyecto }, '+ Nuevo proyecto'),
    ),
    h(
      'div',
      { class: 'cifras' },
      h('div', { class: 'cifra' }, h('b', {}, activos.length), h('span', {}, 'Proyectos abiertos')),
      ESTADOS_PROYECTO.filter(([id]) => id !== 'terminado').map(([id, texto]) =>
        h('div', { class: 'cifra' }, h('b', {}, datos.proyectos.filter((p) => p.estado === id).length), h('span', {}, texto)),
      ),
      h('div', { class: 'cifra' }, h('b', {}, formatoEuros(presupuestado)), h('span', {}, 'Presupuestado (abiertos)')),
      h('div', { class: 'cifra' }, h('b', {}, formatoEuros(pendienteCobro)), h('span', {}, 'Pendiente de cobro')),
    ),
    h('h2', {}, 'Proyectos recientes'),
    recientes.length
      ? h('div', { class: 'tarjetas' }, recientes.map(tarjetaProyecto))
      : h('div', { class: 'tarjeta vacio' }, h('p', {}, 'Todavía no hay proyectos. Empieza creando uno: dentro podrás dibujar el plano, verlo en 3D y hacer el presupuesto.'), h('button', { class: 'boton principal', onclick: crearProyecto }, '+ Crear el primer proyecto')),
    h('h2', { style: { marginTop: '26px' } }, 'Accesos rápidos'),
    h(
      'div',
      { class: 'tarjetas' },
      [
        ['#/ia', '✦', 'Rediseñar con IA', 'Sube una foto de una habitación y mira cómo quedaría en otro estilo.'],
        ['#/inspiracion', '◐', 'Paletas y moodboards', 'Saca los colores de una foto y monta tableros de inspiración.'],
        ['#/calculadora', '▤', 'Calcular materiales', 'Pintura, suelo, papel pintado y azulejo según los metros.'],
        ['#/catalogo', '◫', 'Catálogo', `${datos.catalogo.length} productos con medidas, precio, foto y modelo 3D.`],
      ].map(([href, icono, titulo, texto]) => h('a', { class: 'tarjeta tarjeta-enlace', href }, h('div', { class: 'cuerpo' }, h('h3', {}, `${icono}  ${titulo}`), h('p', { style: { color: 'var(--texto-suave)', margin: 0 } }, texto)))),
    ),
  );
}
