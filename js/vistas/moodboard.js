// Tablero de inspiración: fotos, colores y notas que se colocan y se cambian de tamaño con el ratón.
import { h, vaciar, ventana, confirmar, campo, entrada, selector, vacio, uid, aviso, elegirArchivo, descargar } from '../ui.js';
import { datos, guardar, urlArchivo, subirArchivo } from '../estado.js';
import { coloresDeFoto, esOscuro } from './inspiracion.js';

export function mostrar(el, [id]) {
  const m = datos.moodboards.find((x) => x.id === id);
  if (!m) {
    el.append(vacio('Este moodboard no existe.', h('a', { class: 'boton', href: '#/inspiracion/moodboards' }, 'Ver moodboards')));
    return;
  }
  m.fondo ||= '#ffffff';
  let elegido = null;
  const tablero = h('div', { class: 'tablero', style: { background: m.fondo } });

  const limitar = (e) => {
    const r = tablero.getBoundingClientRect();
    e.x = Math.max(-e.w + 30, Math.min(r.width - 30, e.x));
    e.y = Math.max(0, Math.min(r.height - 30, e.y));
  };

  const pintar = () => {
    vaciar(
      tablero,
      m.elementos.length ? null : h('div', { class: 'vacio', style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' } }, 'Añade fotos, colores y notas con los botones de arriba. Arrastra para moverlos y usa la esquina para cambiar el tamaño.'),
      m.elementos.map((e) => pieza(e)),
    );
  };

  const pieza = (e) => {
    const contenido =
      e.tipo === 'imagen'
        ? h('img', { src: urlArchivo(e.archivo), alt: '' })
        : e.tipo === 'color'
          ? h('div', { class: 'color', style: { background: e.color, color: esOscuro(e.color) ? '#fff' : '#222' } }, e.texto || e.color.toUpperCase())
          : h('div', { class: 'nota', style: { fontSize: `${e.tam || 14}px` } }, e.texto);
    const asa = h('div', { class: 'asa', 'aria-hidden': 'true' });
    const div = h('div', { class: `pieza${elegido === e ? ' elegida' : ''}`, style: { left: `${e.x}px`, top: `${e.y}px`, width: `${e.w}px`, height: `${e.h}px`, zIndex: m.elementos.indexOf(e) + 1 } }, contenido, asa);
    div.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      elegido = e;
      for (const otro of tablero.querySelectorAll('.pieza')) otro.classList.remove('elegida');
      div.classList.add('elegida');
      const redimensionar = ev.target === asa;
      const inicio = { x: ev.clientX, y: ev.clientY, ex: e.x, ey: e.y, w: e.w, hh: e.h };
      const proporcion = e.h / e.w;
      div.setPointerCapture(ev.pointerId);
      const mover = (mv) => {
        const dx = mv.clientX - inicio.x;
        const dy = mv.clientY - inicio.y;
        if (redimensionar) {
          e.w = Math.max(40, Math.round(inicio.w + dx));
          e.h = Math.max(30, Math.round(e.tipo === 'imagen' && !mv.shiftKey ? e.w * proporcion : inicio.hh + dy));
        } else {
          e.x = Math.round(inicio.ex + dx);
          e.y = Math.round(inicio.ey + dy);
          limitar(e);
        }
        Object.assign(div.style, { left: `${e.x}px`, top: `${e.y}px`, width: `${e.w}px`, height: `${e.h}px` });
      };
      const soltar = () => {
        div.removeEventListener('pointermove', mover);
        div.removeEventListener('pointerup', soltar);
        guardar();
      };
      div.addEventListener('pointermove', mover);
      div.addEventListener('pointerup', soltar);
    });
    div.addEventListener('dblclick', () => editar(e));
    return div;
  };

  const centroLibre = (w, hh) => {
    const r = tablero.getBoundingClientRect();
    const n = m.elementos.length;
    return { x: Math.round(Math.max(10, r.width / 2 - w / 2 + ((n * 37) % 200) - 100)), y: Math.round(Math.max(10, r.height / 2 - hh / 2 + ((n * 53) % 160) - 80)) };
  };

  const anadirFotos = async () => {
    const archivos = await elegirArchivo('image/*', { multiple: true });
    for (const a of archivos) {
      try {
        const [archivo, bitmap] = await Promise.all([subirArchivo(a), createImageBitmap(a)]);
        const w = 260;
        const hh = Math.round((w * bitmap.height) / bitmap.width);
        m.elementos.push({ id: uid(), tipo: 'imagen', archivo, w, h: hh, ...centroLibre(w, hh) });
      } catch (e) {
        aviso(e.message, 'error');
      }
    }
    guardar();
    pintar();
  };

  const anadirColor = (color = '#c97f62') => {
    m.elementos.push({ id: uid(), tipo: 'color', color, texto: '', w: 110, h: 110, ...centroLibre(110, 110) });
    guardar();
    pintar();
  };

  const anadirNota = () => {
    const e = { id: uid(), tipo: 'nota', texto: 'Escribe aquí…', tam: 16, w: 220, h: 120, ...centroLibre(220, 120) };
    m.elementos.push(e);
    guardar();
    pintar();
    editar(e);
  };

  const coloresDelTablero = async () => {
    const fotos = m.elementos.filter((e) => e.tipo === 'imagen');
    if (!fotos.length) return aviso('Añade primero alguna foto', 'error');
    const colores = [];
    for (const f of fotos.slice(0, 6)) colores.push(...(await coloresDeFoto(urlArchivo(f.archivo), 3)));
    const unicos = colores.filter((c, i) => colores.findIndex((d) => distanciaColor(c, d) < 40) === i).slice(0, 6);
    datos.paletas.push({ id: uid(), nombre: `Colores de ${m.nombre}`, colores: unicos, proyectoId: m.proyectoId || '' });
    unicos.forEach((c) => anadirColor(c));
    aviso('Paleta guardada en Inspiración y colores añadidos al tablero');
  };

  const editar = (e) => {
    const cerrar = ventana(
      e.tipo === 'imagen' ? 'Foto' : e.tipo === 'color' ? 'Color' : 'Nota',
      h(
        'div',
        {},
        e.tipo === 'nota' ? campo('Texto', (() => { const t = h('textarea', { rows: 5 }); t.value = e.texto; t.addEventListener('input', () => { e.texto = t.value; }); return t; })()) : null,
        e.tipo === 'nota' ? campo('Tamaño de letra', entrada(e, 'tam', { tipo: 'number', min: 10, max: 60 })) : null,
        e.tipo === 'color' ? h('div', { class: 'rejilla-2' }, campo('Color', entrada(e, 'color', { tipo: 'color' })), campo('Texto (opcional)', entrada(e, 'texto', { placeholder: 'Ej.: Pared principal' }))) : null,
        h(
          'div',
          { class: 'botones' },
          h('button', { class: 'boton', onclick: () => { m.elementos.splice(m.elementos.indexOf(e), 1); m.elementos.push(e); guardar(); cerrar(); } }, 'Traer delante'),
          h('button', { class: 'boton', onclick: () => { m.elementos.splice(m.elementos.indexOf(e), 1); m.elementos.unshift(e); guardar(); cerrar(); } }, 'Enviar detrás'),
          h('button', { class: 'boton peligro', onclick: () => { m.elementos.splice(m.elementos.indexOf(e), 1); guardar(); cerrar(); } }, 'Quitar'),
          h('button', { class: 'boton principal', onclick: () => { guardar(); cerrar(); } }, 'Hecho'),
        ),
      ),
      { alCerrar: () => { guardar(); pintar(); } },
    );
  };

  const teclas = (ev) => {
    if (ev.target.closest('input, textarea, select') || !elegido) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      m.elementos.splice(m.elementos.indexOf(elegido), 1);
      elegido = null;
      guardar();
      pintar();
    }
  };
  document.addEventListener('keydown', teclas);

  const fondo = h('input', { type: 'color', value: m.fondo, title: 'Color de fondo' });
  fondo.addEventListener('input', () => {
    m.fondo = fondo.value;
    tablero.style.background = m.fondo;
    guardar();
  });

  el.append(
    h(
      'div',
      { class: 'cabecera', style: { marginBottom: '12px' } },
      h('div', {}, h('div', { class: 'miga' }, h('a', { href: '#/inspiracion/moodboards' }, 'Moodboards'), ' ›'), h('div', { class: 'fila' }, h('div', { style: { width: '280px' } }, entrada(m, 'nombre', { alCambiar: guardar, 'aria-label': 'Nombre del moodboard', style: { fontSize: '20px', fontWeight: 650 } })), selector(m, 'proyectoId', [['', 'Sin proyecto'], ...datos.proyectos.map((x) => [x.id, x.nombre])], { alCambiar: guardar, style: { width: '180px' } }))),
      h(
        'div',
        { class: 'fila' },
        h('button', { class: 'boton principal', onclick: anadirFotos }, '+ Fotos'),
        h('button', { class: 'boton', onclick: () => anadirColor() }, '+ Color'),
        h('button', { class: 'boton', onclick: anadirNota }, '+ Nota'),
        h('button', { class: 'boton', onclick: coloresDelTablero }, '◐ Sacar paleta'),
        h('label', { class: 'fila', style: { fontSize: '13px' } }, 'Fondo', fondo),
        h('button', { class: 'boton', onclick: () => exportar(m, tablero) }, '⤓ Descargar imagen'),
        h('button', {
          class: 'boton peligro',
          onclick: async () => {
            if (!(await confirmar(`¿Borrar el moodboard «${m.nombre}»?`, { si: 'Borrar', peligro: true }))) return;
            datos.moodboards.splice(datos.moodboards.indexOf(m), 1);
            guardar();
            location.hash = '#/inspiracion/moodboards';
          },
        }, 'Borrar'),
      ),
    ),
    tablero,
    h('p', { class: 'ayuda-teclas', style: { marginTop: '8px' } }, 'Doble clic en un elemento para editarlo, ponerlo delante o quitarlo. Supr borra el elegido. Mayús al cambiar el tamaño de una foto la deforma.'),
  );
  requestAnimationFrame(pintar);
  return () => document.removeEventListener('keydown', teclas);
}

