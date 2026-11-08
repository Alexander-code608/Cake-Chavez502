/* =========================================================
   ADMIN-FUNCIONES.JS — botones nuevos del panel (2026):
   🏷️ Categorías y precios · 📸 Fotos de clientes · 🎁 Premios · ✨ Extras y avisos
   (📅 Pedidos programados está en admin.js porque usa las tarjetas de pedidos.)
   La seguridad real la dan Supabase Auth + admin_users + RLS.
   ========================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SQL = 'Primero ejecuta en Supabase el archivo supabase/funciones_nuevas_2026.sql (incluido en el ZIP).';
  var cargado = {};
  var ajustes = null;

  function A() { return window.CakeAdmin || {}; }
  function db() { return A().getClient ? A().getClient() : null; }
  function msg(id, texto, tipo) { var e = $(id); if (!e) return; e.textContent = texto || ''; e.className = ('admin-message ' + (tipo || '')).trim(); }
  function amable(error) {
    var t = String(error && error.message ? error.message : error || 'Error desconocido');
    if (/does not exist|schema cache|PGRST205|42P01|42703|column/i.test(t)) return SQL + ' (Detalle: ' + t + ')';
    if (/row-level security|permission denied/i.test(t)) return 'Tu usuario no tiene permiso. Revisa admin_users y el SQL nuevo. (Detalle: ' + t + ')';
    return t;
  }
  function el(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined && texto !== null) e.textContent = String(texto); return e; }
  function boton(html, clase, fn) { var b = el('button', 'admin-button ' + clase); b.type = 'button'; b.innerHTML = html; b.addEventListener('click', fn); return b; }
  function fmtQ(v) { return 'Q' + (Number(v) || 0).toFixed(2); }
  function slugify(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  async function subirFoto(file, carpeta) {
    if (!A().uploadPhoto) throw new Error('El panel todavía no está listo.');
    return A().uploadPhoto(file, carpeta);
  }

  /* =========================================================
     CRUD genérico (Extras, Preguntas, Premios)
     ========================================================= */
  function crud(cfg) {
    var raiz = $(cfg.mount); if (!raiz) return null;
    var filas = [];
    var editando = null;
    var archivo = null;
    var idp = cfg.id;
    raiz.className = 'af-grid-2 af-crud';
    var form = el('form', 'admin-form-card');
    var titulo = el('h3', '', cfg.tituloNuevo);
    form.appendChild(titulo);
    var grid = el('div', 'admin-form-grid');
    cfg.campos.forEach(function (c) {
      var caja = el('div', c.ancho || c.tipo === 'textarea' || c.tipo === 'imagen' ? 'admin-full' : '');
      if (c.tipo === 'check') {
        var lab = el('label', 'admin-inline-check'); var ch = el('input'); ch.type = 'checkbox'; ch.id = idp + '-' + c.clave; ch.checked = c.defecto !== false;
        lab.appendChild(ch); lab.appendChild(document.createTextNode(' ' + c.etiqueta)); caja.appendChild(lab);
      } else if (c.tipo === 'imagen') {
        caja.appendChild(el('label', '', c.etiqueta));
        var prev = el('img', 'af-crud-preview'); prev.id = idp + '-' + c.clave + '-prev'; prev.alt = ''; prev.hidden = true; caja.appendChild(prev);
        var f = el('input'); f.type = 'file'; f.accept = 'image/*'; f.id = idp + '-' + c.clave + '-file'; caja.appendChild(f);
        var u = el('input'); u.id = idp + '-' + c.clave; u.placeholder = 'O pega la dirección (URL) de una imagen'; u.maxLength = 1000; caja.appendChild(u);
        f.addEventListener('change', function () { archivo = f.files && f.files[0] ? f.files[0] : null; if (archivo) { prev.src = URL.createObjectURL(archivo); prev.hidden = false; } });
        u.addEventListener('input', function () { if (!archivo) { prev.src = u.value; prev.hidden = !u.value; } });
      } else {
        var l = el('label', '', c.etiqueta); l.htmlFor = idp + '-' + c.clave; caja.appendChild(l);
        var i = el(c.tipo === 'textarea' ? 'textarea' : 'input'); i.id = idp + '-' + c.clave;
        if (c.tipo === 'textarea') i.rows = 3; else i.type = c.tipo || 'text';
        if (c.max) i.maxLength = c.max; if (c.paso) i.step = c.paso; if (c.min !== undefined) i.min = c.min; if (c.maximo !== undefined) i.max = c.maximo;
        if (c.requerido) i.required = true; if (c.ayuda) i.placeholder = c.ayuda;
        caja.appendChild(i);
      }
      grid.appendChild(caja);
    });
    form.appendChild(grid);
    var acciones = el('div', 'admin-form-actions');
    var guardar = el('button', 'admin-button admin-button-primary'); guardar.type = 'submit'; guardar.innerHTML = '<i class="fas fa-save"></i> Guardar';
    acciones.appendChild(guardar);
    acciones.appendChild(boton('Nuevo / limpiar', 'admin-button-outline', function () { limpiar(); }));
    form.appendChild(acciones);
    var mensaje = el('p', 'admin-message'); mensaje.id = idp + '-msg'; mensaje.setAttribute('role', 'status'); form.appendChild(mensaje);
    var listaCard = el('div', 'admin-list-card');
    var cab = el('div', 'admin-list-toolbar'); cab.appendChild(el('h3', '', cfg.tituloLista));
    listaCard.appendChild(cab);
    var lista = el('div', 'af-lista'); listaCard.appendChild(lista);
    raiz.replaceChildren(form, listaCard);

    function valor(c) { var e = $(idp + '-' + c.clave); return c.tipo === 'check' ? e.checked : e.value; }
    function limpiar() {
      editando = null; archivo = null; form.reset(); titulo.textContent = cfg.tituloNuevo; mensaje.textContent = '';
      cfg.campos.forEach(function (c) {
        var e = $(idp + '-' + c.clave);
        if (c.tipo === 'check') e.checked = c.defecto !== false;
        else if (c.defecto !== undefined) e.value = typeof c.defecto === 'function' ? c.defecto(filas) : c.defecto;
        if (c.tipo === 'imagen') { var p = $(idp + '-' + c.clave + '-prev'); p.hidden = true; p.removeAttribute('src'); }
      });
    }
    function llenar(f) {
      limpiar(); editando = f; titulo.textContent = 'Editar: ' + (f[cfg.nombre] || '');
      cfg.campos.forEach(function (c) {
        var e = $(idp + '-' + c.clave);
        if (c.tipo === 'check') e.checked = f[c.clave] !== false;
        else e.value = f[c.clave] !== null && f[c.clave] !== undefined ? f[c.clave] : '';
        if (c.tipo === 'imagen' && f[c.clave]) { var p = $(idp + '-' + c.clave + '-prev'); p.src = f[c.clave]; p.hidden = false; }
      });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function cargar() {
      lista.replaceChildren(el('p', '', 'Cargando…'));
      var r = await db().from(cfg.tabla).select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
      if (r.error) { lista.replaceChildren(el('p', 'af-error', amable(r.error))); return; }
      filas = r.data || [];
      if (!editando) limpiar();
      lista.replaceChildren();
      if (!filas.length) lista.appendChild(el('p', 'af-vacio', cfg.vacio));
      filas.forEach(function (f) {
        var fila = el('article', 'af-fila' + (f.is_active === false ? ' af-fila-oculta' : ''));
        if (cfg.imagen) { var img = el('img'); img.src = f[cfg.imagen] || ''; img.alt = ''; img.onerror = function () { img.style.visibility = 'hidden'; }; fila.appendChild(img); }
        var meta = el('div', 'af-fila-meta');
        meta.appendChild(el('strong', '', f[cfg.nombre]));
        meta.appendChild(el('span', '', cfg.detalle(f)));
        fila.appendChild(meta);
        var ac = el('div', 'admin-row-actions');
        ac.appendChild(boton('Editar', 'admin-button-outline', function () { llenar(f); }));
        if (f.is_active !== undefined) ac.appendChild(boton(f.is_active === false ? 'Mostrar' : 'Ocultar', 'admin-button-outline', async function () {
          var r2 = await db().from(cfg.tabla).update({ is_active: f.is_active === false }).eq('id', f.id);
          if (r2.error) { msg(idp + '-msg', amable(r2.error), 'error'); return; } cargar();
        }));
        ac.appendChild(boton('Borrar', 'admin-button-danger', async function () {
          if (!confirm('¿Borrar «' + f[cfg.nombre] + '»? No se puede deshacer.')) return;
          var r3 = await db().from(cfg.tabla).delete().eq('id', f.id);
          if (r3.error) { msg(idp + '-msg', amable(r3.error), 'error'); return; }
          if (editando && editando.id === f.id) limpiar();
          cargar();
        }));
        fila.appendChild(ac);
        lista.appendChild(fila);
      });
    }
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      msg(idp + '-msg', 'Guardando…');
      guardar.disabled = true;
      try {
        var datos = {};
        for (var k = 0; k < cfg.campos.length; k++) {
          var c = cfg.campos[k], v = valor(c);
          if (c.tipo === 'number') v = v === '' ? (c.defectoNumero !== undefined ? c.defectoNumero : 0) : Number(v);
          if (c.tipo === 'imagen') {
            if (archivo) { msg(idp + '-msg', 'Subiendo imagen…'); v = await subirFoto(archivo, cfg.carpeta || 'extras'); }
            v = String(v || '').trim();
          }
          if (typeof v === 'string' && c.tipo !== 'imagen') v = v.trim();
          if (c.requerido && (v === '' || v === null)) throw new Error('Completa: ' + c.etiqueta);
          datos[c.clave] = v;
        }
        var r = editando ? await db().from(cfg.tabla).update(datos).eq('id', editando.id) : await db().from(cfg.tabla).insert(datos);
        if (r.error) throw r.error;
        editando = null;
        msg(idp + '-msg', 'Guardado correctamente.', 'success');
        await cargar();
        msg(idp + '-msg', 'Guardado correctamente.', 'success');
      } catch (e) { msg(idp + '-msg', amable(e), 'error'); }
      finally { guardar.disabled = false; }
    });
    return { cargar: cargar };
  }

  /* =========================================================
     AJUSTES (barra, reloj, extras, galería, QR, guía, raspa y gana)
     ========================================================= */
  async function cargarAjustes() {
    var r = await db().from('cake_features_settings').select('*').eq('id', 1).maybeSingle();
    if (r.error) { msg('af-features-message', amable(r.error), 'error'); msg('af-raspa-message', amable(r.error), 'error'); return null; }
    ajustes = r.data || {};
    return ajustes;
  }
  async function guardarAjustes(cambios, idMensaje) {
    msg(idMensaje, 'Guardando…');
    var datos = Object.assign({ id: 1 }, cambios);
    var r = await db().from('cake_features_settings').upsert(datos, { onConflict: 'id' });
    if (r.error) { msg(idMensaje, amable(r.error), 'error'); return false; }
    ajustes = Object.assign({}, ajustes || {}, cambios);
    msg(idMensaje, 'Guardado. Los cambios ya se ven en la tienda.', 'success');
    return true;
  }
  function pintarAjustesFunciones() {
    var a = ajustes || {};
    $('af-banner-on').checked = a.banner_enabled !== false;
    $('af-banner-text').value = a.banner_text || '';
    $('af-banner-deadline').value = a.banner_deadline || '';
    $('af-banner-dates').value = (Array.isArray(a.banner_dates) ? a.banner_dates : []).join('\n');
    $('af-banner-spots').checked = a.banner_show_spots !== false;
    $('af-count-on').checked = a.countdown_enabled !== false;
    var ev = Array.isArray(a.countdown_events) ? a.countdown_events : [];
    $('af-count-label1').value = ev[0] ? ev[0].label || '' : '';
    $('af-count-date1').value = ev[0] ? String(ev[0].date || '').slice(0, 16) : '';
    $('af-count-label2').value = ev[1] ? ev[1].label || '' : '';
    $('af-count-date2').value = ev[1] ? String(ev[1].date || '').slice(0, 16) : '';
    $('af-count-msgs').value = (Array.isArray(a.countdown_messages) ? a.countdown_messages : []).join('\n');
    $('af-extras-on').checked = a.extras_enabled !== false;
    $('af-gift-on').checked = a.gift_qr_enabled !== false;
    $('af-gallery-on').checked = a.gallery_enabled !== false;
    $('af-gallery-title').value = a.gallery_title || '';
    var filas = $('af-guia-filas'); filas.replaceChildren();
    (Array.isArray(a.portion_guide) ? a.portion_guide : []).forEach(agregarFilaGuia);
  }
  function agregarFilaGuia(g) {
    g = g || { label: '', slices: '', note: '', tiers: 1 };
    var fila = el('div', 'af-guia-fila');
    function campo(etq, clave, ancho, tipo) {
      var c = el('label', 'af-guia-campo'); c.appendChild(el('span', '', etq));
      var i = el('input'); i.dataset.clave = clave; i.value = g[clave] !== undefined ? g[clave] : ''; i.type = tipo || 'text'; if (tipo === 'number') { i.min = 1; i.max = 4; }
      if (ancho) c.style.flex = ancho; c.appendChild(i); fila.appendChild(c);
    }
    campo('Tamaño / molde', 'label', '1.2');
    campo('Rebanadas', 'slices', '1');
    campo('Nota', 'note', '1.4');
    campo('Pisos', 'tiers', '.4', 'number');
    fila.appendChild(boton('×', 'admin-button-danger af-guia-quitar', function () { fila.remove(); }));
    $('af-guia-filas').appendChild(fila);
  }
  function lineas(id) { return String($(id).value || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

  /* =========================================================
     🏷️ CATEGORÍAS Y PRECIOS
     ========================================================= */
  var categorias = [];
  async function cargarCategorias() {
    var lista = $('af-cat-list');
    lista.replaceChildren(el('p', '', 'Cargando…'));
    var r = await db().from('cake_categories').select('*').order('display_order', { ascending: true });
    if (r.error) { lista.replaceChildren(el('p', 'af-error', amable(r.error))); return; }
    categorias = r.data || [];
    var productos = A().getProducts ? A().getProducts() : [];
    lista.replaceChildren();
    categorias.forEach(function (c) {
      var usados = productos.filter(function (p) { return p.category === c.slug; }).length;
      var fila = el('article', 'af-cat-fila' + (c.is_active === false ? ' af-fila-oculta' : ''));
      var nombre = el('input'); nombre.value = c.name; nombre.maxLength = 60; nombre.setAttribute('aria-label', 'Nombre de la categoría');
      var orden = el('input'); orden.type = 'number'; orden.value = c.display_order; orden.className = 'af-num'; orden.setAttribute('aria-label', 'Orden');
      var pastel = el('label', 'admin-inline-check'); var chP = el('input'); chP.type = 'checkbox'; chP.checked = !!c.is_cake; pastel.appendChild(chP); pastel.appendChild(document.createTextNode(' Pasteles (rebanadas)'));
      var visible = el('label', 'admin-inline-check'); var chV = el('input'); chV.type = 'checkbox'; chV.checked = c.is_active !== false; visible.appendChild(chV); visible.appendChild(document.createTextNode(' Visible'));
      var info = el('small', 'af-cat-info', usados + ' producto(s) · enlace: ' + c.slug + (c.is_system ? ' · se muestra en «Especialidades»' : ''));
      var ac = el('div', 'admin-row-actions');
      ac.appendChild(boton('<i class="fas fa-save"></i> Guardar', 'admin-button-primary', async function () {
        var r2 = await db().from('cake_categories').update({ name: nombre.value.trim() || c.name, display_order: Number(orden.value) || 0, is_cake: chP.checked, is_active: chV.checked }).eq('slug', c.slug);
        if (r2.error) { msg('af-cat-message', amable(r2.error), 'error'); return; }
        msg('af-cat-message', 'Categoría «' + (nombre.value.trim() || c.name) + '» guardada.', 'success');
        await refrescarTodo();
      }));
      if (!c.is_system) ac.appendChild(boton('Borrar', 'admin-button-danger', async function () {
        if (usados) { alert('Esta categoría tiene ' + usados + ' producto(s). Muévelos a otra categoría (o envíalos a la papelera) antes de borrarla, o simplemente desmarca «Visible».'); return; }
        if (!confirm('¿Borrar la categoría «' + c.name + '»?')) return;
        var r3 = await db().from('cake_categories').delete().eq('slug', c.slug);
        if (r3.error) { msg('af-cat-message', amable(r3.error), 'error'); return; }
        await refrescarTodo();
      }));
      var cuerpo = el('div', 'af-cat-campos'); cuerpo.append(nombre, orden, pastel, visible);
      fila.append(cuerpo, info, ac);
      lista.appendChild(fila);
    });
    var sel = $('af-precios-cat'); var actual = sel.value;
    sel.replaceChildren();
    categorias.forEach(function (c) { var o = el('option', '', c.name); o.value = c.slug; sel.appendChild(o); });
    if (actual && categorias.some(function (c) { return c.slug === actual; })) sel.value = actual;
    pintarPrecios();
  }
  async function refrescarTodo() {
    if (A().reloadCategories) await A().reloadCategories();
    await cargarCategorias();
  }
  function pintarPrecios() {
    var cont = $('af-precios-list'); if (!cont) return;
    var slug = $('af-precios-cat').value;
    var cat = categorias.filter(function (c) { return c.slug === slug; })[0];
    var esPastel = cat ? !!cat.is_cake : false;
    var productos = (A().getProducts ? A().getProducts() : []).filter(function (p) { return p.category === slug; });
    cont.replaceChildren();
    if (!productos.length) { cont.appendChild(el('p', 'af-vacio', 'No hay productos en esta categoría.')); return; }
    productos.forEach(function (p) {
      var fila = el('article', 'af-precio-fila');
      var img = el('img'); img.src = p.image_url || ''; img.alt = ''; img.onerror = function () { img.style.visibility = 'hidden'; };
      var nom = el('strong', '', p.name);
      var campos = el('div', 'af-precio-campos');
      var inputs = {};
      function num(etq, clave, paso) {
        var l = el('label', 'af-precio-campo' + (/slices/.test(clave) ? ' af-reb' : '')); l.appendChild(el('span', '', etq));
        var i = el('input'); i.type = 'number'; i.min = 0; i.step = paso || '0.01'; i.value = p[clave] !== null && p[clave] !== undefined ? p[clave] : ''; inputs[clave] = i;
        l.appendChild(i); campos.appendChild(l);
      }
      num('Precio base Q', 'price');
      num('Pequeño Q', 'price_small'); if (esPastel) num('🍰 reb.', 'slices_small', '1');
      num('Mediano Q', 'price_medium'); if (esPastel) num('🍰 reb.', 'slices_medium', '1');
      num('Grande Q', 'price_large'); if (esPastel) num('🍰 reb.', 'slices_large', '1');
      num('Oferta Q', 'sale_price');
      var g = boton('<i class="fas fa-save"></i> Guardar', 'admin-button-primary', async function () {
        var datos = {};
        Object.keys(inputs).forEach(function (k) {
          var v = inputs[k].value.trim();
          datos[k] = v === '' ? (k === 'price' ? 0 : null) : (/slices/.test(k) ? Math.max(0, Math.round(Number(v))) : Number(v));
        });
        datos.updated_at = new Date().toISOString();
        g.disabled = true;
        var r = await db().from('products').update(datos).eq('id', p.id);
        g.disabled = false;
        if (r.error) { msg('af-precios-message', amable(r.error), 'error'); return; }
        Object.assign(p, datos);
        msg('af-precios-message', 'Precios de «' + p.name + '» guardados.', 'success');
        fila.classList.add('af-guardado'); setTimeout(function () { fila.classList.remove('af-guardado'); }, 1200);
      });
      fila.append(img, nom, campos, g);
      cont.appendChild(fila);
    });
  }

  /* =========================================================
     📸 FOTOS DE CLIENTES
     ========================================================= */
  var fotos = [], estadoFotos = 'pendiente', qrFotos = null;
  async function cargarFotos() {
    var lista = $('af-fotos-list');
    lista.replaceChildren(el('p', '', 'Cargando…'));
    var r = await db().from('cake_customer_photos').select('*').order('created_at', { ascending: false }).limit(500);
    if (r.error) { lista.replaceChildren(el('p', 'af-error', amable(r.error))); return; }
    fotos = r.data || [];
    pintarFotos();
  }
  function pintarFotos() {
    document.querySelectorAll('[data-foto-estado]').forEach(function (b) { b.classList.toggle('active', b.dataset.fotoEstado === estadoFotos); });
    ['pendiente', 'aprobada', 'rechazada'].forEach(function (e) { var c = document.querySelector('[data-foto-count="' + e + '"]'); if (c) c.textContent = String(fotos.filter(function (f) { return f.status === e; }).length); });
    var lista = $('af-fotos-list'); lista.replaceChildren();
    var visibles = fotos.filter(function (f) { return f.status === estadoFotos; });
    if (!visibles.length) { lista.appendChild(el('p', 'af-vacio', estadoFotos === 'pendiente' ? 'No hay fotos nuevas por revisar. 🎉' : 'No hay fotos en esta sección.')); return; }
    visibles.forEach(function (f) {
      var card = el('article', 'af-foto');
      var a = el('a'); a.href = f.image_url; a.target = '_blank'; a.rel = 'noopener';
      var img = el('img'); img.src = f.image_url; img.alt = 'Foto de ' + (f.customer_name || 'cliente'); img.loading = 'lazy'; a.appendChild(img);
      card.appendChild(a);
      var meta = el('div', 'af-foto-meta');
      meta.appendChild(el('strong', '', f.customer_name || 'Sin nombre'));
      if (f.message) meta.appendChild(el('p', '', '“' + f.message + '”'));
      meta.appendChild(el('small', '', new Date(f.created_at).toLocaleString('es-GT') + (f.source === 'admin' ? ' · subida por ti' : '')));
      card.appendChild(meta);
      var ac = el('div', 'af-foto-acciones');
      function cambiar(estado, texto) {
        return async function () {
          var r = await db().from('cake_customer_photos').update({ status: estado, reviewed_at: new Date().toISOString() }).eq('id', f.id);
          if (r.error) { A().globalMessage && A().globalMessage(amable(r.error), 'error'); return; }
          f.status = estado; pintarFotos();
          if (A().globalMessage) A().globalMessage(texto, 'success');
        };
      }
      if (f.status !== 'aprobada') ac.appendChild(boton('<i class="fas fa-check"></i> Confirmar', 'admin-button-primary', cambiar('aprobada', 'Foto confirmada: ya aparece en «Clientes felices».')));
      if (f.status !== 'rechazada') ac.appendChild(boton(f.status === 'aprobada' ? 'Quitar de la galería' : 'No publicar', 'admin-button-outline', cambiar('rechazada', 'La foto no se mostrará en la tienda.')));
      ac.appendChild(boton('Eliminar', 'admin-button-danger', async function () {
        if (!confirm('¿Eliminar esta foto definitivamente?')) return;
        var r = await db().from('cake_customer_photos').delete().eq('id', f.id);
        if (r.error) { A().globalMessage && A().globalMessage(amable(r.error), 'error'); return; }
        var ruta = A().imageStoragePath ? A().imageStoragePath(f.image_url) : null;
        if (ruta && /^clientes-felices\//.test(ruta)) await db().storage.from('product-images').remove([ruta]).catch(function () { /* nada */ });
        fotos = fotos.filter(function (x) { return x.id !== f.id; }); pintarFotos();
      }));
      card.appendChild(ac);
      lista.appendChild(card);
    });
  }
  function pintarQRFotos() {
    if (!window.CakeQR) return;
    var url = window.CakeQR.urlFotos();
    window.CakeQR.dibujar(url, 260).then(function (c) { qrFotos = c; $('af-fotos-qr').replaceChildren(c, el('small', 'af-qr-url', url)); });
  }
  function tarjetaQRFotos() {
    var url = window.CakeQR.urlFotos();
    return window.CakeQR.dibujar(url, 900);
  }

  /* =========================================================
     ARRANQUE DE CADA BOTÓN
     ========================================================= */
  var crudExtras = null, crudFaq = null, crudPremios = null;
  function prepararCruds() {
    crudExtras = crud({
      mount: 'af-extras-crud', id: 'af-extra', tabla: 'cake_extras', nombre: 'name', imagen: 'image_url', carpeta: 'extras',
      tituloNuevo: '🕯️ Agregar extra del carrito', tituloLista: 'Extras que se sugieren en el carrito', vacio: 'Todavía no hay extras.',
      detalle: function (f) { return fmtQ(f.price) + (f.is_active === false ? ' · oculto' : '') + (f.description ? ' · ' + f.description : ''); },
      campos: [
        { clave: 'name', etiqueta: 'Nombre', max: 100, requerido: true, ayuda: 'Ej. Velitas mágicas' },
        { clave: 'price', etiqueta: 'Precio (Q)', tipo: 'number', paso: '0.01', min: 0 },
        { clave: 'description', etiqueta: 'Descripción corta', max: 300, ancho: true },
        { clave: 'image_url', etiqueta: 'Foto', tipo: 'imagen' },
        { clave: 'display_order', etiqueta: 'Orden', tipo: 'number', paso: '1', defecto: function (f) { return String((f.length + 1) * 10); }, defectoNumero: 10 },
        { clave: 'is_active', etiqueta: 'Activo (se muestra en el carrito)', tipo: 'check' }
      ]
    });
    crudFaq = crud({
      mount: 'af-faq-crud', id: 'af-faq', tabla: 'cake_faqs', nombre: 'question',
      tituloNuevo: '❓ Agregar pregunta frecuente', tituloLista: 'Preguntas frecuentes', vacio: 'No hay preguntas; la tienda muestra las de siempre.',
      detalle: function (f) { return String(f.answer || '').slice(0, 110) + (String(f.answer || '').length > 110 ? '…' : ''); },
      campos: [
        { clave: 'question', etiqueta: 'Pregunta', max: 200, requerido: true, ancho: true },
        { clave: 'answer', etiqueta: 'Respuesta', tipo: 'textarea', max: 1500, requerido: true },
        { clave: 'display_order', etiqueta: 'Orden', tipo: 'number', paso: '1', defecto: function (f) { return String((f.length + 1) * 10); }, defectoNumero: 10 },
        { clave: 'is_active', etiqueta: 'Visible', tipo: 'check' }
      ]
    });
    crudPremios = crud({
      mount: 'af-premios-crud', id: 'af-premio', tabla: 'cake_prizes', nombre: 'name', imagen: 'image_url', carpeta: 'premios',
      tituloNuevo: '🎁 Agregar premio', tituloLista: 'Premios', vacio: 'Agrega al menos un premio para que aparezca el juego.',
      detalle: function (f) { return 'Frecuencia ' + (f.weight || 1) + ' · ' + (f.detail || '') + (f.is_active === false ? ' · oculto' : ''); },
      campos: [
        { clave: 'name', etiqueta: 'Nombre del premio', max: 100, requerido: true, ayuda: 'Ej. ¡Velita mágica gratis!' },
        { clave: 'weight', etiqueta: 'Qué tan seguido sale (1 a 100)', tipo: 'number', paso: '1', min: 1, maximo: 100, defecto: '1', defectoNumero: 1 },
        { clave: 'detail', etiqueta: 'Detalles', max: 300, ancho: true, ayuda: 'Ej. Te regalamos una velita con tu pedido.' },
        { clave: 'image_url', etiqueta: 'Imagen del premio', tipo: 'imagen' },
        { clave: 'display_order', etiqueta: 'Orden', tipo: 'number', paso: '1', defecto: function (f) { return String((f.length + 1) * 10); }, defectoNumero: 10 },
        { clave: 'is_active', etiqueta: 'Activo', tipo: 'check' }
      ]
    });
  }
  async function alAbrir(tab) {
    if (!db()) return;
    if (tab === 'categories') { await cargarCategorias(); }
    if (tab === 'photos') { if (!cargado.photos) pintarQRFotos(); cargado.photos = true; await cargarFotos(); }
    if (tab === 'prizes') {
      var a = await cargarAjustes();
      if (a) { $('af-raspa-activo').checked = a.scratch_enabled !== false; $('af-raspa-titulo').value = a.scratch_title || ''; $('af-raspa-sub').value = a.scratch_subtitle || ''; }
      if (crudPremios) await crudPremios.cargar();
    }
    if (tab === 'features') {
      var b = await cargarAjustes();
      if (b) pintarAjustesFunciones();
      if (crudExtras) crudExtras.cargar();
      if (crudFaq) crudFaq.cargar();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('admin-panel-categories')) return;
    document.querySelectorAll('[data-admin-tab]').forEach(function (b) { b.addEventListener('click', function () { alAbrir(b.dataset.adminTab); }); });
    document.addEventListener('cake-admin-listo', prepararCruds);

    // Categorías
    $('af-cat-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var nombre = $('af-cat-name').value.trim();
      var slug = slugify(nombre);
      if (!slug) { msg('af-cat-message', 'Escribe un nombre.', 'error'); return; }
      if (categorias.some(function (c) { return c.slug === slug; })) { msg('af-cat-message', 'Ya existe una categoría con ese nombre.', 'error'); return; }
      var r = await db().from('cake_categories').insert({ slug: slug, name: nombre, display_order: Number($('af-cat-order').value) || 60, is_cake: $('af-cat-cake').checked, is_active: $('af-cat-active').checked });
      if (r.error) { msg('af-cat-message', amable(r.error), 'error'); return; }
      $('af-cat-form').reset(); $('af-cat-active').checked = true;
      msg('af-cat-message', 'Categoría «' + nombre + '» creada. Ya puedes elegirla al guardar productos.', 'success');
      await refrescarTodo();
    });
    $('af-cat-refresh').addEventListener('click', cargarCategorias);
    $('af-precios-cat').addEventListener('change', pintarPrecios);

    // Fotos
    $('af-fotos-refresh').addEventListener('click', cargarFotos);
    document.querySelectorAll('[data-foto-estado]').forEach(function (b) { b.addEventListener('click', function () { estadoFotos = b.dataset.fotoEstado; pintarFotos(); }); });
    $('af-fotos-qr-descargar').addEventListener('click', function () { tarjetaQRFotos().then(function (c) { window.CakeQR.descargar(c, 'qr-fotos-clientes-cake-chavez.png'); }); });
    $('af-fotos-qr-compartir').addEventListener('click', function () { tarjetaQRFotos().then(function (c) { window.CakeQR.compartir(c, 'qr-fotos-clientes-cake-chavez.png', '📸 Comparte las fotos de tu fiesta con Cake Chávez: ' + window.CakeQR.urlFotos()); }); });
    $('af-fotos-qr-copiar').addEventListener('click', function () { window.CakeQR.copiar(window.CakeQR.urlFotos()).then(function () { msg('af-fotos-qr-message', 'Enlace copiado: ' + window.CakeQR.urlFotos(), 'success'); }); });
    $('af-fotos-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var files = Array.prototype.slice.call($('af-fotos-archivos').files || []);
      if (!files.length) { msg('af-fotos-message', 'Elige al menos una foto.', 'error'); return; }
      try {
        for (var i = 0; i < files.length; i++) {
          msg('af-fotos-message', 'Subiendo foto ' + (i + 1) + ' de ' + files.length + '…');
          var url = await subirFoto(files[i], 'clientes-felices');
          var r = await db().from('cake_customer_photos').insert({ customer_name: $('af-fotos-nombre').value.trim(), message: $('af-fotos-texto').value.trim(), image_url: url, status: 'aprobada', source: 'admin', reviewed_at: new Date().toISOString() });
          if (r.error) throw r.error;
        }
        $('af-fotos-form').reset();
        msg('af-fotos-message', 'Fotos publicadas en «Clientes felices».', 'success');
        estadoFotos = 'aprobada'; await cargarFotos();
      } catch (e) { msg('af-fotos-message', amable(e), 'error'); }
    });

    // Premios
    $('af-premios-refresh').addEventListener('click', function () { alAbrir('prizes'); });
    $('af-raspa-ajustes').addEventListener('submit', function (ev) {
      ev.preventDefault();
      guardarAjustes({ scratch_enabled: $('af-raspa-activo').checked, scratch_title: $('af-raspa-titulo').value.trim() || 'Raspa y gana navideño', scratch_subtitle: $('af-raspa-sub').value.trim() }, 'af-raspa-message');
    });

    // Extras y avisos
    $('af-features-refresh').addEventListener('click', function () { alAbrir('features'); });
    $('af-guia-agregar').addEventListener('click', function () { agregarFilaGuia(); });
    $('af-features-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fechas = lineas('af-banner-dates').filter(function (f) { return /^\d{4}-\d{2}-\d{2}$/.test(f); });
      var eventos = [];
      [['af-count-label1', 'af-count-date1'], ['af-count-label2', 'af-count-date2']].forEach(function (p) {
        var d = $(p[1]).value; if (d) eventos.push({ label: $(p[0]).value.trim() || 'Celebración', date: d.slice(0, 16) });
      });
      var guia = Array.prototype.map.call(document.querySelectorAll('#af-guia-filas .af-guia-fila'), function (f) {
        var o = {}; Array.prototype.forEach.call(f.querySelectorAll('input'), function (i) { o[i.dataset.clave] = i.dataset.clave === 'tiers' ? Math.max(1, Math.min(4, Number(i.value) || 1)) : i.value.trim(); });
        return o;
      }).filter(function (g) { return g.label && g.slices; });
      guardarAjustes({
        banner_enabled: $('af-banner-on').checked,
        banner_text: $('af-banner-text').value.trim() || '🎄 ¡Cupos limitados! Haz tu apartado antes del {fecha}.',
        banner_deadline: $('af-banner-deadline').value || null,
        banner_dates: fechas,
        banner_show_spots: $('af-banner-spots').checked,
        countdown_enabled: $('af-count-on').checked,
        countdown_events: eventos,
        countdown_messages: lineas('af-count-msgs'),
        extras_enabled: $('af-extras-on').checked,
        gift_qr_enabled: $('af-gift-on').checked,
        gallery_enabled: $('af-gallery-on').checked,
        gallery_title: $('af-gallery-title').value.trim() || 'Clientes felices',
        portion_guide: guia
      }, 'af-features-message');
    });
  });
})();
