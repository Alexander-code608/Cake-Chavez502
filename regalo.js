/* Página del mensaje secreto: lee el mensaje con el código del QR,
   muestra la animación elegida y pone música suave. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var audio = $('regalo-audio');
  var detener = null;
  var datos = null;

  function token() {
    var m = String(location.search || '').match(/[?&]t=([a-z0-9]{16,40})/i);
    return m ? m[1].toLowerCase() : '';
  }
  function mostrarError() {
    $('regalo-sobre').hidden = true;
    $('regalo-error').hidden = false;
    if (!detener && window.CakeAnimaciones) detener = window.CakeAnimaciones.iniciar($('regalo-lienzo'), 'dorado');
  }
  function subirVolumen() {
    try {
      audio.volume = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* el navegador no dejó sonar */ });
      var v = 0;
      var t = setInterval(function () { v = Math.min(0.55, v + 0.03); audio.volume = v; if (v >= 0.55) clearInterval(t); }, 120);
    } catch (e) { /* sin música */ }
    var b = $('regalo-musica');
    b.hidden = false;
    b.onclick = function () {
      if (audio.paused) { audio.play(); b.setAttribute('aria-pressed', 'true'); }
      else { audio.pause(); b.setAttribute('aria-pressed', 'false'); }
    };
  }
  function escribir(texto, destino, alTerminar) {
    destino.textContent = '';
    var cursor = document.createElement('span'); cursor.className = 'regalo-cursor';
    var nodo = document.createTextNode('');
    destino.appendChild(nodo); destino.appendChild(cursor);
    if (window.CAKE_LIGERO || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      nodo.nodeValue = texto; cursor.remove(); alTerminar(); return;
    }
    var i = 0, letras = Array.from ? Array.from(texto) : texto.split('');
    var velocidad = Math.max(18, Math.min(45, 2600 / Math.max(1, letras.length)));
    (function paso() {
      if (i >= letras.length) { cursor.remove(); alTerminar(); return; }
      nodo.nodeValue += letras[i++];
      setTimeout(paso, /[.,!?¡¿\n]/.test(letras[i - 1]) ? velocidad * 6 : velocidad);
    })();
  }
  function abrir() {
    if (!datos) return;
    subirVolumen();
    var sobre = $('regalo-sobre');
    sobre.classList.add('regalo-saliendo');
    if (detener) detener();
    detener = window.CakeAnimaciones ? window.CakeAnimaciones.iniciar($('regalo-lienzo'), datos.animation || 'nieve') : null;
    setTimeout(function () {
      sobre.hidden = true;
      $('regalo-para').textContent = datos.recipient_name || 'ti';
      $('regalo-carta').hidden = false;
      setTimeout(function () {
        escribir(String(datos.message || ''), $('regalo-mensaje'), function () {
          if (datos.sender_name) { var de = $('regalo-de'); de.textContent = 'Con cariño, ' + datos.sender_name; de.hidden = false; }
        });
      }, 900);
    }, 650);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var t = token();
    // Mientras carga, un fondo suave de luces.
    if (window.CakeAnimaciones) detener = window.CakeAnimaciones.iniciar($('regalo-lienzo'), 'dorado');
    if (!t) { mostrarError(); return; }
    var client = null;
    try { client = window.getCakeSupabaseClient ? window.getCakeSupabaseClient() : null; } catch (e) { client = null; }
    if (!client) { mostrarError(); return; }
    client.rpc('cake_get_gift_message', { p_token: t }).then(function (r) {
      var d = r && !r.error ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;
      if (!d || !d.message) { mostrarError(); return; }
      datos = d;
      var boton = $('regalo-abrir');
      $('regalo-sobre-texto').textContent = 'Toca para abrir tu sorpresa';
      boton.disabled = false;
      boton.addEventListener('click', abrir);
      if (window.CakeAnimaciones) {
        if (detener) detener();
        detener = window.CakeAnimaciones.iniciar($('regalo-lienzo'), d.animation || 'nieve');
      }
    }, mostrarError);
  });
})();
