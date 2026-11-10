/* =========================================================
   CAKE CHÁVEZ — PANEL: TEMAS, RECORDATORIOS DE WHATSAPP Y
   ENLACE DIRECTO A UN PEDIDO (admin.html?panel=1&pedido=CC-...)
   - No modifica ninguna función anterior del panel.
   - El aviso de pedidos nuevos (script.js → tu número de siempre) NO se toca:
     esta pantalla solo administra la lista independiente de recordatorios.
   ========================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function A() { return window.CakeAdmin || {}; }
  function db() { var a = A(); return a.getClient ? a.getClient() : null; }
  function msg(id, texto, tipo) { var el = $(id); if (!el) return; el.textContent = texto || ''; el.className = 'admin-message' + (tipo ? ' ' + tipo : ''); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  var NOMBRES = { 'navidad': 'Navidad', 'anio-nuevo': 'Año Nuevo' };
  var listo = false;

  /* =========================================================
     1. TEMAS
     ========================================================= */
  var temaActual = window.CakeTema ? window.CakeTema.actual : 'navidad';

  function pintarTemas() {
    document.querySelectorAll('[data-tema-card]').forEach(function (card) {
      var activo = card.getAttribute('data-tema-card') === temaActual;
      card.classList.toggle('activo', activo);
      var badge = card.querySelector('.tema-badge'); if (badge) badge.hidden = !activo;
      var btn = card.querySelector('[data-cambiar-tema]');
      if (btn) {
        btn.disabled = activo;
        btn.innerHTML = activo ? '<i class="fas fa-check"></i> Cambiar tema · ya está activo' : '<i class="fas fa-wand-magic-sparkles"></i> Cambiar tema';
      }
    });
    var anio = window.CakeTema ? window.CakeTema.anioNuevo() : new Date().getFullYear() + 1;
    document.querySelectorAll('[data-anio-nuevo]').forEach(function (el) { el.textContent = String(anio); });
  }

  async function cargarTema() {
    var c = db(); if (!c) return;
    var r = await c.from('cake_site_theme').select('theme,updated_at').eq('id', 1).maybeSingle();
    if (r.error) {
      msg('tema-message', 'No se pudo leer el tema. ¿Ya ejecutaste el archivo SQL «temas_y_recordatorios_2026.sql» en Supabase? (' + r.error.message + ')', 'error');
      return;
    }
    if (r.data && NOMBRES[r.data.theme]) {
      temaActual = r.data.theme;
      if (window.CakeTema && window.CakeTema.actual !== temaActual) window.CakeTema.aplicar(temaActual);
    }
    pintarTemas();
  }

  async function cambiarTema(tema) {
    if (!NOMBRES[tema] || tema === temaActual) return;
    if (!confirm('¿Cambiar la tienda y el panel al tema de ' + NOMBRES[tema] + '?')) return;
    var c = db(); if (!c) return;
    document.querySelectorAll('[data-cambiar-tema]').forEach(function (b) { b.disabled = true; });
    msg('tema-message', 'Cambiando tema…');
    var r = await c.from('cake_site_theme').upsert({ id: 1, theme: tema }, { onConflict: 'id' }).select('theme').maybeSingle();
    if (r.error) {
      msg('tema-message', 'No se pudo cambiar el tema: ' + r.error.message, 'error');
      pintarTemas();
      return;
    }
    temaActual = tema;
    if (window.CakeTema) window.CakeTema.aplicar(tema);
    pintarTemas();
    msg('tema-message', '¡Listo! La tienda y el panel ahora usan el tema de ' + NOMBRES[tema] + '.', 'success');
  }

  /* =========================================================
     2. ADORNOS DEL PANEL SEGÚN EL TEMA
     ========================================================= */
  function adornosPanel() {
    var viejo = document.querySelector('.panel-adornos');
    if (viejo) viejo.parentNode.removeChild(viejo);
    var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cont = document.createElement('div');
    cont.className = 'panel-adornos';
    cont.setAttribute('aria-hidden', 'true');
    var tema = window.CakeTema ? window.CakeTema.actual : 'navidad';
    var html = '';
    if (tema === 'navidad') {
      html += '<div class="panel-guirnalda">' + new Array(19).join('<i></i>') + '</div>';
      if (!reducir) for (var i = 0; i < 12; i++) {
        html += '<span class="panel-copo" style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-duration:' + (10 + Math.random() * 8).toFixed(1) + 's;animation-delay:-' + (Math.random() * 15).toFixed(1) + 's;font-size:' + (9 + Math.random() * 8).toFixed(0) + 'px">' + ['❄', '❅', '❆'][i % 3] + '</span>';
      }
    } else {
      html += '<div class="panel-banderines">' + new Array(23).join('<i></i>') + '</div>';
      if (!reducir) for (var j = 0; j < 12; j++) {
        html += '<span class="panel-confeti" style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-duration:' + (11 + Math.random() * 8).toFixed(1) + 's;animation-delay:-' + (Math.random() * 15).toFixed(1) + 's;background:' + ['#b9dfc0', '#e7c98b', '#f3cdb4', '#f7eedd'][j % 4] + '"></span>';
      }
    }
    cont.innerHTML = html;
    document.body.insertBefore(cont, document.body.firstChild);
  }

  /* =========================================================
     3. RECORDATORIOS DE ENTREGAS POR WHATSAPP
     ========================================================= */
  var recDatos = { ajustes: null, numeros: [] };

  function normalizarTelefono(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.length === 8) d = '502' + d; // número de Guatemala sin código de país
    return d;
  }
  function telefonoBonito(d) {
    d = String(d || '');
    if (d.indexOf('502') === 0 && d.length === 11) return '+502 ' + d.slice(3, 7) + ' ' + d.slice(7);
    return '+' + d;
  }

  function pintarEstadoGeneral() {
    var on = !!(recDatos.ajustes && recDatos.ajustes.enabled);
    var activos = recDatos.numeros.filter(function (n) { return n.is_active; }).length;
    $('rec-enabled').checked = on;
    $('rec-enabled-label').textContent = on ? 'Activos' : 'Pausados';
    var t = $('rec-estado-texto');
    t.classList.toggle('on', on);
    t.textContent = on
      ? (activos ? '✅ Activos · se enviarán a ' + activos + ' número' + (activos === 1 ? '' : 's') + '.' : '⚠️ Activos, pero no hay números activos en la lista.')
      : '⏸️ Pausados · no se envía ningún recordatorio.';
  }

  async function cargarAjustesRec() {
    var c = db(); if (!c) return;
    var r = await c.from('cake_reminder_settings').select('*').eq('id', 1).maybeSingle();
    if (r.error) { msg('rec-settings-message', 'No se pudieron leer los ajustes. ¿Ejecutaste el archivo SQL «temas_y_recordatorios_2026.sql»? (' + r.error.message + ')', 'error'); return; }
    var a = r.data || {};
    recDatos.ajustes = a;
    $('rec-tomorrow-at').value = String(a.send_tomorrow_at || '18:00').slice(0, 5);
    $('rec-today-at').value = String(a.send_today_at || '07:00').slice(0, 5);
    $('rec-admin-url').value = a.admin_url || new URL('admin.html?panel=1', location.href).href;
    $('rec-template').value = a.template_name || 'cake_recordatorio_entrega';
    $('rec-language').value = a.template_language || 'es';
    pintarEstadoGeneral();
  }

  async function guardarAjustesRec(ev, soloInterruptor) {
    if (ev) ev.preventDefault();
    var c = db(); if (!c) return;
    var datos = { id: 1, enabled: $('rec-enabled').checked };
    if (!soloInterruptor) {
      var url = $('rec-admin-url').value.trim();
      var plantilla = $('rec-template').value.trim();
      var idioma = $('rec-language').value.trim();
      if (!/^https:\/\//.test(url)) { msg('rec-settings-message', 'La dirección del panel debe empezar con https://', 'error'); return; }
      if (!/^[a-z0-9_]{1,255}$/.test(plantilla)) { msg('rec-settings-message', 'El nombre de la plantilla solo puede tener minúsculas, números y guion bajo.', 'error'); return; }
      if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(idioma)) { msg('rec-settings-message', 'Idioma no válido. Ejemplos: es, es_MX, en_US.', 'error'); return; }
      datos.send_tomorrow_at = $('rec-tomorrow-at').value || '18:00';
      datos.send_today_at = $('rec-today-at').value || '07:00';
      datos.admin_url = url; datos.template_name = plantilla; datos.template_language = idioma;
    }
    msg('rec-settings-message', 'Guardando…');
    var r = await c.from('cake_reminder_settings').upsert(datos, { onConflict: 'id' }).select('*').maybeSingle();
    if (r.error) { msg('rec-settings-message', 'No se pudo guardar: ' + r.error.message, 'error'); await cargarAjustesRec(); return; }
    recDatos.ajustes = r.data;
    pintarEstadoGeneral();
    msg('rec-settings-message', soloInterruptor ? (datos.enabled ? 'Recordatorios activados.' : 'Recordatorios pausados.') : 'Ajustes guardados.', 'success');
  }

  async function cargarNumeros() {
    var c = db(); if (!c) return;
    var r = await c.from('cake_reminder_recipients').select('id,phone,label,is_active,created_at').order('created_at', { ascending: true });
    var lista = $('rec-list');
    if (r.error) { lista.innerHTML = '<p class="admin-order-muted">No se pudo cargar la lista: ' + esc(r.error.message) + '</p>'; return; }
    recDatos.numeros = r.data || [];
    pintarEstadoGeneral();
    if (!recDatos.numeros.length) { lista.innerHTML = '<p class="admin-order-muted">Todavía no hay números. Toca «+ Agregar número».</p>'; return; }
    lista.innerHTML = '';
    recDatos.numeros.forEach(function (n) {
      var fila = document.createElement('article');
      fila.className = 'rec-fila' + (n.is_active ? '' : ' inactivo');
      fila.innerHTML =
        '<span class="rec-fila-icono"><i class="fab fa-whatsapp"></i></span>' +
        '<div class="rec-fila-datos"><strong>' + esc(telefonoBonito(n.phone)) + '</strong><small>' + esc(n.label || 'Sin nombre') + ' · ' + (n.is_active ? 'Recibe recordatorios' : 'Desactivado') + '</small></div>' +
        '<label class="rec-switch rec-switch-chico" title="Activar o desactivar este número"><input type="checkbox"' + (n.is_active ? ' checked' : '') + '><span class="rec-switch-pista"><span class="rec-switch-bola"></span></span></label>' +
        '<div class="admin-row-actions"><button type="button" class="admin-button admin-button-outline" data-accion="prueba"><i class="fas fa-paper-plane"></i> Prueba</button>' +
        '<button type="button" class="admin-button admin-button-danger" data-accion="borrar"><i class="fas fa-trash"></i> Eliminar</button></div>';
      fila.querySelector('input[type=checkbox]').addEventListener('change', async function (e) {
        var on = e.target.checked;
        var u = await db().from('cake_reminder_recipients').update({ is_active: on }).eq('id', n.id);
        if (u.error) { e.target.checked = !on; msg('rec-list-message', 'No se pudo cambiar: ' + u.error.message, 'error'); return; }
        msg('rec-list-message', telefonoBonito(n.phone) + (on ? ' activado.' : ' desactivado.'), 'success');
        cargarNumeros();
      });
      fila.querySelector('[data-accion="borrar"]').addEventListener('click', async function () {
        if (!confirm('¿Eliminar ' + telefonoBonito(n.phone) + ' de los recordatorios? Ya no recibirá avisos de entregas.')) return;
        var d = await db().from('cake_reminder_recipients').delete().eq('id', n.id);
        if (d.error) { msg('rec-list-message', 'No se pudo eliminar: ' + d.error.message, 'error'); return; }
        msg('rec-list-message', 'Número eliminado.', 'success');
        cargarNumeros();
      });
      fila.querySelector('[data-accion="prueba"]').addEventListener('click', function () { enviarPrueba(n.phone); });
      lista.appendChild(fila);
    });
  }

  async function guardarNumero(ev) {
    ev.preventDefault();
    var tel = normalizarTelefono($('rec-phone').value);
    if (!/^[1-9]\d{7,14}$/.test(tel)) { msg('rec-list-message', 'Escribe el número con su código de país (ej. 502 5555 1234).', 'error'); return; }
    if (!$('rec-consent').checked) { msg('rec-list-message', 'Confirma que la persona aceptó recibir recordatorios (Meta lo exige).', 'error'); return; }
    if (recDatos.numeros.some(function (n) { return n.phone === tel; })) { msg('rec-list-message', 'Ese número ya está en la lista.', 'error'); return; }
    msg('rec-list-message', 'Guardando…');
    var r = await db().from('cake_reminder_recipients').insert({ phone: tel, label: $('rec-label').value.trim() || null, is_active: true, consent_confirmed: true });
    if (r.error) { msg('rec-list-message', r.error.code === '23505' ? 'Ese número ya está en la lista.' : 'No se pudo guardar: ' + r.error.message, 'error'); return; }
    $('rec-add-form').reset(); $('rec-add-form').hidden = true;
    msg('rec-list-message', 'Número ' + telefonoBonito(tel) + ' guardado. Recibirá solo recordatorios de entregas de hoy y mañana.', 'success');
    cargarNumeros();
  }

  // ---- Llamadas a la función segura del servidor (los tokens de Meta viven allí) ----
  async function llamarFuncion(accion, extra) {
    var c = db(); if (!c) throw new Error('Sin conexión con Supabase.');
    var cuerpo = Object.assign({ accion: accion }, extra || {});
    var r = await c.functions.invoke('cake-recordatorios', { body: cuerpo });
    if (r.error) {
      var detalle = '';
      try { if (r.error.context && r.error.context.json) { var j = await r.error.context.json(); detalle = j && (j.mensaje || j.error) || ''; } } catch (e) { detalle = ''; }
      if (/Failed to send|NetworkError|Failed to fetch|404|not found/i.test(String(r.error.message) + detalle)) {
        throw new Error('No se encontró la función «cake-recordatorios». Publícala en Supabase siguiendo el archivo LEEME de recordatorios.' + (detalle ? ' (' + detalle + ')' : ''));
      }
      throw new Error(detalle || r.error.message);
    }
    return r.data || {};
  }
  function ocupado(on) { ['rec-check', 'rec-test', 'rec-run', 'rec-template-create'].forEach(function (id) { var b = $(id); if (b) b.disabled = on; }); }

  async function revisarConexion() {
    ocupado(true); msg('rec-action-message', 'Revisando conexión…');
    try {
      var d = await llamarFuncion('estado');
      var s = d.secretos || {};
      var falta = Object.keys(s).filter(function (k) { return !s[k] && k !== 'WHATSAPP_APP_ID'; });
      var p = d.plantilla || {};
      var estadoP = { APPROVED: '✅ Aprobada', PENDING: '⏳ En revisión de Meta', REJECTED: '❌ Rechazada', NO_EXISTE: '➕ Aún no creada', PAUSED: '⏸️ Pausada por Meta', DISABLED: '⛔ Desactivada' }[p.estado] || ('❔ ' + (p.estado || 'desconocido'));
      var num = d.numero_envia;
      var numTxt = num && num.display_phone_number ? esc(num.display_phone_number) + (num.verified_name ? ' · ' + esc(num.verified_name) : '') : (num && num.error ? '❌ ' + esc(num.error) : '—');
      $('rec-conexion').innerHTML =
        '<dl>' +
        '<dt>Claves en el servidor</dt><dd>' + (falta.length ? '❌ Faltan: ' + esc(falta.join(', ')) : '✅ Configuradas') + '</dd>' +
        '<dt>Número que envía</dt><dd>' + numTxt + '</dd>' +
        '<dt>Plantilla «' + esc(p.nombre || '') + '»</dt><dd>' + estadoP + (p.motivo ? '<br><small>' + esc(p.motivo) + '</small>' : '') + '</dd>' +
        '<dt>Hora en Guatemala</dt><dd>' + esc(d.hora_guatemala ? d.hora_guatemala.fecha + ' ' + d.hora_guatemala.hora : '—') + '</dd>' +
        '</dl>';
      msg('rec-action-message', falta.length ? 'Faltan claves de WhatsApp en Supabase (ver guía abajo).' : (p.estado === 'APPROVED' ? 'Conexión lista.' : 'Conexión hecha; falta que Meta apruebe la plantilla.'), falta.length ? 'error' : 'success');
    } catch (e) { msg('rec-action-message', e.message, 'error'); }
    ocupado(false);
  }
  async function enviarPrueba(telefono) {
    if (!telefono && !recDatos.numeros.some(function (n) { return n.is_active; })) { msg('rec-action-message', 'Agrega y activa al menos un número para la prueba.', 'error'); return; }
    ocupado(true); msg('rec-action-message', 'Enviando mensaje de prueba…');
    try {
      var d = await llamarFuncion('prueba', telefono ? { telefono: telefono } : {});
      var det = (d.resultados || []).map(function (x) { return telefonoBonito(x.phone) + ': ' + (x.ok ? 'enviado ✅' : 'error ❌ ' + (x.error || '')); }).join(' · ');
      msg('rec-action-message', (d.mensaje || '') + (det ? ' — ' + det : ''), d.ok ? 'success' : 'error');
    } catch (e) { msg('rec-action-message', e.message, 'error'); }
    ocupado(false); cargarLog();
  }
  async function enviarPendientes() {
    if (!confirm('¿Enviar ahora los recordatorios pendientes de hoy y mañana? (Los que ya se enviaron no se repiten.)')) return;
    ocupado(true); msg('rec-action-message', 'Revisando pedidos de hoy y mañana…');
    try {
      var d = await llamarFuncion('revisar_ahora');
      msg('rec-action-message', d.motivo ? d.motivo : 'Pedidos encontrados: ' + (d.pedidos || 0) + ' · enviados: ' + (d.enviados || 0) + ' · ya enviados antes: ' + (d.omitidos || 0) + ' · con error: ' + (d.errores || 0), d.errores ? 'error' : 'success');
    } catch (e) { msg('rec-action-message', e.message, 'error'); }
    ocupado(false); cargarLog();
  }
  async function crearPlantilla() {
    if (!confirm('¿Enviar la plantilla «' + ($('rec-template').value || 'cake_recordatorio_entrega') + '» a Meta para su aprobación?')) return;
    ocupado(true); msg('rec-action-message', 'Enviando plantilla a Meta…');
    try {
      var d = await llamarFuncion('crear_plantilla');
      msg('rec-action-message', d.mensaje || (d.ok ? 'Plantilla enviada.' : 'No se pudo crear.'), d.ok ? 'success' : 'error');
    } catch (e) { msg('rec-action-message', e.message, 'error'); }
    ocupado(false);
  }

  async function cargarLog() {
    var c = db(); if (!c) return;
    var r = await c.from('cake_reminder_log').select('order_code,delivery_date,kind,phone,status,error,created_at').order('created_at', { ascending: false }).limit(30);
    var cont = $('rec-log');
    if (r.error) { cont.innerHTML = '<p class="admin-order-muted">No se pudo leer el registro: ' + esc(r.error.message) + '</p>'; return; }
    if (!r.data || !r.data.length) { cont.innerHTML = '<p class="admin-order-muted">Aún no se ha enviado ningún recordatorio.</p>'; return; }
    var tipos = { hoy: 'Hoy', manana: 'Mañana', prueba: 'Prueba' };
    var estados = { enviado: ['ok', 'Enviado'], error: ['error', 'Error'], enviando: ['espera', 'Enviando'], sin_confirmar: ['espera', 'Sin confirmar'] };
    cont.innerHTML = r.data.map(function (x) {
      var e = estados[x.status] || ['espera', x.status];
      var enlace = /^CC-/.test(x.order_code) ? '<a href="#" data-ir-pedido="' + esc(x.order_code) + '">' + esc(x.order_code) + '</a>' : esc(x.order_code);
      return '<div class="rec-log-fila"><span class="rec-chip ' + e[0] + '">' + e[1] + '</span><div><strong>' + (tipos[x.kind] || x.kind) + '</strong> · ' + enlace + '<small>' + esc(telefonoBonito(x.phone)) + ' · ' + new Date(x.created_at).toLocaleString('es-GT') + (x.error ? '<br>' + esc(String(x.error).slice(0, 220)) : '') + '</small></div></div>';
    }).join('');
  }

  function cargarRecordatorios() { cargarAjustesRec(); cargarNumeros(); cargarLog(); }

  /* =========================================================
     4. ENLACE DIRECTO A UN PEDIDO  (?pedido=CC-XXXXXXXXXXXXXXXX)
     Solo funciona con la sesión de la administradora iniciada: los
     pedidos están protegidos por las políticas de Supabase (RLS).
     ========================================================= */
  async function irAPedido(codigo) {
    if (!/^CC-[A-Z0-9]{16}$/.test(codigo || '')) return;
    var a = A(), c = db(); if (!c || !a.setTab) return;
    a.setTab('orders');
    var r = await c.from('orders').select('order_code,status,deleted_at').eq('order_code', codigo).maybeSingle();
    if (r.error || !r.data) { a.globalMessage && a.globalMessage('No se encontró el pedido ' + codigo + '.', 'error'); return; }
    if (r.data.deleted_at) { a.setOrdersView('papelera'); }
    else if (a.statusView) { a.setOrdersView(a.statusView(r.data.status)); }
    var intentos = 0;
    (function buscar() {
      var tarjeta = null;
      document.querySelectorAll('#admin-orders-list .admin-order-code').forEach(function (el) { if (el.textContent.trim() === codigo) tarjeta = el.closest('.admin-order-row'); });
      if (tarjeta) {
        document.querySelectorAll('.admin-order-destacado').forEach(function (el) { el.classList.remove('admin-order-destacado'); });
        tarjeta.classList.add('admin-order-destacado');
        tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        a.globalMessage && a.globalMessage('Pedido ' + codigo + ' abierto desde el recordatorio de WhatsApp.', 'success');
        return;
      }
      if (++intentos < 40) setTimeout(buscar, 250);
      else a.globalMessage && a.globalMessage('El pedido ' + codigo + ' existe, pero no aparece en la lista (solo se muestran los 500 más recientes).', 'error');
    })();
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function conectar() {
    document.querySelectorAll('[data-cambiar-tema]').forEach(function (b) { b.addEventListener('click', function () { cambiarTema(b.getAttribute('data-cambiar-tema')); }); });
    var on = function (id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); };
    on('tema-refresh', 'click', cargarTema);
    on('rec-refresh', 'click', cargarRecordatorios);
    on('rec-settings-form', 'submit', guardarAjustesRec);
    on('rec-enabled', 'change', function () { guardarAjustesRec(null, true); });
    on('rec-add-toggle', 'click', function () { var f = $('rec-add-form'); f.hidden = !f.hidden; if (!f.hidden) $('rec-phone').focus(); });
    on('rec-add-cancel', 'click', function () { $('rec-add-form').reset(); $('rec-add-form').hidden = true; });
    on('rec-add-form', 'submit', guardarNumero);
    on('rec-check', 'click', revisarConexion);
    on('rec-test', 'click', function () { enviarPrueba(); });
    on('rec-run', 'click', enviarPendientes);
    on('rec-template-create', 'click', crearPlantilla);
    on('rec-log-refresh', 'click', cargarLog);
    on('rec-log', 'click', function (e) { var a = e.target.closest('[data-ir-pedido]'); if (a) { e.preventDefault(); irAPedido(a.getAttribute('data-ir-pedido')); } });
    document.querySelectorAll('[data-admin-tab="temas"]').forEach(function (b) { b.addEventListener('click', cargarTema); });
    document.querySelectorAll('[data-admin-tab="recordatorios"]').forEach(function (b) { b.addEventListener('click', cargarRecordatorios); });
    document.addEventListener('cake-tema-cambiado', adornosPanel);
    pintarTemas();
    adornosPanel();
  }
  document.addEventListener('cake-admin-listo', function () {
    if (listo) return; listo = true;
    cargarTema();
    var codigo = '';
    try { codigo = new URLSearchParams(location.search).get('pedido') || ''; } catch (e) { codigo = ''; }
    if (codigo) irAPedido(codigo.toUpperCase());
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectar);
  else conectar();
})();
