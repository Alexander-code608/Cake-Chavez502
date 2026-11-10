/* =========================================================
   CAKE CHÁVEZ — TEMA ACTIVO (Navidad / Año Nuevo)
   Se carga en el <head> de index.html y admin.html, ANTES de los estilos
   de cada tema, para que la página aparezca directamente con el tema correcto.

   - El tema se guarda en Supabase (tabla cake_site_theme) y se cambia desde
     el panel: Administración > 🎨 Temas > «Cambiar tema».
   - Se recuerda en el teléfono para que la siguiente visita abra al instante.
   - Para ver un tema sin activarlo: index.html?tema=anio-nuevo  o  ?tema=navidad
   ========================================================= */
(function () {
  'use strict';
  var CLAVE = 'cakeTemaSitio';
  var VALIDOS = { 'navidad': true, 'anio-nuevo': true };
  var html = document.documentElement;
  var esperando = [];

  function leer(k, almacen) { try { return window[almacen].getItem(k); } catch (e) { return null; } }
  function guardar(k, v, almacen) { try { window[almacen].setItem(k, v); } catch (e) { /* modo privado */ } }

  var forzado = null;
  try { forzado = new URLSearchParams(window.location.search).get('tema'); } catch (e) { forzado = null; }
  if (!VALIDOS[forzado]) forzado = null;
  var guardado = leer(CLAVE, 'localStorage');
  if (!VALIDOS[guardado]) guardado = null;

  var estado = {
    actual: forzado || guardado || 'navidad',
    pendiente: !forzado && !guardado,   // primera visita: aún no sabemos el tema
    listo: false
  };

  // Hoja de colores de Año Nuevo: solo se descarga cuando ese tema está activo.
  function esPanel() {
    return /admin\.html/i.test(window.location.pathname) || !!document.querySelector('meta[name="cake-panel"]');
  }
  function hojaAnioNuevo() {
    return esPanel() ? 'admin-anio-nuevo-colores.css?v=20261110' : 'anio-nuevo-colores.css?v=20261110';
  }
  // Bienvenida «¡Feliz Año Nuevo!»: en la tienda (no en el panel), salvo enlaces directos a un producto
  // o si la persona pidió reducir animaciones. Se marca desde ya para que la página no "parpadee".
  function prepararIntroAnio() {
    if (esPanel()) return;
    var reducir = false, directo = false;
    try { reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reducir = false; }
    try { directo = !!new URLSearchParams(window.location.search).get('producto'); } catch (e) { directo = false; }
    if (!reducir && !directo) html.classList.add('an-intro-activa');
  }
  function cargarHoja(href, sincronico) {
    if (document.querySelector('link[data-tema-hoja="' + href + '"]')) return;
    if (sincronico && document.readyState === 'loading') {
      document.write('<link rel="stylesheet" data-tema-hoja="' + href + '" href="' + href + '">');
      return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-tema-hoja', href);
    document.head.appendChild(l);
  }

  function aplicarClases(tema) {
    html.classList.remove('tema-navidad', 'tema-anio-nuevo');
    html.classList.add('tema-' + tema);
    html.setAttribute('data-tema', tema);
    var color = document.querySelector('meta[name="theme-color"]');
    if (color) color.setAttribute('content', tema === 'anio-nuevo' ? '#4b3a30' : '#1d1216');
    if (document.body) aplicarCuerpo();
  }

  // El <body> de la tienda trae la clase "navidad" (activa todos los adornos navideños).
  // Con Año Nuevo se quita y se pone "anio-nuevo".
  function aplicarCuerpo() {
    var b = document.body; if (!b) return;
    var navidad = estado.actual === 'navidad';
    if (b.hasAttribute('data-tema-navidad') || b.classList.contains('navidad')) {
      b.setAttribute('data-tema-navidad', '');
      b.classList.toggle('navidad', navidad);
    }
    b.classList.toggle('anio-nuevo', !navidad);
  }

  function terminar(tema) {
    if (estado.listo) return;
    estado.actual = tema;
    estado.listo = true;
    if (tema === 'anio-nuevo') { cargarHoja(hojaAnioNuevo(), false); prepararIntroAnio(); }
    aplicarClases(tema);
    html.classList.remove('tema-cargando');
    var lista = esperando; esperando = [];
    for (var i = 0; i < lista.length; i++) { try { lista[i](tema); } catch (e) { if (window.console) console.error(e); } }
  }

  // ---- Arranque inmediato (sin esperar a la red) ----
  aplicarClases(estado.actual);
  if (estado.actual === 'anio-nuevo') cargarHoja(hojaAnioNuevo(), true);
  if (estado.pendiente) {
    html.classList.add('tema-cargando');
  } else {
    estado.listo = true;
    if (estado.actual === 'anio-nuevo') prepararIntroAnio();
  }

  // ---- Consultar el tema guardado en Supabase ----
  function consultar() {
    var cfg = window.CAKE_SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || !window.fetch) { terminar(estado.actual); return; }
    var abortado = false;
    var limite = setTimeout(function () { abortado = true; terminar(estado.actual); }, estado.pendiente ? 2500 : 8000);
    fetch(cfg.url + '/rest/v1/cake_site_theme?id=eq.1&select=theme', {
      headers: { apikey: cfg.anonKey, Accept: 'application/json' },
      cache: 'no-store'
    }).then(function (r) { return r.ok ? r.json() : []; }).then(function (filas) {
      clearTimeout(limite);
      var tema = filas && filas[0] && VALIDOS[filas[0].theme] ? filas[0].theme : 'navidad';
      if (!forzado) guardar(CLAVE, tema, 'localStorage');
      if (abortado && estado.pendiente) return;
      if (!estado.listo || estado.pendiente) { estado.pendiente = false; terminar(tema); return; }
      // Ya se mostró un tema guardado y en Supabase hay otro: recargar una sola vez.
      if (!forzado && tema !== estado.actual && leer('cakeTemaRecargado', 'sessionStorage') !== tema) {
        guardar('cakeTemaRecargado', tema, 'sessionStorage');
        window.location.reload();
      }
    }).catch(function () { clearTimeout(limite); terminar(estado.actual); });
  }

  window.CakeTema = {
    get actual() { return estado.actual; },
    get pendiente() { return !estado.listo; },
    // Ejecuta fn(tema) cuando el tema ya se conoce (al instante si ya se sabe).
    cuandoListo: function (fn) { if (estado.listo) { fn(estado.actual); } else { esperando.push(fn); } },
    cuerpo: aplicarCuerpo,
    // Usado por el panel al pulsar «Cambiar tema».
    recordar: function (tema) { if (VALIDOS[tema]) { guardar(CLAVE, tema, 'localStorage'); guardar('cakeTemaRecargado', tema, 'sessionStorage'); } },
    // Cambia el tema en vivo (lo usa el panel después de guardar el cambio en Supabase).
    aplicar: function (tema) {
      if (!VALIDOS[tema]) return;
      estado.actual = tema;
      if (tema === 'anio-nuevo') cargarHoja(hojaAnioNuevo(), false);
      var hojas = document.querySelectorAll('link[data-tema-hoja]');
      for (var i = 0; i < hojas.length; i++) hojas[i].disabled = tema !== 'anio-nuevo';
      aplicarClases(tema);
      this.recordar(tema);
      try { document.dispatchEvent(new CustomEvent('cake-tema-cambiado', { detail: { tema: tema } })); } catch (e) { /* navegador antiguo */ }
    },
    anioNuevo: function () { var d = new Date(); return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicarCuerpo);
  consultar();
})();
