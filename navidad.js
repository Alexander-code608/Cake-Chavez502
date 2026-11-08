/* CAKE CHAVEZ — nieve, destellos y luces de fondo navideñas (optimizado para celulares) */
(function () {
  function iniciarNavidad() {
    var cielo = document.createElement('div');
    cielo.className = 'navidad-cielo';
    cielo.setAttribute('aria-hidden', 'true');
    var esCelular = window.innerWidth < 700;
    var ligero = !!window.CAKE_LIGERO;
    var copos = ligero ? (esCelular ? 8 : 14) : (esCelular ? 16 : 30);
    var simbolos = ['❄', '❅', '❆', '✦'];
    for (var i = 0; i < copos; i++) {
      var c = document.createElement('span');
      c.className = 'navidad-copo';
      c.textContent = simbolos[i % simbolos.length];
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.fontSize = (10 + Math.random() * 16) + 'px';
      c.style.opacity = (0.35 + Math.random() * 0.55).toFixed(2);
      c.style.animationDuration = (9 + Math.random() * 12) + 's';
      c.style.animationDelay = (-Math.random() * 20) + 's';
      c.style.setProperty('--viento', (Math.random() * 80 - 40) + 'px');
      cielo.appendChild(c);
    }
    var destellos = ligero ? 6 : (esCelular ? 12 : 26);
    for (var j = 0; j < destellos; j++) {
      var d = document.createElement('span');
      d.className = 'navidad-destello';
      d.style.left = (Math.random() * 100) + 'vw';
      d.style.top = (Math.random() * 100) + 'vh';
      d.style.animationDelay = (-Math.random() * 3) + 's';
      cielo.appendChild(d);
    }
    document.body.appendChild(cielo);
  }

  // Luces bonitas en el fondo: círculos de luz suaves (bokeh) y foquitos que titilan.
  function crearLucesFondo() {
    if (document.querySelector('.navidad-fondo-luces')) return;
    var capa = document.createElement('div');
    capa.className = 'navidad-fondo-luces';
    capa.setAttribute('aria-hidden', 'true');
    var esCelular = window.innerWidth < 700;
    var ligero = !!window.CAKE_LIGERO;
    var colores = [
      'rgba(255,127,179,.6)', 'rgba(255,205,120,.55)', 'rgba(255,90,140,.5)',
      'rgba(140,235,205,.4)', 'rgba(255,240,220,.5)', 'rgba(255,110,110,.45)'
    ];
    var total = ligero ? 6 : (esCelular ? 9 : 15);
    for (var i = 0; i < total; i++) {
      var luz = document.createElement('i');
      var tam = esCelular ? (70 + Math.random() * 120) : (110 + Math.random() * 200);
      luz.style.width = luz.style.height = Math.round(tam) + 'px';
      luz.style.left = (Math.random() * 100 - 8).toFixed(1) + '%';
      luz.style.top = (Math.random() * 100 - 8).toFixed(1) + '%';
      luz.style.setProperty('--luz', colores[i % colores.length]);
      luz.style.setProperty('--dur', (12 + Math.random() * 12).toFixed(1) + 's');
      luz.style.setProperty('--delay', (-Math.random() * 20).toFixed(1) + 's');
      luz.style.setProperty('--dx', Math.round(Math.random() * 80 - 40) + 'px');
      luz.style.setProperty('--dy', Math.round(Math.random() * 80 - 40) + 'px');
      luz.style.setProperty('--min', (0.2 + Math.random() * 0.15).toFixed(2));
      luz.style.setProperty('--max', (0.6 + Math.random() * 0.3).toFixed(2));
      capa.appendChild(luz);
    }
    var foquitos = ligero ? 10 : (esCelular ? 18 : 34);
    var coloresFoco = ['#ffd9a0', '#ff9ccc', '#ffffff', '#a8f0dc', '#ff8a8a'];
    for (var j = 0; j < foquitos; j++) {
      var f = document.createElement('b');
      f.style.left = (Math.random() * 100).toFixed(1) + '%';
      f.style.top = (Math.random() * 100).toFixed(1) + '%';
      f.style.setProperty('--luz', coloresFoco[j % coloresFoco.length]);
      f.style.setProperty('--dur', (1.8 + Math.random() * 2.6).toFixed(1) + 's');
      f.style.setProperty('--delay', (-Math.random() * 4).toFixed(1) + 's');
      capa.appendChild(f);
    }
    document.body.insertBefore(capa, document.body.firstChild);
  }

  // Detiene los adornos animados de las tarjetas que no se están viendo (ahorra batería y evita tirones).
  var observadorPausa = null;
  function pausarFueraDePantalla(raiz) {
    if (!('IntersectionObserver' in window)) return;
    if (!observadorPausa) {
      observadorPausa = new IntersectionObserver(function (entradas) {
        for (var i = 0; i < entradas.length; i++) {
          entradas[i].target.classList.toggle('cake-pausa', !entradas[i].isIntersecting);
        }
      }, { rootMargin: '120px 0px' });
    }
    var tarjetas = (raiz || document).querySelectorAll('.producto, .destacado-card, .navidad-esp-card');
    for (var k = 0; k < tarjetas.length; k++) {
      if (tarjetas[k].__cakePausaLista) continue;
      tarjetas[k].__cakePausaLista = true;
      observadorPausa.observe(tarjetas[k]);
    }
  }
  // Luces de colores al pie de cada ficha de producto (también para las que se cargan después).
  function decorarTarjetas(raiz) {
    var tarjetas = (raiz || document).querySelectorAll('.producto, .destacado-card');
    for (var i = 0; i < tarjetas.length; i++) {
      var t = tarjetas[i];
      if (t.querySelector(':scope > .navidad-tarjeta-luces')) continue;
      var luces = document.createElement('span');
      luces.className = 'navidad-tarjeta-luces';
      luces.setAttribute('aria-hidden', 'true');
      var total = 9;
      for (var j = 0; j < total; j++) {
        var foco = document.createElement('i');
        foco.style.left = (4 + j * (92 / (total - 1))) + '%';
        foco.style.animationDelay = (-(j * 0.37) % 1.3).toFixed(2) + 's';
        luces.appendChild(foco);
      }
      t.appendChild(luces);
    }
  }


  // Ventanas de los pasteles: guirnalda de luces, nieve, gorrito y acebo.
  function decorarVentanas() {
    var cajas = document.querySelectorAll('#modal-producto .caja-modal, #modal-solo-imagen .caja-solo-imagen');
    for (var i = 0; i < cajas.length; i++) {
      var caja = cajas[i];
      if (caja.querySelector(':scope > .navidad-ventana-luces')) continue;

      var luces = document.createElement('span');
      luces.className = 'navidad-ventana-luces';
      luces.setAttribute('aria-hidden', 'true');
      var total = 13;
      for (var j = 0; j < total; j++) {
        var foco = document.createElement('i');
        foco.style.left = (2 + j * (96 / (total - 1))) + '%';
        foco.style.animationDelay = (-(j * 0.41) % 1.3).toFixed(2) + 's';
        luces.appendChild(foco);
      }

      var nieve = document.createElement('span');
      nieve.className = 'navidad-ventana-nieve';
      nieve.setAttribute('aria-hidden', 'true');
      var copos = ['❄', '❅', '✦', '•', '❆'];
      for (var k = 0; k < 16; k++) {
        var c = document.createElement('i');
        c.textContent = copos[k % copos.length];
        c.style.left = (Math.random() * 100).toFixed(1) + '%';
        c.style.fontSize = (8 + Math.random() * 10).toFixed(0) + 'px';
        c.style.animationDuration = (7 + Math.random() * 7).toFixed(1) + 's';
        c.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's';
        c.style.setProperty('--viento', (Math.random() * 60 - 30).toFixed(0) + 'px');
        nieve.appendChild(c);
      }

      var gorro = document.createElement('img');
      gorro.src = 'img/navidad/gorrito.webp';
      gorro.alt = '';
      gorro.className = 'navidad-ventana-gorro';
      gorro.setAttribute('aria-hidden', 'true');

      var acebo = document.createElement('img');
      acebo.src = 'img/navidad/acebo.webp';
      acebo.alt = '';
      acebo.className = 'navidad-ventana-acebo';
      acebo.setAttribute('aria-hidden', 'true');

      caja.insertBefore(nieve, caja.firstChild);
      caja.appendChild(luces);
      caja.appendChild(gorro);
      caja.appendChild(acebo);
    }
  }

  function iniciarTodo() {
    crearLucesFondo();
    iniciarNavidad();
    decorarTarjetas();
    decorarVentanas();
    pausarFueraDePantalla();
    if (window.MutationObserver) {
      var pendiente = false;
      new MutationObserver(function () {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(function () { pendiente = false; decorarTarjetas(); pausarFueraDePantalla(); });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarTodo);
  else iniciarTodo();
})();
