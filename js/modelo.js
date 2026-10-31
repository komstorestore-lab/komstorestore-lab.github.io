// Cómo son los proyectos, habitaciones y muebles, y los valores con los que empiezan.
import { uid, hoy } from './ui.js';
import { datos } from './estado.js';

export const ESTADOS_PROYECTO = [
  ['idea', 'Idea'],
  ['presupuesto', 'Presupuesto enviado'],
  ['curso', 'En curso'],
  ['terminado', 'Terminado'],
];

export const FASES_INICIALES = [
  'Visita y toma de medidas',
  'Propuesta de diseño',
  'Presupuesto aceptado',
  'Pedidos a proveedores',
  'Obra y montaje',
  'Entrega al cliente',
];

export function nuevoPlano(ancho = 400, largo = 300) {
  return {
    puntos: [{ x: 0, y: 0 }, { x: ancho, y: 0 }, { x: ancho, y: largo }, { x: 0, y: largo }],
    cerrado: true,
    altura: 250,
    grosor: 12,
    aberturas: [],
    muebles: [],
    acabados: { pared: '#efe9e1', paredes: {}, suelo: 'madera-clara', colorSuelo: '', techo: '#ffffff' },
  };
}

export function nuevaHabitacion(nombre = 'Salón', ancho, largo) {
  return { id: uid(), nombre, plano: nuevoPlano(ancho, largo) };
}

export function nuevoProyecto(nombre) {
  return {
    id: uid(),
    nombre,
    estado: 'idea',
    creado: hoy(),
    cliente: { nombre: '', telefono: '', email: '', direccion: '' },
    notas: '',
    habitaciones: [nuevaHabitacion()],
    fases: FASES_INICIALES.map((n) => ({ id: uid(), nombre: n, hecha: false, fecha: '' })),
    proveedores: [],
    pagos: [],
    fotos: [],
    presupuesto: { numero: '', fecha: hoy(), lineas: [], descuento: 0, notas: '' },
  };
}

export const buscarProyecto = (id) => datos.proyectos.find((p) => p.id === id);
export const buscarProducto = (id) => datos.catalogo.find((p) => p.id === id);

