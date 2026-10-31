import { h, ventana, campo, formatoFecha, vacio } from '../ui.js';
import { datos, guardar, urlArchivo } from '../estado.js';
import { nuevoProyecto, ESTADOS_PROYECTO } from '../modelo.js';

export function tarjetaProyecto(p) {
  const portada = [...p.fotos].reverse().find((f) => f.tipo !== 'antes') || p.fotos[0];
  const estado = ESTADOS_PROYECTO.find(([id]) => id === p.estado)?.[1] || p.estado;
  return h(
    'a',
    { class: 'tarjeta tarjeta-enlace', href: `#/proyecto/${p.id}` },
    h('div', { class: 'portada', style: portada ? { backgroundImage: `url("${urlArchivo(portada.archivo)}")` } : {} }, portada ? '' : '◇'),
    h(
      'div',
      { class: 'cuerpo' },
      h('div', { class: 'fila', style: { justifyContent: 'space-between' } }, h('h3', { style: { margin: 0 } }, p.nombre), h('span', { class: `etiqueta ${p.estado}` }, estado)),
      h('small', {}, [p.cliente.nombre, `${p.habitaciones.length} ${p.habitaciones.length === 1 ? 'espacio' : 'espacios'}`, formatoFecha(p.creado)].filter(Boolean).join(' · ')),
    ),
  );
}

export function crearProyecto() {
  const p = nuevoProyecto('');
  const nombre = h('input', { placeholder: 'Ej.: Reforma piso calle Mayor' });
  const cliente = h('input', { placeholder: 'Nombre del cliente (opcional)' });
  const crear = () => {
    p.nombre = nombre.value.trim() || 'Proyecto sin nombre';
    p.cliente.nombre = cliente.value.trim();
    datos.proyectos.push(p);
    guardar();
    cerrar();
    location.hash = `#/proyecto/${p.id}`;
  };
  const cerrar = ventana(
    'Nuevo proyecto',
    h(
      'form',
      { onsubmit: (e) => { e.preventDefault(); crear(); } },
      campo('Nombre del proyecto', nombre),
      campo('Cliente', cliente),
      h('small', {}, 'Empieza con un salón de 4 × 3 m y las fases habituales; luego puedes cambiarlo todo.'),
      h('div', { class: 'botones' }, h('button', { class: 'boton principal', type: 'submit' }, 'Crear proyecto')),
    ),
  );
}

export function mostrar(el) {
  let filtro = 'abiertos';
  let texto = '';
  const lista = h('div');
  const pintar = () => {
    const t = texto.toLowerCase();
    const proyectos = [...datos.proyectos]
      .reverse()
      .filter((p) => (filtro === 'todos' ? true : filtro === 'abiertos' ? p.estado !== 'terminado' : p.estado === filtro))
      .filter((p) => !t || `${p.nombre} ${p.cliente.nombre} ${p.cliente.direccion}`.toLowerCase().includes(t));
    lista.replaceChildren(
      proyectos.length
        ? h('div', { class: 'tarjetas' }, proyectos.map(tarjetaProyecto))
        : vacio(datos.proyectos.length ? 'No hay proyectos con ese filtro.' : 'Todavía no hay proyectos.', h('button', { class: 'boton principal', onclick: crearProyecto }, '+ Nuevo proyecto')),
    );
  };
  const filtros = h(
    'select',
    { style: { width: 'auto' }, onchange: (e) => { filtro = e.target.value; pintar(); } },
    h('option', { value: 'abiertos' }, 'Abiertos'),
    ESTADOS_PROYECTO.map(([id, nombre]) => h('option', { value: id }, nombre)),
    h('option', { value: 'todos' }, 'Todos'),
  );
  el.append(
    h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Proyectos'), h('p', {}, 'Cada proyecto tiene su cliente, sus espacios con plano y 3D, fases, pagos, fotos y presupuesto.')), h('button', { class: 'boton principal', onclick: crearProyecto }, '+ Nuevo proyecto')),
    h('div', { class: 'fila', style: { marginBottom: '16px' } }, h('input', { class: 'crece', type: 'search', placeholder: 'Buscar por nombre, cliente o dirección', style: { maxWidth: '360px' }, oninput: (e) => { texto = e.target.value; pintar(); } }), filtros),
    lista,
  );
  pintar();
}
