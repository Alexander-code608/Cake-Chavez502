/* =========================================================
   CAKE CHÁVEZ — CREAR O RECUPERAR CONTRASEÑA DEL PANEL
   Las personas con acceso al panel que vienen del sistema anterior crean
   aquí su nueva contraseña: reciben un enlace en su correo, lo abren y
   eligen una contraseña. Solo funciona con correos que ya tienen acceso.
   ========================================================= */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var client = function () { return window.getCakeSupabaseClient ? window.getCakeSupabaseClient() : null; };
  var params = new URLSearchParams(window.location.search);
  var enlaceRecuperacion = params.get('nueva-clave') === '1';

  function msg(el, texto, tipo) { el.textContent = texto; el.className = 'admin-message' + (tipo ? ' ' + tipo : ''); }

  function formularioCorreo() {
    var login = $('admin-login-form');
    if (!login || $('clave-solicitar')) return;
    var caja = document.createElement('div');
    caja.className = 'acc-login-additions';
    caja.innerHTML = '<button type="button" id="clave-solicitar" class="admin-button admin-button-outline"><i class="fas fa-key"></i> ¿Primera vez en el nuevo panel u olvidaste tu contraseña?</button>' +
      '<form id="clave-form" hidden novalidate><p>Escribe el correo con el que entras al panel. Te enviaremos un enlace para crear tu contraseña.</p>' +
      '<label for="clave-email">Correo electrónico</label><input id="clave-email" type="email" autocomplete="username" required maxlength="180">' +
      '<button class="admin-button admin-button-primary" type="submit">Enviar enlace</button></form>' +
      '<p id="clave-mensaje" class="admin-message" role="status"></p>';
    login.after(caja);
    $('clave-solicitar').addEventListener('click', function () {
      var f = $('clave-form'); f.hidden = !f.hidden;
      if (!f.hidden) $('clave-email').value = ($('admin-email') && $('admin-email').value) || '';
    });
    $('clave-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var correo = $('clave-email').value.trim().toLowerCase();
      var m = $('clave-mensaje');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { msg(m, 'Escribe un correo válido.', 'error'); return; }
      var c = client(); if (!c) { msg(m, 'No se pudo conectar. Inténtalo de nuevo.', 'error'); return; }
      var boton = ev.target.querySelector('button'); boton.disabled = true;
      msg(m, 'Enviando…');
      var r = await c.auth.resetPasswordForEmail(correo, { redirectTo: window.location.origin + '/admin.html?panel=1&nueva-clave=1' });
      boton.disabled = false;
      if (r.error && !/rate|seconds/i.test(r.error.message || '')) { msg(m, 'No se pudo enviar el enlace: ' + r.error.message, 'error'); return; }
      if (r.error) { msg(m, 'Espera un momento antes de pedir otro enlace.', 'error'); return; }
      msg(m, 'Si ese correo tiene acceso al panel, en unos minutos recibirás el enlace. Revisa también la carpeta de spam.', 'success');
    });
  }

  function ventanaNuevaClave() {
    if ($('clave-dialogo')) return;
    var d = document.createElement('dialog');
    d.id = 'clave-dialogo'; d.className = 'acc-dialog';
    d.innerHTML = '<h2>Crea tu nueva contraseña</h2><p>Úsala de ahora en adelante para entrar al panel de Cake Chávez.</p>' +
      '<form id="clave-nueva-form" novalidate><label for="clave-nueva">Nueva contraseña (mínimo 8 caracteres)</label><input id="clave-nueva" type="password" autocomplete="new-password" minlength="8" required>' +
      '<label for="clave-repetir">Repite la contraseña</label><input id="clave-repetir" type="password" autocomplete="new-password" minlength="8" required>' +
      '<button class="admin-button admin-button-primary" type="submit">Guardar contraseña</button></form><p id="clave-nueva-mensaje" class="admin-message" role="status"></p>';
    document.body.appendChild(d);
    d.showModal();
    $('clave-nueva-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var m = $('clave-nueva-mensaje');
      var a = $('clave-nueva').value, b = $('clave-repetir').value;
      if (a.length < 8) { msg(m, 'La contraseña debe tener al menos 8 caracteres.', 'error'); return; }
      if (a !== b) { msg(m, 'Las contraseñas no coinciden.', 'error'); return; }
      var c = client(); if (!c) return;
      var boton = ev.target.querySelector('button'); boton.disabled = true;
      msg(m, 'Guardando…');
      var r = await c.auth.updateUser({ password: a });
      boton.disabled = false;
      if (r.error) { msg(m, 'No se pudo guardar: ' + r.error.message, 'error'); return; }
      msg(m, '¡Listo! Tu contraseña quedó guardada.', 'success');
      var url = new URL(window.location.href); url.searchParams.delete('nueva-clave'); url.hash = '';
      window.history.replaceState(null, '', url.pathname + url.search);
      setTimeout(function () { d.close(); d.remove(); }, 1200);
    });
  }

  async function revisarEnlace() {
    if (!enlaceRecuperacion) return;
    var c = client(); if (!c) return;
    var r = await c.auth.getSession();
    if (r.data && r.data.session) { ventanaNuevaClave(); return; }
    var err = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description');
    var login = $('admin-login-message');
    if (login) msg(login, err ? 'El enlace ya no es válido (' + err + '). Pide uno nuevo.' : 'El enlace ya no es válido. Pide uno nuevo.', 'error');
  }

  function iniciar() { formularioCorreo(); revisarEnlace(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