// Muebles genéricos para el plano. Medidas en cm: ancho × fondo × alto.
// Los que tienen modelo 3D (de IKEA) toman sus medidas reales de recursos/modelos/modelos.json.
export const MUEBLES_GENERICOS = [
  { grupo: 'Decoración', tipo: 'cuadro', nombre: 'Cuadro', ancho: 120, fondo: 3, alto: 80, color: '#7f8a8c' },
  { grupo: 'Decoración', tipo: 'espejo', nombre: 'Espejo', ancho: 40, fondo: 5, alto: 150, color: '#d9dee0' },
  { grupo: 'Decoración', tipo: 'cortina', nombre: 'Cortinas', ancho: 180, fondo: 20, alto: 250, color: '#e8e0d2' },
  { grupo: 'Decoración', tipo: 'cojin', nombre: 'Cojín', ancho: 45, fondo: 15, alto: 45, color: '#c9b39a', elevacion: 45 },
  { grupo: 'Decoración', tipo: 'jarron', nombre: 'Jarrón', ancho: 12, fondo: 12, alto: 25, color: '#f2efe9', elevacion: 75 },
  { grupo: 'Iluminación', tipo: 'lampara-techo', nombre: 'Lámpara de techo', ancho: 45, fondo: 45, alto: 15, color: '#d8c39b' },
  { grupo: 'Iluminación', tipo: 'lampara-mesa', nombre: 'Lámpara de mesa', ancho: 20, fondo: 26, alto: 30, color: '#e8d9b5', elevacion: 75 },
  { grupo: 'Salón', tipo: 'puf', nombre: 'Puf', ancho: 40, fondo: 40, alto: 40, color: '#b8a48f' },
  { grupo: 'Salón', tipo: 'mesa-auxiliar', nombre: 'Mesa auxiliar', ancho: 55, fondo: 55, alto: 45, color: '#a67c52' },
  { grupo: 'Salón', tipo: 'sofa', nombre: 'Sofá 3 plazas', ancho: 210, fondo: 90, alto: 85, color: '#8c8f94' },
  { grupo: 'Salón', tipo: 'sofa', nombre: 'Sofá 2 plazas', ancho: 160, fondo: 88, alto: 85, color: '#8c8f94' },
  { grupo: 'Salón', tipo: 'sofa-l', nombre: 'Sofá chaise longue', ancho: 260, fondo: 160, alto: 85, color: '#8c8f94' },
  { grupo: 'Salón', tipo: 'sillon', nombre: 'Sillón', ancho: 80, fondo: 85, alto: 90, color: '#b08a6a' },
  { grupo: 'Salón', tipo: 'mesa-centro', nombre: 'Mesa de centro', ancho: 110, fondo: 60, alto: 40, color: '#a67c52' },
  { grupo: 'Salón', tipo: 'mueble-tv', nombre: 'Mueble de TV', ancho: 180, fondo: 40, alto: 50, color: '#d8cfc4' },
  { grupo: 'Salón', tipo: 'estanteria', nombre: 'Estantería', ancho: 100, fondo: 35, alto: 190, color: '#c8a27a' },
  { grupo: 'Salón', tipo: 'alfombra', nombre: 'Alfombra', ancho: 200, fondo: 140, alto: 1, color: '#d9c7b0' },
  { grupo: 'Comedor', tipo: 'mesa', nombre: 'Mesa de comedor', ancho: 160, fondo: 90, alto: 75, color: '#a67c52' },
  { grupo: 'Comedor', tipo: 'mesa-redonda', nombre: 'Mesa redonda', ancho: 110, fondo: 110, alto: 75, color: '#a67c52' },
  { grupo: 'Comedor', tipo: 'silla', nombre: 'Silla', ancho: 45, fondo: 50, alto: 85, color: '#6f5643' },
  { grupo: 'Comedor', tipo: 'aparador', nombre: 'Aparador', ancho: 160, fondo: 45, alto: 80, color: '#c8a27a' },
  { grupo: 'Dormitorio', tipo: 'cama', nombre: 'Cama 150', ancho: 160, fondo: 200, alto: 50, color: '#e8e2d8' },
  { grupo: 'Dormitorio', tipo: 'cama', nombre: 'Cama 90', ancho: 100, fondo: 200, alto: 50, color: '#e8e2d8' },
  { grupo: 'Dormitorio', tipo: 'mesilla', nombre: 'Mesilla', ancho: 45, fondo: 40, alto: 50, color: '#c8a27a' },
  { grupo: 'Dormitorio', tipo: 'armario', nombre: 'Armario', ancho: 200, fondo: 60, alto: 240, color: '#f1ede6' },
  { grupo: 'Dormitorio', tipo: 'comoda', nombre: 'Cómoda', ancho: 100, fondo: 50, alto: 85, color: '#c8a27a' },
  { grupo: 'Dormitorio', tipo: 'escritorio', nombre: 'Escritorio', ancho: 120, fondo: 60, alto: 75, color: '#d8cfc4' },
  { grupo: 'Cocina', tipo: 'encimera', nombre: 'Módulo de cocina', ancho: 60, fondo: 60, alto: 90, color: '#f1ede6' },
  { grupo: 'Cocina', tipo: 'nevera', nombre: 'Frigorífico', ancho: 60, fondo: 65, alto: 185, color: '#d9dbde' },
  { grupo: 'Cocina', tipo: 'isla', nombre: 'Isla', ancho: 180, fondo: 90, alto: 90, color: '#f1ede6' },
  { grupo: 'Baño', tipo: 'banera', nombre: 'Bañera', ancho: 170, fondo: 75, alto: 55, color: '#ffffff' },
  { grupo: 'Baño', tipo: 'ducha', nombre: 'Plato de ducha', ancho: 120, fondo: 80, alto: 5, color: '#ffffff' },
  { grupo: 'Baño', tipo: 'lavabo', nombre: 'Mueble de lavabo', ancho: 80, fondo: 46, alto: 85, color: '#ffffff' },
  { grupo: 'Baño', tipo: 'inodoro', nombre: 'Inodoro', ancho: 38, fondo: 65, alto: 75, color: '#ffffff' },
  { grupo: 'Decoración', tipo: 'planta', nombre: 'Planta', ancho: 45, fondo: 45, alto: 120, color: '#5f7d4e' },
  { grupo: 'Decoración', tipo: 'lampara', nombre: 'Lámpara de pie', ancho: 40, fondo: 40, alto: 160, color: '#e8d9b5' },
];

