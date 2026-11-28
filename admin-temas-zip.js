/* Cake Chávez — instalar, actualizar, activar, restaurar y eliminar temáticas ZIP. */
(function () {
  'use strict';
  var w = window, d = document;
  var BUCKET = 'cake-theme-assets', MAX_ZIP = 100 * 1024 * 1024, MAX_FILES = 250;
  var CONOCIDOS = {
    'anio-nuevo': ['Año Nuevo', '🎆'], 'carino-amistad': ['Día del Cariño y la Amistad', '💗'],
    'semana-santa': ['Semana Santa', '🌿'], 'dia-madre': ['Día de la Madre', '🌷'],
    'dia-padre': ['Día del Padre', '👔'], 'dia-nino': ['Día del Niño', '🎈'],
    halloween: ['Halloween', '🎃'], 'tema-oficial': ['Tema Oficial', '🎀'],
    'tematica-adicional': ['Jardín Encantado', '🦋'], navidad: ['Navidad', '🎄']
  };
  var EXT = { css: 'style', webp: 'image', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', mp3: 'audio', ogg: 'audio', wav: 'audio', mp4: 'video', webm: 'video' };
  var MIME = { css: 'text/css', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm' };
  var estado = { paquetes: [], activo: 'navidad', analisis: null, modo: 'agregar', tema: null, esperada: 0, ocupado: false };
  var sec, modal, input, previewUrl = null;
  function $(id) { return d.getElementById(id); }
  function client() { return w.CakeAdmin && w.CakeAdmin.getClient ? w.CakeAdmin.getClient() : null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function msg(texto, tipo) { var m = $('cake-zip-msg'); if (m) { m.textContent = texto || ''; m.className = 'admin-message' + (tipo ? ' ' + tipo : ''); } }
  function modalMsg(texto, tipo) { var m = $('cake-zip-modal-msg'); if (m) { m.textContent = texto || ''; m.className = 'admin-message' + (tipo ? ' ' + tipo : ''); } }
  function nombre(id) { return (CONOCIDOS[id] && CONOCIDOS[id][0]) || id.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function emoji(id) { return (CONOCIDOS[id] && CONOCIDOS[id][1]) || '✨'; }
  function extension(path) { return (path.split('.').pop() || '').toLowerCase(); }
  function texto(bytes) { return w.fflate.strFromU8(bytes); }
  function json(bytes, label) { try { return JSON.parse(texto(bytes)); } catch (e) { throw new Error(label + ' no contiene JSON válido.'); } }
  function rutaValida(path) { return path && path.length < 400 && !path.startsWith('/') && path.indexOf('\\') < 0 && !/(^|\/)\.\.?($|\/)/.test(path) && !/[\u0000-\u001f]/.test(path); }
  function resolver(base, rel) {
    var partes = base.split('/').slice(0, -1);
    rel.split('/').forEach(function (p) { if (!p || p === '.') return; if (p === '..') partes.pop(); else partes.push(p); });
    return partes.join('/');
  }
  function limpiarCss(css, path) {
    css = css.replace(/@import\s+(?:url\()?\s*['"]https:\/\/fonts\.googleapis\.com\/[^'"]+['"]\)?\s*;?/gi, '');
    if (/@import|expression\s*\(|javascript:|-moz-binding|behavior\s*:/i.test(css)) throw new Error('El estilo ' + path + ' contiene código o importaciones no permitidas.');
    var urls = [];
    css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, function (_, q, url) { urls.push(url); return _; });
    urls.forEach(function (url) { if (/^(?:https?:|data:|\/\/)/i.test(url)) throw new Error('El estilo ' + path + ' usa recursos externos. Inclúyalos dentro del ZIP.'); });
    return css;
  }
  function crearConfig(manifiesto, id) {
    var cfg = Object.assign({}, manifiesto);
    cfg.id = id; cfg.nombre = manifiesto.nombre || nombre(id); cfg.emoji = manifiesto.emoji || emoji(id);
    cfg.especialidades = manifiesto.especialidades || ('Especialidades de ' + cfg.nombre);
    cfg.etiqueta = manifiesto.etiqueta || cfg.nombre;
    cfg.subtitulo = manifiesto.subtitulo || 'Detalles hechos con amor para celebrar juntos.';
    delete cfg.estilos;
    return cfg;
  }
  function analizarBytes(bytes, fileName) {
    if (!w.fflate || !w.fflate.unzipSync) throw new Error('No se pudo cargar el lector de archivos ZIP.');
    if (!bytes || !bytes.length) throw new Error('El archivo está vacío.');
    if (bytes.length > MAX_ZIP) throw new Error('El ZIP supera el límite de 100 MB.');
    var raw;
    try { raw = w.fflate.unzipSync(bytes); } catch (e) { throw new Error('No se pudo abrir el ZIP. Comprueba que no esté dañado ni protegido con contraseña.'); }
    var paths = Object.keys(raw).filter(function (p) { return p && !p.endsWith('/') && !/(^|\/)__MACOSX\//.test(p) && !/(^|\/)\.DS_Store$/.test(p); });
    if (!paths.length || paths.length > MAX_FILES) throw new Error('El ZIP debe contener entre 1 y ' + MAX_FILES + ' archivos.');
    paths.forEach(function (p) { if (!rutaValida(p)) throw new Error('El ZIP contiene una ruta no segura: ' + p); });
    var manifestPath = paths.indexOf('tema.json') >= 0 ? 'tema.json' : paths.filter(function (p) { return /(^|\/)tema\.json$/.test(p); })[0];
    if (!manifestPath) throw new Error('Falta tema.json en la raíz del paquete.');
    var prefix = manifestPath.slice(0, -'tema.json'.length), entries = {};
    paths.forEach(function (p) {
      if (prefix && p.indexOf(prefix) !== 0) throw new Error('Todos los archivos deben estar dentro de la misma carpeta del ZIP.');
      var clean = p.slice(prefix.length), ext = extension(clean);
      if (clean !== 'tema.json' && clean !== 'productos/productos.json' && !EXT[ext]) throw new Error('Archivo no permitido: ' + clean + '. No se aceptan páginas ni scripts.');
      if (raw[p].length > 30 * 1024 * 1024) throw new Error(clean + ' supera el límite de 30 MB por archivo.');
      entries[clean] = raw[p];
    });
    if (!entries['tema.json']) throw new Error('Falta tema.json.');
    var manifest = json(entries['tema.json'], 'tema.json');
    if (!manifest || manifest.formato !== 'cake-tema-1') throw new Error('tema.json debe indicar "formato": "cake-tema-1".');
    var id = String(manifest.id || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]{1,60}$/.test(id)) throw new Error('El identificador de la temática solo puede tener minúsculas, números y guiones.');
    var estilos = Array.isArray(manifest.estilos) ? manifest.estilos : [];
    if (!estilos.length || estilos.some(function (p) { return typeof p !== 'string' || !rutaValida(p) || extension(p) !== 'css' || !entries[p]; })) throw new Error('tema.json debe incluir estilos CSS existentes dentro del ZIP.');
    estilos.forEach(function (p) { limpiarCss(texto(entries[p]), p); });
    var productosRaw = entries['productos/productos.json'] ? json(entries['productos/productos.json'], 'productos/productos.json') : [];
    if (!Array.isArray(productosRaw) || productosRaw.length > 100) throw new Error('productos.json debe ser una lista de hasta 100 productos.');
    var slugs = {};
    var productos = productosRaw.map(function (p, i) {
      var slug = String(p.slug || '').toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,139}$/.test(slug) || slugs[slug]) throw new Error('Hay un slug vacío, duplicado o inválido en el producto ' + (i + 1) + '.');
      slugs[slug] = true;
      if (!String(p.nombre || '').trim()) throw new Error('Falta el nombre del producto ' + (i + 1) + '.');
      if (!p.imagen || !entries[p.imagen] || EXT[extension(p.imagen)] !== 'image') throw new Error('Falta la imagen ' + (p.imagen || '') + ' del producto ' + p.nombre + '.');
      return { slug: slug, name: String(p.nombre).trim().slice(0, 140), category: String(p.categoria || 'especiales').slice(0, 80), description: String(p.descripcion || '').slice(0, 1000), image: p.imagen, price: Math.max(0, Number(p.precio_sugerido) || 0), price_status: 'por_confirmar', is_theme_special: !!p.especialidad, display_order: (Number(p.orden) || i + 1) * 10 };
    });
    var files = {}, total = 0;
    Object.keys(entries).forEach(function (path) {
      var ext = extension(path); if (!EXT[ext]) return;
      total += entries[path].length;
      files[path] = { original: path, type: EXT[ext], bytes: entries[path], mime: MIME[ext] };
    });
    if (total > MAX_ZIP) throw new Error('Los recursos descomprimidos superan el límite de 100 MB.');
    var tutoriales = ['pedido', 'personalizado'].filter(function (kind) { return files['videos/tutoriales/' + kind + '.mp4']; }).map(function (kind) {
      return { kind: kind, title: kind === 'pedido' ? 'Cómo hacer un pedido' : 'Cómo hacer un pedido personalizado', description: '', video: 'videos/tutoriales/' + kind + '.mp4', poster: files['videos/tutoriales/' + kind + '.jpg'] ? 'videos/tutoriales/' + kind + '.jpg' : '' };
    });
    var portada = files['imagenes/escena.webp'] || files['imagenes/cabecera.webp'] || null;
    return { id: id, name: manifest.nombre || nombre(id), config: crearConfig(manifest, id), fileName: fileName || 'tema.zip', entries: entries, files: files, styles: estilos, products: productos, tutorials: tutoriales, cover: portada };
  }
  function abrir(modo, id) {
    estado.modo = modo || 'agregar'; estado.analisis = null; estado.tema = id || null; estado.esperada = 0; estado.ocupado = false;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    var p = estado.paquetes.filter(function (x) { return x.theme === id; })[0];
    if (estado.modo === 'actualizar') { if (!p) return; estado.esperada = p.version; }
    $('cake-zip-titulo').textContent = estado.modo === 'actualizar' ? 'Actualizar ' + p.name : 'Agregar nueva temática';
    $('cake-zip-elegir').hidden = false; $('cake-zip-previa').hidden = true; $('cake-zip-publicar').hidden = true; $('cake-zip-publicar').disabled = false;
    $('cake-zip-progreso').hidden = true; $('cake-zip-progreso-i').style.width = '0'; input.value = '';
    modalMsg(estado.modo === 'actualizar' ? 'Elige el ZIP de ' + p.name + '. La versión actual se conservará en el historial.' : 'Elige un ZIP compatible. Primero lo revisaremos; no se publicará automáticamente.');
    modal.hidden = false; d.documentElement.classList.add('adm27-ventana-abierta');
  }
  function cerrar() { if (estado.ocupado) return; modal.hidden = true; d.documentElement.classList.remove('adm27-ventana-abierta'); estado.analisis = null; }
  function mostrarAnalisis(a) {
    estado.analisis = a;
    $('cake-zip-previa').hidden = false; $('cake-zip-nombre').textContent = (a.config.emoji || '✨') + ' ' + a.name;
    $('cake-zip-datos').innerHTML = '<li>' + a.products.length + ' productos</li><li>' + Object.keys(a.files).length + ' recursos</li><li>' + a.styles.length + ' hojas de estilo</li><li>' + a.tutorials.length + ' tutoriales</li>';
    var img = $('cake-zip-imagen');
    if (a.cover) { previewUrl = URL.createObjectURL(new Blob([a.cover.bytes], { type: a.cover.mime })); img.src = previewUrl; img.hidden = false; } else img.hidden = true;
    $('cake-zip-publicar').hidden = false; $('cake-zip-publicar').textContent = estado.modo === 'actualizar' ? 'Publicar actualización' : 'Instalar temática';
    modalMsg('ZIP revisado correctamente. Nada se ha publicado todavía.', 'success');
  }
  async function elegir() {
    var f = input.files && input.files[0]; if (!f) return;
    if (!/\.zip$/i.test(f.name)) { modalMsg('Selecciona un archivo .zip.', 'error'); input.value = ''; return; }
    $('cake-zip-previa').hidden = true; $('cake-zip-publicar').hidden = true; modalMsg('Analizando el ZIP…');
    try {
      var a = analizarBytes(new Uint8Array(await f.arrayBuffer()), f.name);
      var existe = estado.paquetes.some(function (p) { return p.theme === a.id; });
      if (estado.modo === 'agregar' && existe) throw new Error('Esa temática ya está instalada. Usa su botón «Actualizar».');
      if (estado.modo === 'actualizar') {
        var actual = estado.paquetes.filter(function (p) { return p.theme === estado.tema && p.version === estado.esperada; })[0];
        if (!actual || actual.theme !== a.id) throw new Error('El ZIP no corresponde a la temática que elegiste actualizar.');
      }
      mostrarAnalisis(a);
    } catch (e) { modalMsg(e.message || 'No se pudo analizar el ZIP.', 'error'); }
  }
  function progreso(n, total, texto) { var box = $('cake-zip-progreso'); box.hidden = false; $('cake-zip-progreso-i').style.width = Math.round(n / Math.max(1, total) * 100) + '%'; modalMsg(texto || ('Subiendo recurso ' + n + ' de ' + total + '…')); }
  async function publicar() {
    var a = estado.analisis, c = client(); if (!a || !c || estado.ocupado) return;
    estado.ocupado = true; $('cake-zip-publicar').disabled = true; input.disabled = true;
    var version = estado.esperada + 1, uploaded = [], publishedFiles = {}, keys = Object.keys(a.files);
    try {
      keys.forEach(function (path) { publishedFiles[path] = { path: a.id + '/v' + version + '/' + path, type: a.files[path].type, url: '' }; });
      // Primero se conocen las URL para reemplazar las imágenes usadas por los CSS.
      keys.forEach(function (path) { publishedFiles[path].url = c.storage.from(BUCKET).getPublicUrl(publishedFiles[path].path).data.publicUrl; });
      for (var i = 0; i < keys.length; i++) {
        var path = keys[i], item = a.files[path], body = item.bytes;
        if (item.type === 'style') {
          var css = limpiarCss(texto(item.bytes), path).replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, function (_, q, url) {
            var clean = resolver(path, url); if (!publishedFiles[clean]) throw new Error('El estilo ' + path + ' necesita ' + clean + ', pero no está en el ZIP.');
            return 'url("' + publishedFiles[clean].url + '")';
          });
          body = new Blob([css], { type: 'text/css' });
        }
        progreso(i, keys.length, 'Subiendo ' + path + ' (' + (i + 1) + ' de ' + keys.length + ')…');
        var up = await c.storage.from(BUCKET).upload(publishedFiles[path].path, body, { contentType: item.mime, upsert: false, cacheControl: '31536000' });
        if (up.error) throw new Error('No se pudo subir ' + path + ': ' + up.error.message);
        uploaded.push(publishedFiles[path].path);
      }
      var products = a.products.map(function (p) { return { slug: p.slug, name: p.name, category: p.category, description: p.description, image_url: publishedFiles[p.image].url, price: p.price, price_status: p.price_status, is_theme_special: p.is_theme_special, display_order: p.display_order }; });
      var tutorials = a.tutorials.map(function (t) { return { kind: t.kind, title: t.title, description: t.description, url: publishedFiles[t.video].url, poster: t.poster ? publishedFiles[t.poster].url : '' }; });
      var config = Object.assign({}, a.config, { estilosUrls: a.styles.map(function (p) { return publishedFiles[p].url; }), files: publishedFiles });
      var musica = keys.filter(function (p) { return p.indexOf('musica/') === 0 && publishedFiles[p].type === 'audio'; })[0];
      if (musica) config.musica = { archivo: publishedFiles[musica].url, titulo: musica.split('/').pop().replace(/\.[^.]+$/, ''), artista: '', fuente: '', enlace: '' };
      progreso(keys.length, keys.length, 'Guardando la temática y su historial…');
      var r = await c.rpc('cake_theme_publish', { p_theme: a.id, p_name: a.name, p_config: config, p_files: publishedFiles, p_products: products, p_tutorials: tutorials, p_zip: a.fileName, p_expected: estado.esperada, p_replace: true, p_changes: { productos: products.length, recursos: keys.length, tutoriales: tutorials.length } });
      if (r.error) throw new Error('No se pudo publicar: ' + r.error.message);
      estado.ocupado = false; input.disabled = false; cerrar(); await cargar();
      msg((estado.modo === 'actualizar' ? 'Temática actualizada. ' : 'Temática instalada. ') + 'Ahora puedes verla o activarla cuando quieras.', 'success');
    } catch (e) {
      if (uploaded.length) await c.storage.from(BUCKET).remove(uploaded);
      estado.ocupado = false; input.disabled = false; $('cake-zip-publicar').disabled = false; modalMsg(e.message || 'No se pudo instalar.', 'error');
    }
  }
  function portada(p) { if (p.theme === 'navidad') return 'img/navidad/arbol.webp'; var f = (p.files || {})['imagenes/escena.webp'] || (p.files || {})['imagenes/cabecera.webp']; return f && f.url || ''; }
  function tarjeta(p) {
    var activa = p.theme === estado.activo, img = portada(p);
    return '<article class="cake-zip-card' + (activa ? ' activa' : '') + '" data-theme="' + esc(p.theme) + '"><div class="cake-zip-portada">' + (img ? '<img src="' + esc(img) + '" alt="Vista de ' + esc(p.name) + '" loading="lazy">' : '') + (activa ? '<span class="cake-zip-estado">✓ Temática activa</span>' : '') + '</div><div class="cake-zip-info"><h3>' + esc((p.config && p.config.emoji || emoji(p.theme)) + ' ' + p.name) + '</h3><p>' + esc(p.config && p.config.subtitulo || 'Temática instalada desde un paquete ZIP.') + '</p><span class="cake-zip-version">Versión ' + p.version + ' · instalada por ZIP</span><div class="cake-zip-acciones">' +
      '<button type="button" class="admin-button admin-button-primary" data-zip-activar="' + esc(p.theme) + '"' + (activa ? ' disabled' : '') + '>' + (activa ? 'Activa ahora' : 'Cambiar a esta temática') + '</button>' +
      '<a class="admin-button admin-button-outline" href="index.html?tema=' + encodeURIComponent(p.theme) + '" target="_blank" rel="noopener">Vista previa</a>' +
      '<button type="button" class="admin-button admin-button-outline" data-zip-actualizar="' + esc(p.theme) + '">Actualizar tema</button>' +
      '<button type="button" class="admin-button admin-button-outline" data-zip-historial="' + esc(p.theme) + '">Historial</button>' +
      (p.theme !== 'navidad' ? '<button type="button" class="admin-button admin-button-danger" data-zip-eliminar="' + esc(p.theme) + '">Eliminar</button>' : '') + '</div></div></article>';
  }
  function pintar() {
    if (!sec) return;
    // Las ventanas viven en <body>; quita las de una pintura anterior antes de crear las nuevas.
    ['cake-zip-modal', 'cake-zip-history-modal'].forEach(function (id) { var viejo = $(id); if (viejo) viejo.remove(); });
    var activa = estado.paquetes.filter(function (p) { return p.theme === estado.activo; })[0];
    sec.innerHTML = '<div class="admin-section-head"><div><h2>🎨 Temáticas</h2><p>Instala un ZIP, revisa su contenido y actívalo cuando quieras. Agregar o actualizar una temática no cambia la que ven tus clientes.</p></div><button type="button" class="admin-button admin-button-primary" id="cake-zip-agregar"><i class="fas fa-plus"></i> Agregar tema</button></div>' +
      '<div class="cake-zip-resumen"><div><strong>Temática activa: ' + esc(activa ? activa.name : nombre(estado.activo)) + '</strong><span>' + estado.paquetes.length + ' temática' + (estado.paquetes.length === 1 ? '' : 's') + ' instalada' + (estado.paquetes.length === 1 ? '' : 's') + '. Navidad es la única incluida inicialmente.</span></div><button type="button" class="admin-button admin-button-outline" id="cake-zip-refrescar"><i class="fas fa-rotate"></i> Actualizar lista</button></div>' +
      '<div class="cake-zip-grid">' + estado.paquetes.map(tarjeta).join('') + '</div><p id="cake-zip-msg" class="admin-message" role="status"></p>' +
      '<div class="cake-zip-modal" id="cake-zip-modal" hidden role="dialog" aria-modal="true" aria-labelledby="cake-zip-titulo"><div class="cake-zip-caja"><div class="cake-zip-cab"><h2 id="cake-zip-titulo">Agregar nueva temática</h2><button type="button" class="cake-zip-x" id="cake-zip-cerrar" aria-label="Cerrar">×</button></div><div class="cake-zip-cuerpo"><label class="cake-zip-drop" id="cake-zip-elegir"><i class="fas fa-file-zipper"></i><strong>Seleccionar paquete ZIP</strong><small>Máximo 100 MB. Se revisarán sus archivos antes de publicar.</small><input id="cake-zip-input" type="file" accept=".zip,application/zip"></label><div class="cake-zip-previa" id="cake-zip-previa" hidden><img id="cake-zip-imagen" alt="Portada de la nueva temática"><div><h3 id="cake-zip-nombre"></h3><ul class="cake-zip-datos" id="cake-zip-datos"></ul></div></div><div class="cake-zip-progreso" id="cake-zip-progreso" hidden><i id="cake-zip-progreso-i"></i></div><p class="admin-message" id="cake-zip-modal-msg" role="status"></p><div class="cake-zip-acciones-modal"><button type="button" class="admin-button admin-button-primary" id="cake-zip-publicar" hidden>Instalar temática</button><button type="button" class="admin-button admin-button-outline" id="cake-zip-cancelar">Cancelar</button></div></div></div></div>' +
      '<div class="cake-zip-modal" id="cake-zip-history-modal" hidden role="dialog" aria-modal="true" aria-labelledby="cake-zip-history-title"><div class="cake-zip-caja"><div class="cake-zip-cab"><h2 id="cake-zip-history-title">Historial</h2><button type="button" class="cake-zip-x" id="cake-zip-history-close" aria-label="Cerrar">×</button></div><div class="cake-zip-cuerpo" id="cake-zip-history-body"></div></div></div>';
    modal = $('cake-zip-modal'); input = $('cake-zip-input');
    // Fuera de la sección animada: la ventana cubre toda la pantalla y no queda bajo el menú.
    d.body.appendChild(modal); d.body.appendChild($('cake-zip-history-modal'));
    $('cake-zip-agregar').addEventListener('click', function () { abrir('agregar'); });
    $('cake-zip-refrescar').addEventListener('click', cargar);
    $('cake-zip-cerrar').addEventListener('click', cerrar); $('cake-zip-cancelar').addEventListener('click', cerrar);
    input.addEventListener('change', elegir); $('cake-zip-publicar').addEventListener('click', publicar);
    $('cake-zip-history-close').addEventListener('click', function () { $('cake-zip-history-modal').hidden = true; });
  }
  async function activar(id, boton) {
    if (id === estado.activo || estado.ocupado) return;
    if (!confirm('¿Cambiar la tienda a ' + nombre(id) + '? La temática instalada ya está lista para publicarse.')) return;
    boton.disabled = true; msg('Cambiando temática…'); var c = client();
    var r = await c.rpc('cake_theme_activate', { p_theme: id });
    if (r.error) { msg('No se pudo cambiar: ' + r.error.message, 'error'); boton.disabled = false; return; }
    estado.activo = id; if (w.CakeTema) w.CakeTema.aplicar(id); pintar(); msg('¡Listo! La tienda ahora usa ' + nombre(id) + '.', 'success');
  }
  async function historial(id) {
    var box = $('cake-zip-history-modal'), body = $('cake-zip-history-body'); $('cake-zip-history-title').textContent = 'Historial de ' + nombre(id); body.innerHTML = '<p>Cargando versiones…</p>'; box.hidden = false;
    var r = await client().from('cake_theme_versions').select('id,version,zip_name,changes,created_at,status,error').eq('theme', id).order('version', { ascending: false });
    if (r.error) { body.innerHTML = '<p class="admin-message error">No se pudo cargar: ' + esc(r.error.message) + '</p>'; return; }
    if (!r.data || !r.data.length) { body.innerHTML = '<p>Esta temática todavía no tiene actualizaciones registradas.</p>'; return; }
    body.innerHTML = '<div class="cake-zip-historial">' + r.data.map(function (v) {
      var actual = estado.paquetes.filter(function (p) { return p.theme === id; })[0];
      return '<div class="cake-zip-version-fila"><div><strong>Versión ' + v.version + '</strong><small>' + esc(v.zip_name) + ' · ' + esc(new Date(v.created_at).toLocaleString('es-GT')) + '</small></div>' + (v.version === actual.version ? '<span>Versión actual</span>' : '<button type="button" class="admin-button admin-button-outline" data-zip-restaurar="' + v.id + '" data-theme-id="' + esc(id) + '" data-version="' + v.version + '">Restaurar esta versión</button>') + '</div>';
    }).join('') + '</div>';
  }
  async function restaurar(versionId, id, boton) {
    var p = estado.paquetes.filter(function (x) { return x.theme === id; })[0]; if (!p) return;
    if (!confirm('¿Restaurar esta versión de ' + p.name + '? Se creará una nueva versión y la actual quedará en el historial.')) return;
    boton.disabled = true; var r = await client().rpc('cake_theme_restore', { p_version: versionId, p_expected: p.version });
    if (r.error) { alert('No se pudo restaurar: ' + r.error.message); boton.disabled = false; return; }
    $('cake-zip-history-modal').hidden = true; await cargar(); msg('Versión restaurada correctamente.', 'success');
  }
  async function eliminar(id) {
    if (id === 'navidad') return;
    if (!confirm('¿Eliminar la temática ' + nombre(id) + '? Sus productos y enlaces se conservarán como temporada no disponible. Si está activa, la tienda volverá a Navidad.')) return;
    var r = await client().rpc('cake_theme_delete', { p_theme: id }); if (r.error) { msg('No se pudo eliminar: ' + r.error.message, 'error'); return; }
    if (w.CAKE_TEMAS && w.CAKE_TEMAS.retirar) w.CAKE_TEMAS.retirar(id);
    if (estado.activo === id && w.CakeTema) w.CakeTema.aplicar('navidad'); await cargar(); msg('Temática eliminada. Puedes volver a instalarla con su ZIP.', 'success');
  }
  async function cargar() {
    if (!sec) return; var c = client(); if (!c) return;
    msg('Cargando temáticas instaladas…');
    var rs = await Promise.all([c.from('cake_theme_packages').select('theme,name,config,files,version,deleted_at,updated_at').is('deleted_at', null).order('theme'), c.from('cake_site_theme').select('theme').eq('id', 1).maybeSingle()]);
    if (rs[0].error) { sec.innerHTML = '<div class="admin-section-head"><div><h2>🎨 Temáticas</h2><p>Instala y actualiza temáticas con archivos ZIP.</p></div></div><p class="admin-message error">Falta ejecutar 01_tematicas_zip.sql en tu base de datos y crear el espacio privado cake-theme-assets. Después vuelve a abrir esta sección.</p><p class="admin-order-muted">Detalle: ' + esc(rs[0].error.message) + '</p>'; return; }
    estado.paquetes = rs[0].data || []; estado.activo = rs[1].data && rs[1].data.theme || 'navidad';
    if (w.CAKE_TEMAS) w.CAKE_TEMAS.instalarPaquetes(estado.paquetes);
    pintar(); msg('Lista actualizada.', 'success');
  }
  function clic(e) {
    var b = e.target.closest && e.target.closest('[data-zip-activar],[data-zip-actualizar],[data-zip-historial],[data-zip-eliminar],[data-zip-restaurar]'); if (!b) return;
    if (b.hasAttribute('data-zip-activar')) activar(b.getAttribute('data-zip-activar'), b);
    else if (b.hasAttribute('data-zip-actualizar')) abrir('actualizar', b.getAttribute('data-zip-actualizar'));
    else if (b.hasAttribute('data-zip-historial')) historial(b.getAttribute('data-zip-historial'));
    else if (b.hasAttribute('data-zip-eliminar')) eliminar(b.getAttribute('data-zip-eliminar'));
    else if (b.hasAttribute('data-zip-restaurar')) restaurar(b.getAttribute('data-zip-restaurar'), b.getAttribute('data-theme-id'), b);
  }
  function iniciar() {
    sec = $('admin-panel-temas'); if (!sec || sec.getAttribute('data-cake-zip')) return; sec.setAttribute('data-cake-zip', '1');
    d.addEventListener('click', clic); d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal && !modal.hidden) cerrar(); });
    pintar();
  }
  w.CakeTemasZip = { cargar: cargar, analizarBytes: analizarBytes, abrir: abrir };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  d.addEventListener('cake-admin-listo', cargar);
})();
