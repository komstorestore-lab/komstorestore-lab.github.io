// Vista 3D de un espacio, hecha a partir de su plano. Las medidas del plano van en cm; en 3D, en metros.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { PointerLockControls } from '../vendor/PointerLockControls.js';
import { RGBELoader } from '../vendor/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from '../vendor/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { tramos, puntoDentro } from './calculos.js';
import { h } from './ui.js';
import { modeloDe, cargarModelo, instancia } from './modelos3d.js';
import { cargarTexturas, materialSuelo, materialPared, materialTela } from './materiales.js';

const M = 0.01; // de centímetros a metros
const ALTURA_OJOS = 1.6;
// Piezas que van colgadas en la pared o del techo, o encima de otros muebles.
const EN_PARED = new Set(['cuadro', 'espejo', 'aplique']);

export class Vista3D {
  constructor(contenedor, plano, { alElegirPared, alCambiarPaseo, calidad = 'alta' } = {}) {
    this.contenedor = contenedor;
    this.plano = plano;
    this.alElegirPared = alElegirPared;
    this.alCambiarPaseo = alCambiarPaseo;
    this.calidad = calidad;
    this.luz = 'dia';
    this.conTecho = false;
    this.paseo = false;
    this.teclas = new Set();
    this.version = 0;
    // Pantalla táctil como puntero principal (móvil o tableta).
    this.tactil = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.lienzo = this.renderer.domElement;
    contenedor.prepend(this.lienzo);

    this.escena = new THREE.Scene();
    // Luz ambiental de estudio: da reflejos y sombras suaves como en una habitación real.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.escena.environment = this.entorno;

    this.camara = new THREE.PerspectiveCamera(50, 1, 0.05, 300);
    this.orbita = new OrbitControls(this.camara, this.lienzo);
    this.orbita.enableDamping = true;
    this.orbita.maxPolarAngle = Math.PI * 0.495;
    this.orbita.minDistance = 0.5;
    this.orbita.maxDistance = 60;
    this.primeraPersona = new PointerLockControls(this.camara, this.lienzo);
    this.primeraPersona.addEventListener('unlock', () => this.salirPaseo());

    this.luces = new THREE.Group();
    this.escena.add(this.luces);
    this.habitacion = new THREE.Group();
    this.escena.add(this.habitacion);
    this.base = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 1 }));
    this.base.position.y = -0.03;
    this.base.receiveShadow = true;
    this.escena.add(this.base);

    this.prepararEfectos();
    this.reloj = new THREE.Clock();
    this.alTeclaAbajo = (e) => {
      if (this.paseo) this.teclas.add(e.code);
    };
    this.alTeclaArriba = (e) => this.teclas.delete(e.code);
    document.addEventListener('keydown', this.alTeclaAbajo);
    document.addEventListener('keyup', this.alTeclaArriba);
    this.instalarClic();
    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(contenedor);

    this.listo = cargarTexturas().then(() => this.construir());
    this.construir();
    this.vistaAerea();
    this.ponerLuz('dia');
    this.redimensionar();
    this.animar();
  }

  prepararEfectos() {
    this.compositor = null;
    if (this.calidad !== 'alta') return;
    try {
      this.compositor = new EffectComposer(this.renderer);
      this.compositor.addPass(new RenderPass(this.escena, this.camara));
      // Sombras de contacto (oclusión ambiental): rincones y patas de los muebles más realistas.
      this.ao = new GTAOPass(this.escena, this.camara, 1, 1);
      this.ao.output = GTAOPass.OUTPUT.Default;
      this.ao.blendIntensity = 0.85;
      this.ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1 });
      this.compositor.addPass(this.ao);
      this.compositor.addPass(new OutputPass());
    } catch {
      this.compositor = null;
    }
  }

  destruir() {
    cancelAnimationFrame(this.cuadro);
    this.observador.disconnect();
    document.removeEventListener('keydown', this.alTeclaAbajo);
    document.removeEventListener('keyup', this.alTeclaArriba);
    document.removeEventListener('keydown', this.alEscape);
    if (this.primeraPersona.isLocked) this.primeraPersona.unlock();
    this.primeraPersona.dispose?.();
    this.orbita.dispose();
    liberar(this.habitacion);
    this.compositor?.dispose?.();
    this.entorno.dispose();
    this.cielo?.dispose();
    this.renderer.dispose();
    this.lienzo.remove();
    this.mandos?.remove();
  }

  redimensionar() {
    const r = this.contenedor.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.compositor?.setSize(r.width, r.height);
    this.camara.aspect = r.width / r.height;
    this.camara.updateProjectionMatrix();
  }

  // ---------- Construcción de la habitación ----------

  actualizar() {
    cancelAnimationFrame(this.pendiente);
    this.pendiente = requestAnimationFrame(() => this.construir());
  }

  limites() {
    const p = this.plano.puntos;
    if (!p.length) return { cx: 2, cz: 1.5, tam: 5 };
    const xs = p.map((q) => q.x * M);
    const zs = p.map((q) => q.y * M);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, tam: Math.max(maxX - minX, maxZ - minZ, 2), minX, maxX, minZ, maxZ };
  }

  construir() {
    const version = ++this.version;
    liberar(this.habitacion);
    this.habitacion.clear();
    this.paredes = [];
    const pl = this.plano;
    const ac = pl.acabados;
    const altura = (Number(pl.altura) || 250) * M;
    const grosor = (Number(pl.grosor) || 12) * M;
    const cerrado = pl.cerrado && pl.puntos.length >= 3;

    if (cerrado) {
      const forma = new THREE.Shape(pl.puntos.map((p) => new THREE.Vector2(p.x * M, -p.y * M)));
      const suelo = new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2), materialSuelo(ac.suelo, ac.colorSuelo));
      suelo.receiveShadow = true;
      this.habitacion.add(suelo);
      if (this.conTecho || this.paseo) {
        const techo = new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: ac.techo || '#ffffff', roughness: 0.95, side: THREE.BackSide }));
        techo.position.y = altura;
        techo.receiveShadow = true;
        this.habitacion.add(techo);
      }
    }

    for (const t of tramos(pl)) {
      if (t.largo < 1) continue;
      this.construirPared(t, { altura, grosor, cerrado });
    }

    this.colgados = [];
    for (const m of pl.muebles) {
      const grupo = this.crearMueble(m, version, altura);
      this.habitacion.add(grupo);
      // Cuadros, espejos, apliques y cortinas se esconden con su pared en la vista de casa de muñecas.
      if (EN_PARED.has(m.tipo) || m.tipo === 'cortina') {
        const pared = this.paredMasCercana(m);
        if (pared) this.colgados.push({ grupo, pared });
      }
    }
    this.ponerLuz(this.luz);
  }

  paredMasCercana(m) {
    let mejor = null;
    let distanciaMejor = Infinity;
    for (const p of this.paredes) {
      const t = tramos(this.plano)[p.userData.pared];
      if (!t) continue;
      const largo2 = (t.b.x - t.a.x) ** 2 + (t.b.y - t.a.y) ** 2 || 1;
      const u = Math.max(0, Math.min(1, ((m.x - t.a.x) * (t.b.x - t.a.x) + (m.y - t.a.y) * (t.b.y - t.a.y)) / largo2));
      const d = Math.hypot(m.x - (t.a.x + (t.b.x - t.a.x) * u), m.y - (t.a.y + (t.b.y - t.a.y) * u));
      if (d < distanciaMejor) {
        distanciaMejor = d;
        mejor = p;
      }
    }
    return distanciaMejor < 40 ? mejor : null;
  }

  construirPared(t, { altura, grosor, cerrado }) {
    const pl = this.plano;
    const ac = pl.acabados;
    const largo = t.largo * M;
    const angulo = Math.atan2(t.b.y - t.a.y, t.b.x - t.a.x);
    const medio = new THREE.Vector3(((t.a.x + t.b.x) / 2) * M, 0, ((t.a.y + t.b.y) / 2) * M);
    let normal = new THREE.Vector3(-Math.sin(angulo), 0, Math.cos(angulo));
    if (cerrado) {
      const prueba = { x: (medio.x + normal.x * 0.05) / M, y: (medio.z + normal.z * 0.05) / M };
      if (!puntoDentro(prueba, pl.puntos)) normal = normal.negate();
    }
    // Lado de la pared (en sus propios ejes) que da a la habitación: +z o −z.
    const ladoDentro = Math.sign(normal.dot(new THREE.Vector3(-Math.sin(angulo), 0, Math.cos(angulo)))) || 1;
    const material = materialPared(ac.revestimientos?.[t.indice] || ac.revestimiento || 'pintura', ac.paredes?.[t.indice] || ac.pared || '#efe9e1');
    const grupo = new THREE.Group();
    const huecos = pl.aberturas
      .filter((ab) => ab.pared === t.indice)
      .map((ab) => {
        const pos = Math.max(0, Math.min(t.largo - ab.ancho, ab.pos)) * M;
        const abajo = (ab.tipo === 'puerta' ? 0 : Number(ab.alfeizar) || 0) * M;
        return { ab, desde: pos, hasta: pos + ab.ancho * M, abajo, arriba: Math.min(altura, abajo + (Number(ab.alto) || 0) * M) };
      })
      .sort((a, b) => a.desde - b.desde);
    const caja = (x0, x1, y0, y1, mat = material, z = 0, fondo = grosor) => {
      if (x1 - x0 < 0.001 || y1 - y0 < 0.001) return null;
      const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, fondo);
      coordenadasMundo(geo, x0, y0);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.pared = t.indice;
      grupo.add(m);
      return m;
    };
    const blanco = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.45 });
    // Rodapié a lo largo de la cara de dentro, cortado en las puertas.
    const rodapie = (x0, x1) => caja(x0, x1, 0, 0.08, blanco, ladoDentro * (grosor / 2 + 0.006), 0.012);

    // Se alarga media pared por cada lado para que las esquinas queden cerradas.
    let cursor = -grosor / 2;
    for (const hu of huecos) {
      caja(cursor, hu.desde, 0, altura);
      rodapie(Math.max(0, cursor), hu.desde);
      caja(hu.desde, hu.hasta, 0, hu.abajo);
      caja(hu.desde, hu.hasta, hu.arriba, altura);
      if (hu.ab.tipo === 'ventana') this.ventana(grupo, hu, grosor, ladoDentro);
      else this.puerta(grupo, hu, grosor, ladoDentro);
      cursor = hu.hasta;
    }
    caja(cursor, largo + grosor / 2, 0, altura);
    rodapie(Math.max(0, cursor), largo);
    grupo.position.set(t.a.x * M, 0, t.a.y * M);
    grupo.rotation.y = -angulo;
    grupo.userData = { pared: t.indice, medio, normal };
    this.habitacion.add(grupo);
    this.paredes.push(grupo);
  }

  ventana(grupo, hu, grosor, lado) {
    const ancho = hu.hasta - hu.desde;
    const alto = hu.arriba - hu.abajo;
    const cx = (hu.desde + hu.hasta) / 2;
    const cy = (hu.abajo + hu.arriba) / 2;
    const marco = new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.35 });
    const cristal = new THREE.MeshPhysicalMaterial({ color: 0xdfeef5, transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0, envMapIntensity: 1.2 });
    const pieza = (w, hh, d, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
      m.position.set(x, y, z);
      m.castShadow = mat !== cristal;
      grupo.add(m);
    };
    const p = 0.055;
    pieza(ancho, p, 0.07, cx, hu.abajo + p / 2, 0, marco);
    pieza(ancho, p, 0.07, cx, hu.arriba - p / 2, 0, marco);
    pieza(p, alto, 0.07, hu.desde + p / 2, cy, 0, marco);
    pieza(p, alto, 0.07, hu.hasta - p / 2, cy, 0, marco);
    const hojas = ancho > 0.9 ? 2 : 1;
    if (hojas === 2) pieza(0.05, alto - 2 * p, 0.065, cx, cy, 0, marco);
    pieza(ancho - 2 * p, alto - 2 * p, 0.008, cx, cy, 0, cristal);
    // Alféizar de piedra por dentro
    if (hu.abajo > 0.05) {
      const piedra = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.3 });
      pieza(ancho + 0.06, 0.025, grosor / 2 + 0.05, cx, hu.abajo - 0.0125, lado * (grosor / 4 + 0.025), piedra);
    }
  }

  puerta(grupo, hu, grosor, lado) {
    const ancho = hu.hasta - hu.desde;
    const alto = hu.arriba;
    const madera = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.4 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.25, metalness: 0.9 });
    const pieza = (w, hh, d, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      grupo.add(m);
      return m;
    };
    // Tapajuntas por las dos caras
    for (const cara of [-1, 1]) {
      const z = cara * (grosor / 2 + 0.006);
      pieza(0.07, alto + 0.07, 0.012, hu.desde - 0.035, (alto + 0.07) / 2, z, madera);
      pieza(0.07, alto + 0.07, 0.012, hu.hasta + 0.035, (alto + 0.07) / 2, z, madera);
      pieza(ancho + 0.14, 0.07, 0.012, (hu.desde + hu.hasta) / 2, alto + 0.035, z, madera);
    }
    // Hoja de la puerta entreabierta hacia el lado en que abre
    const bisagraDer = hu.ab.abre === 'der';
    const hoja = new THREE.Group();
    const anchoHoja = ancho - 0.01;
    const tabla = new THREE.Mesh(new RoundedBoxGeometry(anchoHoja, alto - 0.01, 0.04, 2, 0.004), madera);
    tabla.position.set(bisagraDer ? -anchoHoja / 2 : anchoHoja / 2, (alto - 0.01) / 2, 0);
    tabla.castShadow = true;
    tabla.receiveShadow = true;
    hoja.add(tabla);
    for (const cara of [-1, 1]) {
      const pomo = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 12).rotateZ(Math.PI / 2), metal);
      pomo.position.set(bisagraDer ? -anchoHoja + 0.11 : anchoHoja - 0.11, 1.0, cara * 0.045);
      hoja.add(pomo);
    }
    hoja.position.set(bisagraDer ? hu.hasta : hu.desde, 0, 0);
    const haciaDentro = !hu.ab.fuera;
    hoja.rotation.y = (bisagraDer ? 1 : -1) * (haciaDentro ? lado : -lado) * (Math.PI / 180) * 25;
    grupo.add(hoja);
  }

  crearMueble(m, version, altura) {
    const grupo = new THREE.Group();
    const ancho = (Number(m.ancho) || 60) * M;
    const fondo = (Number(m.fondo) || 60) * M;
    const alto = (Number(m.alto) || 75) * M;
    let y = (Number(m.elevacion) || 0) * M;
    if (!m.elevacion && EN_PARED.has(m.tipo)) y = Math.max(0, 1.5 - alto / 2);
    if (m.tipo === 'lampara-techo') y = Math.max(0, altura - alto);
    grupo.position.set(m.x * M, y, m.y * M);
    grupo.rotation.y = (-(Number(m.rot) || 0) * Math.PI) / 180;
    grupo.userData.mueble = m;
    const provisional = formaMueble(m, ancho, fondo, alto);
    grupo.add(provisional);
    modeloDe(m)
      .then(async (fuente) => {
        if (!fuente) return;
        const escena = await cargarModelo(fuente.url);
        if (version !== this.version) return;
        const copia = instancia(escena, fuente, m, ancho, fondo, alto);
        grupo.remove(provisional);
        liberar(provisional);
        grupo.add(copia);
      })
      .catch(() => {});
    return grupo;
  }

  // ---------- Luz ----------

  ponerLuz(tipo) {
    this.luz = tipo;
    liberar(this.luces);
    this.luces.clear();
    const { cx, cz, tam } = this.limites();
    const altura = (Number(this.plano.altura) || 250) * M;
    const ajustes = {
      dia: { hemi: [0xffffff, 0xd8cfc2, 0.6], sol: [0xfff1dc, 3.2], entorno: 0.75, fondo: 0xefece6, exposicion: 1 },
      tarde: { hemi: [0xffd9b0, 0x6f5a4a, 0.35], sol: [0xffa25c, 2.6], entorno: 0.35, fondo: 0xe6d3bf, exposicion: 1.05 },
      noche: { hemi: [0x40506e, 0x1d1915, 0.15], sol: [0x8ea3c7, 0.15], entorno: 0.08, fondo: 0x1c1f27, exposicion: 1.15 },
    }[tipo] || {};
    this.escena.environmentIntensity = ajustes.entorno;
    this.renderer.toneMappingExposure = ajustes.exposicion;
    this.base.material.color.set(tipo === 'noche' ? 0x262930 : 0xe9e4dc);
    this.ponerFondo(tipo, ajustes.fondo);
    this.luces.add(new THREE.HemisphereLight(...ajustes.hemi));
    const sol = new THREE.DirectionalLight(...ajustes.sol);
    const bajo = tipo === 'tarde';
    sol.position.set(cx + tam * 1.1, tam * (bajo ? 0.45 : 1.3) + 1.5, cz + tam * 0.7);
    sol.target.position.set(cx, 0, cz);
    sol.castShadow = true;
    sol.shadow.mapSize.set(this.calidad === 'alta' ? 4096 : 2048, this.calidad === 'alta' ? 4096 : 2048);
    const s = tam * 1.1 + 2;
    Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: tam * 6 + 20 });
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.02;
    sol.shadow.radius = 4;
    this.luces.add(sol, sol.target);
    if (tipo !== 'dia') {
      // Luz cálida del techo y de cada lámpara que haya en el plano.
      const techo = new THREE.PointLight(0xffd2a1, tipo === 'noche' ? 9 : 3, tam * 2.5, 2);
      techo.position.set(cx, altura - 0.2, cz);
      techo.castShadow = this.calidad === 'alta';
      techo.shadow.bias = -0.002;
      this.luces.add(techo);
      for (const m of this.plano.muebles.filter((x) => String(x.tipo).startsWith('lampara') || x.tipo === 'aplique').slice(0, 8)) {
        const l = new THREE.PointLight(0xffc489, tipo === 'noche' ? 4 : 1.5, 5, 2);
        const arriba = m.tipo === 'lampara-techo' ? altura - 0.1 - (Number(m.alto) || 20) * M : ((Number(m.elevacion) || 0) + (Number(m.alto) || 150) - 12) * M;
        l.position.set(m.x * M, arriba, m.y * M);
        this.luces.add(l);
      }
    }
  }

  // Desde dentro, por las ventanas se ve un exterior real; desde fuera, un fondo liso.
  async ponerFondo(tipo, color) {
    this.escena.background = new THREE.Color(color);
    if (!this.paseo) return;
    try {
      this.cielos ||= {};
      this.cielos[tipo] ||= new RGBELoader().loadAsync(`recursos/texturas/cielo_${tipo}.hdr`);
      const cielo = await this.cielos[tipo];
      cielo.mapping = THREE.EquirectangularReflectionMapping;
      if (this.paseo && this.luz === tipo) {
        this.escena.background = cielo;
        this.escena.backgroundIntensity = tipo === 'noche' ? 0.6 : 0.9;
        this.cielo = cielo;
      }
    } catch {
      // Sin cielo: se queda el fondo liso.
    }
  }

  ponerTecho(si) {
    this.conTecho = si;
    this.construir();
  }

  // ---------- Cámara ----------

  vistaAerea() {
    if (this.paseo) this.primeraPersona.unlock();
    const { cx, cz, tam } = this.limites();
    this.camara.position.set(cx + tam * 0.55, tam * 1.05 + 1.5, cz + tam * 1.15);
    this.orbita.target.set(cx, 0.6, cz);
    this.orbita.update();
  }

  alternarPaseo() {
    if (this.paseo) {
      if (this.primeraPersona.isLocked) this.primeraPersona.unlock();
      else this.salirPaseo();
      return;
    }
    const { cx, cz } = this.limites();
    this.paseo = true;
    this.orbita.enabled = false;
    // Se empieza en el centro mirando hacia la pared más lejana.
    this.camara.position.set(cx, ALTURA_OJOS, cz);
    const lejano = this.plano.puntos.reduce((a, p) => (Math.hypot(p.x * M - cx, p.y * M - cz) > Math.hypot(a.x * M - cx, a.y * M - cz) ? p : a), this.plano.puntos[0] || { x: 0, y: 0 });
    this.camara.lookAt(lejano.x * M, 1.4, lejano.y * M);
    this.construir();
    // En el móvil no se bloquea el ratón: se mira arrastrando el dedo y se anda con el mando.
    if (this.tactil) this.sinBloqueo = true;
    this.alCambiarPaseo?.(true, this.sinBloqueo);
    this.mostrarMandos(true);
    if (!this.tactil) this.bloquearRaton();
  }

  mostrarMandos(si) {
    if (!this.mandos) this.crearMandos();
    this.mandos.style.display = si ? '' : 'none';
    if (!si) this.mando = null;
  }

  // Mando en pantalla para andar (círculo que se arrastra) y botón para dejar de recorrer.
  crearMandos() {
    const bola = h('div', { class: 'mando-bola' });
    const base = h('div', { class: 'mando', role: 'application', 'aria-label': 'Mando para andar: arrastra el círculo hacia donde quieras ir' }, bola);
    const salir = h('button', { class: 'boton pequeno mando-salir', onclick: () => this.salirPaseo() }, '✕ Dejar de recorrer');
    this.mandos = h('div', { class: 'mandos-3d' }, base, salir);
    this.contenedor.append(this.mandos);
    const radio = 46;
    let id = null;
    const mover = (e) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > radio) {
        dx *= radio / d;
        dy *= radio / d;
      }
      bola.style.transform = `translate(${dx}px, ${dy}px)`;
      this.mando = { x: dx / radio, y: dy / radio };
    };
    base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      try {
        base.setPointerCapture(id);
      } catch {
        // Ese puntero ya no está activo.
      }
      mover(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) mover(e);
    });
    const soltar = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.mando = null;
      bola.style.transform = '';
    };
    base.addEventListener('pointerup', soltar);
    base.addEventListener('pointercancel', soltar);
  }

  // Algunos navegadores (o ventanas integradas) no dejan bloquear el ratón: entonces se mira arrastrando.
  bloquearRaton() {
    if (this.sinBloqueo) return;
    const fallo = () => {
      this.sinBloqueo = true;
      if (this.paseo) this.alCambiarPaseo?.(true, true);
    };
    try {
      const r = this.lienzo.requestPointerLock();
      if (r?.catch) r.catch(fallo);
    } catch {
      fallo();
    }
  }

  salirPaseo() {
    if (!this.paseo) return;
    if (this.primeraPersona.isLocked) this.primeraPersona.unlock();
    this.paseo = false;
    this.teclas.clear();
    this.orbita.enabled = true;
    this.mostrarMandos(false);
    this.construir();
    this.vistaAerea();
    this.alCambiarPaseo?.(false);
  }

  instalarClic() {
    let inicio = null;
    let ultimo = null; // última posición del dedo o del ratón que está mirando
    this.lienzo.addEventListener('pointerdown', (e) => {
      inicio = { x: e.clientX, y: e.clientY };
      if (!ultimo) ultimo = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (this.paseo && !this.primeraPersona.isLocked && !this.tactil) this.bloquearRaton();
    });
    const mirar = new THREE.Euler(0, 0, 0, 'YXZ');
    this.lienzo.addEventListener('pointermove', (e) => {
      if (!this.paseo || !this.sinBloqueo || !e.buttons || !ultimo || e.pointerId !== ultimo.id) return;
      const dx = e.clientX - ultimo.x;
      const dy = e.clientY - ultimo.y;
      ultimo = { id: e.pointerId, x: e.clientX, y: e.clientY };
      // Con el dedo se «agarra» la escena (como en las fotos de 360°); con el ratón se mira hacia donde se mueve.
      const s = e.pointerType === 'touch' ? -1 : 1;
      mirar.setFromQuaternion(this.camara.quaternion);
      mirar.y -= s * dx * 0.005;
      mirar.x = Math.max(-1.4, Math.min(1.4, mirar.x - s * dy * 0.005));
      this.camara.quaternion.setFromEuler(mirar);
    });
    const soltarMirada = (e) => {
      if (ultimo?.id === e.pointerId) ultimo = null;
    };
    this.lienzo.addEventListener('pointerup', soltarMirada);
    this.lienzo.addEventListener('pointercancel', soltarMirada);
    this.alEscape = (e) => {
      if (e.key === 'Escape' && this.paseo && !this.primeraPersona.isLocked) this.salirPaseo();
    };
    document.addEventListener('keydown', this.alEscape);
    this.lienzo.addEventListener('pointerup', (e) => {
      if (!inicio || this.paseo || Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 4) return;
      const r = this.lienzo.getBoundingClientRect();
      const raton = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const rayo = new THREE.Raycaster();
      rayo.setFromCamera(raton, this.camara);
      const visibles = this.paredes.filter((p) => p.visible);
      const choque = rayo.intersectObjects(visibles, true).find((c) => c.object.userData.pared !== undefined);
      this.alElegirPared?.(choque ? choque.object.userData.pared : null);
    });
  }

  animar() {
    this.cuadro = requestAnimationFrame(() => this.animar());
    const dt = Math.min(0.05, this.reloj.getDelta());
    if (this.paseo) {
      const antes = this.camara.position.clone();
      const v = 1.6 * dt * (this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight') ? 2 : 1);
      if (this.teclas.has('KeyW') || this.teclas.has('ArrowUp')) this.primeraPersona.moveForward(v);
      if (this.teclas.has('KeyS') || this.teclas.has('ArrowDown')) this.primeraPersona.moveForward(-v);
      if (this.teclas.has('KeyA') || this.teclas.has('ArrowLeft')) this.primeraPersona.moveRight(-v);
      if (this.teclas.has('KeyD') || this.teclas.has('ArrowRight')) this.primeraPersona.moveRight(v);
      if (this.mando) {
        // Mando en pantalla: hacia arriba se anda hacia delante.
        this.primeraPersona.moveForward(-this.mando.y * 1.6 * dt);
        this.primeraPersona.moveRight(this.mando.x * 1.6 * dt);
      }
      this.camara.position.y = ALTURA_OJOS;
      // No se atraviesan las paredes.
      if (this.plano.cerrado && this.plano.puntos.length >= 3 && !puntoDentro({ x: this.camara.position.x / M, y: this.camara.position.z / M }, this.plano.puntos)) {
        this.camara.position.copy(antes);
      }
    } else {
      this.orbita.update();
    }
    // Desde fuera se esconden las paredes que tapan la habitación (como en una casa de muñecas).
    const cam = this.camara.position;
    for (const p of this.paredes || []) {
      const { medio, normal } = p.userData;
      const haciaCamara = new THREE.Vector3(cam.x - medio.x, 0, cam.z - medio.z);
      p.visible = this.paseo || haciaCamara.dot(normal) > -0.05;
    }
    for (const { grupo, pared } of this.colgados || []) grupo.visible = pared.visible;
    if (this.compositor) this.compositor.render(dt);
    else this.renderer.render(this.escena, this.camara);
  }

  captura() {
    if (this.compositor) this.compositor.render(0);
    else this.renderer.render(this.escena, this.camara);
    return new Promise((resolver, rechazar) => this.lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se ha podido hacer la captura'))), 'image/png'));
  }
}

// Coordenadas de textura en metros (así un ladrillo mide lo mismo en todas las paredes).
function coordenadasMundo(geo, x0, y0) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const centro = geo.boundingBox.getCenter(new THREE.Vector3());
  const ancho = geo.boundingBox.max.x - geo.boundingBox.min.x;
  const alto = geo.boundingBox.max.y - geo.boundingBox.min.y;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - centro.x + x0 + ancho / 2;
    const y = pos.getY(i) - centro.y + y0 + alto / 2;
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x, z);
    else if (nx > 0.5) uv.setXY(i, z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}

