import { h, vaciar, ventana, campo, entrada, areaTexto, selector, aviso, confirmar, elegirArchivo, descargar, hoy } from '../ui.js';
import { datos, guardar, guardarYa, urlArchivo, subirArchivo, pedir, info } from '../estado.js';

export async function mostrar(el) {
  const e = datos.estudio;
  const zonaLogo = h('div');
  const pintarLogo = () =>
    vaciar(
      zonaLogo,
      e.logo ? h('img', { src: urlArchivo(e.logo), alt: 'Logo', style: { maxHeight: '60px', maxWidth: '200px', display: 'block', marginBottom: '6px' } }) : null,
      h('div', { class: 'fila' }, h('button', { class: 'boton pequeno', onclick: async () => { const [a] = await elegirArchivo('image/png,image/jpeg,image/webp'); if (!a) return; try { e.logo = await subirArchivo(a); guardar(); pintarLogo(); } catch (err) { aviso(err.message, 'error'); } } }, e.logo ? 'Cambiar logo' : '+ Logo'), e.logo ? h('button', { class: 'boton pequeno', onclick: () => { e.logo = ''; guardar(); pintarLogo(); } }, 'Quitar') : null),
    );
  pintarLogo();

  const zonaIa = h('div');
  const zonaMovil = h('div');
  el.append(
    h('div', { class: 'cabecera' }, h('div', {}, h('h1', {}, 'Ajustes'))),
    h(
      'div',
      { class: 'tarjeta' },
      h('h2', {}, 'Tu estudio (sale en los presupuestos)'),
      h('div', { class: 'rejilla' }, campo('Nombre', entrada(e, 'nombre', { alCambiar: guardar })), campo('NIF', entrada(e, 'nif', { alCambiar: guardar })), campo('Teléfono', entrada(e, 'telefono', { tipo: 'tel', alCambiar: guardar })), campo('Correo', entrada(e, 'email', { tipo: 'email', alCambiar: guardar })), campo('Web', entrada(e, 'web', { alCambiar: guardar }))),
      campo('Dirección', entrada(e, 'direccion', { alCambiar: guardar })),
      h('div', { class: 'rejilla' }, campo('Logo', zonaLogo), campo('IVA por defecto', selector(e, 'iva', [[21, '21 %'], [10, '10 %'], [4, '4 %'], [0, '0 %']], { alCambiar: (v) => { e.iva = Number(v); guardar(); } })), campo('Validez del presupuesto (días)', entrada(e, 'validez', { tipo: 'number', min: 1, alCambiar: guardar }))),
      campo('Condiciones (al pie del presupuesto)', areaTexto(e, 'condiciones', { rows: 4, alCambiar: guardar, placeholder: 'Ej.: Forma de pago: 40 % al aceptar, 40 % al empezar y 20 % a la entrega. Plazo de entrega de los muebles según proveedor.' })),
    ),
    info.movil ? copiasMovil() : h('div', { class: 'tarjeta' }, h('h2', {}, 'Rediseño con IA'), zonaIa),
    info.local ? h('div', { class: 'tarjeta' }, h('h2', {}, 'Usar desde el móvil (y realidad aumentada)'), zonaMovil) : null,
    info.local ? copias() : null,
  );
  if (!info.movil) pintarIa(zonaIa);
  if (info.local) pintarMovil(zonaMovil);
}

