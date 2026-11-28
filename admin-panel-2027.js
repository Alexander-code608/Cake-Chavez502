/* =========================================================
   CAKE CHAVEZ — PANEL AVANZADO 2027
   Paleta fija café/crema/rosa, menú lateral (☰), «Pedidos por tema», «Todos los pedidos»,
   lista compacta de pedidos con «Ver pedido completo» e «Imprimir pedido», «Tomar /
   Transferir / Liberar pedido», «Añadir audio», «Tutoriales y videos», especialidades de la
   temática activa, catálogo por temática y las diez temáticas en «Temas».
   Usa el mismo sistema de pedidos y productos de admin.js (window.CakeAdmin); no crea otro.
   ========================================================= */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (id) { return d.getElementById(id); };
  var T = w.CAKE_TEMAS || { lista: [{ id: 'navidad', nombre: 'Navidad', emoji: '🎄', especialidades: 'Especialidades de Navidad' }], buscar: function () { return null; }, etiqueta: function (t) { return t; }, nombre: function (t) { return t; }, valido: function (t) { return t === 'navidad'; } };
  function A() { return w.CakeAdmin || {}; }
  function db() { var a = A(); return a.getClient ? a.getClient() : null; }
  function tema() { return w.CakeTema && w.CakeTema.actual ? w.CakeTema.actual : 'navidad'; }
  function info(t) { return T.buscar(t) || { id: t, nombre: t, emoji: '✨', especialidades: 'Especialidades' }; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function aviso(t, tipo) { var a = A(); if (a.globalMessage) a.globalMessage(t, tipo); }
  function fmtQ(v) { var n = Number(v); return Number.isFinite(n) ? 'Q' + n.toFixed(2) : 'Q0.00'; }
  function faltaSQL(error) { return /column|does not exist|42703|PGRST204|PGRST205|PGRST202|schema cache|relation/i.test(String((error && error.message) || '') + ' ' + String((error && error.code) || '')); }
  function fechaBonita(v) { if (!v) return 'No indicada'; try { var p = String(v).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return v; } }
  function horaBonita(v) { if (!v) return 'No indicada'; var m = String(v).match(/^(\d{1,2}):(\d{2})/); if (!m) return v; var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' a. m.' : ' p. m.'); }

  var api = w.CakeAdmin27 = {
    columnaTemas: false, columnaAtencion: false,
    filaCompacta: filaCompacta, alPintarPedidos: alPintarPedidos, alFormularioProducto: alFormularioProducto
  };
  d.documentElement.classList.add('adm27');

  /* ---------------------------------------------------------
     1. PESTAÑAS NUEVAS (junto a las que ya existen)
     --------------------------------------------------------- */
  var NUEVAS = [
    ['pedidos-tema', '🗂️ Pedidos por tema'], ['orders', '📋 Todos los pedidos', 'todos'], ['numeros', '📞 Números para recibir los pedidos'],
    ['audio', '🎵 Añadir audio'], ['videos', '🎬 Tutoriales y videos'], ['correo', '✉️ Recordatorios por correo']
  ];
  function seccion(id) {
    var s = $('admin-panel-' + id);
    if (!s) { s = el('section', 'admin-section'); s.id = 'admin-panel-' + id; s.hidden = true; var app = $('admin-app-view'); var ref = $('admin-global-message'); if (ref && ref.parentNode === app) app.insertBefore(s, ref); else if (app) app.appendChild(s); }
    return s;
  }
  function abrir(tab) {
    // Se usa el botón original para que todas sus funciones actuales se ejecuten igual que antes.
    var b = d.querySelector('.admin-tabs [data-admin-tab="' + tab + '"]:not([data-adm27-todos])');
    if (b) b.click(); else if (A().setTab) A().setTab(tab);
  }
  function crearPestanas() {
    var nav = d.querySelector('.admin-tabs'); if (!nav || nav.querySelector('[data-adm27]')) return;
    NUEVAS.forEach(function (n) {
      var b = el('button', 'admin-tab admin-tab-nueva adm27-tab'); b.type = 'button'; b.textContent = n[1];
      b.setAttribute('data-admin-tab', n[0]); b.setAttribute('data-adm27', '1'); if (n[2]) b.setAttribute('data-adm27-todos', '1');
      b.addEventListener('click', function () {
        if (n[2] === 'todos') A().ordersTheme = null;
        if (A().setTab) A().setTab(n[0]);
        marcarMenu(n[2] === 'todos' ? 'orders-todos' : n[0]);
        if (n[0] === 'pedidos-tema') cargarPedidosTema();
        if (n[0] === 'audio') pintarAudio();
        if (n[0] === 'videos') pintarVideos();
      });
      nav.appendChild(b);
    });
    // La pestaña «Pedidos» de siempre muestra todos los pedidos (sin filtro de temática).
    d.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-admin-tab="orders"]');
      if (t && !t.hasAttribute('data-tema-pedidos')) A().ordersTheme = null;
      var x = e.target.closest && e.target.closest('.admin-tabs [data-admin-tab]');
      if (x && !x.hasAttribute('data-adm27')) marcarMenu(x.getAttribute('data-admin-tab'));
    }, true);
  }

  /* ---------------------------------------------------------
     2. MENÚ LATERAL ☰
     --------------------------------------------------------- */
  var MENU = [
    { g: 'Inicio', i: 'fa-house', ir: 'inicio' },
    { g: 'Tienda', i: 'fa-store', items: [['fa-cubes', 'Productos y ofertas', 'products'], ['fa-star', 'Especialidades', 'navidad', 'esp'], ['fa-palette', 'Temáticas', 'temas'], ['fa-images', 'Carrusel', 'carousel'], ['fa-tags', 'Categorías y precios', 'categories']] },
    { g: 'Pedidos', i: 'fa-cart-shopping', items: [['fa-list', 'Todos los pedidos', 'orders-todos'], ['fa-layer-group', 'Pedidos por tema', 'pedidos-tema'], ['fa-calendar-days', 'Pedidos programados', 'scheduled'], ['fa-phone', 'Números para recibir los pedidos', 'numeros']] },
    { g: 'Contenido', i: 'fa-circle-play', items: [['fa-film', 'Tutoriales y videos', 'videos'], ['fa-music', 'Añadir audio', 'audio'], ['fa-comment-dots', 'Opiniones reales', 'reviews'], ['fa-camera', 'Fotos de clientes', 'photos']] },
    { g: 'Herramientas', i: 'fa-screwdriver-wrench', items: [['fa-trophy', 'Premios', 'prizes'], ['fa-wand-magic-sparkles', 'Extras y avisos', 'features'], ['fa-bell', 'Notificaciones de entregas por WhatsApp', 'recordatorios'], ['fa-envelope', 'Recordatorios por correo', 'correo']] },
    { g: 'Sistema', i: 'fa-gear', items: [['fa-truck', 'Entregas y pagos', 'settings'], ['fa-right-from-bracket', 'Salir del Panel avanzado', 'salir']] }
  ];
  var menu, velo;
  function esMovil() { return w.matchMedia('(max-width: 1099px)').matches; }
  function abrirMenu(si) {
    var abierto = si == null ? !d.documentElement.classList.contains('adm27-menu-abierto') : si;
    d.documentElement.classList.toggle('adm27-menu-abierto', abierto);
    var b = $('adm27-hamburguesa'); if (b) { b.setAttribute('aria-expanded', abierto ? 'true' : 'false'); b.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú'); }
    try { if (!esMovil()) localStorage.setItem('adm27-menu', abierto ? '1' : '0'); } catch (e) { /* privado */ }
  }
  function marcarMenu(clave) {
    if (!menu) return;
    menu.querySelectorAll('[data-adm27-ir]').forEach(function (b) { var on = b.getAttribute('data-adm27-ir') === clave; b.classList.toggle('activo', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function irA(clave) {
    if (clave === 'salir') { var s = $('admin-logout'); if (s) s.click(); return; }
    if (clave === 'inicio') { abrir('products'); marcarMenu('inicio'); w.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (clave === 'orders-todos') { var t = d.querySelector('[data-adm27-todos]'); if (t) t.click(); }
    else { abrir(clave); marcarMenu(clave); }
    if (clave !== 'inicio') { var sec = $('admin-panel-' + (clave === 'orders-todos' ? 'orders' : clave)); if (sec) setTimeout(function () { var y = sec.getBoundingClientRect().top + w.scrollY - 90; w.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }, 60); }
    if (esMovil()) abrirMenu(false);
  }
  function crearMenu() {
    if ($('adm27-menu')) return;
    menu = el('aside', 'adm27-menu'); menu.id = 'adm27-menu'; menu.setAttribute('aria-label', 'Menú del Panel avanzado');
    var h = '<div class="adm27-menu-marca"><img src="img/logo.png" alt="" width="58" height="58"><div><strong>Cake Chavez</strong><small>Panel de administración</small></div><button type="button" class="adm27-menu-cerrar" aria-label="Cerrar menú"><i class="fas fa-xmark"></i></button></div><nav class="adm27-menu-lista">';
    MENU.forEach(function (g, gi) {
      if (!g.items) { h += '<button type="button" class="adm27-menu-item adm27-menu-raiz" data-adm27-ir="' + g.ir + '"><i class="fas ' + g.i + '"></i><span>' + g.g + '</span></button>'; return; }
      h += '<div class="adm27-grupo' + (gi < 3 ? ' abierto' : '') + '"><button type="button" class="adm27-grupo-titulo" aria-expanded="' + (gi < 3) + '"><i class="fas ' + g.i + '"></i><span>' + g.g + '</span><i class="fas fa-chevron-down adm27-flecha"></i></button><div class="adm27-grupo-items">';
      g.items.forEach(function (it) { h += '<button type="button" class="adm27-menu-item" data-adm27-ir="' + it[2] + '"' + (it[3] ? ' data-adm27-esp="1"' : '') + '><i class="fas ' + it[0] + '"></i><span>' + it[1] + '</span></button>'; });
      h += '</div></div>';
    });
    h += '</nav><div class="adm27-menu-pie"><span class="adm27-firma">Cake Chavez</span><small>Endulzando tus momentos 💗</small></div>';
    menu.innerHTML = h;
    d.body.appendChild(menu);
    velo = el('div', 'adm27-velo'); velo.addEventListener('click', function () { abrirMenu(false); }); d.body.appendChild(velo);
    menu.addEventListener('click', function (e) {
      var g = e.target.closest('.adm27-grupo-titulo');
      if (g) { var c = g.parentNode; c.classList.toggle('abierto'); g.setAttribute('aria-expanded', c.classList.contains('abierto')); return; }
      var b = e.target.closest('[data-adm27-ir]'); if (b) irA(b.getAttribute('data-adm27-ir'));
      if (e.target.closest('.adm27-menu-cerrar')) abrirMenu(false);
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.documentElement.classList.contains('adm27-menu-abierto') && esMovil()) abrirMenu(false); });
    var bar = d.querySelector('.admin-topbar');
    if (bar && !$('adm27-hamburguesa')) {
      var hb = el('button', 'adm27-hamburguesa', '<i class="fas fa-bars"></i><span>Menú</span>'); hb.type = 'button'; hb.id = 'adm27-hamburguesa'; hb.setAttribute('aria-controls', 'adm27-menu');
      hb.addEventListener('click', function () { abrirMenu(); });
      bar.insertBefore(hb, bar.firstChild);
      var chip = el('span', 'adm27-tema-activo'); chip.id = 'adm27-tema-activo'; bar.insertBefore(chip, bar.querySelector('.admin-store-link'));
    }
    var guardado = null; try { guardado = localStorage.getItem('adm27-menu'); } catch (e) { guardado = null; }
    abrirMenu(!esMovil() && guardado !== '0');
    marcarMenu('inicio');
  }
  function sesionVisible() {
    var app = $('admin-app-view'); var ver = !!app && !app.hidden;
    d.documentElement.classList.toggle('adm27-app', ver);
  }

  /* ---------------------------------------------------------
     3. TEMÁTICA ACTIVA: indicador, pestaña de especialidades y «Temas»
     --------------------------------------------------------- */
  function pintarTemaActivo() {
    var t = info(tema());
    var chip = $('adm27-tema-activo'); if (chip) chip.textContent = 'TEMA ACTIVO: ' + String(t.nombre).toUpperCase() + ' ' + (t.emoji || '');
    var tab = d.querySelector('.admin-tabs [data-admin-tab="navidad"]'); if (tab) tab.textContent = (t.emoji || '⭐') + ' ' + (t.especialidades || 'Especialidades');
    if (menu) { var m = menu.querySelector('[data-adm27-esp] span'); if (m) m.textContent = t.especialidades || 'Especialidades'; }
    prepararEspecialidades();
  }
  function tarjetasTemas() {
    var grid = d.querySelector('#admin-panel-temas .tema-grid'); if (!grid || grid.getAttribute('data-adm27')) return;
    grid.setAttribute('data-adm27', '1');
    grid.innerHTML = (T.lista || []).map(function (t) {
      var img = t.id === 'navidad' ? 'img/navidad/arbol.webp' : ((t.files && t.files['imagenes/escena.webp']) || '');
      return '<article class="tema-card adm27-tema-card" data-tema-card="' + t.id + '"><div class="adm27-tema-vista" aria-hidden="true"><img src="' + img + '" alt="" loading="lazy"></div><div class="tema-card-info">' +
        '<span class="tema-badge" hidden><i class="fas fa-check"></i> Tema activo</span><h3>' + esc((t.emoji || '') + ' ' + (t.nombreAdmin || t.nombre)) + '</h3><p>' + esc(t.subtitulo || '') + '</p>' +
        '<div class="admin-form-actions"><button type="button" class="admin-button admin-button-primary" data-cambiar-tema="' + t.id + '"><i class="fas fa-wand-magic-sparkles"></i> Cambiar tema</button><a class="admin-button admin-button-outline" href="index.html?tema=' + t.id + '" target="_blank" rel="noopener"><i class="fas fa-eye"></i> Ver vista previa</a></div></div></article>';
    }).join('');
  }

  /* ---------------------------------------------------------
     4. ESPECIALIDADES DE LA TEMÁTICA ACTIVA (Navidad conserva su sección de siempre)
     --------------------------------------------------------- */
  function prepararEspecialidades() {
    var sec = $('admin-panel-navidad'); if (!sec) return;
    var nav = sec.querySelector('.adm27-esp-navidad');
    if (!nav) { nav = el('div', 'adm27-esp-navidad'); while (sec.firstChild) nav.appendChild(sec.firstChild); sec.appendChild(nav); }
    var otra = sec.querySelector('.adm27-esp-tema'); if (!otra) { otra = el('div', 'adm27-esp-tema'); sec.insertBefore(otra, nav); }
    var esNavidad = tema() === 'navidad';
    nav.hidden = !esNavidad; otra.hidden = esNavidad;
    if (!esNavidad && !sec.hidden) pintarEspecialidades(otra);
  }
  async function pintarEspecialidades(cont) {
    var t = info(tema()), c = db(); if (!c) return;
    var prods = (A().getProducts ? A().getProducts() : []).filter(function (p) { return (p.store_theme || 'navidad') === t.id; });
    var esp = prods.filter(function (p) { return p.category === 'especiales' || p.is_theme_special; });
    var otros = prods.filter(function (p) { return esp.indexOf(p) < 0 && p.is_active; });
    var r = await c.from('cake_theme_specialty_settings').select('*').eq('theme', t.id).maybeSingle();
    var cfg = (r && r.data) || {};
    var h = '<div class="admin-section-head"><div><h2>' + esc(t.emoji + ' ' + t.especialidades) + '</h2><p>Estas son las especialidades que verán tus clientes en la tienda de ' + esc(t.nombre) + '. Las especialidades navideñas se conservan intactas y vuelven a mostrarse al activar Navidad.</p></div></div>';
    if (!api.columnaTemas) h += '<p class="admin-message error">Para separar las especialidades por temática ejecuta primero el SQL 2027 (Cake_Chavez_Actualizacion_Supabase.sql).</p>';
    h += '<form class="admin-form-card adm27-esp-form"><h3>Textos de la sección</h3><div class="admin-form-grid"><div><label>Título</label><input name="title" maxlength="120" value="' + esc(cfg.title || t.especialidades) + '"></div><div><label>Etiqueta pequeña</label><input name="eyebrow" maxlength="80" value="' + esc(cfg.eyebrow || t.etiqueta || '') + '"></div><div class="admin-full"><label>Descripción</label><textarea name="subtitle" rows="2" maxlength="400">' + esc(cfg.subtitle || t.subtitulo || '') + '</textarea></div><div class="admin-checkboxes admin-full"><label><input type="checkbox" name="is_enabled"' + (cfg.is_enabled === false ? '' : ' checked') + '> Mostrar la sección en la tienda</label></div></div><div class="admin-form-actions"><button class="admin-button admin-button-primary" type="submit"><i class="fas fa-save"></i> Guardar textos</button></div><p class="admin-message" role="status"></p></form>';
    h += '<div class="admin-list-card"><div class="admin-list-toolbar"><h3>Especialidades publicadas (' + esp.length + ')</h3><button type="button" class="admin-button admin-button-primary" data-adm27-nueva-esp><i class="fas fa-plus"></i> Añadir especialidad</button></div><div class="adm27-esp-lista">' +
      (esp.length ? esp.map(filaEsp).join('') : '<p class="admin-order-muted">Todavía no hay especialidades en esta temática.</p>') + '</div>';
    if (otros.length) h += '<details class="adm27-esp-mas"><summary>Marcar otro producto de ' + esc(t.nombre) + ' como especialidad (' + otros.length + ')</summary><div class="adm27-esp-lista">' + otros.map(filaEsp).join('') + '</div></details>';
    h += '</div>';
    cont.innerHTML = h;
    var form = cont.querySelector('.adm27-esp-form');
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); var m = form.querySelector('.admin-message'); m.textContent = 'Guardando…'; m.className = 'admin-message';
      var fd = new FormData(form);
      var q = await c.from('cake_theme_specialty_settings').upsert({ theme: t.id, title: fd.get('title'), eyebrow: fd.get('eyebrow'), subtitle: fd.get('subtitle'), is_enabled: !!fd.get('is_enabled'), updated_at: new Date().toISOString() }, { onConflict: 'theme' });
      if (q.error) { m.textContent = faltaSQL(q.error) ? 'No se guardó: falta ejecutar el SQL 2027 en Supabase.' : 'No se guardó: ' + q.error.message; m.className = 'admin-message error'; return; }
      m.textContent = 'Textos guardados para ' + t.nombre + '.'; m.className = 'admin-message success';
    });
    cont.querySelector('[data-adm27-nueva-esp]').addEventListener('click', function () { var b = $('admin-new-specialty'); abrir('products'); if (b) b.click(); });
    espProds = prods;
    if (cont.getAttribute('data-escucha')) return;
    cont.setAttribute('data-escucha', '1');
    cont.addEventListener('click', async function (e) {
      var b = e.target.closest('[data-adm27-esp-id]'); if (!b) return;
      var t = info(tema());
      var p = espProds.filter(function (x) { return x.id === b.getAttribute('data-adm27-esp-id'); })[0]; if (!p) return;
      if (b.getAttribute('data-accion') === 'editar') { abrir('products'); if (A().fillProduct) A().fillProduct(p); return; }
      var marcar = b.getAttribute('data-accion') === 'marcar';
      if (!marcar && p.category === 'especiales') { alert('Este producto está en la categoría «Especiales». Para quitarlo cambia su categoría con «Editar».'); return; }
      b.disabled = true;
      var u = await c.from('products').update({ is_theme_special: marcar }).eq('id', p.id);
      if (u.error) { aviso(faltaSQL(u.error) ? 'Falta ejecutar el SQL 2027 para marcar especialidades por temática.' : 'No se pudo actualizar: ' + u.error.message, 'error'); b.disabled = false; return; }
      aviso(marcar ? '«' + p.name + '» ahora es especialidad de ' + t.nombre + '.' : '«' + p.name + '» ya no aparece en especialidades.', 'success');
      if (A().loadProducts) await A().loadProducts(); prepararEspecialidades();
    });
  }
  var espProds = [];
  function filaEsp(p) {
    var es = p.category === 'especiales' || p.is_theme_special;
    return '<article class="admin-product-row"><img src="' + esc(p.image_url || '') + '" alt="" loading="lazy"><div class="admin-product-meta"><strong>' + esc(p.name) + '</strong><span>' + fmtQ(p.price) + (p.price_status === 'por_confirmar' ? ' · precio por confirmar' : '') + '</span><small>' + (p.is_active ? 'Publicado' : 'Oculto') + ' · ' + esc(p.category || '') + '</small></div><div class="admin-row-actions"><button type="button" class="admin-button admin-button-outline" data-adm27-esp-id="' + p.id + '" data-accion="editar">Editar</button><button type="button" class="admin-button ' + (es ? 'admin-button-outline' : 'admin-button-primary') + '" data-adm27-esp-id="' + p.id + '" data-accion="' + (es ? 'quitar' : 'marcar') + '">' + (es ? 'Quitar de especialidades' : 'Marcar como especialidad') + '</button></div></article>';
  }

  /* ---------------------------------------------------------
     5. CATÁLOGO POR TEMÁTICA (formulario y lista de productos)
     --------------------------------------------------------- */
  function opcionesTemas(sel) { return (T.lista || []).map(function (t) { return '<option value="' + t.id + '"' + (t.id === sel ? ' selected' : '') + '>' + esc(t.emoji + ' ' + (t.nombreAdmin || t.nombre)) + '</option>'; }).join(''); }
  function prepararFormularioProducto() {
    var grid = d.querySelector('#admin-product-form .admin-form-grid'); if (!grid || $('product-store-theme')) return;
    var campo = el('div', 'admin-full adm27-campo-tema', '<label for="product-store-theme">Tienda (temática) donde se publica</label><select id="product-store-theme">' + opcionesTemas(tema()) + '</select><small id="product-store-theme-nota">Cada temática tiene su catálogo independiente: el producto solo aparece en la tienda elegida.</small>');
    grid.insertBefore(campo, grid.firstChild);
    var checks = grid.querySelector('.admin-checkboxes');
    if (checks) { var l = el('label', '', '<input id="product-price-confirmed" type="checkbox" checked> Precio confirmado (si no, se muestra «precio por confirmar»)'); checks.appendChild(l); }
    var bar = d.querySelector('#admin-panel-products .admin-list-toolbar');
    if (bar && !$('adm27-filtro-tema')) {
      var f = el('label', 'adm27-filtro-tema', '<span>Tienda</span><select id="adm27-filtro-tema"><option value="">Todas las temáticas</option>' + opcionesTemas(tema()) + '</select>');
      bar.appendChild(f); $('adm27-filtro-tema').addEventListener('change', decorarProductos);
      var s = $('admin-product-search'); if (s) s.addEventListener('input', function () { setTimeout(decorarProductos, 0); });
    }
    var lista = $('admin-products-list'); if (lista && w.MutationObserver) new MutationObserver(function () { if (!decorando) decorarProductos(); }).observe(lista, { childList: true });
  }
  var decorando = false;
  function decorarProductos() {
    var lista = $('admin-products-list'); if (!lista) return;
    var prods = A().getProducts ? A().getProducts() : [];
    api.columnaTemas = prods.some(function (p) { return Object.prototype.hasOwnProperty.call(p, 'store_theme'); });
    var nota = $('product-store-theme-nota'), sel = $('product-store-theme');
    if (sel) sel.disabled = !api.columnaTemas;
    if (nota && !api.columnaTemas && prods.length) nota.textContent = 'Para publicar productos en otras temáticas ejecuta primero el SQL 2027 en Supabase. Mientras tanto se guardan en la tienda de siempre (Navidad).';
    var filtro = ($('adm27-filtro-tema') || {}).value || '';
    var q = String(($('admin-product-search') || {}).value || '').trim().toLowerCase();
    decorando = true;
    lista.querySelectorAll('.admin-product-row').forEach(function (row, i) {
      var p = prods[i]; if (!p) return;
      var meta = row.querySelector('.admin-product-meta');
      if (meta && !meta.querySelector('.adm27-chip-tema')) {
        var t = info(p.store_theme || 'navidad');
        var c = el('span', 'adm27-chip-tema', esc(t.emoji + ' ' + t.nombre) + (p.price_status === 'por_confirmar' ? ' · <b>precio por confirmar</b>' : ''));
        meta.appendChild(c);
      }
      var coincide = !q || (String(p.name || '') + ' ' + (p.category || '') + ' ' + (p.slug || '')).toLowerCase().indexOf(q) >= 0;
      row.hidden = !coincide || (filtro && (p.store_theme || 'navidad') !== filtro);
    });
    decorando = false;
    var esp = $('admin-panel-navidad'); if (esp && !esp.hidden) prepararEspecialidades();
  }
  function alFormularioProducto(p) {
    var sel = $('product-store-theme'), conf = $('product-price-confirmed');
    if (sel) sel.value = p ? (p.store_theme || 'navidad') : (($('adm27-filtro-tema') || {}).value || tema());
    if (conf) conf.checked = p ? p.price_status !== 'por_confirmar' : true;
  }

  /* ---------------------------------------------------------
     6. PEDIDOS: lista compacta, ventana completa, impresión y atención del equipo
     --------------------------------------------------------- */
  var ESTADOS = { pendiente: ['Pendiente de atención', 'pendiente'], en_atencion: ['En atención', 'atencion'], transferido: ['Transferido', 'transferido'], liberado: ['Liberado', 'liberado'] };
  function filaCompacta(order) {
    var p = order.payload || {};
    var row = el('article', 'adm27-pedido');
    var t = order.store_theme ? info(order.store_theme) : null;
    var est = ESTADOS[order.attention_status || 'pendiente'] || ESTADOS.pendiente;
    var resp = order.assigned_name ? ' · ' + esc(order.assigned_name) : '';
    row.innerHTML = '<div class="adm27-pedido-datos"><strong class="adm27-pedido-nombre">' + esc(p.name || 'Cliente sin nombre') + '</strong><span class="adm27-pedido-codigo">' + esc(order.order_code || 'Sin código') + '</span>' +
      '<div class="adm27-pedido-chips"><span class="adm27-chip">' + (t ? esc(t.emoji + ' ' + t.nombre) : 'Sin temática registrada') + '</span>' + (p.delivery_date ? '<span class="adm27-chip">📅 ' + esc(fechaBonita(p.delivery_date)) + '</span>' : '') +
      (Object.prototype.hasOwnProperty.call(order, 'attention_status') ? '<span class="adm27-chip adm27-atencion adm27-atencion-' + est[1] + '">' + est[0] + resp + '</span>' : '') + '</div></div>' +
      '<div class="adm27-pedido-botones"><button type="button" class="admin-button admin-button-primary" data-a="ver"><i class="fas fa-eye"></i> Ver pedido completo</button><button type="button" class="admin-button admin-button-outline" data-a="imprimir"><i class="fas fa-print"></i> Imprimir pedido</button></div>';
    var botones = row.querySelector('.adm27-pedido-botones');
    if (Object.prototype.hasOwnProperty.call(order, 'attention_status')) {
      api.columnaAtencion = true;
      var mk = function (txt, acc, cls) { var b = el('button', 'admin-button ' + cls, txt); b.type = 'button'; b.setAttribute('data-a', acc); botones.appendChild(b); };
      if (!order.assigned_user_id) mk('<i class="fas fa-hand"></i> Tomar pedido', 'tomar', 'admin-button-outline');
      else { mk('<i class="fas fa-right-left"></i> Transferir pedido', 'transferir', 'admin-button-outline'); mk('<i class="fas fa-unlock"></i> Liberar pedido', 'liberar', 'admin-button-outline'); }
    }
    row.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'ver') verCompleto(order); else if (a === 'imprimir') imprimir(order); else atencion(order, a, b);
    });
    return row;
  }
  var ventana = null;
  function cerrarVentana() { if (ventana) { ventana.remove(); ventana = null; d.documentElement.classList.remove('adm27-ventana-abierta'); } }
  function verCompleto(order) {
    cerrarVentana();
    ventana = el('div', 'adm27-ventana'); ventana.setAttribute('role', 'dialog'); ventana.setAttribute('aria-modal', 'true'); ventana.setAttribute('aria-label', 'Pedido completo ' + (order.order_code || ''));
    var caja = el('div', 'adm27-ventana-caja');
    var cab = el('div', 'adm27-ventana-cab', '<div><small>Pedido completo</small><h2>' + esc(order.order_code || '') + '</h2></div><div class="adm27-ventana-acciones"><button type="button" class="admin-button admin-button-outline" data-a="imprimir"><i class="fas fa-print"></i> Imprimir</button><button type="button" class="adm27-x" aria-label="Cerrar ventana">×</button></div>');
    caja.appendChild(cab);
    var cuerpo = el('div', 'adm27-ventana-cuerpo');
    cuerpo.appendChild(A().createOrderRow ? A().createOrderRow(order) : el('p', '', 'No disponible.'));
    caja.appendChild(cuerpo); ventana.appendChild(caja); d.body.appendChild(ventana);
    d.documentElement.classList.add('adm27-ventana-abierta');
    ventana.addEventListener('click', function (e) { if (e.target === ventana || e.target.closest('.adm27-x')) cerrarVentana(); if (e.target.closest('[data-a="imprimir"]')) imprimir(order); });
    var x = ventana.querySelector('.adm27-x'); if (x) x.focus();
  }
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ventana && !d.querySelector('.admin-order-edit-modal:not([hidden]), .admin-image-lightbox:not([hidden])')) cerrarVentana(); });
  function alPintarPedidos(orders) {
    // Si la lista se volvió a cargar (estado guardado, pedido editado…), la ventana muestra datos viejos: se cierra.
    if (ventana && !d.querySelector('.admin-order-edit-modal:not([hidden])')) cerrarVentana();
    api.columnaTemas = api.columnaTemas || (orders || []).some(function (o) { return Object.prototype.hasOwnProperty.call(o, 'store_theme'); });
    var f = $('adm27-filtro-pedidos'), lista = $('admin-orders-list');
    if (!f && lista) { f = el('div', 'adm27-filtro-pedidos'); f.id = 'adm27-filtro-pedidos'; lista.parentNode.insertBefore(f, lista); }
    if (!f) return;
    var t = A().ordersTheme;
    if (!t) { f.innerHTML = '<span><i class="fas fa-list"></i> Mostrando <b>todos los pedidos</b> (todas las temáticas).</span><button type="button" class="admin-button admin-button-outline" data-ir-tema>🗂️ Ver por tema</button>'; }
    else { f.innerHTML = '<span><i class="fas fa-filter"></i> Mostrando solo: <b>' + esc(t === 'sin' ? 'Sin temática registrada' : T.etiqueta(t)) + '</b>. La temática activa de la tienda no cambia.</span><button type="button" class="admin-button admin-button-outline" data-ver-todos>Ver todos los pedidos</button>'; }
    var bt = f.querySelector('[data-ver-todos]'); if (bt) bt.onclick = function () { var x = d.querySelector('[data-adm27-todos]'); if (x) x.click(); };
    var bp = f.querySelector('[data-ir-tema]'); if (bp) bp.onclick = function () { irA('pedidos-tema'); };
  }
  async function atencion(order, accion, boton) {
    var c = db(); if (!c) return;
    var destino = null;
    if (accion === 'transferir') {
      var eq = await c.rpc('cake_equipo_pedidos');
      if (eq.error) { aviso(faltaSQL(eq.error) ? 'Falta ejecutar el SQL 2027 para transferir pedidos.' : 'No se pudo leer el equipo: ' + eq.error.message, 'error'); return; }
      var otros = (eq.data || []).filter(function (p) { return p.user_id !== order.assigned_user_id; });
      if (!otros.length) { alert('No hay otra persona con acceso activo para recibir el pedido.'); return; }
      destino = await elegirPersona(otros, order); if (!destino) return;
    } else if (accion === 'liberar') {
      if (!confirm('¿Liberar el pedido ' + order.order_code + '? Quedará disponible para que otra persona lo tome. No se envía ningún mensaje al cliente.')) return;
    }
    boton.disabled = true;
    var r = await c.rpc('cake_pedido_asignacion', { p_order_code: order.order_code, p_accion: accion, p_destino: destino });
    boton.disabled = false;
    if (r.error) {
      var m = String(r.error.message || '');
      aviso(/YA_ASIGNADO/.test(m) ? m.replace('YA_ASIGNADO: ', '') : faltaSQL(r.error) ? 'Falta ejecutar el SQL 2027 en Supabase para tomar, transferir o liberar pedidos.' : 'No se pudo completar: ' + m, 'error');
      if (A().loadOrders) A().loadOrders();
      return;
    }
    var fila = Array.isArray(r.data) ? r.data[0] : r.data;
    aviso(accion === 'tomar' ? 'Tomaste el pedido ' + order.order_code + '. Ahora figura «En atención» a tu nombre.' : accion === 'transferir' ? 'Pedido ' + order.order_code + ' transferido a ' + ((fila && fila.assigned_name) || 'otra persona') + '.' : 'Pedido ' + order.order_code + ' liberado.', 'success');
    if (A().loadOrders) A().loadOrders();
  }
  function elegirPersona(lista, order) {
    return new Promise(function (ok) {
      var v = el('div', 'adm27-ventana');
      v.innerHTML = '<div class="adm27-ventana-caja adm27-caja-chica"><div class="adm27-ventana-cab"><div><small>Transferir pedido</small><h2>' + esc(order.order_code) + '</h2></div><button type="button" class="adm27-x" aria-label="Cerrar">×</button></div><div class="adm27-ventana-cuerpo"><label for="adm27-destino">¿A quién se lo transfieres?</label><select id="adm27-destino">' +
        lista.map(function (p) { return '<option value="' + esc(p.user_id) + '">' + esc(p.nombre + (p.email ? ' · ' + p.email : '')) + '</option>'; }).join('') + '</select><p class="admin-order-muted">Quedará registrado quién lo transfirió, a quién y cuándo. No se envía ningún mensaje al cliente.</p><div class="admin-form-actions"><button type="button" class="admin-button admin-button-primary" data-ok>Transferir</button><button type="button" class="admin-button admin-button-outline" data-no>Cancelar</button></div></div></div>';
      d.body.appendChild(v);
      var fin = function (val) { v.remove(); ok(val); };
      v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('.adm27-x,[data-no]')) fin(null); if (e.target.closest('[data-ok]')) fin($('adm27-destino').value); });
    });
  }
  function imprimir(order) {
    var p = order.payload || {}, items = Array.isArray(p.items) ? p.items : [];
    var logo = new URL('img/logo.png', location.href).href;
    var t = order.store_theme ? info(order.store_theme).nombre : '';
    var notas = [['Ocasión', p.occasion], ['Sabor', p.flavor], ['Tamaño', p.size], ['Colores o temática del pastel', p.colors_theme || p.theme], ['Personalización / dedicatoria', p.customization || p.personalization], ['Dirección', p.address], ['Premio Raspa y gana', p.prize && p.prize.name]].filter(function (x) { return x[1]; });
    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Pedido ' + esc(order.order_code) + '</title><style>' +
      '@page{size:auto;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#2b1a15;font-size:11.5px;margin:0}' +
      '.cab{display:flex;align-items:center;gap:10px;border-bottom:2px solid #4a2a20;padding-bottom:6px;margin-bottom:8px}.cab img{width:42px;height:42px;object-fit:contain}.cab h1{font-size:15px;margin:0}.cab small{color:#7b5b52}.cod{margin-left:auto;text-align:right;font-weight:700;font-size:13px}' +
      'h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8c3f4c;margin:9px 0 4px}table{width:100%;border-collapse:collapse}td,th{padding:3px 4px;border-bottom:1px solid #e6cfc2;text-align:left;vertical-align:top}th{font-size:10px;color:#7b5b52}.n{text-align:right;white-space:nowrap}' +
      '.g{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}.tot{display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:2px solid #4a2a20;margin-top:6px;padding-top:5px}.pie{margin-top:10px;font-size:9.5px;color:#7b5b52;text-align:center}</style></head><body>' +
      '<div class="cab"><img src="' + logo + '" alt=""><div><h1>Cake Chavez</h1><small>Pedido' + (t ? ' · ' + esc(t) : '') + '</small></div><div class="cod">' + esc(order.order_code || '') + '</div></div>' +
      '<div class="g"><div><b>Cliente:</b> ' + esc(p.name || '') + '</div><div><b>Teléfono:</b> ' + esc(p.phone || '') + '</div><div><b>Entrega:</b> ' + esc(fechaBonita(p.delivery_date)) + '</div><div><b>Hora:</b> ' + esc(horaBonita(p.delivery_time)) + '</div></div>' +
      '<h2>Productos</h2><table><tr><th>Cant.</th><th>Producto</th><th class="n">Subtotal</th></tr>' + (items.length ? items.map(function (i) { var q = Number(i.quantity) || 1; return '<tr><td>' + q + '</td><td>' + esc(i.name || i.nombre || 'Producto') + '</td><td class="n">' + (i.price != null ? fmtQ(Number(i.price) * q) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="3">Sin artículos registrados</td></tr>') + '</table>' +
      (notas.length ? '<h2>Información importante</h2><table>' + notas.map(function (x) { return '<tr><td style="width:34%"><b>' + esc(x[0]) + '</b></td><td>' + esc(x[1]) + '</td></tr>'; }).join('') + '</table>' : '') +
      '<div class="tot"><span>Total a pagar</span><span>' + fmtQ(p.total) + '</span></div><div class="pie">Impreso el ' + esc(new Date().toLocaleString('es-GT')) + ' · Cake Chavez</div></body></html>';
    var f = el('iframe', 'adm27-imprimir'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    d.body.appendChild(f);
    var doc = f.contentWindow.document; doc.open(); doc.write(html); doc.close();
    var listo = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { aviso('No se pudo abrir la impresión.', 'error'); } setTimeout(function () { f.remove(); }, 1500); };
    var img = doc.querySelector('img'); if (img && !img.complete) { img.onload = listo; img.onerror = listo; } else setTimeout(listo, 50);
  }

  /* ---------------------------------------------------------
     7. «PEDIDOS POR TEMA»
     --------------------------------------------------------- */
  async function cargarPedidosTema() {
    var s = seccion('pedidos-tema'), c = db(); if (!c) return;
    s.innerHTML = '<div class="admin-section-head"><div><h2>🗂️ Pedidos por tema</h2><p>Elige una celebración para ver solo sus pedidos. Esto no cambia la temática activa de tu tienda.</p></div></div><p class="admin-order-muted">Contando pedidos…</p>';
    var r = await c.from('orders').select('store_theme').is('deleted_at', null).limit(5000);
    var sinColumna = r.error && faltaSQL(r.error);
    if (sinColumna) r = await c.from('orders').select('order_code').is('deleted_at', null).limit(5000);
    if (r.error) { s.lastChild.textContent = 'No se pudieron contar los pedidos: ' + r.error.message; return; }
    var cuenta = {}, sin = 0;
    (r.data || []).forEach(function (o) { if (o.store_theme) cuenta[o.store_theme] = (cuenta[o.store_theme] || 0) + 1; else sin++; });
    var botones = (T.lista || []).filter(function (t) { return cuenta[t.id]; }).map(function (t) { return '<button type="button" class="adm27-tema-boton" data-tema-pedidos="' + t.id + '" data-admin-tab="orders"><span class="adm27-tema-emoji">' + t.emoji + '</span><span>' + esc(t.nombre) + '</span><b>' + cuenta[t.id] + ' pedido' + (cuenta[t.id] === 1 ? '' : 's') + '</b></button>'; }).join('');
    if (sin) botones += '<button type="button" class="adm27-tema-boton adm27-tema-sin" data-tema-pedidos="sin" data-admin-tab="orders"><span class="adm27-tema-emoji">📦</span><span>Sin temática registrada</span><b>' + sin + ' pedido' + (sin === 1 ? '' : 's') + '</b></button>';
    s.lastChild.outerHTML = (sinColumna ? '<p class="admin-message error">La temática de cada pedido se empezará a guardar al ejecutar el SQL 2027 en Supabase. Los pedidos anteriores aparecen como «Sin temática registrada» (no se les inventa una).</p>' : '') +
      (botones ? '<div class="adm27-temas-pedidos">' + botones + '</div>' : '<p class="admin-order-muted">Todavía no hay pedidos registrados.</p>');
    s.querySelectorAll('[data-tema-pedidos]').forEach(function (b) {
      b.addEventListener('click', function () { A().ordersTheme = b.getAttribute('data-tema-pedidos'); if (A().setTab) A().setTab('orders'); marcarMenu('pedidos-tema'); w.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
  }

  /* ---------------------------------------------------------
     8. «AÑADIR AUDIO» de la temática activa
     --------------------------------------------------------- */
  var audioPrevia = null;
  async function pintarAudio() {
    var s = seccion('audio'), c = db(); if (!c) return;
    var t = info(tema()), ref = t.musica || {};
    s.innerHTML = '<div class="admin-section-head"><div><h2>🎵 Añadir audio</h2><p>Música de fondo de la tienda. Solo se administra la temática activa; las demás conservan su propia música.</p></div></div><p class="admin-order-muted">Cargando…</p>';
    var r = await c.from('cake_theme_audio').select('*').eq('theme', t.id).maybeSingle();
    var sinTabla = r.error && faltaSQL(r.error), fila = (r && r.data) || null;
    var actualUrl = fila ? fila.audio_url : (ref.archivo || '');
    var actualNombre = fila ? (fila.audio_url ? (fila.track_title || fila.file_name || fila.audio_url) : '') : (ref.titulo || '');
    var h = '<div class="adm27-audio-tema">Administrando: <b>' + esc(t.emoji + ' ' + (t.nombreAdmin || t.nombre)) + '</b></div>' +
      (sinTabla ? '<p class="admin-message error">Para guardar audios ejecuta primero el SQL 2027 en Supabase. Mientras tanto la tienda usa la pista incluida en la página.</p>' : '') +
      '<div class="admin-form-card adm27-audio"><h3>Audio configurado</h3>' + (actualUrl ? '<p><b>' + esc(actualNombre) + '</b>' + (fila && fila.artist ? ' · ' + esc(fila.artist) : ref.artista ? ' · ' + esc(ref.artista) : '') + '</p><audio controls preload="none" src="' + esc(actualUrl) + '"></audio>' : '<p class="admin-order-muted">Esta temática no tiene música configurada.</p>') +
      (ref.titulo ? '<p class="adm27-audio-ref"><i class="fas fa-circle-info"></i> Pista de referencia de la carpeta de música: <b>' + esc(ref.titulo) + '</b>' + (ref.artista ? ' · ' + esc(ref.artista) : '') + (ref.fuente ? ' (' + esc(ref.fuente) + ')' : '') + (ref.enlace ? ' · <a href="' + esc(ref.enlace) + '" target="_blank" rel="noopener">enlace oficial</a>' : '') + '</p>' : '') +
      '<h3>Subir o elegir otro audio</h3><input type="file" id="adm27-audio-archivo" accept="audio/*"><div id="adm27-audio-previa"></div>' +
      '<div class="admin-form-grid"><div><label for="adm27-audio-titulo">Nombre de la pista</label><input id="adm27-audio-titulo" maxlength="120" value="' + esc(fila && fila.track_title || ref.titulo || '') + '"></div><div><label for="adm27-audio-artista">Autor</label><input id="adm27-audio-artista" maxlength="120" value="' + esc(fila && fila.artist || ref.artista || '') + '"></div>' +
      '<div class="admin-full"><label for="adm27-audio-volumen">Volumen en la tienda: <span id="adm27-vol-txt">' + Math.round(((fila && fila.volume) || 0.35) * 100) + '%</span></label><input type="range" id="adm27-audio-volumen" min="0.05" max="0.8" step="0.05" value="' + ((fila && fila.volume) || 0.35) + '"></div></div>' +
      '<div class="admin-form-actions"><button type="button" class="admin-button admin-button-primary" id="adm27-audio-guardar"><i class="fas fa-save"></i> Guardar audio</button>' + (ref.archivo ? '<button type="button" class="admin-button admin-button-outline" id="adm27-audio-incluida"><i class="fas fa-music"></i> Usar la pista incluida</button>' : '') + (actualUrl ? '<button type="button" class="admin-button admin-button-danger" id="adm27-audio-quitar"><i class="fas fa-trash"></i> Quitar audio</button>' : '') + '</div><p id="adm27-audio-msg" class="admin-message" role="status"></p></div>';
    s.lastChild.outerHTML = h;
    var msg = function (tx, tipo) { var m = $('adm27-audio-msg'); m.textContent = tx; m.className = 'admin-message' + (tipo ? ' ' + tipo : ''); };
    $('adm27-audio-volumen').addEventListener('input', function () { $('adm27-vol-txt').textContent = Math.round(this.value * 100) + '%'; });
    $('adm27-audio-archivo').addEventListener('change', function () {
      var f = this.files && this.files[0], box = $('adm27-audio-previa'); box.innerHTML = '';
      if (audioPrevia) { URL.revokeObjectURL(audioPrevia); audioPrevia = null; }
      if (!f) return;
      if (!/^audio\//.test(f.type)) { msg('Ese archivo no es un audio.', 'error'); this.value = ''; return; }
      if (f.size > 15 * 1024 * 1024) { msg('El audio pesa más de 15 MB. Elige uno más liviano.', 'error'); this.value = ''; return; }
      audioPrevia = URL.createObjectURL(f);
      box.innerHTML = '<p>Vista previa: <b>' + esc(f.name) + '</b></p><audio controls src="' + audioPrevia + '"></audio>';
      if (!$('adm27-audio-titulo').value || $('adm27-audio-titulo').value === (ref.titulo || '')) $('adm27-audio-titulo').value = f.name.replace(/\.[a-z0-9]+$/i, '');
    });
    var guardar = async function (datos) {
      msg('Guardando…');
      var q = await c.from('cake_theme_audio').upsert(Object.assign({ theme: t.id, updated_at: new Date().toISOString(), volume: Number($('adm27-audio-volumen').value) || 0.35 }, datos), { onConflict: 'theme' });
      if (q.error) { msg(faltaSQL(q.error) ? 'No se guardó: falta ejecutar el SQL 2027 en Supabase.' : 'No se guardó: ' + q.error.message, 'error'); return false; }
      return true;
    };
    $('adm27-audio-guardar').addEventListener('click', async function () {
      var f = $('adm27-audio-archivo').files[0];
      var titulo = $('adm27-audio-titulo').value.trim(), artista = $('adm27-audio-artista').value.trim();
      if (!f) { if (!actualUrl) { msg('Primero selecciona un archivo de audio.', 'error'); return; } if (await guardar({ audio_url: actualUrl, track_title: titulo || null, artist: artista || null })) { msg('Datos del audio guardados para ' + t.nombre + '.', 'success'); } return; }
      this.disabled = true; msg('Subiendo audio…');
      var ruta = t.id + '/' + Date.now() + '-' + f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
      var up = await c.storage.from('theme-audio').upload(ruta, f, { contentType: f.type, upsert: false });
      this.disabled = false;
      if (up.error) { msg('No se pudo subir el audio: ' + up.error.message + (faltaSQL(up.error) || /bucket/i.test(up.error.message) ? ' (ejecuta el SQL 2027)' : ''), 'error'); return; }
      var url = c.storage.from('theme-audio').getPublicUrl(ruta).data.publicUrl;
      var anterior = fila && fila.storage_path;
      if (await guardar({ audio_url: url, file_name: f.name, storage_path: ruta, track_title: titulo || f.name, artist: artista || null, source_url: null })) {
        if (anterior && anterior !== ruta) await c.storage.from('theme-audio').remove([anterior]);
        msg('Audio guardado para ' + t.nombre + '. Las demás temáticas no cambiaron.', 'success'); setTimeout(pintarAudio, 900);
      } else { await c.storage.from('theme-audio').remove([ruta]); }
    });
    var inc = $('adm27-audio-incluida');
    if (inc) inc.addEventListener('click', async function () {
      if (await guardar({ audio_url: ref.archivo, file_name: ref.archivo.split('/').pop(), storage_path: null, track_title: ref.titulo, artist: ref.artista || null, source_url: ref.enlace || null })) {
        if (fila && fila.storage_path) await c.storage.from('theme-audio').remove([fila.storage_path]);
        msg('Se usará la pista incluida «' + ref.titulo + '».', 'success'); setTimeout(pintarAudio, 900);
      }
    });
    var quitar = $('adm27-audio-quitar');
    if (quitar) quitar.addEventListener('click', async function () {
      if (!confirm('¿Quitar la música de ' + t.nombre + '? La tienda de esta temática quedará sin música de fondo. Las demás temáticas no cambian.')) return;
      if (await guardar({ audio_url: null, file_name: null, storage_path: null })) {
        if (fila && fila.storage_path) await c.storage.from('theme-audio').remove([fila.storage_path]);
        msg('Música quitada de ' + t.nombre + '.', 'success'); setTimeout(pintarAudio, 900);
      }
    });
  }

  /* ---------------------------------------------------------
     9. «TUTORIALES Y VIDEOS»
     --------------------------------------------------------- */
  function pintarVideos() {
    var s = seccion('videos'), t = info(tema());
    var v = function (archivo, titulo) { var base = 'videos/tutoriales/' + t.id + '/' + archivo; return '<figure class="adm27-video"><video controls preload="none" poster="' + base + '.jpg" src="' + (window.cakeMedia ? window.cakeMedia(base + '.mp4') : base + '.mp4') + '" onerror="this.closest(\'figure\').classList.add(\'falta\')"></video><figcaption>' + titulo + '</figcaption></figure>'; };
    s.innerHTML = '<div class="admin-section-head"><div><h2>🎬 Tutoriales y videos</h2><p>Los dos tutoriales que ven tus clientes en la tienda de ' + esc(t.nombre) + ' (botón «Ver tutoriales»). Al cambiar de temática cambian también los tutoriales.</p></div></div><div class="adm27-videos">' + v('pedido', 'Cómo hacer un pedido') + v('personalizado', 'Cómo hacer un pedido personalizado') + '</div><p class="admin-order-muted">Los 50 videos (tutoriales, publicitarios y de productos) están organizados por temática en la carpeta VIDEOS del paquete de entrega.</p>';
  }

  /* ---------------------------------------------------------
     ARRANQUE
     --------------------------------------------------------- */
  function iniciar() {
    tarjetasTemas(); crearPestanas(); crearMenu(); prepararFormularioProducto(); pintarTemaActivo(); sesionVisible();
    var app = $('admin-app-view'); if (app && w.MutationObserver) new MutationObserver(sesionVisible).observe(app, { attributes: true, attributeFilter: ['hidden'] });
    w.addEventListener('resize', function () { if (!esMovil() && !d.documentElement.classList.contains('adm27-menu-abierto')) { var g = null; try { g = localStorage.getItem('adm27-menu'); } catch (e) { g = null; } if (g !== '0') abrirMenu(true); } });
    d.addEventListener('cake-tema-cambiado', pintarTemaActivo);
    d.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-admin-tab="navidad"]')) setTimeout(prepararEspecialidades, 0); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  d.addEventListener('cake-admin-listo', function () { seccion('pedidos-tema'); seccion('audio'); seccion('videos'); decorarProductos(); pintarTemaActivo(); });
})();
