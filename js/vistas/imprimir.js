// Presupuesto listo para imprimir o guardar en PDF (con «Imprimir» del navegador).
import { h, vacio, formatoEuros, formatoFecha, formatoNumero, hoy } from '../ui.js';
import { datos, guardar, urlArchivo } from '../estado.js';
import { buscarProyecto } from '../modelo.js';
import { totalesPresupuesto } from '../calculos.js';

export function mostrar(el, [pid]) {
  const p = buscarProyecto(pid);
  if (!p) {
    el.append(vacio('Este proyecto no existe.'));
    return;
  }
  const pr = p.presupuesto;
  const e = datos.estudio;
  if (!pr.numero) {
    datos.contadorPresupuestos = (Number(datos.contadorPresupuestos) || 0) + 1;
    pr.numero = `${new Date().getFullYear()}-${String(datos.contadorPresupuestos).padStart(3, '0')}`;
    guardar();
  }
  const t = totalesPresupuesto(pr);
  const validez = Number(e.validez) || 30;
  const tituloAnterior = document.title;
  document.title = `Presupuesto ${pr.numero} - ${p.cliente.nombre || p.nombre}`;

  el.append(
    h(
      'div',
      { class: 'solo-pantalla fila' },
      h('a', { class: 'boton', href: `#/proyecto/${p.id}/presupuesto` }, '‹ Volver'),
      h('button', { class: 'boton principal', onclick: () => window.print() }, 'Imprimir o guardar en PDF'),
      h('small', { class: 'crece' }, 'En la ventana de imprimir, elige «Guardar como PDF» o «Microsoft Print to PDF» como impresora.'),
      !e.nombre ? h('a', { href: '#/ajustes' }, 'Pon los datos de tu estudio en Ajustes') : null,
    ),
    h(
      'article',
      { class: 'documento' },
      h(
        'div',
        { class: 'doc-cabecera' },
        h(
          'div',
          {},
          e.logo ? h('img', { class: 'doc-logo', src: urlArchivo(e.logo), alt: e.nombre }) : h('h2', { style: { margin: 0 } }, e.nombre || 'Tu estudio'),
          h('div', { style: { marginTop: '8px', color: '#555', whiteSpace: 'pre-line' } }, [e.logo ? e.nombre : '', e.nif ? `NIF ${e.nif}` : '', e.direccion, [e.telefono, e.email].filter(Boolean).join(' · '), e.web].filter(Boolean).join('\n')),
        ),
        h('div', { style: { textAlign: 'right' } }, h('h1', {}, 'PRESUPUESTO'), h('div', {}, `Nº ${pr.numero}`), h('div', {}, `Fecha: ${formatoFecha(pr.fecha || hoy())}`), h('div', {}, `Válido ${validez} días`)),
      ),
      h(
        'div',
        { class: 'doc-datos' },
        h('div', {}, h('small', {}, 'CLIENTE'), h('div', { style: { fontWeight: 600 } }, p.cliente.nombre || '—'), p.cliente.nif ? h('div', {}, `NIF ${p.cliente.nif}`) : null, h('div', {}, p.cliente.direccion), h('div', {}, [p.cliente.telefono, p.cliente.email].filter(Boolean).join(' · '))),
        h('div', {}, h('small', {}, 'PROYECTO'), h('div', { style: { fontWeight: 600 } }, p.nombre), h('div', {}, p.habitaciones.map((x) => x.nombre).join(', '))),
      ),
      h(
        'table',
        { class: 'tabla' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Concepto'), h('th', { class: 'numero' }, 'Cantidad'), h('th', { class: 'numero' }, 'Precio'), h('th', { class: 'numero' }, 'IVA'), h('th', { class: 'numero' }, 'Importe'))),
        h(
          'tbody',
          {},
          pr.lineas.length
            ? pr.lineas.map((l) =>
                h(
                  'tr',
                  {},
                  h('td', {}, l.concepto),
                  h('td', { class: 'numero' }, `${formatoNumero(l.cantidad)} ${l.unidad || ''}`),
                  h('td', { class: 'numero' }, formatoEuros(l.precio)),
                  h('td', { class: 'numero' }, `${l.iva} %`),
                  h('td', { class: 'numero' }, formatoEuros((Number(l.cantidad) || 0) * (Number(l.precio) || 0))),
                ),
              )
            : h('tr', {}, h('td', { colspan: 5 }, 'Este presupuesto todavía no tiene líneas.')),
        ),
      ),
      h(
        'div',
        { class: 'totales' },
        h('div', {}, h('span', {}, 'Suma'), h('span', {}, formatoEuros(t.subtotal))),
        pr.descuento ? h('div', {}, h('span', {}, `Descuento ${formatoNumero(pr.descuento)} %`), h('span', {}, `−${formatoEuros(t.descuentoImporte)}`)) : null,
        h('div', {}, h('span', {}, 'Base imponible'), h('span', {}, formatoEuros(t.base))),
        t.ivas.map((i) => h('div', {}, h('span', {}, `IVA ${i.tipo} %`), h('span', {}, formatoEuros(i.cuota)))),
        h('div', { class: 'total' }, h('span', {}, 'TOTAL'), h('span', {}, formatoEuros(t.total))),
      ),
      pr.notas ? h('p', { style: { marginTop: '24px', whiteSpace: 'pre-wrap' } }, pr.notas) : null,
      e.condiciones ? h('div', { class: 'condiciones' }, h('b', {}, 'Condiciones'), '\n', e.condiciones) : null,
      h('div', { style: { marginTop: '50px', display: 'flex', justifyContent: 'space-between', gap: '40px', color: '#555' } }, h('div', {}, 'Conforme, el cliente:', h('div', { style: { borderBottom: '1px solid #999', width: '220px', height: '50px' } })), h('div', {}, 'Fecha:', h('div', { style: { borderBottom: '1px solid #999', width: '160px', height: '50px' } }))),
    ),
  );
  return () => {
    document.title = tituloAnterior;
  };
}
