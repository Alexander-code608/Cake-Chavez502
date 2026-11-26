/* =========================================================
   CAKE CHAVEZ — BOTÓN Y VENTANA «TUTORIALES» (las diez temáticas)
   Muestra los dos tutoriales de la temática activa:
     videos/tutoriales/<temática>/pedido.mp4         (cómo hacer un pedido)
     videos/tutoriales/<temática>/personalizado.mp4  (cómo hacer un pedido personalizado)
   Al cambiar la temática desde el administrador, la ventana muestra automáticamente los de la nueva.
   ========================================================= */
(function () {
  'use strict';
  var w = window, d = document, caja = null, ultimoFoco = null;
  var TUTORIALES = [
    { id: 'pedido', titulo: 'Cómo hacer un pedido', desc: 'Elige un producto, añádelo a tu orden y envíanos tu pedido por WhatsApp.' },
    { id: 'personalizado', titulo: 'Cómo hacer un pedido personalizado', desc: 'Diseña tu pastel: ocasión, sabor, tamaño, colores y foto de referencia.' }
  ];
  // Registro de los audios de la página (música de cada temática) para pausarlos durante un tutorial.
  var audios = new Set();
  try {
    var playOriginal = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!(this instanceof HTMLVideoElement)) audios.add(this); return playOriginal.apply(this, arguments); };
  } catch (e) { /* navegador antiguo: la música sigue sonando */ }
  var pausados = [];
  function tema() { return (w.CakeTema && w.CakeTema.actual) || 'navidad'; }
  function nombreTema() { var t = w.CAKE_TEMAS && w.CAKE_TEMAS.buscar(tema()); return t ? t.nombre : 'Cake Chavez'; }
  function ruta(id, ext) { var r = 'videos/tutoriales/' + tema() + '/' + id + '.' + ext; return ext === 'mp4' && w.cakeMedia ? w.cakeMedia(r) : r + '?v=20270101'; }
  function crearBoton() {
    if (d.getElementById('cake-tut-abrir')) return true;
    var fila = d.querySelector('.t27-urgente-fila');
    if (!fila) return false;
    var b = d.createElement('button'); b.type = 'button'; b.id = 'cake-tut-abrir'; b.className = 't27-urgente-btn cake-tut-btn';
    b.innerHTML = '<i class="fas fa-play-circle" aria-hidden="true"></i><span>Ver tutoriales</span>';
    b.addEventListener('click', abrir);
    fila.appendChild(b);
    return true;
  }
  function crearVentana() {
    caja = d.createElement('div'); caja.className = 'cake-tut cf-excluir-editor'; caja.id = 'cake-tut'; caja.hidden = true;
    caja.innerHTML = '<section class="cake-tut-caja" role="dialog" aria-modal="true" aria-labelledby="cake-tut-titulo">' +
      '<button type="button" class="t27-urgente-x" aria-label="Cerrar">×</button>' +
      '<h2 id="cake-tut-titulo">Tutoriales</h2><p class="cake-tut-sub"></p><div class="cake-tut-cuerpo"></div></section>';
    d.body.appendChild(caja);
    caja.addEventListener('click', function (ev) { if (ev.target === caja) cerrar(); });
    caja.querySelector('.t27-urgente-x').addEventListener('click', cerrar);
    d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && caja && !caja.hidden) cerrar(); });
  }
  function lista() {
    var cuerpo = caja.querySelector('.cake-tut-cuerpo');
    caja.querySelector('#cake-tut-titulo').textContent = 'Tutoriales de ' + nombreTema();
    caja.querySelector('.cake-tut-sub').textContent = 'Mira paso a paso cómo pedir en Cake Chavez desde tu celular o computadora.';
    cuerpo.innerHTML = '<div class="cake-tut-lista"></div>';
    var cont = cuerpo.firstChild;
    TUTORIALES.forEach(function (t) {
      var b = d.createElement('button'); b.type = 'button'; b.className = 'cake-tut-item';
      b.innerHTML = '<span class="cake-tut-miniatura"><img alt="" loading="lazy"><span class="cake-tut-play" aria-hidden="true"><i class="fas fa-play"></i></span></span><strong></strong><span class="cake-tut-desc"></span>';
      b.querySelector('img').src = ruta(t.id, 'jpg');
      b.querySelector('img').onerror = function () { this.style.visibility = 'hidden'; };
      b.querySelector('strong').textContent = t.titulo; b.querySelector('.cake-tut-desc').textContent = t.desc;
      b.setAttribute('aria-label', 'Reproducir tutorial: ' + t.titulo);
      b.addEventListener('click', function () { reproducir(t); });
      cont.appendChild(b);
    });
    setTimeout(function () { var p = cont.querySelector('button'); if (p) p.focus(); }, 60);
  }
  function reproducir(t) {
    var cuerpo = caja.querySelector('.cake-tut-cuerpo');
    caja.querySelector('#cake-tut-titulo').textContent = t.titulo;
    caja.querySelector('.cake-tut-sub').textContent = 'Tutorial de ' + nombreTema();
    cuerpo.innerHTML = '<div class="cake-tut-reproductor"><video controls playsinline preload="metadata"></video></div><button type="button" class="cake-tut-volver"><i class="fas fa-arrow-left" aria-hidden="true"></i> Ver los dos tutoriales</button>';
    var v = cuerpo.querySelector('video');
    v.poster = ruta(t.id, 'jpg'); v.src = ruta(t.id, 'mp4');
    v.addEventListener('error', function () {
      cuerpo.querySelector('.cake-tut-reproductor').innerHTML = '<p class="cake-tut-vacio">Este tutorial no se pudo cargar. Revisa tu conexión e inténtalo de nuevo.</p>';
    });
    // La música de la temática se pausa mientras se ve el tutorial.
    v.addEventListener('play', function () { audios.forEach(function (a) { if (!a.paused) { pausados.push(a); a.pause(); } }); });
    cuerpo.querySelector('.cake-tut-volver').addEventListener('click', function () { v.pause(); lista(); });
    var p = v.play(); if (p && p.catch) p.catch(function () { /* el navegador pidió tocar para reproducir */ });
    v.focus();
  }
  function abrir() {
    if (!caja) crearVentana();
    ultimoFoco = d.activeElement;
    lista(); caja.hidden = false; d.documentElement.classList.add('cake-ventana-abierta');
  }
  function cerrar() {
    if (!caja) return;
    var v = caja.querySelector('video'); if (v) v.pause();
    pausados.splice(0).forEach(function (a) { var p = a.play(); if (p && p.catch) p.catch(function () {}); });
    caja.hidden = true; caja.querySelector('.cake-tut-cuerpo').innerHTML = '';
    d.documentElement.classList.remove('cake-ventana-abierta');
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  w.CakeTutoriales = { abrir: abrir, cerrar: cerrar };
  function iniciar() {
    if (/admin\.html/i.test(w.location.pathname)) return;
    var n = 0; (function intentar() { if (!crearBoton() && n++ < 40) setTimeout(intentar, 150); })();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