async function pintarIa(zona) {
  let a;
  try {
    a = await pedir('/api/ia');
  } catch (err) {
    vaciar(zona, h('p', { class: 'problema' }, err.message));
    return;
  }
  const estado = { proveedor: a.proveedor, modelo: a.modelo, calidad: a.calidad, clave: '' };
  const clave = h('input', { type: 'password', autocomplete: 'off', placeholder: a.hayClave ? `Guardada (termina en …${a.finClave}). Escribe otra para cambiarla.` : 'Pega aquí la clave' });
  clave.addEventListener('input', () => {
    estado.clave = clave.value;
  });
  const zonaModelo = h('div');
  const ayuda = h('small');
  const resultadoPrueba = h('p', { style: { margin: '8px 0 0' } });
  const pintarModelo = () => {
    const p = a.proveedores[estado.proveedor];
    const opciones = p.modelos.some(([id]) => id === estado.modelo) ? p.modelos : [...p.modelos, [estado.modelo, `${estado.modelo} (elegido a mano)`]];
    vaciar(zonaModelo, campo('Modelo', selector(estado, 'modelo', opciones), 'El recomendado va bien para casi todo.'));
    vaciar(ayuda, 'Crea la clave en ', h('a', { href: p.claves, target: '_blank', rel: 'noopener noreferrer' }, p.claves.replace('https://', '')), '. Se paga por imagen; activa allí la facturación y, si puedes, pon un límite de gasto.');
  };
  pintarModelo();
  const guardarAjustes = async () => {
    if (estado.proveedor !== a.proveedor && !estado.clave && a.hayClave && !(await confirmar('Al cambiar de servicio se borra la clave anterior. ¿Seguir sin poner una nueva?'))) return false;
    try {
      await pedir('/api/ia', { metodo: 'PUT', cuerpo: estado });
      return true;
    } catch (err) {
      aviso(err.message, 'error');
      return false;
    }
  };
  vaciar(
    zona,
    h('p', { style: { color: 'var(--texto-suave)' } }, 'La clave se guarda solo en este ordenador (carpeta «datos», archivo ia.json) y nunca se muestra en pantalla. Las fotos que rediseñes se envían al servicio elegido.'),
    h(
      'div',
      { class: 'rejilla' },
      campo('Servicio', selector(estado, 'proveedor', Object.entries(a.proveedores).map(([id, p]) => [id, p.nombre]), { alCambiar: (v) => { estado.modelo = a.proveedores[v].modelo; pintarModelo(); } })),
      zonaModelo,
      campo('Calidad de la imagen', selector(estado, 'calidad', [['2K', 'Alta (2K)'], ['1K', 'Normal (1K, más barata)']]), 'Solo para Google Gemini.'),
    ),
    campo('Clave (API key)', clave, ayuda),
    h(
      'div',
      { class: 'botones izquierda' },
      h('button', { class: 'boton principal', onclick: async () => { if (await guardarAjustes()) { aviso('Ajustes de IA guardados'); pintarIa(zona); } } }, 'Guardar'),
      h('button', {
        class: 'boton',
        onclick: async () => {
          if (estado.clave && !(await guardarAjustes())) return;
          vaciar(resultadoPrueba, h('span', { class: 'girando' }), ' Comprobando…');
          try {
            const r = await pedir('/api/ia/probar', { metodo: 'POST' });
            vaciar(resultadoPrueba, h('span', { style: { color: r.ok ? 'var(--ok)' : 'var(--peligro)' } }, `${r.ok ? '✓' : '✗'} ${r.mensaje}`));
          } catch (err) {
            vaciar(resultadoPrueba, h('span', { class: 'problema' }, err.message));
          }
        },
      }, 'Probar la clave (gratis)'),
      a.hayClave ? h('button', { class: 'boton peligro', onclick: async () => { if (!(await confirmar('¿Borrar la clave guardada?', { si: 'Borrar', peligro: true }))) return; await pedir('/api/ia', { metodo: 'PUT', cuerpo: { ...estado, borrarClave: true } }); pintarIa(zona); } }, 'Borrar la clave') : null,
    ),
    resultadoPrueba,
  );
}

