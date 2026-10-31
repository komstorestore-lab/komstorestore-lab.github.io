// Dibujo pequeño de un plano, para las tarjetas.
import { h } from './ui.js';
import { esquinasMueble } from './calculos.js';

export function miniPlano(plano, alto = 130) {
  const p = plano.puntos;
  if (!p.length) return h('div', { class: 'portada', style: { height: `${alto}px` } }, '◇');
  const xs = p.map((q) => q.x);
  const ys = p.map((q) => q.y);
  const margen = 30;
  const minX = Math.min(...xs) - margen;
  const minY = Math.min(...ys) - margen;
  const ancho = Math.max(...xs) - minX + margen;
  const largo = Math.max(...ys) - minY + margen;
  return h(
    'svg',
    { viewBox: `${minX} ${minY} ${ancho} ${largo}`, style: { width: '100%', height: `${alto}px`, background: 'var(--superficie-2)', display: 'block' } },
    plano.cerrado
      ? h('polygon', { points: p.map((q) => `${q.x},${q.y}`).join(' '), fill: '#fff', stroke: '#2f2924', 'stroke-width': plano.grosor || 12, 'stroke-linejoin': 'miter' })
      : h('polyline', { points: p.map((q) => `${q.x},${q.y}`).join(' '), fill: 'none', stroke: '#2f2924', 'stroke-width': plano.grosor || 12 }),
    plano.muebles.map((m) => h('polygon', { points: esquinasMueble(m).map((q) => `${q.x},${q.y}`).join(' '), fill: m.color || '#ccc', 'fill-opacity': 0.8, stroke: '#6e655c', 'stroke-width': 2 })),
  );
}
