// Materiales de la vista 3D con texturas reales (Poly Haven, CC0): suelos, paredes y tejidos.
import * as THREE from '../vendor/three.module.min.js';

let indice = null;
let promesa = null;
const cargador = new THREE.TextureLoader();
const texturas = new Map(); // url → textura original (las copias comparten la imagen)

export const REVESTIMIENTOS = [
  ['pintura', 'Pintura lisa'],
  ['ladrillo', 'Ladrillo visto'],
  ['madera-pared', 'Friso de madera'],
  ['piedra', 'Piedra'],
  ['azulejo-pared', 'Azulejo'],
  ['microcemento', 'Microcemento'],
];

export const TELAS = [
  ['lino', 'Lino'],
  ['boucle', 'Bouclé'],
  ['terciopelo', 'Terciopelo'],
  ['pana', 'Pana'],
  ['cuero', 'Cuero'],
];

export function cargarTexturas() {
  promesa ||= fetch('recursos/texturas/texturas.json')
    .then((r) => (r.ok ? r.json() : { texturas: {} }))
    .then((j) => {
      indice = j.texturas || {};
      return indice;
    })
    .catch(() => {
      indice = {};
      return indice;
    });
  return promesa;
}

function textura(url, { color = false, repetir = 1 } = {}) {
  if (!texturas.has(url)) {
    const t = cargador.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    texturas.set(url, t);
  }
  const copia = texturas.get(url).clone();
  copia.repeat.set(repetir, repetir);
  copia.needsUpdate = true;
  return copia;
}

// Material con los mapas de una textura del índice. «metros»: cuánto mide la textura en la escena.
function conTextura(clave, { color = '#ffffff', sinColor = false, escalaNormal = 1, rugosidad = 1, metros } = {}) {
  const t = indice?.[clave];
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rugosidad });
  if (!t) return mat;
  const repetir = 1 / (metros || t.escala || 1);
  if (t.color && !sinColor) mat.map = textura(t.color, { color: true, repetir });
  if (t.normal) {
    mat.normalMap = textura(t.normal, { repetir });
    mat.normalScale.set(escalaNormal, escalaNormal);
  }
  if (t.rugosidad) mat.roughnessMap = textura(t.rugosidad, { repetir });
  return mat;
}

export function materialSuelo(tipo, tono) {
  if (tipo === 'hidraulico') return materialHidraulico(tono);
  const clave = indice?.[tipo] ? tipo : 'madera-clara';
  const brillo = { marmol: 0.55, porcelanico: 0.7, 'gres-blanco': 0.7, microcemento: 0.9, terrazo: 0.8 }[clave] ?? 1;
  return conTextura(clave, { color: tono || '#ffffff', rugosidad: brillo });
}

export function materialPared(revestimiento, color) {
  if (!revestimiento || revestimiento === 'pintura') {
    // Pintura: el color elegido con el relieve suave del yeso.
    return conTextura('pintura', { color, sinColor: true, escalaNormal: 0.35, rugosidad: 1 });
  }
  return conTextura(revestimiento, { color: '#ffffff' });
}

export function materialTela(tipo, color, dobleCara = false) {
  const mat = conTextura(indice?.[tipo] ? tipo : 'lino', { color, metros: 0.35, escalaNormal: 0.8 });
  // Las texturas de tela tienen color propio: se aclaran para que manden el color elegido.
  if (mat.map) mat.color = new THREE.Color(color).multiplyScalar(1.25);
  if (dobleCara) mat.side = THREE.DoubleSide;
  return mat;
}

// Baldosa hidráulica dibujada (no hay textura real de este tipo).
let hidraulico = null;
function materialHidraulico(tono) {
  if (!hidraulico) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    const n = 4;
    const t = 512 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        x.save();
        x.translate(i * t, j * t);
        x.fillStyle = '#efe7da';
        x.fillRect(0, 0, t, t);
        x.fillStyle = '#5b7d8a';
        x.beginPath();
        x.moveTo(t / 2, t * 0.1);
        x.lineTo(t * 0.9, t / 2);
        x.lineTo(t / 2, t * 0.9);
        x.lineTo(t * 0.1, t / 2);
        x.fill();
        x.fillStyle = '#c4703f';
        x.beginPath();
        x.arc(t / 2, t / 2, t * 0.16, 0, Math.PI * 2);
        x.fill();
        for (const [cx, cy] of [[0, 0], [t, 0], [0, t], [t, t]]) {
          x.fillStyle = '#2f3a40';
          x.beginPath();
          x.arc(cx, cy, t * 0.2, 0, Math.PI * 2);
          x.fill();
        }
        x.strokeStyle = 'rgba(0,0,0,0.18)';
        x.strokeRect(0, 0, t, t);
        x.restore();
      }
    hidraulico = new THREE.CanvasTexture(c);
    hidraulico.colorSpace = THREE.SRGBColorSpace;
    hidraulico.wrapS = hidraulico.wrapT = THREE.RepeatWrapping;
    hidraulico.repeat.set(1 / 0.8, 1 / 0.8);
    hidraulico.anisotropy = 8;
  }
  const mat = new THREE.MeshStandardMaterial({ map: hidraulico, roughness: 0.55, color: tono || '#ffffff' });
  mat.userData.texturaCompartida = true;
  if (indice?.porcelanico?.normal) {
    mat.normalMap = textura(indice.porcelanico.normal, { repetir: 1 / 0.8 });
    mat.normalScale.set(0.5, 0.5);
  }
  return mat;
}

// Muestra de una textura para los menús (la imagen de color, o un color liso).
export function muestra(clave) {
  return indice?.[clave]?.color || '';
}

export function infoTextura(clave) {
  return indice?.[clave] || null;
}