function liberar(objeto) {
  objeto.traverse?.((o) => {
    // Los modelos cargados comparten geometría y materiales con la caché: no se borran.
    if (o.userData?.deCache) return;
    if (o.geometry && !o.geometry.userData?.compartida) o.geometry.dispose();
    if (o.material) {
      for (const m of [].concat(o.material)) {
        if (!m.userData?.compartido && !m.userData?.original) m.dispose();
      }
    }
  });
}

// ---------- Muebles con formas sencillas (mientras carga el modelo, o si no hay modelo) ----------

function bloque(grupo, mat, ancho, alto, fondo, x, y, z, { redondo = false, radio = 0.02 } = {}) {
  const geo = redondo
    ? new THREE.CylinderGeometry(ancho / 2, ancho / 2, alto, 40)
    : new RoundedBoxGeometry(ancho, alto, fondo, 3, Math.min(radio, ancho / 2.2, alto / 2.2, fondo / 2.2));
  const m = new THREE.Mesh(geo, mat);
  if (redondo) m.scale.z = fondo / ancho;
  m.position.set(x, y + alto / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  grupo.add(m);
  return m;
}

function patas(grupo, mat, ancho, fondo, alto, grueso = 0.04, margen = 0.04) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bloque(grupo, mat, grueso, alto, grueso, sx * (ancho / 2 - margen), 0, sz * (fondo / 2 - margen), { radio: 0.005 });
}

