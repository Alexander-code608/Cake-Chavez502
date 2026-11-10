/* =========================================================
   CAKE CHAVEZ — INTRO NAVIDEÑA
   1. Pantalla oscura -> "Toca para abrir la magia" (el toque permite el sonido).
   2. Una estrella da vueltas con sonido brillante y luego se acerca al centro.
   3. Explota con un "¡pum!" y campanitas, salen muchísimas estrellas.
   4. El logo aparece en grande, la gorra brinca y da una vuelta completa, y el logo vuelve a su lugar.
   5. Aparece el resto de la página y empieza la música navideña de fondo.
   Para quitar la intro: borra las líneas de navidad-intro.css y navidad-intro.js
   en index.html.
   ========================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  // Tema de Año Nuevo activo (ya conocido): no hay intro navideña, ni gorra, ni música navideña.
  if (window.CakeTema && !window.CakeTema.pendiente && window.CakeTema.actual !== 'navidad') return;
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  var enlaceDirecto = Boolean(params && params.get('producto'));
  var reducirMovimiento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var conIntro = !enlaceDirecto && !reducirMovimiento;

  // Se oculta la página desde el primer momento para que todo empiece oscuro.
  if (conIntro) html.classList.add('intro-navidad', 'intro-activa');

  var CLAVE_MUSICA = 'cakeMusicaNavidad';
  function preferenciaMusica() {
    try { return localStorage.getItem(CLAVE_MUSICA) || 'on'; } catch (e) { return 'on'; }
  }
  function guardarPreferenciaMusica(valor) {
    try { localStorage.setItem(CLAVE_MUSICA, valor); } catch (e) { /* sin almacenamiento */ }
  }

  /* =========================================================
     EFECTOS DE SONIDO (estrella, explosión, campanitas: los crea el navegador)
     ========================================================= */
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master, sfx, eco, ruidoBuf;

  function prepararAudio() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      master = ctx.createGain();
      master.gain.value = 0.9;
      var compresor = ctx.createDynamicsCompressor();
      compresor.threshold.value = -16;
      compresor.ratio.value = 4;
      master.connect(compresor);
      compresor.connect(ctx.destination);

      eco = ctx.createConvolver();
      eco.buffer = crearEco(2.6);
      var ecoVol = ctx.createGain();
      ecoVol.gain.value = 0.3;
      eco.connect(ecoVol);
      ecoVol.connect(master);

      sfx = ctx.createGain();
      sfx.gain.value = 0.85;
      sfx.connect(master);
      sfx.connect(eco);

      ruidoBuf = crearRuido(2);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* nada */ } }
    return ctx;
  }

  function crearEco(seg) {
    var n = Math.floor(ctx.sampleRate * seg);
    var b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    return b;
  }

  function crearRuido(seg) {
    var n = Math.floor(ctx.sampleRate * seg);
    var b = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // Timbres: campana real y cajita musical (más suave).
  var CAMPANA = [[1, 1, 1], [2.0, 0.45, 0.6], [2.76, 0.3, 0.45], [5.4, 0.12, 0.25], [8.93, 0.05, 0.14]];
  var CAJITA = [[1, 1, 1], [2, 0.22, 0.5], [3, 0.1, 0.32], [4.2, 0.04, 0.2]];

  function campana(frec, t, dur, vol, destino, parciales) {
    if (!ctx) return;
    parciales = parciales || CAMPANA;
    for (var i = 0; i < parciales.length; i++) {
      var p = parciales[i];
      if (frec * p[0] > ctx.sampleRate * 0.45) continue;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = frec * p[0];
      var d = Math.max(0.08, dur * p[2]);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * p[1]), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(destino || sfx);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  function ruido(t, dur, vol, tipo, frec, frecFin, ataque, q) {
    if (!ctx) return;
    var s = ctx.createBufferSource();
    s.buffer = ruidoBuf;
    s.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.setValueAtTime(frec, t);
    if (frecFin) f.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
    f.Q.value = q || 1;
    var g = ctx.createGain();
    var a = ataque || 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(sfx);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  function cascabeles(t, veces, separacion, vol) {
    for (var i = 0; i < veces; i++) {
      ruido(t + i * separacion + Math.random() * 0.02, 0.09, vol * (0.7 + Math.random() * 0.3), 'bandpass', 7200 + Math.random() * 1500, null, 0.004, 3);
    }
  }

  var PENTA_ALTA = [84, 86, 88, 91, 93, 96, 98, 100, 103];

  // Brillo de la estrella mientras da vueltas.
  function sonidoEstrella(t, dur) {
    ruido(t, dur, 0.045, 'bandpass', 2600, 5200, 0.5, 2);
    var paso = 0;
    while (paso < dur) {
      campana(midi(PENTA_ALTA[Math.floor(Math.random() * PENTA_ALTA.length)]), t + paso, 0.55, 0.035 + Math.random() * 0.04, sfx, CAJITA);
      paso += 0.07 + Math.random() * 0.07;
    }
  }

  // Sonido que sube cuando la estrella se acerca al centro.
  function sonidoAcercar(t, dur) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(2100, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g); g.connect(sfx);
    o.start(t); o.stop(t + dur + 0.1);
    ruido(t, dur + 0.05, 0.12, 'bandpass', 700, 6500, dur * 0.85, 1.5);
    for (var i = 0; i < 12; i++) {
      var k = i / 12;
      campana(midi(84 + i * 2), t + dur * (1 - Math.pow(1 - k, 1.8)), 0.4, 0.04, sfx, CAJITA);
    }
  }

  // ¡Pum! + campanitas + cascabeles.
  function sonidoExplosion(t) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.55);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 1.4);

    var o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(80, t);
    o2.frequency.exponentialRampToValueAtTime(30, t + 0.7);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o2.connect(g2); g2.connect(sfx); o2.start(t); o2.stop(t + 1);

    ruido(t, 0.9, 0.5, 'lowpass', 1800, 180, 0.005, 0.8);
    ruido(t, 0.18, 0.25, 'highpass', 3000, null, 0.003, 0.7);

    // Acorde de campana grande
    campana(midi(72), t + 0.02, 4.2, 0.13);
    campana(midi(76), t + 0.03, 4, 0.1);
    campana(midi(79), t + 0.04, 3.8, 0.1);
    campana(midi(84), t + 0.05, 3.5, 0.08);

    // Lluvia de campanitas
    var notas = [84, 88, 91, 96, 100, 103, 96, 91, 88, 100, 108, 103, 98, 93, 105, 96];
    for (var i = 0; i < notas.length; i++) {
      campana(midi(notas[i]), t + 0.08 + i * 0.09 + Math.random() * 0.06, 2.4, 0.06 + Math.random() * 0.05);
    }
    cascabeles(t + 0.1, 14, 0.11, 0.14);
  }

  function sonidoSalto(t) {
    var sube = [79, 84, 88, 91, 96];
    for (var i = 0; i < sube.length; i++) campana(midi(sube[i]), t + 0.12 + i * 0.07, 0.6, 0.06, sfx, CAJITA);
    ruido(t + 0.1, 0.6, 0.05, 'bandpass', 1200, 4800, 0.2, 2);
    cascabeles(t + 0.08, 4, 0.08, 0.1);
    campana(midi(91), t + 1.0, 1.2, 0.08);
    cascabeles(t + 1.0, 3, 0.07, 0.09);
  }

  function sonidoVuelo(t) {
    ruido(t, 1.1, 0.07, 'bandpass', 4200, 700, 0.25, 2);
    var baja = [100, 96, 93, 91, 88, 84];
    for (var i = 0; i < baja.length; i++) campana(midi(baja[i]), t + i * 0.12, 0.7, 0.04, sfx, CAJITA);
  }

  /* =========================================================
     MÚSICA SUAVE — "Happy Christmas Faces (2 min edit)" de kaazoom (Pixabay)
     Archivo: musica/happy-christmas-faces-suave.mp3 (suavizada y con volumen parejo)
     Licencia de contenido de Pixabay: uso libre, sin obligación de dar crédito.
     Dura 2 minutos, termina con un fundido suave y se repite sola.
     Se usa un archivo de audio real para que no suene robótico.
     ========================================================= */
  var RUTA_MUSICA = 'musica/happy-christmas-faces-suave.mp3?v=5';
  // Volumen de fondo: suave y agradable, sin tapar los sonidos de la página.
  var VOLUMEN_MUSICA = 0.35;
  var musica = { sonando: false, audio: null, fundido: null, desbloqueada: false };

  function obtenerAudioMusica() {
    if (musica.audio) return musica.audio;
    var a = new Audio();
    a.src = RUTA_MUSICA;
    a.loop = true;
    a.preload = 'auto';
    a.setAttribute('playsinline', '');
    a.volume = 0;
    musica.audio = a;
    return a;
  }

  // Sube o baja el volumen poco a poco (en iPhone el volumen lo maneja el teléfono).
  function fundirMusica(destino, segundos, alTerminar) {
    var a = musica.audio;
    if (!a) return;
    clearInterval(musica.fundido);
    var inicio = a.volume, pasos = Math.max(1, Math.round((segundos || 1) * 20)), paso = 0;
    musica.fundido = setInterval(function () {
      paso++;
      var v = inicio + (destino - inicio) * (paso / pasos);
      try { a.volume = Math.max(0, Math.min(1, v)); } catch (e) { /* nada */ }
      if (paso >= pasos) {
        clearInterval(musica.fundido);
        if (alTerminar) alTerminar();
      }
    }, 50);
  }

  // Debe llamarse dentro de un toque: así el navegador deja sonar la música después.
  function desbloquearMusica() {
    if (musica.desbloqueada || preferenciaMusica() === 'off') return;
    var a = obtenerAudioMusica();
    musica.desbloqueada = true;
    try {
      a.muted = true;
      var p = a.play();
      var listo = function () { if (!musica.sonando) { a.pause(); a.currentTime = 0; } a.muted = false; };
      if (p && p.then) p.then(listo, function () { a.muted = false; musica.desbloqueada = false; });
      else listo();
    } catch (e) { a.muted = false; }
  }

  function iniciarMusica(fundido) {
    var a = obtenerAudioMusica();
    musica.sonando = true;
    a.muted = false;
    try {
      var p = a.play();
      if (p && p.catch) p.catch(function () { musica.sonando = false; actualizarBotonMusica(); });
    } catch (e) { musica.sonando = false; }
    fundirMusica(VOLUMEN_MUSICA, Math.max(2.5, fundido || 2.5));
    actualizarBotonMusica();
  }

  function detenerMusica() {
    musica.sonando = false;
    actualizarBotonMusica();
    if (!musica.audio) return;
    fundirMusica(0, 0.6, function () { if (!musica.sonando) musica.audio.pause(); });
  }

  function iniciarMusicaSiSePermite(fundido) {
    if (preferenciaMusica() !== 'off') iniciarMusica(fundido);
  }

  // Si se cambia de pestaña, la música hace pausa y luego sigue.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (ctx) { try { ctx.suspend(); } catch (e) { /* nada */ } }
      if (musica.audio && musica.sonando) musica.audio.pause();
    } else {
      if (ctx) { try { ctx.resume(); } catch (e) { /* nada */ } }
      if (musica.audio && musica.sonando) { var p = musica.audio.play(); if (p && p.catch) p.catch(function () {}); }
    }
  });

  // Crédito de la canción (Pixabay no lo exige, pero es un detalle bonito).
  function agregarCreditoMusica() {
    var pie = document.querySelector('body > footer') || document.querySelector('footer');
    if (!pie || pie.querySelector('.credito-musica')) return;
    var p = document.createElement('p');
    p.className = 'credito-musica';
    p.innerHTML = 'Música: «Happy Christmas Faces» de kaazoom · ' +
      '<a href="https://pixabay.com/music/christmas-happy-christmas-faces-2-min-edit-439398/" target="_blank" rel="noopener">Pixabay</a>';
    pie.appendChild(p);
  }

  var botonMusica = null;
  function crearBotonMusica() {
    agregarCreditoMusica();
    botonMusica = document.createElement('button');
    botonMusica.type = 'button';
    botonMusica.className = 'musica-navidad-btn';
    botonMusica.innerHTML = '<i class="fas fa-bell" aria-hidden="true"></i><span>Música</span>';
    botonMusica.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (musica.sonando) { detenerMusica(); guardarPreferenciaMusica('off'); }
      else { guardarPreferenciaMusica('on'); iniciarMusica(1); }
    });
    document.body.appendChild(botonMusica);
    actualizarBotonMusica();
  }
  function actualizarBotonMusica() {
    if (!botonMusica) return;
    botonMusica.setAttribute('aria-pressed', musica.sonando ? 'true' : 'false');
    botonMusica.setAttribute('aria-label', musica.sonando ? 'Apagar música navideña' : 'Encender música navideña');
    botonMusica.title = musica.sonando ? 'Apagar música' : 'Encender música';
    var icono = botonMusica.querySelector('i');
    if (icono) icono.className = musica.sonando ? 'fas fa-bell' : 'fas fa-bell-slash';
  }

  /* =========================================================
     LIENZO DE ESTRELLAS
     ========================================================= */
  var esCelular = window.innerWidth < 700;
  // En celulares sencillos o antiguos se dibujan menos estrellas para que la intro no se trabe.
  var FACTOR_PARTICULAS = window.CAKE_LIGERO ? 0.4 : 1;
  var lienzo, g, W = 0, H = 0, DPR = 1, raf = 0, ultimoCuadro = 0, tInicio = 0;
  var particulas = [], ondas = [], cieloFondo = [];
  var sprites = [], spritePunto = [], spriteGrande = null;
  var estrella = { activa: false, x: 0, y: 0, s: 1, rot: 0, alfa: 0 };
  var lluviaHasta = 0, chispasGorroHasta = 0;
  var ORBITA = 2.8, ACERCA = 0.9, ESPERA = 0.6;

  var COLORES = [
    [255, 214, 110], [255, 214, 110], [255, 236, 170], // dorado
    [255, 130, 190], [255, 160, 205],                  // rosa
    [255, 255, 255], [255, 255, 255],                  // blanco
    [150, 240, 215],                                   // menta
    [255, 110, 120],                                   // rojo
    [150, 210, 255]                                    // celeste
  ];

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function crearSpriteEstrella(c) {
    var s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var x = cv.getContext('2d');
    var rg = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, rgba(c, 0.9));
    rg.addColorStop(0.3, rgba(c, 0.35));
    rg.addColorStop(1, rgba(c, 0));
    x.fillStyle = rg;
    x.fillRect(0, 0, s, s);
    x.translate(32, 32);
    x.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 6.5 : 19, a = -Math.PI / 2 + i * Math.PI / 5;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.shadowColor = rgba(c, 1);
    x.shadowBlur = 8;
    x.fillStyle = rgba(c, 1);
    x.fill();
    x.beginPath();
    x.arc(0, 0, 4, 0, Math.PI * 2);
    x.fillStyle = '#fff';
    x.fill();
    return cv;
  }

  function crearSpritePunto(c) {
    var s = 32, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var x = cv.getContext('2d');
    var rg = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.25, rgba(c, 0.9));
    rg.addColorStop(1, rgba(c, 0));
    x.fillStyle = rg;
    x.fillRect(0, 0, s, s);
    return cv;
  }

  function crearSpriteGrande() {
    var s = 256, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var x = cv.getContext('2d');
    var m = s / 2;
    var rg = x.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,250,220,1)');
    rg.addColorStop(0.12, 'rgba(255,220,130,.85)');
    rg.addColorStop(0.35, 'rgba(255,140,190,.28)');
    rg.addColorStop(1, 'rgba(255,120,180,0)');
    x.fillStyle = rg;
    x.fillRect(0, 0, s, s);
    // destellos en cruz
    x.translate(m, m);
    for (var k = 0; k < 4; k++) {
      x.save();
      x.rotate(k * Math.PI / 2 + (k % 2 ? 0 : 0));
      var lg = x.createLinearGradient(0, 0, m, 0);
      lg.addColorStop(0, 'rgba(255,255,255,.95)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(0, -3); x.lineTo(m, 0); x.lineTo(0, 3); x.closePath();
      x.fill();
      x.restore();
    }
    x.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 14 : 36, a = -Math.PI / 2 + i * Math.PI / 5;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.shadowColor = 'rgba(255,210,120,1)';
    x.shadowBlur = 22;
    x.fillStyle = '#ffe79a';
    x.fill();
    x.beginPath();
    x.arc(0, 0, 9, 0, Math.PI * 2);
    x.fillStyle = '#fff';
    x.fill();
    return cv;
  }

  function prepararSprites() {
    for (var i = 0; i < COLORES.length; i++) {
      sprites.push(crearSpriteEstrella(COLORES[i]));
      spritePunto.push(crearSpritePunto(COLORES[i]));
    }
    spriteGrande = crearSpriteGrande();
  }

  function medir() {
    if (!lienzo) return;
    DPR = Math.min(window.CAKE_LIGERO ? 1.25 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    lienzo.width = Math.round(W * DPR);
    lienzo.height = Math.round(H * DPR);
  }

  function aleatorio(a, b) { return a + Math.random() * (b - a); }

  function agregarParticula(p) {
    if (particulas.length > (window.CAKE_LIGERO ? 900 : 2600)) particulas.shift();
    p.max = p.vida;
    p.fase = Math.random() * 6.28;
    p.tw = aleatorio(4, 11);
    p.rot = Math.random() * 6.28;
    p.vr = aleatorio(-0.08, 0.08);
    particulas.push(p);
  }

  function chispa(x, y, opciones) {
    var o = opciones || {};
    var esEstrella = o.estrella !== undefined ? o.estrella : Math.random() < 0.6;
    var ci = Math.floor(Math.random() * COLORES.length);
    agregarParticula({
      x: x, y: y,
      vx: o.vx || 0, vy: o.vy || 0,
      drag: o.drag || 0.97, grav: o.grav !== undefined ? o.grav : 0.04,
      vida: o.vida || 1,
      tam: o.tam || 10,
      img: esEstrella ? sprites[ci] : spritePunto[ci]
    });
  }

  function posicionEstrella(tl) {
    var cx = W / 2, cy = H / 2;
    var rb = Math.min(W, H) * 0.36;
    var ax = W > H ? 1.3 : 0.95, ay = W > H ? 0.82 : 0.8;
    function orbita(u) {
      var e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      var ang = -Math.PI * 0.8 + e * Math.PI * 2 * 2.15;
      var r = rb * (1 - 0.28 * e);
      return { x: cx + Math.cos(ang) * r * ax, y: cy + Math.sin(ang) * r * ay, v: 0 };
    }
    if (tl < ORBITA) {
      var p = orbita(tl / ORBITA);
      p.s = 0.75 + 0.12 * Math.sin(tl * 9);
      return p;
    }
    var fin = orbita(1);
    var v = Math.min(1, (tl - ORBITA) / ACERCA);
    var k = v * v;
    return { x: fin.x + (cx - fin.x) * k, y: fin.y + (cy - fin.y) * k, s: 0.8 + 5.2 * v * v * v, v: v };
  }

  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    var dt = Math.min(0.05, (ahora - ultimoCuadro) / 1000 || 0.016);
    ultimoCuadro = ahora;
    var t = (ahora - tInicio) / 1000;
    var f = dt * 60;

    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';

    // Cielo con estrellitas lejanas
    for (var c = 0; c < cieloFondo.length; c++) {
      var e = cieloFondo[c];
      g.globalAlpha = e.a * (0.5 + 0.5 * Math.sin(t * e.tw + e.fase));
      g.drawImage(spritePunto[5], e.x * W - e.tam / 2, e.y * H - e.tam / 2, e.tam, e.tam);
    }

    // Estrella principal
    if (estrella.activa) {
      var tl = t - ESPERA;
      if (tl >= 0) {
        var pos = posicionEstrella(tl);
        estrella.x = pos.x; estrella.y = pos.y; estrella.s = pos.s;
        estrella.alfa = Math.min(1, tl / 0.35);
        estrella.rot += dt * (2.2 + 12 * (pos.v || 0));
        var cuantas = esCelular ? 2 : 3;
        for (var n = 0; n < cuantas; n++) {
          chispa(pos.x + aleatorio(-4, 4) * pos.s, pos.y + aleatorio(-4, 4) * pos.s, {
            vx: aleatorio(-0.7, 0.7), vy: aleatorio(-0.7, 0.7), drag: 0.95, grav: 0.02,
            vida: aleatorio(0.5, 1.1), tam: aleatorio(5, 13) * Math.min(pos.s, 2)
          });
        }
      }
    }

    // Lluvia de brillitos después de la explosión
    if (performance.now() < lluviaHasta) {
      var lluvia = esCelular ? 1 : 3;
      for (var l = 0; l < lluvia; l++) {
        if (Math.random() < 0.7) chispa(Math.random() * W, -10, {
          vx: aleatorio(-0.3, 0.3), vy: aleatorio(1, 2.6), drag: 0.998, grav: 0.008,
          vida: aleatorio(3.5, 5.5), tam: aleatorio(6, 15)
        });
      }
    }

    // Chispas que salen de la gorra cuando salta
    if (performance.now() < chispasGorroHasta && gorroIntro) {
      var r = gorroIntro.getBoundingClientRect();
      for (var q = 0; q < 3; q++) chispa(r.left + r.width * aleatorio(0.1, 0.9), r.top + r.height * aleatorio(0.2, 0.9), {
        vx: aleatorio(-1.5, 1.5), vy: aleatorio(-1.5, 0.8), drag: 0.96, grav: 0.05, vida: aleatorio(0.6, 1.2), tam: aleatorio(6, 14)
      });
    }

    // Partículas
    var vivas = [];
    for (var i = 0; i < particulas.length; i++) {
      var p = particulas[i];
      p.vida -= dt;
      if (p.vida <= 0) continue;
      var arrastre = Math.pow(p.drag, f);
      p.vx *= arrastre;
      p.vy = p.vy * arrastre + p.grav * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.rot += p.vr * f;
      if (p.y > H + 40) continue;
      var vidaRel = p.vida / p.max;
      var alfa = Math.min(1, vidaRel * 1.6) * (0.6 + 0.4 * Math.sin(t * p.tw + p.fase));
      if (alfa <= 0.01) { vivas.push(p); continue; }
      g.globalAlpha = alfa;
      var co = Math.cos(p.rot) * DPR, si = Math.sin(p.rot) * DPR;
      g.setTransform(co, si, -si, co, p.x * DPR, p.y * DPR);
      g.drawImage(p.img, -p.tam / 2, -p.tam / 2, p.tam, p.tam);
      vivas.push(p);
    }
    particulas = vivas;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Ondas de la explosión
    var ondasVivas = [];
    for (var w = 0; w < ondas.length; w++) {
      var o = ondas[w];
      o.r += o.v * f;
      o.vida -= dt;
      if (o.vida <= 0) continue;
      g.globalAlpha = Math.max(0, o.vida / o.max) * 0.8;
      g.strokeStyle = o.color;
      g.lineWidth = o.grosor * (o.vida / o.max) + 1;
      g.beginPath();
      g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      g.stroke();
      ondasVivas.push(o);
    }
    ondas = ondasVivas;

    if (estrella.activa && t - ESPERA >= 0) {
      var tam = 90 * estrella.s;
      g.globalAlpha = estrella.alfa;
      var cr = Math.cos(estrella.rot) * DPR, sr = Math.sin(estrella.rot) * DPR;
      g.setTransform(cr, sr, -sr, cr, estrella.x * DPR, estrella.y * DPR);
      g.drawImage(spriteGrande, -tam / 2, -tam / 2, tam, tam);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    g.globalAlpha = 1;
  }

  function arrancarLienzo() {
    if (!g) return;
    ultimoCuadro = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(cuadro);
  }

  function explosion(x, y) {
    var total = Math.round((esCelular ? 600 : 1200) * FACTOR_PARTICULAS);
    var maxV = Math.max(9, Math.min(W, H) / 48);
    for (var i = 0; i < total; i++) {
      var ang = Math.random() * Math.PI * 2;
      var anillo = Math.random() < 0.28;
      var vel = anillo ? maxV * aleatorio(0.85, 1) : maxV * Math.pow(Math.random(), 0.6) * 1.05;
      chispa(x, y, {
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
        drag: aleatorio(0.945, 0.972), grav: aleatorio(0.025, 0.07),
        vida: aleatorio(1.6, 3.8), tam: Math.random() < 0.6 ? aleatorio(9, 30) : aleatorio(4, 12)
      });
    }
    var colores = ['rgba(255,230,160,1)', 'rgba(255,140,195,1)', 'rgba(255,255,255,1)'];
    for (var k = 0; k < 3; k++) ondas.push({ x: x, y: y, r: 10, v: (16 - k * 4) * (Math.min(W, H) / 700), vida: 1 + k * 0.2, max: 1 + k * 0.2, color: colores[k], grosor: 10 - k * 2 });
  }

  /* =========================================================
     LÍNEA DE TIEMPO DE LA INTRO
     ========================================================= */
  var overlay, logoIntro, gorroIntro, botonToque, botonSaltar;
  var temporizadores = [];
  var estado = { iniciado: false, terminado: false };
  var T_EXPLOTA = (ESPERA + ORBITA + ACERCA) * 1000;

  function programar(ms, fn) { temporizadores.push(setTimeout(fn, ms)); }

  function crearIntro() {
    overlay = document.createElement('div');
    overlay.id = 'intro-navidad';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Bienvenida navideña de Cake Chávez');
    overlay.innerHTML =
      '<div class="intro-fondo"></div>' +
      '<div class="intro-aurora"></div>' +
      '<canvas class="intro-lienzo" aria-hidden="true"></canvas>' +
      '<div class="intro-destello" aria-hidden="true"></div>' +
      '<div class="intro-logo" aria-hidden="true">' +
        '<img class="intro-logo-base" src="img/navidad/logo-base.webp" alt="">' +
        '<img class="intro-logo-gorro" src="img/navidad/gorro-logo.webp" alt="">' +
      '</div>' +
      '<button type="button" class="intro-toque">' +
        '<span class="intro-toque-estrella" aria-hidden="true">★</span>' +
        '<span class="intro-toque-texto">Toca para abrir la magia navideña</span>' +
        '<span class="intro-toque-nota"><i class="fas fa-volume-up" aria-hidden="true"></i> Sube el volumen</span>' +
      '</button>' +
      '<button type="button" class="intro-saltar">Saltar intro <i class="fas fa-forward" aria-hidden="true"></i></button>';
    document.body.appendChild(overlay);

    lienzo = overlay.querySelector('.intro-lienzo');
    g = lienzo.getContext('2d');
    logoIntro = overlay.querySelector('.intro-logo');
    gorroIntro = overlay.querySelector('.intro-logo-gorro');
    botonToque = overlay.querySelector('.intro-toque');
    botonSaltar = overlay.querySelector('.intro-saltar');

    prepararSprites();
    medir();
    for (var i = 0; i < Math.round((esCelular ? 45 : 90) * FACTOR_PARTICULAS); i++) {
      cieloFondo.push({ x: Math.random(), y: Math.random(), tam: aleatorio(3, 8), a: aleatorio(0.25, 0.7), tw: aleatorio(0.8, 2.5), fase: Math.random() * 6.28 });
    }
    window.addEventListener('resize', medir);

    tInicio = performance.now() + 1e7; // la estrella aún no sale
    arrancarLienzo();

    overlay.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.intro-saltar')) return;
      empezar();
    });
    botonSaltar.addEventListener('click', function (ev) { ev.stopPropagation(); saltarIntro(); });
  }

  function empezar() {
    if (estado.iniciado || estado.terminado) return;
    estado.iniciado = true;
    prepararAudio();
    desbloquearMusica();
    overlay.classList.add('iniciado');
    try { history.scrollRestoration = 'manual'; } catch (e) { /* nada */ }
    window.scrollTo(0, 0);
    if (ctx) campana(midi(96), ctx.currentTime + 0.02, 1.2, 0.05, sfx, CAJITA);

    tInicio = performance.now();
    programar(ESPERA * 1000, function () {
      estrella.activa = true;
      if (ctx) sonidoEstrella(ctx.currentTime, ORBITA);
    });
    programar((ESPERA + ORBITA) * 1000, function () { if (ctx) sonidoAcercar(ctx.currentTime, ACERCA); });
    programar(T_EXPLOTA, explotar);
    programar(T_EXPLOTA + 250, mostrarLogo);
    programar(T_EXPLOTA + 1300, function () { iniciarMusicaSiSePermite(4); });
    programar(T_EXPLOTA + 2000, saltarGorro);
    programar(T_EXPLOTA + 3800, volarLogo);
    programar(T_EXPLOTA + 3800 + 1150, aterrizar);
  }

  function explotar() {
    estrella.activa = false;
    overlay.classList.add('explotado');
    if (ctx) sonidoExplosion(ctx.currentTime);
    explosion(W / 2, H / 2);
    lluviaHasta = performance.now() + 3600;
  }

  function mostrarLogo() {
    var proporcion = 532 / 818;
    var ancho = Math.min(W * (esCelular ? 0.72 : 0.7), 620, (H * 0.58) / proporcion);
    var alto = ancho * proporcion;
    logoIntro.style.width = ancho + 'px';
    logoIntro.style.left = (W - ancho) / 2 + 'px';
    logoIntro.style.top = (H - alto) / 2 + alto * 0.1 + 'px';
    logoIntro.classList.add('aparece');
    // Anillo de brillitos alrededor del logo
    var cx = W / 2, cy = (H - alto) / 2 + alto * 0.6;
    for (var i = 0; i < Math.round((esCelular ? 70 : 140) * FACTOR_PARTICULAS); i++) {
      var a = Math.random() * Math.PI * 2;
      chispa(cx + Math.cos(a) * ancho * 0.55, cy + Math.sin(a) * alto * 0.7, {
        vx: Math.cos(a) * aleatorio(0.4, 2), vy: Math.sin(a) * aleatorio(0.4, 2), drag: 0.98, grav: 0.01,
        vida: aleatorio(1.2, 2.4), tam: aleatorio(6, 16)
      });
    }
  }

  function saltarGorro() {
    logoIntro.classList.add('salta');
    chispasGorroHasta = performance.now() + 1000;
    if (ctx) sonidoSalto(ctx.currentTime);
  }

  function volarLogo() {
    window.scrollTo(0, 0);
    var destino = document.getElementById('logo-navidad');
    if (!destino) { aterrizar(); return; }
    var d = destino.getBoundingClientRect();
    var a = logoIntro.getBoundingClientRect();
    if (!d.width || !a.width) { aterrizar(); return; }
    var escala = d.width / a.width;
    logoIntro.style.transformOrigin = '0 0';
    void logoIntro.offsetWidth;
    logoIntro.style.transition = 'transform 1.15s cubic-bezier(.7,0,.2,1)';
    logoIntro.style.transform = 'translate(' + (d.left - a.left) + 'px,' + (d.top - a.top) + 'px) scale(' + escala + ')';
    overlay.classList.add('volando');
    if (ctx) sonidoVuelo(ctx.currentTime);
  }

  function revelarPagina() {
    var lista = [];
    var portada = document.querySelector('.zona-portada');
    var encabezado = portada ? portada.querySelector('header') : null;
    if (encabezado) Array.prototype.forEach.call(encabezado.children, function (el) {
      if (!el.classList.contains('logo-container')) lista.push(el);
    });
    if (portada) Array.prototype.forEach.call(portada.children, function (el) { if (el !== encabezado) lista.push(el); });
    var omitir = /(^|\s)(overlay|overlay-modal|carrito-lateral|cake-review-modal|cake-review-lightbox)(\s|$)/;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === portada || el.id === 'intro-navidad' || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(el.tagName)) return;
      if (el.hidden || omitir.test(el.className || '')) return;
      lista.push(el);
    });

    html.classList.remove('intro-activa');
    html.classList.add('gorro-salta');

    var vh = window.innerHeight, orden = 0;
    lista.forEach(function (el) {
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none') return;
      var fijo = cs.position === 'fixed';
      var r = el.getBoundingClientRect();
      var visible = fijo || r.top < vh * 1.05;
      var retraso = 150 + orden * 140;
      if (visible) orden++;
      // Rendimiento: solo se animan los bloques que se ven en pantalla. Animar también los
      // que están más abajo creaba cientos de capas y trababa el primer desplazamiento.
      if (!visible) return;
      if (!el.animate) return;
      try {
        el.animate(
          [{ opacity: 0, translate: '0 28px' }, { opacity: 1, translate: '0 0' }],
          { duration: 800, delay: retraso, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
        );
      } catch (e) { /* navegador antiguo: aparece sin animación */ }
    });
  }

  function cerrarIntro(rapido) {
    estado.terminado = true;
    overlay.style.pointerEvents = 'none';
    overlay.classList.add('terminado');
    if (rapido) overlay.classList.add('rapido');
    // Rendimiento: el lienzo de estrellas ocupa toda la pantalla. Antes seguía dibujándose
    // 2.2 s encima de la página mientras la persona empezaba a bajar (eso causaba el
    // congelamiento). Ahora se detiene en cuanto se desvanece y se retira enseguida.
    setTimeout(function () { cancelAnimationFrame(raf); raf = 0; }, rapido ? 350 : 700);
    setTimeout(function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, rapido ? 600 : 1000);
  }

  function aterrizar() {
    if (estado.terminado) return;
    if (logoIntro) logoIntro.style.visibility = 'hidden';
    revelarPagina();
    cerrarIntro(false);
  }

  function saltarIntro() {
    if (estado.terminado) return;
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    prepararAudio();
    if (ctx) {
      var ahora = ctx.currentTime;
      sfx.gain.cancelScheduledValues(ahora);
      sfx.gain.setValueAtTime(sfx.gain.value, ahora);
      sfx.gain.linearRampToValueAtTime(0, ahora + 0.25);
      sfx.gain.setValueAtTime(0, ahora + 3.5);
      sfx.gain.linearRampToValueAtTime(0.85, ahora + 3.6);
    }
    window.scrollTo(0, 0);
    revelarPagina();
    cerrarIntro(true);
    iniciarMusicaSiSePermite(1.5);
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function alCargar() {
    crearBotonMusica();
    if (conIntro) {
      crearIntro();
    } else {
      if (!reducirMovimiento) html.classList.add('gorro-salta');
      // Sin intro: la música empieza con el primer toque en la página.
      // pointerdown no existe en iPhone antiguos: también se escucha touchstart y click.
      var eventosToque = window.PointerEvent ? ['pointerdown'] : ['touchstart', 'click'];
      var primerToque = function (ev) {
        eventosToque.forEach(function (n) { document.removeEventListener(n, primerToque, true); });
        if (botonMusica && botonMusica.contains(ev.target)) return;
        iniciarMusicaSiSePermite(2.5);
      };
      eventosToque.forEach(function (n) { document.addEventListener(n, primerToque, true); });
    }
  }

  // Primera visita: se espera a saber el tema antes de arrancar la intro.
  function alCargarSegunTema() {
    if (!window.CakeTema) { alCargar(); return; }
    window.CakeTema.cuandoListo(function (tema) {
      if (tema === 'navidad') { alCargar(); return; }
      html.classList.remove('intro-navidad', 'intro-activa', 'gorro-salta');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargarSegunTema);
  else alCargarSegunTema();
})();