export const CATEGORIAS_CATALOGO = ['Sofás y sillones', 'Mesas', 'Sillas', 'Camas', 'Almacenaje', 'Iluminación', 'Textil y alfombras', 'Cuadros y espejos', 'Plantas', 'Decoración', 'Cocina', 'Baño', 'Revestimientos', 'Otros'];

// Tipos de mueble (para el plano y el 3D), con su nombre.
export const TIPOS_MUEBLE = [
  ['sofa', 'Sofá'], ['sofa-l', 'Sofá con chaise longue'], ['sillon', 'Sillón'], ['puf', 'Puf'],
  ['mesa', 'Mesa'], ['mesa-redonda', 'Mesa redonda'], ['mesa-centro', 'Mesa de centro'], ['mesa-auxiliar', 'Mesa auxiliar'], ['escritorio', 'Escritorio'],
  ['silla', 'Silla o taburete'], ['cama', 'Cama'], ['mesilla', 'Mesilla'], ['armario', 'Armario'], ['comoda', 'Cómoda'], ['aparador', 'Aparador'],
  ['mueble-tv', 'Mueble de TV'], ['estanteria', 'Estantería'], ['alfombra', 'Alfombra'], ['cortina', 'Cortina'], ['cojin', 'Cojín'],
  ['cuadro', 'Cuadro'], ['espejo', 'Espejo'], ['planta', 'Planta'], ['jarron', 'Jarrón'], ['decoracion', 'Decoración'],
  ['lampara', 'Lámpara de pie'], ['lampara-techo', 'Lámpara de techo'], ['lampara-mesa', 'Lámpara de mesa'], ['aplique', 'Aplique de pared'],
  ['encimera', 'Mueble de cocina'], ['isla', 'Isla de cocina'], ['nevera', 'Frigorífico'], ['lavabo', 'Mueble de lavabo'], ['banera', 'Bañera'], ['ducha', 'Ducha'], ['inodoro', 'Inodoro'], ['caja', 'Otro'],
];

export { SIN_CHOQUE } from './calculos.js';

// Tipo de forma 3D que se usa para un producto del catálogo según su categoría.
export function tipoPorCategoria(categoria) {
  return {
    'Sofás y sillones': 'sofa',
    Mesas: 'mesa',
    Sillas: 'silla',
    Camas: 'cama',
    Almacenaje: 'armario',
    Iluminación: 'lampara',
    'Textil y alfombras': 'alfombra',
    Decoración: 'planta',
    Cocina: 'encimera',
    Baño: 'lavabo',
    'Cuadros y espejos': 'cuadro',
    Plantas: 'planta',
  }[categoria] || 'caja';
}

export const SUELOS = [
  ['madera-clara', 'Tarima laminada clara'],
  ['roble', 'Roble natural'],
  ['madera-oscura', 'Madera oscura'],
  ['espiga', 'Parquet en espiga'],
  ['parquet', 'Parquet clásico'],
  ['porcelanico', 'Porcelánico'],
  ['gres-blanco', 'Gres blanco alargado'],
  ['marmol', 'Mármol'],
  ['barro', 'Barro cocido'],
  ['hidraulico', 'Baldosa hidráulica'],
  ['microcemento', 'Microcemento'],
  ['terrazo', 'Terrazo'],
  ['pizarra', 'Pizarra'],
  ['moqueta', 'Moqueta'],
];

export const ESTILOS_IA = [
  ['nordico', 'Nórdico'],
  ['japandi', 'Japandi'],
  ['moderno', 'Moderno'],
  ['minimalista', 'Minimalista'],
  ['industrial', 'Industrial'],
  ['mediterraneo', 'Mediterráneo'],
  ['boho', 'Boho'],
  ['clasico', 'Clásico elegante'],
  ['rustico', 'Rústico'],
  ['vintage', 'Años 50 (mid-century)'],
  ['', 'Sin estilo: solo mis indicaciones'],
];
