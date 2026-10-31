// Editor del plano de un espacio (2D) y su vista en 3D.
import { h, vaciar, ventana, campo, entrada, selector, vacio, uid, aviso, confirmar, formatoM2, formatoNumero, hoy } from '../ui.js';
import { datos, guardar, subirBlob, urlArchivo, pedir } from '../estado.js';
import { buscarProyecto, buscarProducto, MUEBLES_GENERICOS, tipoPorCategoria, SUELOS, TIPOS_MUEBLE } from '../modelo.js';
import { tramos, distancia, medidasHabitacion, problemasMuebles, puntoDentro, esquinasMueble } from '../calculos.js';
import { cargarGenericos, vistaCenitalSiEsta } from '../modelos3d.js';
import { cargarTexturas, muestra, infoTextura, REVESTIMIENTOS } from '../materiales.js';
import { ayudanteChatGPT, textoChatGPT } from '../chatgpt.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORES_PARED = ['#ffffff', '#f4f1ea', '#efe9e1', '#e6dccd', '#d9cbb8', '#c9b79c', '#b7a48d', '#9fa59a', '#8a9a8c', '#7d8f9b', '#5f6f7e', '#3e4a56', '#d8b4a0', '#c97f62', '#e9d8a6', '#2f2b28'];

const svgEl = (etiqueta, atributos = {}) => {
  const el = document.createElementNS(NS, etiqueta);
  for (const [k, v] of Object.entries(atributos)) if (v !== undefined && v !== null) el.setAttribute(k, v);
  return el;
};

export function mostrar(el, [pid, hid]) {
  const proyecto = buscarProyecto(pid);
  const hab = proyecto?.habitaciones.find((x) => x.id === hid);
  if (!hab) {
    el.append(vacio('Este espacio no existe.', h('a', { class: 'boton', href: '#/proyectos' }, 'Ver proyectos')));
    return;
  }
  const editor = new Editor(el, proyecto, hab);
  return () => editor.destruir();
}

class Editor {
  constructor(el, proyecto, hab) {
    this.proyecto = proyecto;
    this.hab = hab;
    this.plano = hab.plano;
    this.plano.acabados ||= { pared: '#efe9e1', paredes: {}, suelo: 'madera-clara', colorSuelo: '', techo: '#ffffff' };
    this.plano.acabados.paredes ||= {};
    this.plano.grosor ||= 12;
    this.modo = '2d';
    this.herramienta = 'seleccionar';
    this.seleccion = null;
    this.deshacer = [];
    this.rehacer = [];
    this.dibujo = null; // puntos mientras se dibujan paredes
    this.medida = null;
    this.cursor = null;
    this.arrastre = null;
    this.vista3d = null;

    this.svg = svgEl('svg', { role: 'img', 'aria-label': `Plano de ${hab.nombre}` });
    this.capa = svgEl('g');
    this.svg.append(this.definiciones(), this.capa);
    this.ayuda = h('div', { class: 'ayuda' });
    this.datosSala = h('div', { class: 'datos-sala' });
    // Botones de zoom (en el móvil no hay rueda del ratón; también se puede pellizcar con dos dedos).
    this.botonesZoom = h(
      'div',
      { class: 'zoom-botones' },
      h('button', { class: 'boton-icono', 'aria-label': 'Acercar', title: 'Acercar', onclick: () => this.zoom(1 / 1.35) }, '+'),
      h('button', { class: 'boton-icono', 'aria-label': 'Alejar', title: 'Alejar', onclick: () => this.zoom(1.35) }, '−'),
      h('button', { class: 'boton-icono', 'aria-label': 'Ver todo el plano', title: 'Ver todo el plano', onclick: () => { this.encuadrar(); this.dibujar(); } }, '⤢'),
    );
    this.punteros = new Map(); // dedos (o el ratón) que están tocando el plano
    this.pellizco = null;
    this.tactil = false;
    this.lienzo = h('div', { class: 'lienzo' }, this.svg, this.datosSala, this.ayuda, this.botonesZoom);
    this.panel = h('aside', { class: 'panel', 'aria-label': 'Propiedades' });
    this.barra = h('div', { class: 'editor-barra' });
    el.append(h('div', { class: 'editor' }, this.barra, this.lienzo, this.panel));

    this.teclas = (e) => this.alPulsarTecla(e);
    document.addEventListener('keydown', this.teclas);
    this.svg.addEventListener('pointerdown', (e) => this.alPulsar(e));
    this.svg.addEventListener('pointermove', (e) => this.alMover(e));
    this.svg.addEventListener('pointerup', (e) => this.alSoltar(e));
    this.svg.addEventListener('pointercancel', (e) => this.alSoltar(e));
    this.svg.addEventListener('dblclick', (e) => this.alDobleClic(e));
    this.svg.addEventListener('wheel', (e) => this.alRueda(e), { passive: false });
    this.observador = new ResizeObserver(() => this.ajustarVista(false));
    this.observador.observe(this.lienzo);

    this.pintarBarra();
    this.encuadrar();
    this.dibujar();
    this.pintarPanel();
    // Medidas reales de los muebles genéricos (sus modelos 3D) y texturas de suelo para el dibujo.
    this.genericos = {};
    Promise.all([cargarGenericos(), cargarTexturas()]).then(([g]) => {
      this.genericos = g;
      this.dibujar();
      if (!this.seleccion && this.modo === '2d') this.pintarPanel();
    });
  }

  // Se repinta como mucho una vez por fotograma (las vistas desde arriba llegan poco a poco).
  repintarPronto() {
    if (this.repintePendiente) return;
    this.repintePendiente = requestAnimationFrame(() => {
      this.repintePendiente = 0;
      this.dibujar();
    });
  }

  destruir() {
    document.removeEventListener('keydown', this.teclas);
    this.observador.disconnect();
    this.vista3d?.destruir();
  }

  // ---------- Barra de herramientas ----------

  pintarBarra() {
    const herramienta = (id, texto, titulo) =>
      h('button', { class: `boton pequeno${this.herramienta === id ? ' activo' : ''}`, title: titulo, onclick: () => this.elegirHerramienta(id) }, texto);
    const en2d = this.modo === '2d';
    vaciar(
      this.barra,
      h('a', { class: 'boton pequeno', href: `#/proyecto/${this.proyecto.id}/espacios`, title: 'Volver al proyecto' }, '‹'),
      h('span', { class: 'titulo' }, `${this.proyecto.nombre} · ${this.hab.nombre}`),
      h('button', { class: `boton pequeno${en2d ? ' activo' : ''}`, onclick: () => this.cambiarModo('2d') }, 'Plano 2D'),
      h('button', { class: `boton pequeno${!en2d ? ' activo' : ''}`, onclick: () => this.cambiarModo('3d') }, 'Vista 3D'),
      h('span', { class: 'separador' }),
      en2d
        ? [
            herramienta('seleccionar', '↖ Mover', 'Seleccionar y mover (Esc)'),
            herramienta('paredes', '✎ Paredes', 'Dibujar paredes nuevas'),
            herramienta('puerta', '⌒ Puerta', 'Poner una puerta en una pared'),
            herramienta('ventana', '▭ Ventana', 'Poner una ventana en una pared'),
            herramienta('medir', '↔ Medir', 'Medir una distancia'),
            h('span', { class: 'separador' }),
            h('button', { class: 'boton pequeno', title: 'Deshacer (Ctrl+Z)', disabled: !this.deshacer.length, onclick: () => this.deshacerCambio() }, '↶'),
            h('button', { class: 'boton pequeno', title: 'Rehacer (Ctrl+Y)', disabled: !this.rehacer.length, onclick: () => this.rehacerCambio() }, '↷'),
            h('button', { class: 'boton pequeno', title: 'Ver todo el plano', onclick: () => { this.encuadrar(); this.dibujar(); } }, '⤢'),
          ]
        : [
            h('button', { class: 'boton pequeno', onclick: () => this.vista3d?.alternarPaseo() }, '🚶 Recorrer'),
            h('button', { class: 'boton pequeno', onclick: () => this.vista3d?.vistaAerea() }, '⤢ Vista aérea'),
            h('button', { class: 'boton pequeno', onclick: () => this.capturar() }, '📷 Guardar captura'),
            h('button', { class: 'boton pequeno principal', title: 'Convierte esta vista en una foto realista con tu ChatGPT o con el servicio de IA', onclick: () => this.realistaIA() }, '✦ Hacer realista con IA'),
          ],
      h('a', { class: 'boton pequeno', href: `#/calculadora/${this.proyecto.id}/${this.hab.id}`, style: { marginLeft: 'auto' } }, '▤ Materiales'),
    );
  }

  elegirHerramienta(id) {
    if (id === 'paredes' && this.plano.puntos.length) {
      confirmar('Al dibujar paredes nuevas se borran las actuales, con sus puertas y ventanas. Los muebles se quedan. ¿Seguir?', { si: 'Dibujar de nuevo' }).then((si) => {
        if (!si) return;
        this.herramienta = 'paredes';
        this.dibujo = [];
        this.seleccion = null;
        this.actualizarTodo();
      });
      return;
    }
    this.herramienta = id;
    this.dibujo = id === 'paredes' ? [] : null;
    this.medida = null;
    this.actualizarTodo();
  }

  async cambiarModo(modo) {
    if (modo === this.modo) return;
    this.modo = modo;
    const ayuda3d = 'Arrastra para girar · rueda o dos dedos para acercar · toca una pared para elegirla';
    if (modo === '3d') {
      this.svg.style.display = 'none';
      this.datosSala.style.display = 'none';
      this.botonesZoom.style.display = 'none';
      this.ayuda.textContent = ayuda3d;
      const { Vista3D } = await import('../vista3d.js');
      this.vista3d = new Vista3D(this.lienzo, this.plano, {
        alElegirPared: (i) => {
          this.seleccion = i === null ? null : { tipo: 'pared', i };
          this.pintarPanel();
        },
        alCambiarPaseo: (activo, arrastrando) => {
          this.ayuda.textContent = activo
            ? `${arrastrando ? 'Arrastra' : 'Mueve el ratón'} para mirar · el círculo de abajo, W A S D o las flechas para andar · Esc o «Dejar de recorrer» para salir`
            : ayuda3d;
        },
      });
    } else {
      this.vista3d?.destruir();
      this.vista3d = null;
      this.svg.style.display = '';
      this.datosSala.style.display = '';
      this.botonesZoom.style.display = '';
    }
    this.seleccion = null;
    this.pintarBarra();
    this.pintarPanel();
    this.dibujar();
  }

