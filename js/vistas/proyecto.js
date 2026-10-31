import { h, vaciar, ventana, confirmar, campo, entrada, areaTexto, selector, pestanas, vacio, uid, hoy, formatoEuros, formatoFecha, formatoM2, elegirArchivo, aviso } from '../ui.js';
import { datos, guardar, urlArchivo, subirArchivo } from '../estado.js';
import { buscarProyecto, nuevaHabitacion, ESTADOS_PROYECTO } from '../modelo.js';
import { medidasHabitacion, totalesPresupuesto } from '../calculos.js';
import { miniPlano } from '../miniplano.js';

const PESTANAS = [
  ['resumen', 'Resumen'],
  ['espacios', 'Espacios y planos'],
  ['fases', 'Fases'],
  ['fotos', 'Fotos'],
  ['presupuesto', 'Presupuesto'],
  ['pagos', 'Pagos'],
  ['proveedores', 'Proveedores'],
];

export function mostrar(el, [id, pestanaInicial]) {
  const p = buscarProyecto(id);
  if (!p) {
    el.append(vacio('Este proyecto no existe.', h('a', { class: 'boton', href: '#/proyectos' }, 'Ver proyectos')));
    return;
  }
  let pestana = PESTANAS.some(([x]) => x === pestanaInicial) ? pestanaInicial : 'resumen';
  const cuerpo = h('div');
  const titulo = h('h1', {}, p.nombre);
  const cambiar = () => {
    guardar();
    titulo.textContent = p.nombre;
  };
  const pintar = () => {
    history.replaceState(null, '', `#/proyecto/${p.id}/${pestana}`);
    vaciar(cuerpo, pestanas(PESTANAS, pestana, (x) => { pestana = x; pintar(); }), VISTAS[pestana](p, cambiar, pintar));
  };
  el.append(
    h(
      'div',
      { class: 'cabecera' },
      h('div', {}, h('div', { class: 'miga' }, h('a', { href: '#/proyectos' }, 'Proyectos'), ' ›'), titulo, h('p', {}, [p.cliente.nombre, p.cliente.direccion].filter(Boolean).join(' · '))),
      h(
        'div',
        { class: 'fila' },
        selector(p, 'estado', ESTADOS_PROYECTO, { style: { width: 'auto' }, alCambiar: cambiar }),
        h('a', { class: 'boton', href: `#/ia/${p.id}` }, '✦ Rediseño con IA'),
        h('button', {
          class: 'boton peligro',
          onclick: async () => {
            if (!(await confirmar(`¿Borrar el proyecto «${p.nombre}» con todos sus planos, fotos y presupuesto?`, { si: 'Borrar', peligro: true }))) return;
            datos.proyectos.splice(datos.proyectos.indexOf(p), 1);
            for (const m of datos.moodboards) if (m.proyectoId === p.id) m.proyectoId = '';
            guardar();
            location.hash = '#/proyectos';
          },
        }, 'Borrar'),
      ),
    ),
    cuerpo,
  );
  pintar();
}

