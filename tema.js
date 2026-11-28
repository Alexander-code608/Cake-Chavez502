/* =========================================================
   CAKE CHÁVEZ — TEMA ACTIVO (las 10 temáticas)
   Se carga en el <head> de index.html y admin.html, DESPUÉS de temas-config.js
   y ANTES de los estilos, para que la página aparezca directamente con el tema correcto.

   - El tema se guarda en Supabase (tabla cake_site_theme) y se cambia desde
     el Panel avanzado > «Temáticas» > «Activar esta temática».
   - Se recuerda en el teléfono para que la siguiente visita abra al instante.
   - Para ver un tema sin activarlo: index.html?tema=halloween (o cualquier id).
   - Navidad conserva sus hojas originales. Las otras nueve cargan:
       temas/temas-2027.css (decoración común) + temas/<id>/colores.css + temas/<id>/tema.css
   - El Panel avanzado NUNCA carga hojas de temporada: su paleta es fija.
   ========================================================= */
(function () {
  'use strict';
  var CLAVE = 'cakeTemaSitio';
  var REG = window.CAKE_TEMAS || { valido: function (t) { return t === 'navidad'; }, buscar: function () { return null; }, ids: ['navidad'] };
  var VERSION = '20270101';
  var html = document.documentElement;
  var esperando = [];

  function valido(t) { return !!t && REG.valido(t); }
  function leer(k, almacen) { try { return window[almacen].getItem(k); } catch (e) { return null; } }
  function guardar(k, v, almacen) { try { window[almacen].setItem(k, v); } catch (e) { /* modo privado */ } }

  var forzado = null, solicitado = null;
  try { solicitado = new URLSearchParams(window.location.search).get('tema'); } catch (e) { solicitado = null; }
  forzado = valido(solicitado) ? solicitado : null;
  var guardado = leer(CLAVE, 'localStorage');
  if (!valido(guardado)) guardado = null;

  var estado = {
    actual: forzado || guardado || 'navidad',
    pendiente: !forzado && !guardado,   // primera visita: aún no sabemos el tema
    listo: false
  };

  function esPanel() {
    return /admin\.html/i.test(window.location.pathname) || !!document.querySelector('meta[name="cake-panel"]');
  }
  function reducirMovimiento() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  // Las nueve temáticas 2027 tienen su propia entrada (temas-2027.js). Se marca desde ya
  // para que la página no "parpadee" antes de la animación.
  function prepararIntro(tema) {
    if (esPanel() || tema === 'navidad' || reducirMovimiento()) return;
    html.classList.add('t27-intro-activa');
  }
  function hojas(tema) {
    if (esPanel() || tema === 'navidad') return [];
    var info = REG.buscar(tema);
    var propias = info && Array.isArray(info.estilos) ? info.estilos : [];
    return ['temas/temas-2027.css?v=' + VERSION].concat(propias);
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
  function cargarHojas(tema, sincronico) { hojas(tema).forEach(function (h) { cargarHoja(h, sincronico); }); }

  function aplicarClases(tema) {
    (REG.ids || []).forEach(function (id) { html.classList.remove('tema-' + id); });
    html.classList.remove('tema-2027');
    // Panel avanzado: paleta fija café/crema/rosa. No recibe la clase de la temática
    // (así ninguna hoja de temporada cambia sus colores); solo se anota cuál está activa.
    if (esPanel()) html.classList.add('tema-panel-fijo'); else html.classList.add('tema-' + tema);
    var info = REG.buscar(tema);
    if (info && info.anio2027 && !esPanel()) html.classList.add('tema-2027');
    html.setAttribute('data-tema', tema);
    var color = document.querySelector('meta[name="theme-color"]');
    if (color && !esPanel()) color.setAttribute('content', info && info.colorMeta ? info.colorMeta : '#1d1216');
    if (document.body) aplicarCuerpo();
  }

  // El <body> de la tienda trae la clase "navidad" (activa todos los adornos navideños).
  // Con cualquier otra temática se quita y se pone "tema-temporada".
  function aplicarCuerpo() {
    var b = document.body; if (!b) return;
    var navidad = estado.actual === 'navidad';
    if (b.hasAttribute('data-tema-navidad') || b.classList.contains('navidad')) {
      b.setAttribute('data-tema-navidad', '');
      b.classList.toggle('navidad', navidad);
    }
    b.classList.toggle('tema-temporada', !navidad);
  }

  function terminar(tema) {
    if (estado.listo) return;
    estado.actual = tema;
    estado.listo = true;
    cargarHojas(tema, false); prepararIntro(tema);
    aplicarClases(tema);
    html.classList.remove('tema-cargando');
    var lista = esperando; esperando = [];
    for (var i = 0; i < lista.length; i++) { try { lista[i](tema); } catch (e) { if (window.console) console.error(e); } }
  }

  // ---- Arranque inmediato (sin esperar a la red) ----
  aplicarClases(estado.actual);
  cargarHojas(estado.actual, true);
  if (estado.pendiente) {
    html.classList.add('tema-cargando');
  } else {
    estado.listo = true;
    prepararIntro(estado.actual);
  }

  // ---- Consultar el tema guardado y las temáticas instaladas por ZIP ----
  function consultar() {
    var cfg = window.CAKE_SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || !window.fetch) { terminar(estado.actual); return; }
    var abortado = false;
    var limite = setTimeout(function () { abortado = true; terminar(estado.actual); }, estado.pendiente ? 2500 : 8000);
    var headers = { apikey: cfg.anonKey, Accept: 'application/json' };
    function leerJson(url) { return fetch(url, { headers: headers, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); }
    Promise.all([
      leerJson(cfg.url + '/rest/v1/cake_site_theme?id=eq.1&select=theme'),
      leerJson(cfg.url + '/rest/v1/cake_theme_packages?deleted_at=is.null&select=theme,name,config,files,version,deleted_at')
    ]).then(function (rs) {
      clearTimeout(limite);
      var filas = rs[0] || [], paquetes = rs[1] || [];
      if (REG.instalarPaquetes) REG.instalarPaquetes(paquetes);
      // Un tema recién instalado no existía en el registro durante la primera carga.
      if (!forzado && valido(solicitado)) forzado = solicitado;
      var remoto = filas && filas[0] && valido(filas[0].theme) ? filas[0].theme : 'navidad';
      var tema = forzado || remoto;
      estado.remoto = remoto;
      if (!forzado) guardar(CLAVE, tema, 'localStorage');
      if (abortado && estado.pendiente) return;
      if (!estado.listo || estado.pendiente || (forzado && tema !== estado.actual)) { estado.listo = false; estado.pendiente = false; terminar(tema); return; }
      if (!forzado && tema !== estado.actual && leer('cakeTemaRecargado', 'sessionStorage') !== tema) {
        guardar('cakeTemaRecargado', tema, 'sessionStorage');
        window.location.reload();
      }
    }).catch(function () { clearTimeout(limite); terminar(estado.actual); });
  }

  window.CakeTema = {
    get actual() { return estado.actual; },
    get pendiente() { return !estado.listo; },
    get info() { return REG.buscar(estado.actual); },
    get forzado() { return forzado; },
    lista: function () { return REG.lista || []; },
    buscar: function (id) { return REG.buscar(id); },
    valido: valido,
    // Ejecuta fn(tema) cuando el tema ya se conoce (al instante si ya se sabe).
    cuandoListo: function (fn) { if (estado.listo) { fn(estado.actual); } else { esperando.push(fn); } },
    cuerpo: aplicarCuerpo,
    // Usado por el panel al pulsar «Activar esta temática».
    recordar: function (tema) { if (valido(tema)) { guardar(CLAVE, tema, 'localStorage'); guardar('cakeTemaRecargado', tema, 'sessionStorage'); } },
    // Cambia el tema en vivo (solo se usa en el panel, que no tiene hojas de temporada).
    aplicar: function (tema) {
      if (!valido(tema)) return;
      estado.actual = tema;
      aplicarClases(tema);
      this.recordar(tema);
      try { document.dispatchEvent(new CustomEvent('cake-tema-cambiado', { detail: { tema: tema } })); } catch (e) { /* navegador antiguo */ }
    },
    anioNuevo: function () { var d = new Date(); return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicarCuerpo);
  consultar();
})();