  async capturar() {
    if (!this.vista3d) return;
    try {
      const blob = await this.vista3d.captura();
      const archivo = await subirBlob(blob, 'image/png');
      this.proyecto.fotos.push({ id: uid(), archivo, tipo: 'render', nota: `${this.hab.nombre} en 3D`, fecha: new Date().toISOString().slice(0, 10) });
      guardar();
      aviso('Captura guardada en las fotos del proyecto');
    } catch (e) {
      aviso(e.message, 'error');
    }
  }

  // Convierte la vista 3D en una foto realista de la misma habitación: con tu ChatGPT (a mano)
  // o, si hay clave en Ajustes, con el servicio de IA de pago (automático).
  async realistaIA() {
    if (!this.vista3d || this.ocupado) return;
    this.ocupado = true;
    try {
      const [captura, ajustes] = await Promise.all([
        this.vista3d.captura().then((b) => subirBlob(b, 'image/png')),
        pedir('/api/ia').catch(() => ({ hayClave: false })),
      ]);
      const conChatGPT = () =>
        ayudanteChatGPT({
          titulo: 'Hacer realista con tu ChatGPT',
          fotos: [{ archivo: captura, nombre: `${this.hab.nombre} 3D` }],
          texto: textoChatGPT({ modo: 'realista' }),
          alAnadir: (id) => this.guardarRealista(captura, id, 'Con ChatGPT'),
        });
      if (!ajustes.hayClave) {
        conChatGPT();
        return;
      }
      const cerrar = ventana(
        'Hacer realista',
        h(
          'div',
          {},
          h('p', {}, '¿Cómo quieres hacerlo?'),
          h(
            'div',
            { class: 'botones izquierda' },
            h('button', { class: 'boton principal', onclick: () => { cerrar(); this.realistaAutomatico(captura); } }, 'Automático, con la clave de IA'),
            h('button', { class: 'boton', onclick: () => { cerrar(); conChatGPT(); } }, 'Con mi ChatGPT, a mano'),
          ),
        ),
      );
    } catch (e) {
      aviso(e.message, 'error');
    } finally {
      this.ocupado = false;
    }
  }

  async realistaAutomatico(captura) {
    const espera = ventana('Haciendo la foto realista', h('p', {}, h('span', { class: 'girando' }), ' La IA está trabajando (entre 10 y 60 segundos)…'));
    try {
      const { id } = await pedir('/api/ia/redisenar', { metodo: 'POST', cuerpo: { foto: captura, modo: 'realista' } });
      espera();
      this.guardarRealista(captura, id, 'Con IA');
    } catch (e) {
      espera();
      aviso(/clave/i.test(e.message) ? `${e.message} (Ajustes > Rediseño con IA)` : e.message, 'error');
    }
  }

  async guardarRealista(captura, id, rotulo) {
    this.proyecto.fotos.push({ id: uid(), archivo: id, tipo: 'ia', nota: `${this.hab.nombre} · 3D hecho realista${rotulo === 'Con ChatGPT' ? ' con ChatGPT' : ''}`, fecha: hoy(), original: captura });
    guardar();
    const { comparador } = await import('./proyecto.js');
    ventana('Foto realista', h('div', {}, comparador(urlArchivo(captura), urlArchivo(id), ['3D', rotulo]), h('p', { style: { marginTop: '10px' } }, 'Guardada en las fotos del proyecto.')), { ancha: true });
  }

  // ---------- Deshacer ----------

  instantanea() {
    this.deshacer.push(JSON.stringify(this.plano));
    if (this.deshacer.length > 80) this.deshacer.shift();
    this.rehacer = [];
  }

  restaurar(texto) {
    const nuevo = JSON.parse(texto);
    for (const k of Object.keys(this.plano)) delete this.plano[k];
    Object.assign(this.plano, nuevo);
    this.seleccion = null;
    this.cambiado();
  }

  deshacerCambio() {
    if (!this.deshacer.length) return;
    this.rehacer.push(JSON.stringify(this.plano));
    this.restaurar(this.deshacer.pop());
  }

  rehacerCambio() {
    if (!this.rehacer.length) return;
    this.deshacer.push(JSON.stringify(this.plano));
    this.restaurar(this.rehacer.pop());
  }

  cambiado({ panel = true } = {}) {
    guardar();
    this.dibujar();
    if (panel) this.pintarPanel();
    this.pintarBarra();
    this.vista3d?.actualizar();
  }

  actualizarTodo() {
    this.pintarBarra();
    this.dibujar();
    this.pintarPanel();
  }

  // ---------- Vista: zoom y desplazamiento ----------

  encuadrar() {
    const p = [...this.plano.puntos, ...this.plano.muebles.flatMap((m) => esquinasMueble(m))];
    const r = this.lienzo.getBoundingClientRect();
    const proporcion = r.width && r.height ? r.width / r.height : 1.5;
    if (!p.length) {
      this.vista = { x: -100, y: -100, ancho: 800 * proporcion, alto: 800 };
    } else {
      const minX = Math.min(...p.map((q) => q.x));
      const maxX = Math.max(...p.map((q) => q.x));
      const minY = Math.min(...p.map((q) => q.y));
      const maxY = Math.max(...p.map((q) => q.y));
      const margen = Math.max(maxX - minX, maxY - minY) * 0.18 + 60;
      let ancho = maxX - minX + margen * 2;
      let alto = maxY - minY + margen * 2;
      if (ancho / alto > proporcion) alto = ancho / proporcion;
      else ancho = alto * proporcion;
      this.vista = { x: (minX + maxX) / 2 - ancho / 2, y: (minY + maxY) / 2 - alto / 2, ancho, alto };
    }
    this.ajustarVista(true);
  }