async function pintarMovil(zona) {
  let r;
  try {
    r = await pedir('/api/red');
  } catch (err) {
    vaciar(zona, h('p', { class: 'problema' }, err.message));
    return;
  }
  const cambiar = async (movil, nuevoCodigo = false) => {
    try {
      await pedir('/api/red', { metodo: 'PUT', cuerpo: { movil, nuevoCodigo } });
      setTimeout(() => pintarMovil(zona), 600);
    } catch (err) {
      aviso(err.message, 'error');
    }
  };
  vaciar(
    zona,
    h('p', { style: { color: 'var(--texto-suave)' } }, 'Con esto activado, el móvil o la tablet pueden abrir la app mientras estén en la misma wifi que este ordenador (y el ordenador encendido). Sirve para hacer fotos de una habitación y rediseñarla, enseñar los planos al cliente o ver un producto con modelo 3D en su casa con la cámara (realidad aumentada).'),
    r.movil
      ? h(
          'div',
          {},
          r.direcciones.length ? h('div', { class: 'fila', style: { alignItems: 'flex-start', gap: '20px' } }, codigoQr(`${r.direcciones[0]}entrar?codigo=${r.codigo}`), h('p', { style: { maxWidth: '320px' } }, h('b', {}, 'Lo más fácil: '), 'apunta la cámara del móvil a este código y abre el enlace. Entrarás directamente.')) : null,
          h('p', {}, 'O bien: 1. En el móvil, abre el navegador y escribe una de estas direcciones:'),
          h('ul', {}, r.direcciones.length ? r.direcciones.map((d) => h('li', {}, h('code', { style: { fontSize: '17px' } }, d))) : h('li', {}, 'No se encuentra la red de este ordenador.')),
          h('p', {}, '2. Escribe este código: ', h('b', { style: { fontSize: '22px', letterSpacing: '4px' } }, r.codigo)),
          h('small', {}, 'La primera vez, Windows puede preguntar si permites que Node.js use la red: acepta solo para redes privadas. No lo actives en wifis públicas.'),
          h('div', { class: 'botones izquierda' }, h('button', { class: 'boton', onclick: () => cambiar(true, true) }, 'Cambiar el código'), h('button', { class: 'boton peligro', onclick: () => cambiar(false) }, 'Desactivar')),
        )
      : h('div', { class: 'botones izquierda' }, h('button', { class: 'boton principal', onclick: () => cambiar(true) }, 'Activar el uso desde el móvil')),
  );
}