function distanciaColor(a, b) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  return Math.hypot(((x >> 16) & 255) - ((y >> 16) & 255), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255));
}

// Dibuja el tablero en una imagen PNG para enviarla al cliente.
async function exportar(m, tablero) {
  const r = tablero.getBoundingClientRect();
  const escala = 2;
  const c = document.createElement('canvas');
  c.width = r.width * escala;
  c.height = r.height * escala;
  const x = c.getContext('2d');
  x.scale(escala, escala);
  x.fillStyle = m.fondo;
  x.fillRect(0, 0, r.width, r.height);
  for (const e of m.elementos) {
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.15)';
    x.shadowBlur = 10;
    x.shadowOffsetY = 2;
    if (e.tipo === 'imagen') {
      const img = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = urlArchivo(e.archivo);
      });
      if (img) {
        // Igual que object-fit: cover
        const escalaImg = Math.max(e.w / img.width, e.h / img.height);
        const sw = e.w / escalaImg;
        const sh = e.h / escalaImg;
        x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, e.x, e.y, e.w, e.h);
      }
    } else {
      x.fillStyle = e.tipo === 'color' ? e.color : '#fff7d6';
      x.fillRect(e.x, e.y, e.w, e.h);
      x.shadowColor = 'transparent';
      x.fillStyle = e.tipo === 'color' ? (esOscuro(e.color) ? '#fff' : '#222') : '#2b2622';
      const tam = e.tipo === 'nota' ? e.tam || 14 : 12;
      x.font = `${tam}px Segoe UI, sans-serif`;
      const texto = e.tipo === 'color' ? e.texto || e.color.toUpperCase() : e.texto;
      const lineas = partirTexto(x, texto, e.w - 20);
      lineas.forEach((l, i) => {
        const y = e.tipo === 'color' ? e.y + e.h - 8 - (lineas.length - 1 - i) * tam * 1.3 : e.y + 10 + tam + i * tam * 1.3;
        if (y < e.y + e.h) x.fillText(l, e.x + (e.tipo === 'color' ? 6 : 10), y);
      });
    }
    x.restore();
  }
  c.toBlob((b) => descargar(`${m.nombre}.png`, b), 'image/png');
}

function partirTexto(x, texto, ancho) {
  const lineas = [];
  for (const parrafo of String(texto).split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (x.measureText(prueba).width > ancho && actual) {
        lineas.push(actual);
        actual = palabra;
      } else actual = prueba;
    }
    lineas.push(actual);
  }
  return lineas;
}