const VISTAS = {
  resumen(p, cambiar) {
    const m = p.habitaciones.reduce((s, x) => s + medidasHabitacion(x.plano).sueloM2, 0);
    const t = totalesPresupuesto(p.presupuesto);
    const cobrado = p.pagos.filter((x) => x.cobrado).reduce((s, x) => s + (Number(x.importe) || 0), 0);
    const fases = p.fases.filter((f) => f.hecha).length;
    return h(
      'div',
      {},
      h(
        'div',
        { class: 'cifras' },
        h('div', { class: 'cifra' }, h('b', {}, formatoM2(m)), h('span', {}, `${p.habitaciones.length} espacios`)),
        h('div', { class: 'cifra' }, h('b', {}, `${fases} / ${p.fases.length}`), h('span', {}, 'Fases hechas')),
        h('div', { class: 'cifra' }, h('b', {}, formatoEuros(t.total)), h('span', {}, 'Presupuesto con IVA')),
        h('div', { class: 'cifra' }, h('b', {}, formatoEuros(cobrado)), h('span', {}, 'Cobrado')),
      ),
      h(
        'div',
        { class: 'rejilla-2' },
        h(
          'div',
          { class: 'tarjeta' },
          h('h2', {}, 'Proyecto'),
          campo('Nombre', entrada(p, 'nombre', { alCambiar: cambiar })),
          campo('Fecha de inicio', entrada(p, 'creado', { tipo: 'date', alCambiar: cambiar })),
          campo('Notas (gustos del cliente, ideas, medidas pendientes…)', areaTexto(p, 'notas', { alCambiar: cambiar, rows: 6 })),
        ),
        h(
          'div',
          { class: 'tarjeta' },
          h('h2', {}, 'Cliente'),
          campo('Nombre', entrada(p.cliente, 'nombre', { alCambiar: cambiar })),
          h('div', { class: 'rejilla-2' }, campo('Teléfono', entrada(p.cliente, 'telefono', { tipo: 'tel', alCambiar: cambiar })), campo('Correo', entrada(p.cliente, 'email', { tipo: 'email', alCambiar: cambiar }))),
          campo('Dirección de la obra', entrada(p.cliente, 'direccion', { alCambiar: cambiar })),
          campo('NIF (para el presupuesto)', entrada(p.cliente, 'nif', { alCambiar: cambiar })),
        ),
      ),
    );
  },

  espacios(p, cambiar, repintar) {
    const nueva = () => {
      const nombre = h('input', { value: 'Dormitorio' });
      const ancho = h('input', { type: 'number', value: 350, min: 50, step: 1 });
      const largo = h('input', { type: 'number', value: 300, min: 50, step: 1 });
      const cerrar = ventana(
        'Nuevo espacio',
        h(
          'form',
          {
            onsubmit: (e) => {
              e.preventDefault();
              const hab = nuevaHabitacion(nombre.value.trim() || 'Espacio', Number(ancho.value) || 350, Number(largo.value) || 300);
              p.habitaciones.push(hab);
              guardar();
              cerrar();
              location.hash = `#/plano/${p.id}/${hab.id}`;
            },
          },
          campo('Nombre', nombre),
          h('div', { class: 'rejilla-2' }, campo('Ancho (cm)', ancho), campo('Largo (cm)', largo)),
          h('small', {}, 'Empieza como un rectángulo. En el plano puedes mover las esquinas, añadir más paredes y cambiar cada medida.'),
          h('div', { class: 'botones' }, h('button', { class: 'boton principal', type: 'submit' }, 'Crear y abrir el plano')),
        ),
      );
    };
    return h(
      'div',
      {},
      h('div', { class: 'botones izquierda', style: { marginTop: 0, marginBottom: '16px' } }, h('button', { class: 'boton principal', onclick: nueva }, '+ Nuevo espacio')),
      p.habitaciones.length
        ? h(
            'div',
            { class: 'tarjetas' },
            p.habitaciones.map((hab) => {
              const m = medidasHabitacion(hab.plano);
              return h(
                'div',
                { class: 'tarjeta tarjeta-enlace' },
                h('a', { href: `#/plano/${p.id}/${hab.id}` }, miniPlano(hab.plano)),
                h(
                  'div',
                  { class: 'cuerpo' },
                  h('h3', {}, hab.nombre),
                  h('small', {}, `${formatoM2(m.sueloM2)} de suelo · ${formatoM2(m.paredesNetoM2)} de pared · ${hab.plano.muebles.length} muebles`),
                  h(
                    'div',
                    { class: 'botones izquierda' },
                    h('a', { class: 'boton pequeno principal', href: `#/plano/${p.id}/${hab.id}` }, 'Plano y 3D'),
                    h('a', { class: 'boton pequeno', href: `#/calculadora/${p.id}/${hab.id}` }, 'Materiales'),
                    h('button', {
                      class: 'boton pequeno',
                      onclick: () => {
                        const copia = structuredClone(hab);
                        copia.id = uid();
                        copia.nombre = `${hab.nombre} (copia)`;
                        p.habitaciones.push(copia);
                        guardar();
                        repintar();
                      },
                    }, 'Duplicar'),
                    h('button', {
                      class: 'boton pequeno peligro',
                      onclick: async () => {
                        if (!(await confirmar(`¿Borrar el espacio «${hab.nombre}» y su plano?`, { si: 'Borrar', peligro: true }))) return;
                        p.habitaciones.splice(p.habitaciones.indexOf(hab), 1);
                        guardar();
                        repintar();
                      },
                    }, 'Borrar'),
                  ),
                ),
              );
            }),
          )
        : vacio('Este proyecto no tiene espacios todavía.'),
    );
  },

  fases(p, cambiar, repintar) {
    const lista = h(
      'ul',
      { class: 'lista-fases' },
      p.fases.map((f, i) =>
        h(
          'li',
          { class: f.hecha ? 'hecha' : '' },
          h('input', { type: 'checkbox', checked: f.hecha, 'aria-label': `Hecha: ${f.nombre}`, onchange: (e) => { f.hecha = e.target.checked; if (f.hecha && !f.fecha) f.fecha = hoy(); guardar(); repintar(); } }),
          h('span', { class: 'crece', style: { flex: 1 } }, entrada(f, 'nombre', { alCambiar: cambiar, style: { border: 0, background: 'transparent' } })),
          entrada(f, 'fecha', { tipo: 'date', alCambiar: cambiar, style: { width: '160px' } }),
          h('button', { class: 'boton-icono', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { p.fases.splice(i - 1, 0, p.fases.splice(i, 1)[0]); guardar(); repintar(); } }, '↑'),
          h('button', { class: 'boton-icono', 'aria-label': 'Borrar fase', onclick: () => { p.fases.splice(i, 1); guardar(); repintar(); } }, '✕'),
        ),
      ),
    );
    return h(
      'div',
      { class: 'tarjeta' },
      h('h2', {}, 'Fases del proyecto'),
      h('p', { style: { color: 'var(--texto-suave)' } }, 'Marca cada fase cuando esté hecha; la fecha se pone sola y la puedes cambiar.'),
      lista,
      h('div', { class: 'botones izquierda' }, h('button', { class: 'boton', onclick: () => { p.fases.push({ id: uid(), nombre: 'Nueva fase', hecha: false, fecha: '' }); guardar(); repintar(); } }, '+ Añadir fase')),
    );
  },

  fotos(p, cambiar, repintar) {
    const subir = async (tipo) => {
      const archivos = await elegirArchivo('image/*', { multiple: true });
      for (const a of archivos) {
        try {
          const archivo = await subirArchivo(a);
          p.fotos.push({ id: uid(), archivo, tipo, nota: '', fecha: hoy() });
        } catch (e) {
          aviso(e.message, 'error');
        }
      }
      guardar();
      repintar();
    };
    const grupos = [
      ['antes', 'Antes'],
      ['despues', 'Después'],
      ['ia', 'Propuestas con IA'],
      ['render', 'Capturas del 3D'],
    ];
    const antes = p.fotos.filter((f) => f.tipo === 'antes');
    const despues = p.fotos.filter((f) => f.tipo !== 'antes');
    return h(
      'div',
      {},
      h(
        'div',
        { class: 'botones izquierda', style: { marginTop: 0, marginBottom: '16px' } },
        h('button', { class: 'boton principal', onclick: () => subir('antes') }, '+ Fotos del antes'),
        h('button', { class: 'boton', onclick: () => subir('despues') }, '+ Fotos del después'),
        antes.length && despues.length ? h('button', { class: 'boton', onclick: () => compararFotos(p) }, '⇆ Comparar antes y después') : null,
      ),
      p.fotos.length
        ? grupos.map(([tipo, nombre]) => {
            const fotos = p.fotos.filter((f) => f.tipo === tipo);
            if (!fotos.length) return null;
            return h('div', { class: 'tarjeta' }, h('h2', {}, nombre), galeria(p, fotos, repintar));
          })
        : vacio('Sube fotos del estado inicial y del resultado final. Las propuestas de la IA y las capturas del 3D también aparecerán aquí.'),
    );
  },

  presupuesto(p, cambiar, repintar) {
    const pr = p.presupuesto;
    const cuerpoTabla = h('tbody');
    const pie = h('tfoot');
    const recalcular = () => {
      const t = totalesPresupuesto(pr);
      vaciar(
        pie,
        h('tr', {}, h('td', { colspan: 4, class: 'numero' }, 'Suma'), h('td', { class: 'numero' }, formatoEuros(t.subtotal)), h('td', { colspan: 2 })),
        pr.descuento ? h('tr', {}, h('td', { colspan: 4, class: 'numero' }, `Descuento ${pr.descuento} %`), h('td', { class: 'numero' }, `−${formatoEuros(t.descuentoImporte)}`), h('td', { colspan: 2 })) : null,
        t.ivas.map((i) => h('tr', {}, h('td', { colspan: 4, class: 'numero' }, `IVA ${i.tipo} % sobre ${formatoEuros(i.base)}`), h('td', { class: 'numero' }, formatoEuros(i.cuota)), h('td', { colspan: 2 }))),
        h('tr', {}, h('td', { colspan: 4, class: 'numero' }, 'Total'), h('td', { class: 'numero', style: { fontSize: '17px' } }, formatoEuros(t.total)), h('td', { colspan: 2 })),
      );
    };
    const cambio = () => {
      guardar();
      pintarLineas();
    };
    const pintarLineas = () => {
      vaciar(
        cuerpoTabla,
        pr.lineas.map((l, i) => {
          // Al cambiar una cifra solo se recalculan el importe y los totales, sin rehacer la tabla (así no se pierde el cursor).
          const importe = h('td', { class: 'numero', style: { width: '110px' } }, formatoEuros((Number(l.cantidad) || 0) * (Number(l.precio) || 0)));
          const cifra = () => {
            guardar();
            importe.textContent = formatoEuros((Number(l.cantidad) || 0) * (Number(l.precio) || 0));
            recalcular();
          };
          return h(
            'tr',
            {},
            h('td', { style: { minWidth: '240px' } }, entrada(l, 'concepto', { alCambiar: guardar, placeholder: 'Concepto' })),
            h('td', { style: { width: '90px' } }, entrada(l, 'cantidad', { tipo: 'number', step: 'any', alCambiar: cifra })),
            h('td', { style: { width: '90px' } }, entrada(l, 'unidad', { alCambiar: guardar, placeholder: 'ud' })),
            h('td', { style: { width: '110px' } }, entrada(l, 'precio', { tipo: 'number', step: 'any', alCambiar: cifra })),
            importe,
            h('td', { style: { width: '80px' } }, selector(l, 'iva', [[21, '21 %'], [10, '10 %'], [4, '4 %'], [0, '0 %']], { alCambiar: (v) => { l.iva = Number(v); cifra(); } })),
            h(
              'td',
              { style: { width: '70px', whiteSpace: 'nowrap' } },
              h('button', { class: 'boton-icono', 'aria-label': 'Subir línea', disabled: i === 0, onclick: () => { pr.lineas.splice(i - 1, 0, pr.lineas.splice(i, 1)[0]); cambio(); } }, '↑'),
              h('button', { class: 'boton-icono', 'aria-label': 'Borrar línea', onclick: () => { pr.lineas.splice(i, 1); cambio(); } }, '✕'),
            ),
          );
        }),
      );
      recalcular();
    };
    const anadir = (linea = {}) => {
      pr.lineas.push({ id: uid(), concepto: '', cantidad: 1, unidad: 'ud', precio: 0, iva: Number(datos.estudio.iva) || 21, ...linea });
      cambio();
    };
    const desdeCatalogo = () => {
      if (!datos.catalogo.length) return aviso('El catálogo está vacío. Añade productos en Catálogo.', 'error');
      const muebles = new Map();
      for (const hab of p.habitaciones) for (const m of hab.plano.muebles) if (m.productoId) muebles.set(m.productoId, (muebles.get(m.productoId) || 0) + 1);
      const cerrar = ventana(
        'Añadir productos del catálogo',
        h(
          'div',
          {},
          muebles.size
            ? h('button', {
                class: 'boton principal',
                style: { marginBottom: '12px' },
                onclick: () => {
                  for (const [pid, n] of muebles) {
                    const prod = datos.catalogo.find((x) => x.id === pid);
                    if (prod) anadir({ concepto: `${prod.nombre}${prod.proveedor ? ` (${prod.proveedor})` : ''}`, cantidad: n, precio: Number(prod.precio) || 0 });
                  }
                  cerrar();
                },
              }, `Añadir los ${[...muebles.values()].reduce((a, b) => a + b, 0)} productos colocados en los planos`)
            : null,
          h(
            'table',
            { class: 'tabla' },
            h('tbody', {}, datos.catalogo.map((prod) => h('tr', {}, h('td', {}, prod.nombre, h('br'), h('small', {}, prod.categoria)), h('td', { class: 'numero' }, formatoEuros(prod.precio)), h('td', {}, h('button', { class: 'boton pequeno', onclick: () => { anadir({ concepto: prod.nombre, precio: Number(prod.precio) || 0 }); aviso(`Añadido: ${prod.nombre}`); } }, 'Añadir'))))),
          ),
        ),
      );
    };
    pintarLineas();
    return h(
      'div',
      {},
      h(
        'div',
        { class: 'tarjeta' },
        h(
          'div',
          { class: 'rejilla' },
          campo('Número', entrada(pr, 'numero', { alCambiar: cambiar, placeholder: 'Se pone solo al imprimir' })),
          campo('Fecha', entrada(pr, 'fecha', { tipo: 'date', alCambiar: cambiar })),
          campo('Descuento (%)', entrada(pr, 'descuento', { tipo: 'number', min: 0, max: 100, step: 'any', alCambiar: () => { guardar(); recalcular(); } })),
        ),
        h('div', { class: 'envoltura-tabla' }, h('table', { class: 'tabla' }, h('thead', {}, h('tr', {}, h('th', {}, 'Concepto'), h('th', {}, 'Cant.'), h('th', {}, 'Unidad'), h('th', {}, 'Precio'), h('th', { class: 'numero' }, 'Importe'), h('th', {}, 'IVA'), h('th'))), cuerpoTabla, pie)),
        h(
          'div',
          { class: 'botones izquierda' },
          h('button', { class: 'boton', onclick: () => anadir() }, '+ Línea'),
          h('button', { class: 'boton', onclick: () => anadir({ concepto: 'Honorarios de diseño', unidad: 'ud' }) }, '+ Honorarios'),
          h('button', { class: 'boton', onclick: desdeCatalogo }, '+ Del catálogo'),
          h('a', { class: 'boton', href: `#/calculadora/${p.id}` }, '+ Calcular materiales'),
        ),
        campo('Notas que salen en el presupuesto', areaTexto(pr, 'notas', { alCambiar: cambiar, rows: 3, placeholder: 'Ej.: El precio incluye transporte y montaje.' })),
        h('div', { class: 'botones' }, h('a', { class: 'boton principal', href: `#/imprimir/${p.id}` }, 'Ver e imprimir en PDF')),
      ),
    );
  },

  pagos(p, cambiar, repintar) {
    const total = totalesPresupuesto(p.presupuesto).total;
    const cobrado = p.pagos.filter((x) => x.cobrado).reduce((s, x) => s + (Number(x.importe) || 0), 0);
    const previsto = p.pagos.reduce((s, x) => s + (Number(x.importe) || 0), 0);
    const plazos = () => {
      if (!total) return aviso('Primero haz el presupuesto: los plazos se calculan sobre su total.', 'error');
      for (const [concepto, porcentaje] of [['Señal al aceptar el presupuesto', 40], ['Al empezar la obra', 40], ['A la entrega', 20]]) {
        p.pagos.push({ id: uid(), fecha: '', concepto: `${concepto} (${porcentaje} %)`, importe: Math.round(total * porcentaje) / 100, cobrado: false });
      }
      guardar();
      repintar();
    };
    return h(
      'div',
      { class: 'tarjeta' },
      h('h2', {}, 'Pagos del cliente'),
      h('p', { style: { color: 'var(--texto-suave)' } }, `Presupuesto: ${formatoEuros(total)} · Previsto en pagos: ${formatoEuros(previsto)} · Cobrado: ${formatoEuros(cobrado)} · Falta por cobrar: ${formatoEuros(Math.max(0, total - cobrado))}`),
      p.pagos.length
        ? h(
            'div',
            { class: 'envoltura-tabla' },
            h(
              'table',
              { class: 'tabla' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Concepto'), h('th', {}, 'Importe'), h('th', {}, 'Cobrado'), h('th'))),
              h(
                'tbody',
                {},
                p.pagos.map((x, i) =>
                  h(
                    'tr',
                    {},
                    h('td', { style: { width: '160px' } }, entrada(x, 'fecha', { tipo: 'date', alCambiar: cambiar })),
                    h('td', {}, entrada(x, 'concepto', { alCambiar: cambiar })),
                    h('td', { style: { width: '120px' } }, entrada(x, 'importe', { tipo: 'number', step: 'any', alCambiar: () => { guardar(); repintar(); } })),
                    h('td', { style: { width: '80px' } }, h('input', { type: 'checkbox', checked: x.cobrado, 'aria-label': 'Cobrado', onchange: (e) => { x.cobrado = e.target.checked; if (x.cobrado && !x.fecha) x.fecha = hoy(); guardar(); repintar(); } })),
                    h('td', { style: { width: '40px' } }, h('button', { class: 'boton-icono', 'aria-label': 'Borrar pago', onclick: () => { p.pagos.splice(i, 1); guardar(); repintar(); } }, '✕')),
                  ),
                ),
              ),
            ),
          )
        : null,
      h(
        'div',
        { class: 'botones izquierda' },
        h('button', { class: 'boton', onclick: () => { p.pagos.push({ id: uid(), fecha: hoy(), concepto: '', importe: 0, cobrado: false }); guardar(); repintar(); } }, '+ Pago'),
        p.pagos.length ? null : h('button', { class: 'boton', onclick: plazos }, 'Crear plazos 40 / 40 / 20 %'),
      ),
    );
  },

  proveedores(p, cambiar, repintar) {
    return h(
      'div',
      { class: 'tarjeta' },
      h('h2', {}, 'Proveedores y gremios'),
      p.proveedores.length
        ? h(
            'div',
            { class: 'envoltura-tabla' },
            h(
              'table',
              { class: 'tabla' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Nombre'), h('th', {}, 'Qué hace'), h('th', {}, 'Teléfono'), h('th', {}, 'Correo'), h('th', {}, 'Notas'), h('th'))),
              h(
                'tbody',
                {},
                p.proveedores.map((x, i) =>
                  h(
                    'tr',
                    {},
                    h('td', {}, entrada(x, 'nombre', { alCambiar: cambiar })),
                    h('td', {}, entrada(x, 'oficio', { alCambiar: cambiar, placeholder: 'Pintor, carpintería…' })),
                    h('td', {}, entrada(x, 'telefono', { tipo: 'tel', alCambiar: cambiar })),
                    h('td', {}, entrada(x, 'email', { tipo: 'email', alCambiar: cambiar })),
                    h('td', {}, entrada(x, 'notas', { alCambiar: cambiar })),
                    h('td', {}, h('button', { class: 'boton-icono', 'aria-label': 'Borrar proveedor', onclick: () => { p.proveedores.splice(i, 1); guardar(); repintar(); } }, '✕')),
                  ),
                ),
              ),
            ),
          )
        : h('p', { style: { color: 'var(--texto-suave)' } }, 'Apunta aquí la tienda, el carpintero, el pintor… de este proyecto.'),
      h('div', { class: 'botones izquierda' }, h('button', { class: 'boton', onclick: () => { p.proveedores.push({ id: uid(), nombre: '', oficio: '', telefono: '', email: '', notas: '' }); guardar(); repintar(); } }, '+ Proveedor')),
    );
  },
};

function galeria(p, fotos, repintar) {
  return h(
    'div',
    { class: 'galeria' },
    fotos.map((f) =>
      h(
        'div',
        { class: 'foto' },
        h('img', { src: urlArchivo(f.archivo), alt: f.nota || 'Foto del proyecto', loading: 'lazy', onclick: () => verFoto(f) }),
        h(
          'div',
          { class: 'pie' },
          h('span', {}, f.nota || formatoFecha(f.fecha)),
          h('button', {
            'aria-label': 'Borrar foto',
            onclick: async () => {
              if (!(await confirmar('¿Quitar esta foto del proyecto?', { si: 'Quitar', peligro: true }))) return;
              p.fotos.splice(p.fotos.indexOf(f), 1);
              guardar();
              repintar();
            },
          }, '✕'),
        ),
      ),
    ),
  );
}

function verFoto(f) {
  ventana(
    f.nota || 'Foto',
    h(
      'div',
      {},
      h('img', { src: urlArchivo(f.archivo), alt: '', style: { width: '100%', borderRadius: '8px', display: 'block' } }),
      campo('Nota', entrada(f, 'nota', { alCambiar: guardar, placeholder: 'Ej.: Salón, vista desde la puerta' })),
      h('div', { class: 'botones' }, h('a', { class: 'boton', href: urlArchivo(f.archivo), download: `foto-${f.fecha}${f.archivo.slice(-4)}` }, 'Descargar')),
    ),
    { ancha: true },
  );
}

// Comparador con una barra que se arrastra: a la izquierda el antes, a la derecha el después.
export function comparador(urlAntes, urlDespues, rotulos = ['Antes', 'Después']) {
  const encima = h('div', { class: 'encima' }, h('img', { src: urlAntes, alt: rotulos[0] }));
  const barra = h('div', { class: 'barra', role: 'slider', 'aria-label': 'Comparar', tabindex: 0 });
  const caja = h('div', { class: 'comparar' }, h('img', { src: urlDespues, alt: rotulos[1] }), encima, barra, h('span', { class: 'rotulo', style: { left: '10px' } }, rotulos[0]), h('span', { class: 'rotulo', style: { right: '10px' } }, rotulos[1]));
  const poner = (fraccion) => {
    const f = Math.min(1, Math.max(0, fraccion));
    encima.style.clipPath = `inset(0 ${100 - f * 100}% 0 0)`;
    barra.style.left = `calc(${f * 100}% - 1px)`;
  };
  const mover = (e) => {
    const r = caja.getBoundingClientRect();
    poner((e.clientX - r.left) / r.width);
  };
  caja.addEventListener('pointerdown', (e) => {
    caja.setPointerCapture(e.pointerId);
    mover(e);
    caja.addEventListener('pointermove', mover);
  });
  caja.addEventListener('pointerup', () => caja.removeEventListener('pointermove', mover));
  barra.addEventListener('keydown', (e) => {
    const actual = parseFloat(barra.style.left) / 100 || 0.5;
    if (e.key === 'ArrowLeft') poner(actual - 0.05);
    if (e.key === 'ArrowRight') poner(actual + 0.05);
  });
  poner(0.5);
  return caja;
}

function compararFotos(p) {
  const antes = p.fotos.filter((f) => f.tipo === 'antes');
  const despues = p.fotos.filter((f) => f.tipo !== 'antes');
  const sel = { a: antes[0].archivo, d: despues[despues.length - 1].archivo };
  const zona = h('div');
  const pintar = () => vaciar(zona, comparador(urlArchivo(sel.a), urlArchivo(sel.d)));
  const opciones = (lista) => lista.map((f, i) => [f.archivo, f.nota || `${{ antes: 'Antes', despues: 'Después', ia: 'IA', render: '3D' }[f.tipo]} ${i + 1} · ${formatoFecha(f.fecha)}`]);
  ventana(
    'Antes y después',
    h(
      'div',
      {},
      h('div', { class: 'rejilla-2' }, campo('Antes', selector(sel, 'a', opciones(antes), { alCambiar: pintar })), campo('Después', selector(sel, 'd', opciones(despues), { alCambiar: pintar }))),
      zona,
    ),
    { ancha: true },
  );
  pintar();
}