function formaMueble(m, w, d, hgt) {
  const g = new THREE.Group();
  const color = m.tinte || m.color || '#cfc6bb';
  const tela = materialTela(m.tela || 'lino', color);
  const lisa = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const oscuro = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55), roughness: 0.6 });
  const madera = new THREE.MeshStandardMaterial({ color: 0x8a6a4f, roughness: 0.55 });
  const blanco = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.25 });
  const fz = -d / 2;
  switch (m.tipo) {
    case 'sofa':
    case 'sillon':
    case 'sofa-l': {
      const brazo = Math.min(0.2, w * 0.12);
      bloque(g, tela, w, hgt * 0.42, d, 0, 0.08, 0, { radio: 0.04 });
      bloque(g, tela, w, hgt - 0.08, d * 0.24, 0, 0.08, fz + d * 0.12, { radio: 0.05 });
      for (const s of [-1, 1]) bloque(g, tela, brazo, hgt * 0.68, d, s * (w / 2 - brazo / 2), 0.08, 0, { radio: 0.05 });
      const plazas = m.tipo === 'sillon' ? 1 : Math.max(1, Math.round((w - 2 * brazo) / 0.65));
      const anchoCojin = (w - 2 * brazo) / plazas;
      for (let i = 0; i < plazas; i++) bloque(g, tela, anchoCojin - 0.015, 0.12, d * 0.72, -w / 2 + brazo + anchoCojin * (i + 0.5), 0.08 + hgt * 0.42, d * 0.12, { radio: 0.05 });
      patas(g, madera, w, d, 0.08, 0.035, 0.07);
      break;
    }
    case 'cama':
      bloque(g, tela, w, 0.3, d, 0, 0, 0, { radio: 0.03 });
      bloque(g, blanco, w - 0.04, 0.22, d - 0.06, 0, 0.3, 0.03, { radio: 0.06 });
      bloque(g, tela, w + 0.04, 1.05, 0.08, 0, 0, fz + 0.04, { radio: 0.03 });
      for (let i = 0; i < (w > 1.2 ? 2 : 1); i++) bloque(g, blanco, (w > 1.2 ? w / 2 : w) - 0.14, 0.14, 0.4, w > 1.2 ? (i ? 1 : -1) * w / 4 : 0, 0.52, fz + 0.32, { radio: 0.06 });
      bloque(g, oscuro, w - 0.02, 0.05, d * 0.5, 0, 0.51, d * 0.22, { radio: 0.02 });
      break;
    case 'mesa':
    case 'mesa-centro':
    case 'mesa-auxiliar':
    case 'escritorio':
      bloque(g, madera, w, 0.035, d, 0, hgt - 0.035, 0, { radio: 0.008 });
      patas(g, oscuro, w, d, hgt - 0.035, 0.045, 0.06);
      break;
    case 'mesa-redonda':
      bloque(g, madera, w, 0.035, d, 0, hgt - 0.035, 0, { redondo: true });
      bloque(g, oscuro, 0.08, hgt - 0.035, 0.08, 0, 0, 0, { redondo: true });
      bloque(g, oscuro, w * 0.45, 0.025, d * 0.45, 0, 0, 0, { redondo: true });
      break;
    case 'silla':
      bloque(g, lisa, w, 0.05, d, 0, 0.45, 0, { radio: 0.01 });
      bloque(g, lisa, w, hgt - 0.5, 0.03, 0, 0.5, fz + 0.015, { radio: 0.01 });
      patas(g, madera, w, d, 0.45, 0.03, 0.03);
      break;
    case 'alfombra':
      bloque(g, materialTela('yute', color), w, 0.012, d, 0, 0, 0, { radio: 0.004 });
      break;
    case 'cortina': {
      // Tela con pliegues
      const geo = new THREE.PlaneGeometry(w, hgt, 64, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w) * Math.PI * Math.max(6, w * 9)) * 0.03);
      geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, materialTela('lino', color, true));
      c.position.y = hgt / 2;
      c.castShadow = true;
      g.add(c);
      break;
    }
    case 'cojin':
      bloque(g, tela, w, hgt, d, 0, 0, 0, { radio: Math.min(w, hgt, d) / 2.2 });
      break;
    case 'cuadro':
    case 'espejo': {
      bloque(g, oscuro, w, hgt, Math.max(0.02, d), 0, 0, 0, { radio: 0.004 });
      const cara = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, hgt - 0.06), m.tipo === 'espejo' ? new THREE.MeshStandardMaterial({ color: 0xdfe7ea, roughness: 0.02, metalness: 1 }) : lisa);
      cara.position.set(0, hgt / 2, Math.max(0.02, d) / 2 + 0.001);
      g.add(cara);
      break;
    }
    case 'planta': {
      bloque(g, new THREE.MeshStandardMaterial({ color: 0xc77f5a, roughness: 0.9 }), w * 0.55, hgt * 0.25, d * 0.55, 0, 0, 0, { redondo: true });
      const hojas = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(w, d) * 0.55, 1), new THREE.MeshStandardMaterial({ color: 0x4f6b3e, roughness: 0.8, flatShading: true }));
      hojas.scale.y = (hgt * 0.75) / Math.max(w, d) / 1.1;
      hojas.position.y = hgt * 0.25 + hgt * 0.37;
      hojas.castShadow = true;
      g.add(hojas);
      break;
    }
    case 'lampara':
    case 'lampara-mesa':
    case 'lampara-techo':
    case 'aplique': {
      const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.48, Math.min(0.3, hgt * 0.4), 32, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 0.3 }));
      if (m.tipo === 'lampara-techo') {
        pantalla.position.y = hgt * 0.4;
        bloque(g, oscuro, 0.012, hgt, 0.012, 0, 0, 0, { redondo: true });
      } else {
        bloque(g, oscuro, w * 0.5, 0.025, d * 0.5, 0, 0, 0, { redondo: true });
        bloque(g, oscuro, 0.02, hgt * 0.8, 0.02, 0, 0.025, 0, { redondo: true });
        pantalla.position.y = hgt - Math.min(0.3, hgt * 0.4) / 2;
      }
      g.add(pantalla);
      break;
    }
    case 'banera':
      bloque(g, blanco, w, hgt, d, 0, 0, 0, { radio: 0.05 });
      bloque(g, new THREE.MeshStandardMaterial({ color: 0xdde8ef, roughness: 0.15 }), w - 0.12, 0.02, d - 0.12, 0, hgt - 0.01, 0, { radio: 0.08 });
      break;
    case 'ducha':
      bloque(g, blanco, w, Math.max(0.03, hgt), d, 0, 0, 0, { radio: 0.01 });
      bloque(g, new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, transparent: true, opacity: 0.2, roughness: 0.03 }), w, 1.95, 0.008, 0, 0, d / 2);
      break;
    case 'inodoro':
      bloque(g, blanco, w, hgt, d * 0.25, 0, 0, fz + d * 0.125, { radio: 0.04 });
      bloque(g, blanco, w * 0.9, 0.42, d * 0.7, 0, 0, fz + d * 0.25 + d * 0.35, { redondo: true });
      break;
    case 'encimera':
    case 'isla':
    case 'nevera':
    case 'lavabo':
    case 'armario':
    case 'comoda':
    case 'aparador':
    case 'mueble-tv':
    case 'mesilla':
    case 'estanteria': {
      const pie = ['comoda', 'aparador', 'mueble-tv', 'mesilla'].includes(m.tipo) ? 0.1 : 0;
      bloque(g, lisa, w, hgt - pie, d, 0, pie, 0, { radio: 0.008 });
      if (pie) patas(g, madera, w, d, pie, 0.03, 0.04);
      const puertas = Math.max(1, Math.round(w / (m.tipo === 'armario' ? 0.5 : 0.45)));
      for (let i = 1; i < puertas; i++) bloque(g, oscuro, 0.005, hgt - pie - 0.04, 0.005, -w / 2 + (w * i) / puertas, pie + 0.02, d / 2);
      if (m.tipo === 'encimera' || m.tipo === 'isla') bloque(g, new THREE.MeshStandardMaterial({ color: 0x2f2c2a, roughness: 0.3 }), w + 0.01, 0.03, d + 0.02, 0, hgt - 0.03, 0.01, { radio: 0.004 });
      break;
    }
    default:
      bloque(g, lisa, w, hgt, d, 0, 0, 0, { radio: 0.01 });
  }
  return g;
}