// Código QR con la dirección para entrar desde el móvil (librería qrcode-generator, MIT).
let libreriaQr = null;
function codigoQr(texto) {
  const caja = h('div', { style: { width: '180px', height: '180px', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde)' }, role: 'img', 'aria-label': 'Código QR para entrar desde el móvil' });
  libreriaQr ||= new Promise((resolver, rechazar) => {
    const s = h('script', { src: '/vendor/qrcode.js' });
    s.onload = () => resolver(window.qrcode);
    s.onerror = rechazar;
    document.head.append(s);
  });
  libreriaQr
    .then((qrcode) => {
      const qr = qrcode(0, 'M');
      qr.addData(texto);
      qr.make();
      caja.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      caja.querySelector('svg')?.setAttribute('style', 'width:100%;height:100%');
    })
    .catch(() => caja.append('No se ha podido crear el código QR.'));
  return caja;
}

function copias() {
  const zona = h('div', { class: 'tarjeta' });
  const pintar = async () => {
    const i = await pedir('/api/info').catch(() => info);
    const sel = { copia: i.copias?.[i.copias.length - 1] || '' };
    vaciar(
      zona,
      h('h2', {}, 'Copias de seguridad'),
      h('p', { style: { color: 'var(--texto-suave)' } }, 'Tus datos están en ', h('code', {}, i.carpetaDatos), '. Cada día que trabajas se guarda una copia de cómo estaban al empezar (se guardan las últimas 30). Las fotos y modelos están en la subcarpeta «archivos».'),
      i.copias?.length
        ? h(
            'div',
            { class: 'fila' },
            selector(sel, 'copia', [...i.copias].reverse().map((c) => [c, c.replace('datos-', '').replace('.json', '')]), { style: { width: 'auto' } }),
            h('button', {
              class: 'boton',
              onclick: async () => {
                if (!(await confirmar(`¿Volver a cómo estaban los datos el ${sel.copia.replace('datos-', '').replace('.json', '')}? Se pierden los cambios hechos después.`, { si: 'Restaurar', peligro: true }))) return;
                await guardarYa();
                try {
                  await pedir('/api/restaurar', { metodo: 'POST', cuerpo: { copia: sel.copia } });
                  aviso('Copia restaurada');
                  setTimeout(() => location.reload(), 600);
                } catch (err) {
                  aviso(err.message, 'error');
                }
              },
            }, 'Restaurar esta copia'),
          )
        : h('p', {}, 'Todavía no hay copias.'),
      h('h3', { style: { marginTop: '18px' } }, 'Pasar los datos al móvil (o traerlos del móvil)'),
      h('p', { style: { color: 'var(--texto-suave)' } }, 'La copia completa lleva tus proyectos, el catálogo, las fotos y los modelos 3D en un solo archivo. Guárdala en tu nube (Google Drive o iCloud) y ábrela en la app del móvil. Para traer al ordenador lo que hayas hecho en el móvil, haz allí una copia y recupérala aquí.'),
      h(
        'div',
        { class: 'botones izquierda' },
        h('a', { class: 'boton principal', href: '/api/copia' }, '⤓ Copia completa (para el móvil)'),
        h('button', { class: 'boton', onclick: () => recuperarCompleta() }, '⤒ Recuperar una copia completa'),
      ),
      h(
        'div',
        { class: 'botones izquierda' },
        h('button', { class: 'boton', onclick: () => descargar(`interiorismo-datos-${hoy()}.json`, new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' })) }, '⤓ Descargar los datos (sin fotos)'),
        h('button', {
          class: 'boton',
          onclick: async () => {
            if (!(await confirmar('¿Cerrar la app? Para volver a abrirla, usa el acceso directo del Escritorio.', { si: 'Cerrar' }))) return;
            await guardarYa();
            await pedir('/api/apagar', { metodo: 'POST' }).catch(() => {});
            document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">La app está cerrada. Ya puedes cerrar esta pestaña.</p>';
          },
        }, 'Cerrar la app'),
      ),
    );
  };
  pintar();
  return zona;
}

// App del móvil: los datos están en el propio móvil. Las copias se guardan en la nube del móvil (Drive o iCloud).
function copiasMovil() {
  const espacio = h('p', { style: { color: 'var(--texto-suave)' } });
  navigator.storage?.estimate?.().then((e) => {
    if (e?.usage) espacio.textContent = `La app ocupa ${Math.round(e.usage / 1048576)} MB en este móvil.`;
  });
  const guardarCopia = async (boton) => {
    boton.disabled = true;
    try {
      await guardarYa();
      const r = await fetch('/api/copia');
      if (!r.ok) throw new Error((await r.json()).error);
      const nombre = (r.headers.get('content-disposition')?.match(/filename="([^"]+)"/) || [])[1] || 'interiorismo-movil.zip';
      const archivo = new File([await r.blob()], nombre, { type: 'application/zip' });
      // En el móvil se abre el menú de compartir: desde ahí se guarda en Drive, iCloud o donde se quiera.
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: 'Copia de Interiorismo' }).catch((e) => {
          if (e.name !== 'AbortError') descargar(nombre, archivo);
        });
      } else descargar(nombre, archivo);
    } catch (e) {
      aviso(e.message || 'No se ha podido hacer la copia', 'error');
    }
    boton.disabled = false;
  };
  const botonGuardar = h('button', { class: 'boton principal', onclick: () => guardarCopia(botonGuardar) }, '⤓ Guardar una copia');
  return h(
    'div',
    { class: 'tarjeta' },
    h('h2', {}, 'Tus datos y las copias'),
    h('p', {}, 'Tus proyectos, el catálogo, las fotos y los modelos 3D se guardan en este móvil y funcionan sin internet.'),
    espacio,
    h('p', {}, h('b', {}, 'Haz una copia de vez en cuando'), ' y guárdala en tu nube (Google Drive o iCloud). Te sirve para no perder nada si cambias de móvil, y para pasar los datos al ordenador: allí, en Ajustes, «Recuperar una copia completa».'),
    h('div', { class: 'botones izquierda' }, botonGuardar, h('button', { class: 'boton', onclick: () => recuperarCompleta() }, '⤒ Recuperar una copia')),
    h('small', {}, 'Para traer lo del ordenador: en el ordenador, Ajustes > «Copia completa (para el móvil)»; guárdala en tu nube y recupérala aquí.'),
  );
}

// Recupera una copia completa (por ejemplo, la hecha en el móvil): sustituye los datos y añade las fotos que falten.
async function recuperarCompleta() {
  const [archivo] = await elegirArchivo('.zip,application/zip');
  if (!archivo) return;
  if (!(await confirmar(`¿Recuperar «${archivo.name}»? Tus proyectos y tu catálogo pasarán a ser los de esa copia. Antes se guarda cómo están ahora, por si acaso.`, { si: 'Recuperar', peligro: true }))) return;
  await guardarYa();
  const espera = ventana('Recuperando la copia', h('p', {}, h('span', { class: 'girando' }), ' Esto puede tardar un poco si la copia es grande…'));
  try {
    const r = await fetch('/api/copia', { method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-Panel': '1' }, body: archivo });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    espera();
    aviso(`Copia recuperada${j.nuevos ? ` (${j.nuevos} fotos o modelos nuevos)` : ''}`);
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    espera();
    aviso(e.message || 'No se ha podido recuperar la copia', 'error');
  }
}
