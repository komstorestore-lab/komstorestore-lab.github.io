// Modelos 3D de los muebles: carga (con caché), ajuste a las medidas y vista desde arriba para el plano.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/jsm/loaders/DRACOLoader.js';
import { datos, urlArchivo } from './estado.js';

const draco = new DRACOLoader();
draco.setDecoderPath('/vendor/draco/');
const cargador = new GLTFLoader();
cargador.setDRACOLoader(draco);

const escenas = new Map(); // url → promesa con la escena del modelo
let genericos = null;

// Índice de los modelos genéricos que vienen con la app (uno por tipo de mueble).
export function cargarGenericos() {
  genericos ||= fetch('recursos/modelos/modelos.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return genericos;
}

export function cargarModelo(url) {
  if (!escenas.has(url)) {
    const promesa = cargador.loadAsync(url).then((g) => {
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          // Geometría y materiales se comparten entre las copias: se marcan para no borrarlos al quitar una.
          o.geometry.userData.compartida = true;
          for (const mat of [].concat(o.material)) mat.userData.original = true;
        }
      });
      return g.scene;
    });
    promesa.catch(() => escenas.delete(url));
    escenas.set(url, promesa);
  }
  return escenas.get(url);
}

// Qué modelo usar para un mueble del plano: el suyo (si el producto lo trae) o el genérico de su tipo.
export async function modeloDe(m) {
  const producto = m.productoId ? datos.catalogo.find((p) => p.id === m.productoId) : null;
  if (producto?.modelo) return { url: urlArchivo(producto.modelo), propio: true };
  if (m.sinModelo) return null;
  const indice = await cargarGenericos();
  const clave = claveGenerica(m);
  return indice[clave] ? { url: `recursos/modelos/${clave}.glb`, propio: false, info: indice[clave] } : null;
}

function claveGenerica(m) {
  const t = m.tipo;
  if (t === 'sofa' && Number(m.ancho) < 185) return 'sofa-2';
  if (t === 'cama' && Number(m.ancho) < 125) return 'cama-90';
  if (t === 'mesilla' || t === 'mesa-auxiliar') return t === 'mesilla' ? 'mesilla' : 'mesa-auxiliar';
  return t;
}

// Coloca el modelo con el centro en el suelo y lo ajusta a ancho × fondo × alto (en metros).
// Un modelo propio se respeta tal cual si sus medidas casi coinciden; uno genérico se estira a las medidas.
export function ajustar(modelo, ancho, fondo, alto, propio) {
  modelo.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(modelo);
  const tam = caja.getSize(new THREE.Vector3());
  const escala = new THREE.Vector3(ancho / (tam.x || 1), alto / (tam.y || 1), fondo / (tam.z || 1));
  if (propio) {
    const media = (escala.x + escala.y + escala.z) / 3;
    const parecido = [escala.x, escala.y, escala.z].every((e) => Math.abs(e / media - 1) < 0.25);
    if (parecido) escala.setScalar(Math.abs(media - 1) < 0.08 ? 1 : media);
  }
  modelo.scale.multiply(escala);
  modelo.updateMatrixWorld(true);
  const caja2 = new THREE.Box3().setFromObject(modelo);
  const centro = caja2.getCenter(new THREE.Vector3());
  modelo.position.x -= centro.x;
  modelo.position.z -= centro.z;
  modelo.position.y -= caja2.min.y;
  return modelo;
}

// Tiñe la pieza principal del mueble (la que más superficie tiene: la tela de un sofá, el tablero de una mesa).
export function tintar(modelo, color) {
  if (!color) return;
  const cuenta = new Map();
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    const caras = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    for (const mat of [].concat(o.material)) cuenta.set(mat, (cuenta.get(mat) || 0) + caras);
  });
  const principal = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!principal) return;
  const copia = principal.clone();
  copia.userData = {};
  // Se aclara la textura original para que el color elegido se vea parecido al real.
  copia.color = new THREE.Color(color).multiplyScalar(copia.map ? 1.35 : 1);
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map((mat) => (mat === principal ? copia : mat));
    else if (o.material === principal) o.material = copia;
  });
}

// Copia de un modelo lista para colocar: no comparte materiales teñidos con otras copias.
export function copiar(escena) {
  return escena.clone(true);
}