  ajustarVista(soloAplicar) {
    const r = this.lienzo.getBoundingClientRect();
    if (!soloAplicar && r.width && r.height && this.vista) {
      // Mantiene la escala al cambiar el tamaño de la ventana.
      const centroX = this.vista.x + this.vista.ancho / 2;
      const centroY = this.vista.y + this.vista.alto / 2;
      const escala = this.vista.ancho / (this.anchoPx || r.width);
      this.vista.ancho = r.width * escala;
      this.vista.alto = r.height * escala;
      this.vista.x = centroX - this.vista.ancho / 2;
      this.vista.y = centroY - this.vista.alto / 2;
    }
    this.anchoPx = r.width || this.anchoPx || 800;
    const v = this.vista;
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.ancho} ${v.alto}`);
    if (!soloAplicar) this.dibujar();
  }

  // Centímetros que ocupa un píxel de la pantalla.
  get k() {
    return this.vista.ancho / (this.anchoPx || 800);
  }

  aMundo(e) {
    return this.aMundoXY(e.clientX, e.clientY);
  }

  aMundoXY(x, y) {
    const m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  // Acerca (factor < 1) o aleja (factor > 1) manteniendo el centro de la vista.
  zoom(factor) {
    const v = this.vista;
    const cx = v.x + v.ancho / 2;
    const cy = v.y + v.alto / 2;
    const f = Math.min(20000, Math.max(80, v.ancho * factor)) / v.ancho;
    v.ancho *= f;
    v.alto *= f;
    v.x = cx - v.ancho / 2;
    v.y = cy - v.alto / 2;
    this.ajustarVista(true);
    this.dibujar();
  }

  // Pellizco con dos dedos: acercar, alejar y mover la vista a la vez.
  empezarPellizco() {
    // Si el primer dedo había empezado a mover algo, se deja como estaba.
    const a = this.arrastre;
    if (a?.antes && JSON.stringify(this.plano) !== a.antes) {
      const antes = JSON.parse(a.antes);
      for (const k of Object.keys(this.plano)) delete this.plano[k];
      Object.assign(this.plano, antes);
    }
    this.arrastre = null;
    const [p1, p2] = [...this.punteros.values()];
    this.pellizco = {
      distancia: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
      centro: this.aMundoXY((p1.x + p2.x) / 2, (p1.y + p2.y) / 2),
      ancho: this.vista.ancho,
      alto: this.vista.alto,
    };
    this.dibujar();
  }

  moverPellizco() {
    const [p1, p2] = [...this.punteros.values()];
    if (!p2) return;
    const pz = this.pellizco;
    const separacion = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const ancho = Math.min(20000, Math.max(80, (pz.ancho * pz.distancia) / separacion));
    const r = this.svg.getBoundingClientRect();
    const v = this.vista;
    v.ancho = ancho;
    v.alto = (pz.alto * ancho) / pz.ancho;
    // El punto del plano que estaba entre los dedos sigue entre los dedos.
    const k = v.ancho / (r.width || 1);
    v.x = pz.centro.x - ((p1.x + p2.x) / 2 - r.left) * k;
    v.y = pz.centro.y - ((p1.y + p2.y) / 2 - r.top) * k;
    this.ajustarVista(true);
    this.dibujar();
  }

  // Con el dedo, las esquinas y asas se dibujan más grandes para poder tocarlas.
  get asa() {
    return this.tactil ? 1.9 : 1;
  }

  alRueda(e) {
    if (this.modo !== '2d') return;
    e.preventDefault();
    const p = this.aMundo(e);
    const f = Math.exp(Math.sign(e.deltaY) * 0.12);
    const v = this.vista;
    const nuevoAncho = Math.min(20000, Math.max(80, v.ancho * f));
    const factor = nuevoAncho / v.ancho;
    v.x = p.x - (p.x - v.x) * factor;
    v.y = p.y - (p.y - v.y) * factor;
    v.ancho *= factor;
    v.alto *= factor;
    this.ajustarVista(true);
    this.dibujar();
  }

  // ---------- Ajustes de posición ----------

  ajustar(valor, e, paso = 5) {
    return e?.altKey ? Math.round(valor) : Math.round(valor / paso) * paso;
  }

  ajustarPunto(p, e) {
    return { x: this.ajustar(p.x, e), y: this.ajustar(p.y, e) };
  }

  // Mientras se dibuja una pared, se endereza a 0°, 45° o 90° si está cerca, y se pega a los puntos ya puestos.
  ajustarDibujo(p, e) {
    const previo = this.dibujo[this.dibujo.length - 1];
    let q = this.ajustarPunto(p, e);
    if (previo && !e.altKey) {
      const angulo = Math.atan2(p.y - previo.y, p.x - previo.x);
      const recto = Math.round(angulo / (Math.PI / 4)) * (Math.PI / 4);
      if (Math.abs(angulo - recto) < 0.12) {
        const largo = Math.round(distancia(previo, p));
        q = { x: Math.round(previo.x + Math.cos(recto) * largo), y: Math.round(previo.y + Math.sin(recto) * largo) };
      }
    }
    for (const otro of this.dibujo) {
      if (distancia(otro, q) < 14 * this.k) return { ...otro };
      if (Math.abs(otro.x - q.x) < 6 * this.k) q.x = otro.x;
      if (Math.abs(otro.y - q.y) < 6 * this.k) q.y = otro.y;
    }
    return q;
  }

  // ---------- Geometría de paredes y huecos ----------

  normalInterior(t) {
    const dx = (t.b.x - t.a.x) / (t.largo || 1);
    const dy = (t.b.y - t.a.y) / (t.largo || 1);
    let n = { x: -dy, y: dx };
    if (this.plano.cerrado && this.plano.puntos.length >= 3) {
      const medio = { x: (t.a.x + t.b.x) / 2 + n.x * 3, y: (t.a.y + t.b.y) / 2 + n.y * 3 };
      if (!puntoDentro(medio, this.plano.puntos)) n = { x: dy, y: -dx };
    }
    return n;
  }

  geometriaAbertura(ab) {
    const t = tramos(this.plano)[ab.pared];
    if (!t) return null;
    const dir = { x: (t.b.x - t.a.x) / t.largo, y: (t.b.y - t.a.y) / t.largo };
    const pos = Math.max(0, Math.min(t.largo - ab.ancho, ab.pos));
    return {
      t,
      dir,
      n: this.normalInterior(t),
      inicio: { x: t.a.x + dir.x * pos, y: t.a.y + dir.y * pos },
      fin: { x: t.a.x + dir.x * (pos + ab.ancho), y: t.a.y + dir.y * (pos + ab.ancho) },
    };
  }

  paredCercana(p, maximo = 40) {
    let mejor = null;
    for (const t of tramos(this.plano)) {
      if (!t.largo) continue;
      const u = Math.max(0, Math.min(1, ((p.x - t.a.x) * (t.b.x - t.a.x) + (p.y - t.a.y) * (t.b.y - t.a.y)) / (t.largo * t.largo)));
      const q = { x: t.a.x + (t.b.x - t.a.x) * u, y: t.a.y + (t.b.y - t.a.y) * u };
      const d = distancia(p, q);
      if (d <= maximo && (!mejor || d < mejor.d)) mejor = { t, d, u, q };
    }
    return mejor;
  }

  // ---------- Dibujo ----------

  definiciones() {
    const defs = svgEl('defs');
    const fino = svgEl('pattern', { id: 'rejilla-fina', width: 10, height: 10, patternUnits: 'userSpaceOnUse' });
    fino.append(svgEl('path', { d: 'M 10 0 L 0 0 0 10', fill: 'none', stroke: '#ece7e0', 'stroke-width': 0.6 }));
    const grueso = svgEl('pattern', { id: 'rejilla', width: 100, height: 100, patternUnits: 'userSpaceOnUse' });
    grueso.append(svgEl('rect', { width: 100, height: 100, fill: 'url(#rejilla-fina)' }), svgEl('path', { d: 'M 100 0 L 0 0 0 100', fill: 'none', stroke: '#d9d1c6', 'stroke-width': 1.2 }));
    defs.append(fino, grueso);
    return defs;
  }

  dibujar() {
    if (this.modo !== '2d' || !this.vista) return;
    const k = this.k;
    const g = this.capa;
    g.replaceChildren();
    const v = this.vista;
    g.append(svgEl('rect', { x: Math.floor(v.x / 100) * 100 - 100, y: Math.floor(v.y / 100) * 100 - 100, width: v.ancho + 300, height: v.alto + 300, fill: 'url(#rejilla)' }));

    const pl = this.plano;
    const pts = pl.puntos;
    const lista = tramos(pl);
    if (pl.cerrado && pts.length >= 3) g.append(svgEl('polygon', { points: pts.map((p) => `${p.x},${p.y}`).join(' '), fill: this.rellenoSuelo() }));

    // Paredes
    for (const t of lista) {
      const elegida = this.seleccion?.tipo === 'pared' && this.seleccion.i === t.indice;
      g.append(svgEl('line', { x1: t.a.x, y1: t.a.y, x2: t.b.x, y2: t.b.y, stroke: elegida ? '#9b6b45' : '#37302a', 'stroke-width': pl.grosor, 'stroke-linecap': 'square', 'data-t': 'pared', 'data-i': t.indice, style: 'cursor:move' }));
      // Franja invisible más ancha que la pared, para que sea fácil tocarla con el dedo.
      g.append(svgEl('line', { x1: t.a.x, y1: t.a.y, x2: t.b.x, y2: t.b.y, stroke: 'transparent', 'stroke-width': Math.max(pl.grosor, (this.tactil ? 26 : 10) * k), 'data-t': 'pared', 'data-i': t.indice, style: 'cursor:move' }));
    }

    // Puertas y ventanas
    for (const ab of pl.aberturas) {
      const geo = this.geometriaAbertura(ab);
      if (!geo) continue;
      const elegida = this.seleccion?.tipo === 'abertura' && this.seleccion.id === ab.id;
      const { inicio, fin, n, dir } = geo;
      const grupo = svgEl('g', { 'data-t': 'abertura', 'data-id': ab.id, style: 'cursor:move' });
      grupo.append(svgEl('line', { x1: inicio.x, y1: inicio.y, x2: fin.x, y2: fin.y, stroke: '#fff', 'stroke-width': pl.grosor + 1.5 }));
      const color = elegida ? '#9b6b45' : '#37302a';
      if (ab.tipo === 'ventana') {
        const o = pl.grosor / 2;
        for (const s of [-o, 0, o]) {
          grupo.append(svgEl('line', { x1: inicio.x + n.x * s, y1: inicio.y + n.y * s, x2: fin.x + n.x * s, y2: fin.y + n.y * s, stroke: s === 0 ? '#6fa8d6' : color, 'stroke-width': s === 0 ? 2.5 : 1.5 }));
        }
      } else {
        const sentido = ab.fuera ? -1 : 1;
        const bisagra = ab.abre === 'der' ? fin : inicio;
        const otro = ab.abre === 'der' ? inicio : fin;
        const hoja = { x: bisagra.x + n.x * ab.ancho * sentido, y: bisagra.y + n.y * ab.ancho * sentido };
        const barrido = ((ab.abre === 'der') !== (sentido < 0)) ? 1 : 0;
        const giro = dir.x * n.y - dir.y * n.x > 0 ? barrido : 1 - barrido;
        grupo.append(
          svgEl('line', { x1: bisagra.x, y1: bisagra.y, x2: hoja.x, y2: hoja.y, stroke: color, 'stroke-width': 2.5 }),
          svgEl('path', { d: `M ${hoja.x} ${hoja.y} A ${ab.ancho} ${ab.ancho} 0 0 ${giro} ${otro.x} ${otro.y}`, fill: 'none', stroke: color, 'stroke-width': 1, 'stroke-dasharray': `${4 * k} ${3 * k}` }),
        );
      }
      grupo.append(svgEl('line', { x1: inicio.x, y1: inicio.y, x2: fin.x, y2: fin.y, stroke: 'transparent', 'stroke-width': Math.max(pl.grosor + 10, 16 * k * this.asa) }));
      g.append(grupo);
    }

    // Medidas de cada pared, por fuera
    for (const t of lista) {
      if (t.largo < 1) continue;
      const n = this.normalInterior(t);
      const sep = pl.grosor / 2 + 16 * k;
      const mx = (t.a.x + t.b.x) / 2 - n.x * sep;
      const my = (t.a.y + t.b.y) / 2 - n.y * sep;
      let angulo = (Math.atan2(t.b.y - t.a.y, t.b.x - t.a.x) * 180) / Math.PI;
      if (angulo > 90 || angulo < -90) angulo += 180;
      const texto = svgEl('text', { x: mx, y: my, 'font-size': 12.5 * k, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#6e655c', transform: `rotate(${angulo} ${mx} ${my})`, 'data-t': 'pared', 'data-i': t.indice, style: 'cursor:pointer' });
      texto.textContent = `${formatoNumero(t.largo, 0)} cm`;
      g.append(texto);
    }

    // Muebles
    const problemas = problemasMuebles(pl);
    // Primero las alfombras, luego los muebles y encima lo que va sobre ellos o colgado.
    const capa = (m) => (m.tipo === 'alfombra' ? 0 : Number(m.elevacion) > 0 || ['lampara-techo', 'cuadro', 'espejo', 'cortina', 'cojin', 'jarron', 'lampara-mesa'].includes(m.tipo) ? 2 : 1);
    const ordenados = [...pl.muebles].sort((a, b) => capa(a) - capa(b));
    for (const m of ordenados) g.append(this.dibujarMueble(m, problemas.has(m.id), k));

    // Esquinas
    if (this.herramienta === 'seleccionar') {
      pts.forEach((p, i) => {
        const elegida = this.seleccion?.tipo === 'vertice' && this.seleccion.i === i;
        g.append(svgEl('circle', { cx: p.x, cy: p.y, r: (elegida ? 7 : 5.5) * k * this.asa, fill: elegida ? '#9b6b45' : '#fff', stroke: '#37302a', 'stroke-width': 1.5 * k, 'data-t': 'vertice', 'data-i': i, style: 'cursor:grab' }));
      });
    }

    // Paredes en dibujo
    if (this.dibujo) {
      const d = [...this.dibujo, ...(this.cursor && this.dibujo.length ? [this.cursor] : [])];
      if (d.length > 1) g.append(svgEl('polyline', { points: d.map((p) => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: '#9b6b45', 'stroke-width': pl.grosor, 'stroke-opacity': 0.75, 'stroke-linecap': 'square' }));
      if (this.cursor && this.dibujo.length) {
        const a = this.dibujo[this.dibujo.length - 1];
        this.etiqueta(g, (a.x + this.cursor.x) / 2, (a.y + this.cursor.y) / 2 - 18 * k, `${formatoNumero(distancia(a, this.cursor), 0)} cm`, k);
      }
      for (const p of this.dibujo) g.append(svgEl('circle', { cx: p.x, cy: p.y, r: 5 * k, fill: '#9b6b45' }));
      if (this.cursor) g.append(svgEl('circle', { cx: this.cursor.x, cy: this.cursor.y, r: 4 * k, fill: 'none', stroke: '#9b6b45', 'stroke-width': 1.5 * k }));
    }

    // Medición
    if (this.medida) {
      const fin = this.medida.fin || this.cursor;
      if (fin) {
        const a = this.medida.inicio;
        g.append(svgEl('line', { x1: a.x, y1: a.y, x2: fin.x, y2: fin.y, stroke: '#c0392b', 'stroke-width': 1.5 * k, 'stroke-dasharray': `${6 * k} ${4 * k}` }));
        for (const p of [a, fin]) g.append(svgEl('circle', { cx: p.x, cy: p.y, r: 3.5 * k, fill: '#c0392b' }));
        this.etiqueta(g, (a.x + fin.x) / 2, (a.y + fin.y) / 2 - 16 * k, `${formatoNumero(distancia(a, fin), 0)} cm`, k, '#c0392b');
      }
    }

    // Datos de la sala
    const md = medidasHabitacion(pl);
    vaciar(this.datosSala, h('b', {}, this.hab.nombre), h('br'), `Suelo ${formatoM2(md.sueloM2)} · Paredes ${formatoM2(md.paredesNetoM2)}`, h('br'), `Perímetro ${formatoNumero(md.perimetroM)} m · Altura ${formatoNumero(md.alturaM)} m`);
    this.ayuda.textContent = this.textoAyuda();
    this.ayuda.style.display = this.ayuda.textContent ? '' : 'none';
  }

  // El suelo del plano se pinta con la misma textura que en 3D (un poco aclarada para que destaquen los muebles).
  rellenoSuelo() {
    const tex = infoTextura(this.plano.acabados?.suelo);
    if (!tex?.color) return '#f6f0e6';
    const lado = (tex.escala || 1) * 100;
    let patron = this.svg.querySelector('#suelo-textura');
    if (!patron || patron.dataset.url !== tex.color || patron.dataset.tono !== (this.plano.acabados.colorSuelo || '')) {
      patron?.remove();
      patron = svgEl('pattern', { id: 'suelo-textura', patternUnits: 'userSpaceOnUse', width: lado, height: lado });
      patron.dataset.url = tex.color;
      patron.dataset.tono = this.plano.acabados.colorSuelo || '';
      patron.append(svgEl('image', { href: tex.color, width: lado, height: lado, preserveAspectRatio: 'none' }));
      if (this.plano.acabados.colorSuelo) patron.append(svgEl('rect', { width: lado, height: lado, fill: this.plano.acabados.colorSuelo, 'fill-opacity': 0.35, style: 'mix-blend-mode:multiply' }));
      patron.append(svgEl('rect', { width: lado, height: lado, fill: '#ffffff', 'fill-opacity': 0.28 }));
      this.svg.querySelector('defs').append(patron);
    }
    return 'url(#suelo-textura)';
  }

  etiqueta(g, x, y, texto, k, color = '#2f2924') {
    const ancho = texto.length * 7.2 * k + 12 * k;
    g.append(svgEl('rect', { x: x - ancho / 2, y: y - 10 * k, width: ancho, height: 20 * k, rx: 4 * k, fill: color }));
    const t = svgEl('text', { x, y: y + 0.5 * k, 'font-size': 12 * k, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    t.textContent = texto;
    g.append(t);
  }

  textoAyuda() {
    if (this.herramienta === 'paredes') {
      return this.dibujo?.length
        ? 'Haz clic para cada esquina. Clic en el primer punto para cerrar la habitación · doble clic o Intro para terminar sin cerrar · Alt para no ajustar · Esc para cancelar'
        : 'Haz clic donde empieza la primera pared';
    }
    if (this.herramienta === 'puerta' || this.herramienta === 'ventana') return `Haz clic sobre una pared para poner la ${this.herramienta}`;
    if (this.herramienta === 'medir') return 'Haz clic en dos puntos para medir la distancia';
    if (!this.plano.puntos.length) return 'Usa «Paredes» para dibujar la habitación, o «Rectángulo» en el panel de la derecha';
    return '';
  }

  dibujarMueble(m, conProblema, k) {
    const elegido = this.seleccion?.tipo === 'mueble' && this.seleccion.id === m.id;
    const w = m.ancho;
    const d = m.fondo;
    // Lo que cuelga del techo se ve medio transparente, para que no tape lo que hay debajo.
    const g = svgEl('g', { transform: `translate(${m.x} ${m.y}) rotate(${m.rot || 0})`, 'data-t': 'mueble', 'data-id': m.id, style: 'cursor:move', opacity: m.tipo === 'lampara-techo' && !elegido ? 0.55 : null });
    const relleno = m.color || '#cfc6bb';
    const trazo = conProblema ? '#c0392b' : elegido ? '#9b6b45' : '#5d544c';
    const ancho = (conProblema || elegido ? 2.4 : 1.2) * k;
    const rect = (x, y, rw, rd, extra = {}) => svgEl('rect', { x, y, width: rw, height: rd, fill: relleno, stroke: trazo, 'stroke-width': ancho, ...extra });
    const linea = (x1, y1, x2, y2, extra = {}) => svgEl('line', { x1, y1, x2, y2, stroke: trazo, 'stroke-width': 0.8 * k, ...extra });
    const x0 = -w / 2;
    const y0 = -d / 2;
    // Con modelo 3D, el mueble se dibuja tal como se ve desde arriba.
    const vista = vistaCenitalSiEsta(m, () => this.repintarPronto());
    if (vista) {
      g.append(
        svgEl('rect', { x: x0, y: y0, width: w, height: d, fill: 'transparent' }),
        svgEl('image', { href: vista, x: x0, y: y0, width: w, height: d, preserveAspectRatio: 'none', style: 'filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))' }),
      );
      if (conProblema || elegido) g.append(rect(x0, y0, w, d, { fill: 'none', 'stroke-dasharray': elegido ? '' : `${4 * k} ${3 * k}` }));
    } else switch (m.tipo) {
      case 'sofa':
      case 'sillon': {
        const brazo = Math.min(22, w * 0.12);
        g.append(rect(x0, y0, w, d, { rx: 6 }), rect(x0, y0, w, d * 0.24, { rx: 4 }), rect(x0, y0, brazo, d, { rx: 4 }), rect(-x0 - brazo, y0, brazo, d, { rx: 4 }));
        const plazas = m.tipo === 'sillon' ? 1 : Math.max(1, Math.round((w - 2 * brazo) / 65));
        for (let i = 1; i < plazas; i++) {
          const x = x0 + brazo + ((w - 2 * brazo) * i) / plazas;
          g.append(linea(x, y0 + d * 0.24, x, -y0 - 4));
        }
        break;
      }
      case 'sofa-l': {
        const fondoSofa = Math.min(95, d * 0.6);
        const chaise = Math.min(95, w * 0.4);
        g.append(svgEl('path', { d: `M ${x0} ${y0} H ${-x0} V ${-y0} H ${-x0 - chaise} V ${y0 + fondoSofa} H ${x0} Z`, fill: relleno, stroke: trazo, 'stroke-width': ancho }));
        g.append(rect(x0, y0, w, fondoSofa * 0.26, { rx: 4 }), linea(-x0 - chaise, y0 + fondoSofa * 0.26, -x0 - chaise, y0 + fondoSofa));
        break;
      }
      case 'cama': {
        g.append(rect(x0, y0, w, d, { rx: 3 }), rect(x0, y0, w, 8, { fill: '#8a7360' }));
        const almohadas = w > 120 ? 2 : 1;
        const aw = (w - 20 - (almohadas - 1) * 8) / almohadas;
        for (let i = 0; i < almohadas; i++) g.append(rect(x0 + 10 + i * (aw + 8), y0 + 14, aw, 28, { rx: 6, fill: '#fff' }));
        g.append(linea(x0, y0 + d * 0.36, -x0, y0 + d * 0.36, { 'stroke-width': 1.2 * k }));
        break;
      }
      case 'mesa-redonda':
      case 'planta':
      case 'lampara':
        g.append(svgEl('ellipse', { cx: 0, cy: 0, rx: w / 2, ry: d / 2, fill: relleno, stroke: trazo, 'stroke-width': ancho }));
        if (m.tipo === 'lampara') g.append(linea(-w / 4, 0, w / 4, 0), linea(0, -d / 4, 0, d / 4));
        if (m.tipo === 'planta') g.append(svgEl('ellipse', { cx: 0, cy: 0, rx: w / 4, ry: d / 4, fill: 'none', stroke: '#3e5a32', 'stroke-width': 0.8 * k }));
        break;
      case 'silla':
        g.append(rect(x0, y0, w, d, { rx: 4 }), rect(x0, y0, w, d * 0.18, { rx: 2 }));
        break;
      case 'alfombra':
        g.append(rect(x0, y0, w, d, { 'fill-opacity': 0.55, 'stroke-dasharray': `${5 * k} ${3 * k}` }));
        break;
      case 'armario':
        g.append(rect(x0, y0, w, d), linea(x0, -y0 - 4, -x0, -y0 - 4, { 'stroke-dasharray': `${5 * k} ${3 * k}` }));
        for (let i = 1; i < Math.round(w / 50); i++) g.append(linea(x0 + (w * i) / Math.round(w / 50), y0, x0 + (w * i) / Math.round(w / 50), -y0));
        break;
      case 'banera':
        g.append(rect(x0, y0, w, d, { rx: 8 }), svgEl('rect', { x: x0 + 8, y: y0 + 8, width: w - 16, height: d - 16, rx: Math.min(w, d) / 3, fill: '#eef4f8', stroke: trazo, 'stroke-width': 0.8 * k }));
        break;
      case 'ducha':
        g.append(rect(x0, y0, w, d, { fill: '#eef4f8' }), linea(x0, y0, -x0, -y0), linea(-x0, y0, x0, -y0));
        break;
      case 'lavabo':
        g.append(rect(x0, y0, w, d), svgEl('ellipse', { cx: 0, cy: 2, rx: w * 0.3, ry: d * 0.3, fill: '#eef4f8', stroke: trazo, 'stroke-width': 0.8 * k }));
        break;
      case 'inodoro':
        g.append(rect(x0, y0, w, d * 0.3, { rx: 3 }), svgEl('ellipse', { cx: 0, cy: y0 + d * 0.62, rx: w / 2, ry: d * 0.38, fill: relleno, stroke: trazo, 'stroke-width': ancho }));
        break;
      default:
        g.append(rect(x0, y0, w, d, { rx: 2 }));
        if (['encimera', 'mueble-tv', 'aparador', 'comoda', 'estanteria', 'nevera', 'isla'].includes(m.tipo)) g.append(linea(x0, -y0 - 5, -x0, -y0 - 5));
    }
    // Nombre del mueble, legible aunque esté girado (con vista real, solo al elegirlo)
    const tam = Math.min(12 * k, d / 3.2, w / Math.max(4, m.nombre.length * 0.62));
    if (tam > 3.5 * k && (!vista || elegido)) {
      const rot = (((m.rot || 0) % 360) + 360) % 360;
      const t = svgEl('text', { x: 0, y: 0, 'font-size': tam, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#2f2924', transform: rot > 90 && rot < 270 ? 'rotate(180)' : null, 'pointer-events': 'none' });
      t.textContent = m.nombre;
      g.append(t);
    }
    if (elegido) {
      g.append(
        svgEl('line', { x1: 0, y1: y0, x2: 0, y2: y0 - 22 * k * this.asa, stroke: '#9b6b45', 'stroke-width': 1.2 * k }),
        svgEl('circle', { cx: 0, cy: y0 - 26 * k * this.asa, r: 6 * k * this.asa, fill: '#fff', stroke: '#9b6b45', 'stroke-width': 2 * k, 'data-t': 'girar', 'data-id': m.id, style: 'cursor:grab' }),
      );
    }
    return g;
  }

  // ---------- Ratón ----------

  objetivo(e) {
    const el = e.target.closest?.('[data-t]');
    return el ? { tipo: el.dataset.t, id: el.dataset.id, i: el.dataset.i !== undefined ? Number(el.dataset.i) : undefined } : null;
  }

  alPulsar(e) {
    if (e.button === 2) return;
    const eraTactil = this.tactil;
    this.tactil = e.pointerType === 'touch';
    // El primer dedo de un gesto empieza de cero (por si el navegador perdió el «soltar» de otro).
    if (e.isPrimary) {
      this.punteros.clear();
      this.pellizco = null;
    }
    this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.svg.setPointerCapture(e.pointerId);
    } catch {
      // Ese puntero ya no está activo.
    }
    // Con dos dedos se acerca, se aleja y se mueve la vista.
    if (this.punteros.size === 2) return this.empezarPellizco();
    if (this.punteros.size > 2) return;
    if (eraTactil !== this.tactil) this.dibujar();
    this.inicioPuntero = { x: e.clientX, y: e.clientY };
    const p = this.aMundo(e);

    if (e.button === 1 || e.shiftKey && this.herramienta === 'seleccionar' && !this.objetivo(e)) {
      this.arrastre = { tipo: 'mover-vista', inicio: { x: e.clientX, y: e.clientY }, vista: { ...this.vista } };
      return;
    }

    if (this.herramienta === 'paredes') {
      const q = this.ajustarDibujo(p, e);
      if (this.dibujo.length >= 3 && distancia(q, this.dibujo[0]) < 15 * this.k) return this.terminarParedes(true);
      if (!this.dibujo.length || distancia(q, this.dibujo[this.dibujo.length - 1]) > 1) this.dibujo.push(q);
      this.dibujar();
      return;
    }
    if (this.herramienta === 'medir') {
      const q = this.ajustarPunto(p, e);
      if (!this.medida || this.medida.fin) this.medida = { inicio: q };
      else this.medida.fin = q;
      this.dibujar();
      return;
    }
    if (this.herramienta === 'puerta' || this.herramienta === 'ventana') {
      const cerca = this.paredCercana(p, 50 * this.k + 20);
      if (!cerca) return aviso('Haz clic sobre una pared', 'error');
      const ancho = this.herramienta === 'puerta' ? 82 : 120;
      if (cerca.t.largo < ancho + 4) return aviso('Esa pared es demasiado corta', 'error');
      this.instantanea();
      const ab = {
        id: uid(),
        tipo: this.herramienta,
        pared: cerca.t.indice,
        pos: Math.round(Math.max(0, Math.min(cerca.t.largo - ancho, cerca.u * cerca.t.largo - ancho / 2))),
        ancho,
        alto: this.herramienta === 'puerta' ? 210 : 120,
        alfeizar: this.herramienta === 'puerta' ? 0 : 90,
        abre: 'izq',
        fuera: false,
      };
      this.plano.aberturas.push(ab);
      this.herramienta = 'seleccionar';
      this.seleccion = { tipo: 'abertura', id: ab.id };
      this.cambiado();
      return;
    }

    // Seleccionar y mover
    const o = this.objetivo(e);
    if (!o) {
      this.seleccion = null;
      this.arrastre = { tipo: 'mover-vista', inicio: { x: e.clientX, y: e.clientY }, vista: { ...this.vista } };
      this.dibujar();
      this.pintarPanel();
      return;
    }
    const antes = JSON.stringify(this.plano);
    if (o.tipo === 'mueble') {
      const m = this.plano.muebles.find((x) => x.id === o.id);
      this.seleccion = { tipo: 'mueble', id: m.id };
      this.arrastre = { tipo: 'mueble', m, desfase: { x: p.x - m.x, y: p.y - m.y }, antes };
    } else if (o.tipo === 'girar') {
      const m = this.plano.muebles.find((x) => x.id === o.id);
      this.arrastre = { tipo: 'girar', m, antes };
    } else if (o.tipo === 'vertice') {
      this.seleccion = { tipo: 'vertice', i: o.i };
      this.arrastre = { tipo: 'vertice', i: o.i, antes };
    } else if (o.tipo === 'pared') {
      const t = tramos(this.plano)[o.i];
      this.seleccion = { tipo: 'pared', i: o.i };
      this.arrastre = { tipo: 'pared', t, n: this.normalInterior(t), inicio: p, a: { ...t.a }, b: { ...t.b }, ia: o.i, ib: (o.i + 1) % this.plano.puntos.length, antes };
    } else if (o.tipo === 'abertura') {
      const ab = this.plano.aberturas.find((x) => x.id === o.id);
      this.seleccion = { tipo: 'abertura', id: ab.id };
      this.arrastre = { tipo: 'abertura', ab, antes, inicio: p, pos: ab.pos };
    }
    this.dibujar();
    this.pintarPanel();
  }

  alMover(e) {
    if (this.punteros.has(e.pointerId)) this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pellizco) return this.moverPellizco();
    const p = this.aMundo(e);
    if (this.herramienta === 'paredes') {
      this.cursor = this.ajustarDibujo(p, e);
      this.dibujar();
      return;
    }
    if (this.herramienta === 'medir') {
      this.cursor = this.ajustarPunto(p, e);
      if (this.medida && !this.medida.fin) this.dibujar();
      return;
    }
    const a = this.arrastre;
    if (!a) return;
    // Un temblor del dedo no cuenta como arrastrar (si no, un toque movería la pared o el mueble).
    const inicio = this.inicioPuntero;
    if (!a.movido && inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < (this.tactil ? 8 : 2)) return;
    a.movido = true;
    if (a.tipo === 'mover-vista') {
      this.vista.x = a.vista.x - (e.clientX - a.inicio.x) * this.k;
      this.vista.y = a.vista.y - (e.clientY - a.inicio.y) * this.k;
      this.ajustarVista(true);
      this.dibujar();
      return;
    }
    if (a.tipo === 'mueble') {
      a.m.x = this.ajustar(p.x - a.desfase.x, e, 1);
      a.m.y = this.ajustar(p.y - a.desfase.y, e, 1);
    } else if (a.tipo === 'girar') {
      let angulo = (Math.atan2(p.y - a.m.y, p.x - a.m.x) * 180) / Math.PI + 90;
      angulo = e.altKey ? Math.round(angulo) : Math.round(angulo / 15) * 15;
      a.m.rot = ((angulo % 360) + 360) % 360;
    } else if (a.tipo === 'vertice') {
      let q = this.ajustarPunto(p, e);
      // Se alinea con las esquinas vecinas si está cerca (para que las paredes queden rectas).
      const pts = this.plano.puntos;
      for (const j of [a.i - 1, a.i + 1]) {
        const vecino = pts[(j + pts.length) % pts.length];
        if (!vecino || (!this.plano.cerrado && (j < 0 || j >= pts.length))) continue;
        if (Math.abs(vecino.x - q.x) < 8 * this.k) q.x = vecino.x;
        if (Math.abs(vecino.y - q.y) < 8 * this.k) q.y = vecino.y;
      }
      pts[a.i] = q;
    } else if (a.tipo === 'pared') {
      const avance = (p.x - a.inicio.x) * a.n.x + (p.y - a.inicio.y) * a.n.y;
      const paso = e.altKey ? avance : Math.round(avance);
      const pts = this.plano.puntos;
      pts[a.ia] = { x: Math.round(a.a.x + a.n.x * paso), y: Math.round(a.a.y + a.n.y * paso) };
      pts[a.ib] = { x: Math.round(a.b.x + a.n.x * paso), y: Math.round(a.b.y + a.n.y * paso) };
    } else if (a.tipo === 'abertura') {
      const geo = this.geometriaAbertura(a.ab);
      if (geo) {
        const avance = (p.x - a.inicio.x) * geo.dir.x + (p.y - a.inicio.y) * geo.dir.y;
        a.ab.pos = Math.round(Math.max(0, Math.min(geo.t.largo - a.ab.ancho, a.pos + avance)));
      }
    }
    this.dibujar();
  }

  alSoltar(e) {
    this.punteros.delete(e.pointerId);
    if (this.pellizco) {
      // Al levantar los dedos no se sigue moviendo nada con el que quede.
      if (this.punteros.size < 2) this.pellizco = null;
      this.arrastre = null;
      return;
    }
    const a = this.arrastre;
    this.arrastre = null;
    try {
      this.svg.releasePointerCapture(e.pointerId);
    } catch {
      // Ya estaba liberado.
    }
    // En las pantallas táctiles no hay doble clic: dos toques seguidos en una pared la dividen.
    if (e.pointerType === 'touch' && a?.tipo === 'pared' && !a.movido) {
      const ahora = Date.now();
      if (this.ultimoToque && ahora - this.ultimoToque.t < 400 && this.ultimoToque.i === a.ia) {
        this.ultimoToque = null;
        this.dividirPared(a.ia, this.aMundo(e));
        return;
      }
      this.ultimoToque = { t: ahora, i: a.ia };
    }
    if (!a || a.tipo === 'mover-vista' || !a.movido) return;
    if (JSON.stringify(this.plano) !== a.antes) {
      this.deshacer.push(a.antes);
      this.rehacer = [];
      this.cambiado();
    }
  }

  alDobleClic(e) {
    // Con el dedo, el doble toque ya se trata al soltar (así no se divide la pared dos veces).
    if (this.tactil) return;
    if (this.herramienta === 'paredes' && this.dibujo?.length >= 2) {
      this.terminarParedes(false);
      return;
    }
    const o = this.objetivo(e);
    if (this.herramienta === 'seleccionar' && o?.tipo === 'pared') this.dividirPared(o.i, this.aMundo(e));
  }

  terminarParedes(cerrar) {
    const puntos = this.dibujo;
    if (puntos.length < 2) return;
    this.instantanea();
    this.plano.puntos = puntos;
    this.plano.cerrado = cerrar && puntos.length >= 3;
    this.plano.aberturas = [];
    this.dibujo = null;
    this.cursor = null;
    this.herramienta = 'seleccionar';
    this.cambiado();
    this.encuadrar();
    this.dibujar();
  }

  dividirPared(i, p) {
    const t = tramos(this.plano)[i];
    if (!t) return;
    this.instantanea();
    const cerca = this.paredCercana(p, Infinity);
    const u = cerca && cerca.t.indice === i ? cerca.u : 0.5;
    const q = { x: Math.round(t.a.x + (t.b.x - t.a.x) * u), y: Math.round(t.a.y + (t.b.y - t.a.y) * u) };
    const corte = t.largo * u;
    this.plano.puntos.splice(i + 1, 0, q);
    for (const ab of this.plano.aberturas) {
      if (ab.pared > i) ab.pared += 1;
      else if (ab.pared === i && ab.pos >= corte) {
        ab.pared = i + 1;
        ab.pos -= corte;
      }
    }
    this.seleccion = { tipo: 'vertice', i: i + 1 };
    this.cambiado();
    aviso('Pared dividida: arrastra la nueva esquina');
  }

  borrarVertice(i) {
    const pts = this.plano.puntos;
    if (pts.length <= 3) return aviso('Una habitación necesita al menos 3 esquinas', 'error');
    this.instantanea();
    const n = pts.length;
    const antes = (i - 1 + n) % n;
    this.plano.aberturas = this.plano.aberturas
      .filter((ab) => ab.pared !== i && ab.pared !== antes)
      .map((ab) => ({ ...ab, pared: ab.pared > i ? ab.pared - 1 : ab.pared }));
    pts.splice(i, 1);
    this.seleccion = null;
    this.cambiado();
  }

  // ---------- Teclado ----------

  alPulsarTecla(e) {
    if (e.target.closest?.('input, textarea, select')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      return e.shiftKey ? this.rehacerCambio() : this.deshacerCambio();
    }
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      return this.rehacerCambio();
    }
    if (this.modo !== '2d') return;
    if (e.key === 'Escape') {
      this.dibujo = this.herramienta === 'paredes' ? null : this.dibujo;
      this.herramienta = 'seleccionar';
      this.medida = null;
      this.seleccion = null;
      return this.actualizarTodo();
    }
    if (e.key === 'Enter' && this.herramienta === 'paredes' && this.dibujo?.length >= 2) return this.terminarParedes(false);
    const s = this.seleccion;
    if (!s) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return this.borrarSeleccion();
    }
    if (s.tipo === 'mueble') {
      const m = this.plano.muebles.find((x) => x.id === s.id);
      if (!m) return;
      const paso = e.shiftKey ? 10 : 1;
      const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
      if (mov) {
        e.preventDefault();
        this.instantanea();
        m.x += mov[0];
        m.y += mov[1];
        return this.cambiado();
      }
      if (e.key.toLowerCase() === 'r') {
        this.instantanea();
        m.rot = (((m.rot || 0) + (e.shiftKey ? -90 : 90)) % 360 + 360) % 360;
        return this.cambiado();
      }
      if (ctrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        return this.duplicar(m);
      }
    }
  }

  borrarSeleccion() {
    const s = this.seleccion;
    if (!s) return;
    if (s.tipo === 'vertice') return this.borrarVertice(s.i);
    this.instantanea();
    if (s.tipo === 'mueble') this.plano.muebles = this.plano.muebles.filter((x) => x.id !== s.id);
    if (s.tipo === 'abertura') this.plano.aberturas = this.plano.aberturas.filter((x) => x.id !== s.id);
    if (s.tipo === 'pared') {
      aviso('Las paredes no se borran sueltas: borra una esquina o dibuja las paredes de nuevo', 'error');
      this.deshacer.pop();
      return;
    }
    this.seleccion = null;
    this.cambiado();
  }

  duplicar(m) {
    this.instantanea();
    const copia = { ...structuredClone(m), id: uid(), x: m.x + 20, y: m.y + 20 };
    this.plano.muebles.push(copia);
    this.seleccion = { tipo: 'mueble', id: copia.id };
    this.cambiado();
  }

  centro() {
    const p = this.plano.puntos;
    if (!p.length) return { x: 200, y: 150 };
    return { x: Math.round((Math.min(...p.map((q) => q.x)) + Math.max(...p.map((q) => q.x))) / 2), y: Math.round((Math.min(...p.map((q) => q.y)) + Math.max(...p.map((q) => q.y))) / 2) };
  }

  // Clave del modelo genérico de una pieza de la biblioteca.
  claveGenerica(base) {
    if (base.nombre === 'Sofá 2 plazas') return 'sofa-2';
    if (base.nombre === 'Cama 90') return 'cama-90';
    return base.tipo;
  }

  anadirMueble(base) {
    this.instantanea();
    const c = this.centro();
    // Las piezas genéricas con modelo 3D usan las medidas reales del modelo.
    const real = !base.productoId ? this.genericos?.[this.claveGenerica(base)] : null;
    const medidas = real ? { ancho: real.ancho, fondo: real.fondo, alto: real.alto } : { ancho: base.ancho, fondo: base.fondo, alto: base.alto };
    const m = { id: uid(), nombre: base.nombre, tipo: base.tipo, ...medidas, color: base.color, x: c.x, y: c.y, rot: 0, productoId: base.productoId || '', elevacion: base.elevacion || 0, tinte: base.tinte || '' };
    if (m.tipo === 'lampara-techo' || m.tipo === 'cortina') m.alto = m.tipo === 'cortina' ? Math.min(m.alto, (this.plano.altura || 250) - 5) : m.alto;
    this.plano.muebles.push(m);
    this.herramienta = 'seleccionar';
    this.seleccion = { tipo: 'mueble', id: m.id };
    this.cambiado();
  }

  // Gira el mueble para que su parte de atrás mire a la pared más cercana y lo pega a ella.
  pegarAPared(m) {
    const cerca = this.paredCercana(m, Infinity);
    if (!cerca) return;
    this.instantanea();
    const n = this.normalInterior(cerca.t);
    m.rot = Math.round((((Math.atan2(-n.x, n.y) * 180) / Math.PI) % 360 + 360) % 360);
    const separacion = this.plano.grosor / 2 + m.fondo / 2;
    m.x = Math.round(cerca.q.x + n.x * separacion);
    m.y = Math.round(cerca.q.y + n.y * separacion);
    this.cambiado();
  }

  // Cambia el largo de una pared moviendo la pared siguiente en paralelo (así un rectángulo sigue siéndolo).
  cambiarLargo(i, largo) {
    const pts = this.plano.puntos;
    const t = tramos(this.plano)[i];
    if (!t || !(largo > 0)) return;
    this.instantanea();
    const dir = { x: (t.b.x - t.a.x) / t.largo, y: (t.b.y - t.a.y) / t.largo };
    const dx = Math.round(t.a.x + dir.x * largo) - t.b.x;
    const dy = Math.round(t.a.y + dir.y * largo) - t.b.y;
    const ib = (i + 1) % pts.length;
    pts[ib] = { x: pts[ib].x + dx, y: pts[ib].y + dy };
    const ic = (i + 2) % pts.length;
    const moverSiguiente = this.plano.cerrado ? pts.length >= 4 : ic < pts.length && ic > ib;
    if (moverSiguiente && ic !== i) pts[ic] = { x: pts[ic].x + dx, y: pts[ic].y + dy };
    this.cambiado();
  }

  rectangulo() {
    const ancho = h('input', { type: 'number', value: 400, min: 50 });
    const largo = h('input', { type: 'number', value: 300, min: 50 });
    {
      const cerrar = ventana(
        'Habitación rectangular',
        h(
          'form',
          {
            onsubmit: (e) => {
              e.preventDefault();
              const a = Number(ancho.value);
              const l = Number(largo.value);
              if (!(a > 0 && l > 0)) return;
              this.instantanea();
              this.plano.puntos = [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: l }, { x: 0, y: l }];
              this.plano.cerrado = true;
              this.plano.aberturas = [];
              cerrar();
              this.cambiado();
              this.encuadrar();
              this.dibujar();
            },
          },
          h('p', {}, 'Cambia las paredes por un rectángulo con estas medidas. Se quitan las puertas y ventanas; los muebles se quedan.'),
          h('div', { class: 'rejilla-2' }, campo('Ancho (cm)', ancho), campo('Largo (cm)', largo)),
          h('div', { class: 'botones' }, h('button', { class: 'boton principal', type: 'submit' }, 'Aplicar')),
        ),
      );
    }
  }

  // ---------- Panel lateral ----------

  pintarPanel() {
    if (this.modo === '3d') return vaciar(this.panel, this.panel3d());
    const s = this.seleccion;
    if (s?.tipo === 'mueble') {
      const m = this.plano.muebles.find((x) => x.id === s.id);
      if (m) return vaciar(this.panel, this.panelMueble(m));
    }
    if (s?.tipo === 'abertura') {
      const ab = this.plano.aberturas.find((x) => x.id === s.id);
      if (ab) return vaciar(this.panel, this.panelAbertura(ab));
    }
    if (s?.tipo === 'pared' && tramos(this.plano)[s.i]) return vaciar(this.panel, this.panelPared(s.i));
    if (s?.tipo === 'vertice' && this.plano.puntos[s.i]) return vaciar(this.panel, this.panelVertice(s.i));
    vaciar(this.panel, this.panelHabitacion());
  }

  numero(objeto, clave, etiqueta, { min, max, paso = 1, alCambiar } = {}) {
    const el = h('input', { type: 'number', value: objeto[clave] ?? '', min, max, step: paso });
    el.addEventListener('change', () => {
      const v = Number(el.value);
      if (!Number.isFinite(v) || el.value === '') return;
      this.instantanea();
      objeto[clave] = v;
      alCambiar?.(v);
      this.cambiado({ panel: false });
    });
    return campo(etiqueta, el);
  }

  panelHabitacion() {
    const pl = this.plano;
    const md = medidasHabitacion(pl);
    const filtro = { texto: '' };
    const lista = h('div');
    const pintarLista = () => {
      const t = filtro.texto.toLowerCase();
      const productos = datos.catalogo.filter((p) => !t || `${p.nombre} ${p.categoria}`.toLowerCase().includes(t));
      const genericos = MUEBLES_GENERICOS.filter((m) => !t || `${m.nombre} ${m.grupo}`.toLowerCase().includes(t));
      const grupos = [...new Set(genericos.map((m) => m.grupo))];
      vaciar(
        lista,
        productos.length
          ? [
              h('h3', {}, 'De tu catálogo'),
              h(
                'div',
                { class: 'biblioteca' },
                productos.slice(0, 60).map((p) =>
                  h(
                    'button',
                    {
                      class: 'con-foto',
                      title: p.nombre,
                      onclick: () =>
                        this.anadirMueble({
                          nombre: p.nombre,
                          tipo: p.tipo || tipoPorCategoria(p.categoria),
                          ancho: Number(p.ancho) || 60,
                          fondo: Number(p.fondo) || 60,
                          alto: Number(p.alto) || 75,
                          color: p.color || '#cfc6bb',
                          // Sin modelo propio se usa el genérico de su tipo, teñido del color del producto.
                          tinte: p.modelo ? '' : p.color || '',
                          productoId: p.id,
                          elevacion: ['lampara-mesa', 'jarron'].includes(p.tipo) ? 75 : 0,
                        }),
                    },
                    p.foto ? h('img', { src: urlArchivo(p.foto), alt: '', loading: 'lazy' }) : null,
                    h('span', {}, p.nombre, h('small', {}, `${p.proveedor ? `${p.proveedor} · ` : ''}${p.ancho || '?'}×${p.fondo || '?'} cm${p.modelo ? ' · 3D real' : ''}`)),
                  ),
                ),
              ),
            ]
          : null,
        grupos.map((gr) => [
          h('h3', { style: { marginTop: '10px' } }, gr),
          h(
            'div',
            { class: 'biblioteca' },
            genericos
              .filter((m) => m.grupo === gr)
              .map((m) => {
                const real = this.genericos?.[this.claveGenerica(m)];
                return h('button', { onclick: () => this.anadirMueble(m), title: real ? `Modelo 3D: ${real.nombre}` : '' }, m.nombre, h('small', {}, `${real?.ancho ?? m.ancho}×${real?.fondo ?? m.fondo} cm${real ? ' · 3D' : ''}`));
              }),
          ),
        ]),
      );
    };
    pintarLista();
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, 'Espacio'),
        campo('Nombre', entrada(this.hab, 'nombre', { alCambiar: () => { guardar(); this.pintarBarra(); this.dibujar(); } })),
        h('div', { class: 'rejilla-2' }, this.numero(pl, 'altura', 'Altura (cm)', { min: 150, max: 600 }), this.numero(pl, 'grosor', 'Grosor pared', { min: 4, max: 60 })),
        h('p', { style: { fontSize: '13px', color: 'var(--texto-suave)' } }, `Suelo ${formatoM2(md.sueloM2)} · paredes sin huecos ${formatoM2(md.paredesNetoM2)} · rodapié ${formatoNumero(md.rodapieM)} m`),
        h('div', { class: 'fila' }, h('button', { class: 'boton pequeno', onclick: () => this.rectangulo() }, '▭ Rectángulo…'), h('button', { class: 'boton pequeno', onclick: () => this.elegirHerramienta('paredes') }, '✎ Dibujar paredes')),
      ),
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, 'Añadir mueble'),
        h('input', { type: 'search', placeholder: 'Buscar…', style: { marginBottom: '8px' }, oninput: (e) => { filtro.texto = e.target.value; pintarLista(); } }),
        lista,
      ),
      h(
        'div',
        { class: 'ayuda-teclas' },
        h('b', {}, 'Trucos'),
        h('br'),
        'Arrastra el fondo para moverte y usa la rueda para acercar. Doble clic en una pared la divide en dos (para hacer formas en L). Arrastra una pared para moverla entera. ',
        'Con un mueble elegido: R gira 90°, flechas lo mueven 1 cm (Mayús: 10 cm), Ctrl+D lo duplica, Supr lo borra. Mantén Alt para no ajustar a la cuadrícula.',
      ),
    ];
  }

  panelMueble(m) {
    const problema = problemasMuebles(this.plano).get(m.id);
    const producto = m.productoId ? buscarProducto(m.productoId) : null;
    const color = h('input', { type: 'color', value: m.color || '#cfc6bb' });
    color.addEventListener('change', () => {
      this.instantanea();
      m.color = color.value;
      this.cambiado({ panel: false });
    });
    const tinte = h('input', { type: 'color', value: m.tinte || m.color || '#cfc6bb' });
    tinte.addEventListener('change', () => {
      this.instantanea();
      m.tinte = tinte.value;
      this.cambiado();
    });
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, 'Mueble'),
        campo('Nombre', entrada(m, 'nombre', { alCambiar: () => this.cambiado({ panel: false }) })),
        producto ? h('p', { style: { fontSize: '13px' } }, 'Del catálogo: ', h('a', { href: '#/catalogo' }, producto.nombre), producto.precio ? ` · ${producto.precio} €` : '', producto.modelo ? ' · con modelo 3D' : '') : null,
        problema ? h('p', { class: 'problema' }, `⚠ ${problema}`) : h('p', { style: { fontSize: '13px', color: 'var(--ok)' } }, '✓ Cabe sin chocar'),
        h('div', { class: 'rejilla-3' }, this.numero(m, 'ancho', 'Ancho', { min: 1 }), this.numero(m, 'fondo', 'Fondo', { min: 1 }), this.numero(m, 'alto', 'Alto', { min: 1 })),
        h('div', { class: 'rejilla-2' }, this.numero(m, 'rot', 'Giro (°)', { min: -360, max: 360, paso: 15 }), this.numero(m, 'elevacion', 'Altura del suelo', { min: 0, max: 400 })),
        h('div', { class: 'rejilla-2' }, campo('Tipo', selector(m, 'tipo', TIPOS_MUEBLE, { alCambiar: () => this.cambiado() })), campo('Color en el plano', color)),
        campo(
          'Color en 3D',
          h(
            'div',
            { class: 'fila' },
            tinte,
            m.tinte ? h('button', { class: 'boton pequeno', onclick: () => { this.instantanea(); m.tinte = ''; this.cambiado(); } }, 'Volver al original') : h('small', {}, 'El del modelo original'),
          ),
          'Tiñe la tela o el acabado principal (útil para ver otro color del mismo mueble).',
        ),
        h(
          'div',
          { class: 'fila' },
          h('button', { class: 'boton pequeno', onclick: () => { this.instantanea(); m.rot = ((m.rot || 0) + 90) % 360; this.cambiado(); } }, '↻ 90°'),
          h('button', { class: 'boton pequeno', onclick: () => this.pegarAPared(m) }, '⇥ Pegar a la pared'),
          h('button', { class: 'boton pequeno', onclick: () => this.duplicar(m) }, 'Duplicar'),
          h('button', { class: 'boton pequeno peligro', onclick: () => this.borrarSeleccion() }, 'Borrar'),
        ),
      ),
      h('button', { class: 'boton', onclick: () => { this.seleccion = null; this.actualizarTodo(); } }, '‹ Volver al espacio'),
    ];
  }

  panelAbertura(ab) {
    const geo = this.geometriaAbertura(ab);
    const largo = geo ? Math.round(geo.t.largo) : 0;
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, ab.tipo === 'puerta' ? 'Puerta' : 'Ventana'),
        h('p', { style: { fontSize: '13px', color: 'var(--texto-suave)' } }, `En una pared de ${largo} cm. Arrástrala para moverla por la pared.`),
        h('div', { class: 'rejilla-2' }, this.numero(ab, 'ancho', 'Ancho (cm)', { min: 30, max: largo }), this.numero(ab, 'alto', 'Alto (cm)', { min: 30, max: this.plano.altura })),
        h(
          'div',
          { class: 'rejilla-2' },
          this.numero(ab, 'pos', 'Desde la esquina', { min: 0, max: Math.max(0, largo - ab.ancho) }),
          ab.tipo === 'ventana' ? this.numero(ab, 'alfeizar', 'Altura del suelo', { min: 0, max: this.plano.altura }) : null,
        ),
        ab.tipo === 'puerta'
          ? h(
              'div',
              { class: 'fila' },
              h('button', { class: 'boton pequeno', onclick: () => { this.instantanea(); ab.abre = ab.abre === 'der' ? 'izq' : 'der'; this.cambiado(); } }, '⇄ Cambiar bisagra'),
              h('button', { class: 'boton pequeno', onclick: () => { this.instantanea(); ab.fuera = !ab.fuera; this.cambiado(); } }, ab.fuera ? 'Abre hacia dentro' : 'Abre hacia fuera'),
            )
          : null,
        h('div', { class: 'fila', style: { marginTop: '10px' } }, h('button', { class: 'boton pequeno peligro', onclick: () => this.borrarSeleccion() }, 'Borrar')),
      ),
      h('button', { class: 'boton', onclick: () => { this.seleccion = null; this.actualizarTodo(); } }, '‹ Volver al espacio'),
    ];
  }

  panelPared(i) {
    const t = tramos(this.plano)[i];
    const largo = h('input', { type: 'number', value: Math.round(t.largo), min: 1 });
    largo.addEventListener('change', () => this.cambiarLargo(i, Number(largo.value)));
    const huecos = this.plano.aberturas.filter((ab) => ab.pared === i);
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, `Pared ${i + 1}`),
        campo('Largo (cm)', largo, 'Al cambiarlo se mueve la pared siguiente, para que la habitación no se deforme.'),
        h('p', { style: { fontSize: '13px', color: 'var(--texto-suave)' } }, `${huecos.length ? `${huecos.length} hueco(s) · ` : ''}${formatoM2((t.largo * this.plano.altura) / 10000 - huecos.reduce((s, ab) => s + ab.ancho * ab.alto, 0) / 10000)} de pared`),
        h(
          'div',
          { class: 'fila' },
          h('button', { class: 'boton pequeno', onclick: () => { this.herramienta = 'puerta'; this.actualizarTodo(); } }, '+ Puerta'),
          h('button', { class: 'boton pequeno', onclick: () => { this.herramienta = 'ventana'; this.actualizarTodo(); } }, '+ Ventana'),
          h('button', { class: 'boton pequeno', onclick: () => this.dividirPared(i, { x: (t.a.x + t.b.x) / 2, y: (t.a.y + t.b.y) / 2 }) }, 'Dividir en dos'),
        ),
      ),
      h('button', { class: 'boton', onclick: () => { this.seleccion = null; this.actualizarTodo(); } }, '‹ Volver al espacio'),
    ];
  }

  panelVertice(i) {
    const p = this.plano.puntos[i];
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, `Esquina ${i + 1}`),
        h('div', { class: 'rejilla-2' }, this.numero(p, 'x', 'X (cm)'), this.numero(p, 'y', 'Y (cm)')),
        h('button', { class: 'boton pequeno peligro', onclick: () => this.borrarVertice(i) }, 'Quitar esquina'),
      ),
      h('button', { class: 'boton', onclick: () => { this.seleccion = null; this.actualizarTodo(); } }, '‹ Volver al espacio'),
    ];
  }

  panel3d() {
    const ac = this.plano.acabados;
    const s = this.seleccion;
    const paredElegida = s?.tipo === 'pared' ? s.i : null;
    const coloresPaletas = [...new Set(datos.paletas.flatMap((p) => p.colores))].slice(0, 24);
    const aplicar = () => {
      guardar();
      this.vista3d?.actualizar();
      this.pintarPanel();
    };
    const muestras = (alElegir) =>
      h('div', { class: 'muestras' }, [...COLORES_PARED, ...coloresPaletas].map((c) => h('button', { class: 'muestra', style: { background: c }, title: c, 'aria-label': `Color ${c}`, onclick: () => alElegir(c) })));
    const colorPared = paredElegida !== null ? ac.paredes[paredElegida] || ac.pared : ac.pared;
    const selColor = h('input', { type: 'color', value: colorPared });
    selColor.addEventListener('input', () => {
      if (paredElegida !== null) ac.paredes[paredElegida] = selColor.value;
      else ac.pared = selColor.value;
      guardar();
      this.vista3d?.actualizar();
    });
    const selSuelo = selector(ac, 'suelo', SUELOS, { alCambiar: aplicar });
    const tinte = h('input', { type: 'color', value: ac.colorSuelo || '#ffffff' });
    tinte.addEventListener('input', () => {
      ac.colorSuelo = tinte.value;
      guardar();
      this.vista3d?.actualizar();
    });
    const luz = { valor: this.vista3d?.luz || 'dia' };
    return [
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, paredElegida !== null ? `Color de la pared ${paredElegida + 1}` : 'Color de las paredes'),
        h('p', { style: { fontSize: '13px', color: 'var(--texto-suave)' } }, paredElegida !== null ? 'Solo esta pared. Haz clic fuera de las paredes para volver a todas.' : 'Haz clic en una pared del 3D para pintarla de otro color.'),
        h('div', { class: 'fila' }, selColor, h('code', {}, colorPared)),
        muestras((c) => {
          if (paredElegida !== null) ac.paredes[paredElegida] = c;
          else ac.pared = c;
          aplicar();
        }),
        coloresPaletas.length ? h('small', {}, 'Incluye los colores de tus paletas.') : h('small', {}, 'Los colores de tus paletas (Inspiración) también aparecerán aquí.'),
        paredElegida !== null && ac.paredes[paredElegida]
          ? h('div', {}, h('button', { class: 'boton pequeno', onclick: () => { delete ac.paredes[paredElegida]; aplicar(); } }, 'Usar el color general'))
          : paredElegida === null && Object.keys(ac.paredes).length
            ? h('div', {}, h('button', { class: 'boton pequeno', onclick: () => { ac.paredes = {}; aplicar(); } }, 'Todas las paredes del mismo color'))
            : null,
      ),
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, paredElegida !== null ? `Revestimiento de la pared ${paredElegida + 1}` : 'Revestimiento de las paredes'),
        (() => {
          const actual = paredElegida !== null ? ac.revestimientos?.[paredElegida] || ac.revestimiento || 'pintura' : ac.revestimiento || 'pintura';
          const sel = h('select', {}, REVESTIMIENTOS.map(([v, t]) => h('option', { value: v, selected: v === actual }, t)));
          sel.addEventListener('change', () => {
            if (paredElegida !== null) {
              ac.revestimientos ||= {};
              ac.revestimientos[paredElegida] = sel.value;
            } else {
              ac.revestimiento = sel.value;
              ac.revestimientos = {};
            }
            aplicar();
          });
          return sel;
        })(),
        h('small', {}, 'Con pintura manda el color de arriba; ladrillo, madera, piedra y azulejo llevan su textura real.'),
      ),
      h('div', { class: 'seccion' }, h('h3', {}, 'Suelo'), selSuelo, h('div', { class: 'fila', style: { marginTop: '8px' } }, h('span', { style: { fontSize: '13px' } }, 'Tono'), tinte, ac.colorSuelo ? h('button', { class: 'boton pequeno', onclick: () => { ac.colorSuelo = ''; aplicar(); } }, 'Sin tono') : null)),
      h(
        'div',
        { class: 'seccion' },
        h('h3', {}, 'Luz'),
        selector(luz, 'valor', [['dia', 'De día'], ['tarde', 'Atardecer'], ['noche', 'De noche (lámparas)']], { alCambiar: (v) => this.vista3d?.ponerLuz(v) }),
        h('label', { class: 'marcar', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: this.vista3d?.conTecho ?? false, onchange: (e) => this.vista3d?.ponerTecho(e.target.checked) }), 'Mostrar el techo'),
      ),
      h('p', { class: 'ayuda-teclas' }, 'Los muebles del catálogo con modelo 3D (archivo GLB) se ven con su forma real; los demás, con una forma sencilla de sus medidas y color.'),
    ];
  }
}
