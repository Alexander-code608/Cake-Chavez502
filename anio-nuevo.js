/* =========================================================
   CAKE CHÁVEZ — TEMA AÑO NUEVO (página principal)
   - Bienvenida animada «¡Feliz Año Nuevo!» con cuenta 3·2·1 y fuegos artificiales.
   - Confeti, burbujas, destellos, banderines y estrellas colgantes.
   - Aparición suave de la página, igual que con el tema de Navidad.
   Con el tema de Navidad este archivo solo pausa las escenas de «Tu opinión
   nos motiva» cuando no se ven (ahorro de batería); no cambia nada más.
   ========================================================= */
(function () {
  'use strict';
  var html = document.documentElement;
  var reducir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ligero = html.classList.contains('cake-ligero');
  var esCelular = window.innerWidth < 700;

  function anio() { return window.CakeTema ? window.CakeTema.anioNuevo() : new Date().getFullYear() + 1; }

  /* ---------- Escenas de opiniones: solo se animan en pantalla ---------- */
  function pausarEscenas() {
    var escenas = document.querySelectorAll('.opiniones-escena');
    if (!escenas.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle('escena-pausa', !e.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    Array.prototype.forEach.call(escenas, function (el) { el.classList.add('escena-pausa'); io.observe(el); });
  }

  /* ---------- Adornos fijos de Año Nuevo ---------- */
  var COLORES = ['#b9dfc0', '#e7c98b', '#f3cdb4', '#e4f2e1', '#d9d3ea', '#f7eedd', '#7fae8a'];
  function azar(a, b) { return a + Math.random() * (b - a); }

  function crearCielo() {
    if (document.querySelector('.an-cielo') || reducir) return;
    var cielo = document.createElement('div');
    cielo.className = 'an-cielo';
    cielo.setAttribute('aria-hidden', 'true');
    var n = ligero ? 5 : (esCelular ? 8 : 14), i, el;
    for (i = 0; i < n; i++) {
      el = document.createElement('i');
      el.className = 'an-confeti' + (i % 3 === 1 ? ' redondo' : i % 3 === 2 ? ' tira' : '');
      el.style.left = azar(0, 100) + '%';
      el.style.setProperty('--c', COLORES[i % COLORES.length]);
      el.style.setProperty('--viento', azar(-60, 60).toFixed(0) + 'px');
      el.style.animationDuration = azar(9, 16).toFixed(1) + 's';
      el.style.animationDelay = (-azar(0, 16)).toFixed(1) + 's';
      cielo.appendChild(el);
    }
    for (i = 0; i < (esCelular ? 6 : 10); i++) {
      el = document.createElement('i');
      el.className = 'an-brillo';
      el.style.left = azar(2, 98) + '%';
      el.style.top = azar(2, 95) + '%';
      el.style.animationDelay = (-azar(0, 3)).toFixed(1) + 's';
      cielo.appendChild(el);
    }
    if (!ligero) for (i = 0; i < (esCelular ? 2 : 4); i++) {
      el = document.createElement('i');
      el.className = 'an-burbuja';
      var t = azar(10, 26);
      el.style.width = el.style.height = t + 'px';
      el.style.left = azar(3, 97) + '%';
      el.style.setProperty('--viento', azar(-30, 30).toFixed(0) + 'px');
      el.style.animationDuration = azar(14, 22).toFixed(1) + 's';
      el.style.animationDelay = (-azar(0, 20)).toFixed(1) + 's';
      cielo.appendChild(el);
    }
    document.body.insertBefore(cielo, document.body.firstChild);
  }

  function crearEncabezado() {
    // Logo con marco verde pastel (sin gorro navideño)
    Array.prototype.forEach.call(document.querySelectorAll('.zona-portada .logo'), function (img) {
      if (/logo-base\.webp/.test(img.getAttribute('src') || '')) img.src = 'img/anio-nuevo/logo-anio-nuevo.webp';
    });
    var portada = document.querySelector('.zona-portada');
    if (!portada || portada.querySelector('.an-banderines')) return;
    var band = document.createElement('div');
    band.className = 'an-banderines';
    band.setAttribute('aria-hidden', 'true');
    var total = 19, mitad = (total - 1) / 2;
    for (var i = 0; i < total; i++) {
      var b = document.createElement('i');
      var d = (i - mitad) / mitad; // -1..1
      b.style.setProperty('--y', (16 * (1 - d * d)).toFixed(1) + 'px');
      b.style.setProperty('--c', ['#b9dfc0', '#f7eedd', '#e7c98b', '#f3cdb4', '#e4f2e1'][i % 5]);
      b.style.animationDelay = (-i * 0.22).toFixed(2) + 's';
      band.appendChild(b);
    }
    var luces = portada.querySelector('.navidad-luces');
    if (luces && luces.parentNode) luces.parentNode.insertBefore(band, luces);
    else portada.insertBefore(band, portada.firstChild);

    if (getComputedStyle(portada).position === 'static') portada.style.position = 'relative';
    var colg = document.createElement('div');
    colg.className = 'an-estrellas-colgantes';
    colg.setAttribute('aria-hidden', 'true');
    [[7, 60], [15, 95], [85, 80], [93, 50]].forEach(function (p, k) {
      var s = document.createElement('span');
      s.style.left = p[0] + '%'; s.style.height = p[1] + 'px';
      s.style.animationDelay = (-k * 0.9) + 's';
      if (esCelular && (k === 1 || k === 2)) s.style.display = 'none';
      colg.appendChild(s);
    });
    portada.appendChild(colg);

    var slogan = portada.querySelector('.slogan');
    if (slogan && !portada.querySelector('.an-cinta-anio')) {
      var cinta = document.createElement('div');
      cinta.style.textAlign = 'center';
      cinta.innerHTML = '<span class="an-cinta-anio">✨ Feliz Año Nuevo <b>' + anio() + '</b> ✨</span>';
      slogan.parentNode.insertBefore(cinta, slogan.nextSibling);
    }
  }

  /* Fuegos artificiales suaves de vez en cuando (pocos, para no trabar el celular) */
  function fuegosOcasionales() {
    if (reducir || ligero) return;
    function uno() {
      if (!document.hidden && !html.classList.contains('an-intro-activa')) {
        var f = document.createElement('div');
        f.className = 'an-fuego';
        f.setAttribute('aria-hidden', 'true');
        f.style.left = azar(8, 92) + 'vw';
        f.style.top = azar(8, 38) + 'vh';
        var c = COLORES[Math.floor(Math.random() * COLORES.length)];
        var piezas = esCelular ? 10 : 14;
        for (var i = 0; i < piezas; i++) {
          var p = document.createElement('i');
          p.style.setProperty('--a', (360 / piezas * i) + 'deg');
          p.style.setProperty('--r', azar(45, 85).toFixed(0) + 'px');
          p.style.setProperty('--c', i % 2 ? c : '#fff6dc');
          f.appendChild(p);
        }
        document.body.appendChild(f);
        setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1800);
      }
      setTimeout(uno, azar(6000, 10000));
    }
    setTimeout(uno, 2500);
  }

  /* ---------- Aparición suave de la página (como en Navidad) ---------- */
  function revelarPagina() {
    html.classList.remove('an-intro-activa');
    if (reducir) return;
    var lista = [];
    var portada = document.querySelector('.zona-portada');
    if (portada) Array.prototype.forEach.call(portada.querySelectorAll('header > *, .zona-portada > *:not(header)'), function (el) { lista.push(el); });
    var omitir = /(^|\s)(overlay|overlay-modal|carrito-lateral|cake-review-modal|cake-review-lightbox|an-cielo|an-fuego)(\s|$)/;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === portada || el.id === 'intro-anio-nuevo' || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(el.tagName)) return;
      if (el.hidden || omitir.test(el.className || '')) return;
      lista.push(el);
    });
    var vh = window.innerHeight, orden = 0;
    lista.forEach(function (el) {
      if (!el.animate) return;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none') return;
      var r = el.getBoundingClientRect();
      if (cs.position !== 'fixed' && r.top >= vh * 1.05) return;
      var retraso = 120 + orden * 130; orden++;
      try {
        el.animate([{ opacity: 0, translate: '0 26px', scale: '.98' }, { opacity: 1, translate: '0 0', scale: '1' }],
          { duration: 850, delay: retraso, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      } catch (e) { /* navegador antiguo */ }
    });
  }

  /* ---------- Bienvenida «¡Feliz Año Nuevo!» ---------- */
  function crearIntro() {
    if (document.getElementById('intro-anio-nuevo')) return;
    var ov = document.createElement('div');
    ov.id = 'intro-anio-nuevo';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Bienvenida de Año Nuevo de Cake Chávez');
    var titulo = '¡Feliz Año Nuevo!'.split('').map(function (ch, i) {
      return ch === ' ' ? '<span>&nbsp;</span>' : '<span style="animation-delay:' + (0.05 * i).toFixed(2) + 's,' + (1 + 0.05 * i).toFixed(2) + 's">' + ch + '</span>';
    }).join('');
    ov.innerHTML =
      '<canvas aria-hidden="true"></canvas>' +
      '<div class="an-intro-centro">' +
        '<img class="an-intro-reloj" src="img/anio-nuevo/reloj.webp" alt="" width="430" height="497">' +
        '<div class="an-intro-cuenta" aria-hidden="true"></div>' +
        '<h2 class="an-intro-titulo" hidden>' + titulo + '</h2>' +
        '<span class="an-intro-anio" hidden>' + anio() + '</span>' +
        '<p class="an-intro-frase" hidden>Gracias por endulzar nuestro año. Que el próximo venga lleno de dulces momentos 🥂</p>' +
      '</div>' +
      '<button type="button" class="an-intro-saltar">Entrar <i class="fas fa-forward" aria-hidden="true"></i></button>';
    document.body.appendChild(ov);

    var lienzo = ov.querySelector('canvas'), g = lienzo.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, esCelular ? 1.5 : 2);
    function medir() { W = window.innerWidth; H = window.innerHeight; lienzo.width = W * dpr; lienzo.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    medir();
    window.addEventListener('resize', medir);
    var parts = [], raf = 0, terminado = false, tempos = [];
    var fondo = [];
    for (var k = 0; k < (esCelular ? 40 : 80); k++) fondo.push({ x: Math.random(), y: Math.random(), r: azar(.6, 1.8), f: Math.random() * 6.28 });

    function estallido(x, y, n) {
      var c = COLORES[Math.floor(Math.random() * COLORES.length)];
      for (var i = 0; i < n; i++) {
        var a = Math.PI * 2 * i / n + Math.random() * .2, v = azar(1.5, 4.6);
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, dec: azar(.009, .016), c: i % 3 ? c : '#fff6dc', r: azar(1.4, 2.6) });
      }
    }
    function cohete() {
      var x = azar(W * .15, W * .85), y = azar(H * .12, H * .45);
      estallido(x, y, esCelular ? 40 : 70);
    }
    function cuadro(t) {
      g.clearRect(0, 0, W, H);
      for (var i = 0; i < fondo.length; i++) {
        var s = fondo[i];
        g.globalAlpha = .25 + .35 * Math.sin(t / 700 + s.f) * .5 + .2;
        g.fillStyle = '#f3dca6';
        g.beginPath(); g.arc(s.x * W, s.y * H, s.r, 0, 6.283); g.fill();
      }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        p.vx *= .985; p.vy = p.vy * .985 + .035; p.x += p.vx; p.y += p.vy; p.vida -= p.dec;
        if (p.vida <= 0) { parts.splice(j, 1); continue; }
        g.globalAlpha = p.vida;
        g.fillStyle = p.c;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
      if (!terminado) raf = requestAnimationFrame(cuadro);
    }
    raf = requestAnimationFrame(cuadro);

    function programar(ms, fn) { tempos.push(setTimeout(fn, ms)); }
    var cuenta = ov.querySelector('.an-intro-cuenta');
    ['3', '2', '1'].forEach(function (n, i) {
      programar(700 + i * 620, function () { cuenta.innerHTML = '<span>' + n + '</span>'; });
    });
    programar(700 + 3 * 620, function () {
      cuenta.style.display = 'none';
      ov.querySelector('.an-intro-reloj').style.display = 'none';
      ['.an-intro-titulo', '.an-intro-anio', '.an-intro-frase'].forEach(function (s) { ov.querySelector(s).hidden = false; });
      ov.classList.add('revelar');
      estallido(W / 2, H * .42, esCelular ? 60 : 110);
      programar(350, cohete); programar(800, cohete); programar(1300, cohete); programar(1900, cohete); programar(2500, cohete);
    });
    programar(700 + 3 * 620 + 3600, function () { cerrar(false); });

    function cerrar(rapido) {
      if (terminado) return;
      tempos.forEach(clearTimeout);
      revelarPagina();
      ov.style.pointerEvents = 'none';
      ov.classList.add('terminado');
      if (rapido) ov.style.transitionDuration = '.45s';
      setTimeout(function () {
        terminado = true; cancelAnimationFrame(raf);
        window.removeEventListener('resize', medir);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      }, rapido ? 500 : 950);
    }
    ov.addEventListener('click', function () { cerrar(true); });
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { document.removeEventListener('keydown', esc); cerrar(true); } });
  }

  /* ---------- Arranque ---------- */
  function iniciarAnioNuevo() {
    // La bienvenida va primero: si algún adorno fallara, la página nunca se queda oculta.
    try { if (html.classList.contains('an-intro-activa')) crearIntro(); } catch (e) { html.classList.remove('an-intro-activa'); }
    [function () { Array.prototype.forEach.call(document.querySelectorAll('[data-anio-nuevo]'), function (el) { el.textContent = String(anio()); }); },
     crearCielo, crearEncabezado, fuegosOcasionales].forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    });
  }

  function arrancar() {
    pausarEscenas();
    if (!window.CakeTema) return;
    window.CakeTema.cuandoListo(function (tema) {
      if (tema === 'anio-nuevo') iniciarAnioNuevo();
      else html.classList.remove('an-intro-activa');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