// Algunos cuadros y espejos vienen tumbados (mirando al techo): hay que ponerlos de pie.
function estaTumbado(objeto, tipo) {
  if (!['cuadro', 'espejo'].includes(tipo)) return false;
  objeto.updateMatrixWorld(true);
  const t = new THREE.Box3().setFromObject(objeto).getSize(new THREE.Vector3());
  return t.y < 0.25 * Math.min(t.x, t.z);
}

function orientar(copia, fuente, tipo) {
  const giro = fuente.info?.giro || (estaTumbado(copia, tipo) ? [90, 0, 0] : null);
  if (!giro) return copia;
  const envoltorio = new THREE.Group();
  copia.rotation.set(...giro.map((g) => (g * Math.PI) / 180));
  envoltorio.add(copia);
  return envoltorio;
}

// Copia del modelo de un mueble, girada, ajustada a sus medidas (en metros) y teñida.
export function instancia(escena, fuente, m, ancho, fondo, alto) {
  const copia = ajustar(orientar(copiar(escena), fuente, m.tipo), ancho, fondo, alto, fuente.propio);
  tintar(copia, m.tinte);
  return copia;
}

// Medidas reales (en cm) de un modelo 3D, ya de pie. Sirven para corregir las de la tienda.
export async function medirModelo(url, tipo) {
  const escena = await cargarModelo(url);
  const copia = orientar(copiar(escena), { propio: true }, tipo);
  copia.updateMatrixWorld(true);
  const t = new THREE.Box3().setFromObject(copia).getSize(new THREE.Vector3());
  const cm = (v) => Math.max(1, Math.round(v * 1000) / 10);
  if (![t.x, t.y, t.z].every((v) => v > 0.005 && v < 15)) return null;
  return { ancho: cm(t.x), fondo: cm(t.z), alto: cm(t.y) };
}

// ---------- Vista desde arriba (para el plano 2D) ----------

let fotografo = null;
const vistas = new Map(); // clave → promesa con una imagen PNG (dataURL)

function prepararFotografo() {
  if (fotografo) return fotografo;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a8, 2.2));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(-1, 3, -1.5);
  escena.add(sol);
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
  // Mirando hacia abajo, con la parte de atrás del mueble arriba de la imagen (como en el plano).
  camara.up.set(0, 0, -1);
  camara.position.set(0, 10, 0);
  camara.lookAt(0, 0, 0);
  fotografo = { renderer, escena, camara };
  return fotografo;
}

const claveVista = (m) => `${m.productoId || m.tipo}|${Math.round(m.ancho)}|${Math.round(m.fondo)}|${Math.round(m.alto)}|${m.tinte || ''}|${m.sinModelo ? 1 : 0}`;
const listas = new Map();

// Para el plano: la vista desde arriba si ya está hecha; si no, se prepara y avisa al terminar.
export function vistaCenitalSiEsta(m, alTerminar) {
  const clave = claveVista(m);
  if (listas.has(clave)) return listas.get(clave);
  vistaCenital(m).then((url) => {
    listas.set(clave, url);
    if (url) alTerminar?.();
  });
  return null;
}

// Devuelve una imagen del mueble visto desde arriba, del tamaño de su huella, o null si no tiene modelo.
export function vistaCenital(m) {
  const clave = claveVista(m);
  if (!vistas.has(clave)) {
    vistas.set(
      clave,
      (async () => {
        const fuente = await modeloDe(m);
        if (!fuente) return null;
        const escena = await cargarModelo(fuente.url);
        const { renderer, escena: estudio, camara } = prepararFotografo();
        const ancho = (Number(m.ancho) || 60) / 100;
        const fondo = (Number(m.fondo) || 60) / 100;
        const alto = (Number(m.alto) || 75) / 100;
        const copia = instancia(escena, fuente, m, ancho, fondo, alto);
        estudio.add(copia);
        const lado = 384;
        const proporcion = ancho / fondo;
        renderer.setSize(proporcion >= 1 ? lado : Math.max(32, Math.round(lado * proporcion)), proporcion >= 1 ? Math.max(32, Math.round(lado / proporcion)) : lado, false);
        Object.assign(camara, { left: -ancho / 2, right: ancho / 2, top: fondo / 2, bottom: -fondo / 2 });
        camara.updateProjectionMatrix();
        renderer.render(estudio, camara);
        const url = renderer.domElement.toDataURL('image/png');
        estudio.remove(copia);
        return url;
      })().catch(() => null),
    );
  }
  return vistas.get(clave);
}
