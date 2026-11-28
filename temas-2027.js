/* =========================================================
   CAKE CHÁVEZ — TEMÁTICAS 2027 (se carga en las diez temáticas)
   1. CakeIntro: avisa cuando terminó la entrada de la temática activa (Navidad incluida).
   2. Entradas animadas propias de las nueve temáticas nuevas, con sonidos suaves.
   3. Decoraciones: figuras flotantes, escena animada de reseñas, especialidades,
      cuenta regresiva, textos de temporada y música de cada temática.
   4. Botón «¿Necesitas un pedido urgente?» (las diez temáticas).
   5. Ilustraciones en los botones de categorías (las diez temáticas).
   6. Enlaces de productos y enlace universal «Personalizar pastel».
   ========================================================= */
(function () {
  'use strict';
  var w = window, d = document, html = d.documentElement;
  function $(id) { return d.getElementById(id); }
  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function azar(a, b) { return a + Math.random() * (b - a); }
  function elegir(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function temaActual() { return w.CakeTema && w.CakeTema.actual ? w.CakeTema.actual : 'navidad'; }
  function info(t) { return w.CAKE_TEMAS ? w.CAKE_TEMAS.buscar(t || temaActual()) : null; }
  var reducir = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var esCelular = Math.min(w.innerWidth || 1000, w.innerHeight || 1000) < 700;

  /* =========================================================
     1. CakeIntro — una sola señal de «la entrada terminó»
     ========================================================= */
  var intro = { hecho: false, cola: [] };
  w.CakeIntro = {
    terminar: function () { if (intro.hecho) return; intro.hecho = true; var c = intro.cola; intro.cola = []; c.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); },
    listo: function (fn) { if (intro.hecho) fn(); else intro.cola.push(fn); },
    get terminada() { return intro.hecho; }
  };
  // Seguridad: nunca dejar la página escondida si algo falla.
  setTimeout(function () { if (!intro.hecho && !$('t27-intro') && !$('intro-navidad')) { html.classList.remove('t27-intro-activa'); w.CakeIntro.terminar(); } }, 15000);

  /* =========================================================
     2. DATOS DE CADA TEMÁTICA
     ========================================================= */
  function proxima(mes, dia, horasAntes) {
    var ahora = new Date(), y = ahora.getFullYear();
    var f = new Date(y, mes, dia, 0, 0, 0);
    if (f.getTime() + 864e5 <= ahora.getTime()) f = new Date(y + 1, mes, dia, 0, 0, 0);
    return f;
  }
  function pascua(y) { // domingo de Resurrección (algoritmo gregoriano anónimo)
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31) - 1, dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes, dia);
  }
  function juevesSanto() {
    var y = new Date().getFullYear(), p = pascua(y), j = new Date(p.getFullYear(), p.getMonth(), p.getDate() - 3);
    if (j.getTime() + 864e5 <= Date.now()) { p = pascua(y + 1); j = new Date(p.getFullYear(), p.getMonth(), p.getDate() - 3); }
    return j;
  }
  // Fechas de Guatemala: Día de la Madre 10 de mayo, Día del Padre 17 de junio, Día del Niño 1 de octubre.
  var C = {
    'anio-nuevo': { glifo: 'estrella', intro: 'reloj', toque: 'Toca para recibir el Año Nuevo',
      amb: [{ g: 'destello', c: ['#f2e2bf', '#d8b26a'], n: 7, anim: 't27Titilar', t: [10, 20], o: .8 }, { g: 'estrella', c: ['#d8b26a', '#e2b0b4'], n: 5, t: [10, 16], o: .5 }],
      escena: ['destello', 'estrella', 'circulo'], escenaCol: ['#f2e2bf', '#d8b26a', '#e2b0b4'],
      cuenta: function () { return { label: 'Año Nuevo', fecha: proxima(0, 1) }; },
      mensajes: ['Brinda por un nuevo comienzo con un postre hecho con amor ✨', 'Reserva con tiempo tu pastel para recibir el Año Nuevo 🥂', 'Que el nuevo año empiece dulce 🎆'] },
    'carino-amistad': { glifo: 'corazon', intro: 'sobre', toque: 'Toca para abrir tu carta de cariño',
      amb: [{ g: 'corazon', c: ['#e98aa3', '#f3b6c4', '#c26b83'], n: 7, anim: 't27Subir', t: [12, 22], o: .5 }, { g: 'petalo', c: ['#f3c2cd'], n: 4, t: [10, 14], o: .45 }],
      escena: ['corazon', 'petalo', 'destello'], escenaCol: ['#e98aa3', '#f3c2cd', '#c9a46a'],
      cuenta: function () { return { label: 'el Día del Cariño', fecha: proxima(1, 14) }; },
      mensajes: ['Endulza el día de quien más quieres 💗', 'Un detalle dulce dice «te quiero» sin palabras 💌', 'Celebra la amistad con algo hecho a mano 🌹'] },
    'semana-santa': { glifo: 'flor', intro: 'flores', toque: 'Toca para comenzar',
      amb: [{ g: 'petalo', c: ['#c9b8e2', '#ffffff', '#f4c7d1'], n: 6, t: [10, 16], o: .5 }, { g: 'mariposa', c: ['#b9a6d6', '#f6e7b8'], n: 2, anim: 't27Revolotear', t: [18, 24], o: .6, d: [22, 30] }],
      escena: ['flor', 'huevo', 'mariposa'], escenaCol: ['#c9b8e2', '#f6e7b8', '#bcd3a4'],
      cuenta: function () { return { label: 'Semana Santa', fecha: juevesSanto() }; },
      mensajes: ['Comparte en familia sabores de temporada 🌿', 'Haz tu pedido con anticipación para Semana Santa 🌼'] },
    'dia-madre': { glifo: 'rosa', intro: 'ramo', toque: 'Toca para abrir el regalo para mamá',
      amb: [{ g: 'petalo', c: ['#f3c6cf', '#e8b4c0', '#fbe7e3'], n: 7, t: [11, 18], o: .55 }, { g: 'corazon', c: ['#d99aac'], n: 3, anim: 't27Subir', t: [10, 14], o: .35 }],
      escena: ['rosa', 'petalo', 'corazon'], escenaCol: ['#e39cae', '#f3c6cf', '#d8b27a'],
      cuenta: function () { return { label: 'el Día de la Madre', fecha: proxima(4, 10) }; },
      mensajes: ['Porque cada mamá merece un dulce momento 🌷', 'Sorprende a mamá con un pastel hecho con amor 💐'] },
    'dia-padre': { glifo: 'corbata', intro: 'relojpapa', toque: 'Toca para celebrar a papá',
      amb: [{ g: 'hoja', c: ['#8fb5b0', '#a9c1a0'], n: 4, t: [12, 18], o: .35 }, { g: 'destello', c: ['#d8b471'], n: 4, anim: 't27Titilar', t: [8, 14], o: .6 }],
      escena: ['corbata', 'reloj', 'estrella'], escenaCol: ['#1f5157', '#c49a52', '#8fb5b0'],
      cuenta: function () { return { label: 'el Día del Padre', fecha: proxima(5, 17) }; },
      mensajes: ['Celebra a papá con un pastel tan especial como él 👔', 'Chocolate, café y detalles elegantes para papá ⌚'] },
    'dia-nino': { glifo: 'globo', intro: 'globos', toque: '¡Toca para empezar la fiesta!',
      amb: [{ g: 'globo', c: ['#f6b7a3', '#f9d980', '#9fd3c4', '#a9cdf2', '#c7b6ec'], n: 6, anim: 't27Subir', t: [22, 34], o: .7, d: [18, 26] }, { g: 'estrella', c: ['#f9d980'], n: 4, anim: 't27Titilar', t: [10, 16], o: .8 }],
      escena: ['globo', 'estrella', 'osito'], escenaCol: ['#f6b7a3', '#f9d980', '#a9cdf2'],
      cuenta: function () { return { label: 'el Día del Niño', fecha: proxima(9, 1) }; },
      mensajes: ['¡Globos, ositos y mucha alegría para los peques! 🎈', 'Haz que su día sea tan dulce como ellos 🧸'] },
    'halloween': { glifo: 'calabaza', intro: 'niebla', toque: 'Toca si te atreves… 🎃',
      amb: [{ g: 'murcielago', c: ['#2b1820', '#5a3240'], n: 3, anim: 't27Revolotear', t: [22, 32], o: .55, d: [16, 24] }, { g: 'hoja', c: ['#d9a25f', '#e39a6b', '#a8603a'], n: 5, t: [12, 18], o: .5 }, { g: 'circulo', c: ['#ffcf8a'], n: 4, anim: 't27Titilar', t: [5, 8], o: .8 }],
      escena: ['fantasma', 'calabaza', 'murcielago'], escenaCol: ['#f6dccb', '#e39a6b', '#2b1820'],
      cuenta: function () { return { label: 'Halloween', fecha: proxima(9, 31) }; },
      mensajes: ['Dulce o truco… ¡mejor dulce! 🎃', 'Postres deliciosamente encantados para tu noche de Halloween 👻'] },
    'tema-oficial': { glifo: 'lazo', intro: 'liston', toque: 'Toca para descubrir Cake Chavez',
      amb: [{ g: 'destello', c: ['#e8a9b4', '#c9a27a'], n: 5, anim: 't27Titilar', t: [8, 14], o: .6 }],
      escena: ['lazo', 'destello', 'pastel'], escenaCol: ['#e8a9b4', '#c9a27a', '#22C55E'],
      cuenta: null, mensajes: [] },
    'tematica-adicional': { glifo: 'mariposa', intro: 'jardin', toque: 'Toca para entrar al jardín',
      amb: [{ g: 'mariposa', c: ['#b9cde0', '#dbe9e4', '#ffffff'], n: 4, anim: 't27Revolotear', t: [18, 26], o: .7, d: [20, 30] }, { g: 'petalo', c: ['#ffffff', '#eef5f4'], n: 5, t: [10, 15], o: .7 }],
      escena: ['mariposa', 'flor', 'petalo'], escenaCol: ['#b9cde0', '#ffffff', '#a9c2b4'],
      cuenta: null, mensajes: [] }
  };
  function conf(t) { return C[t || temaActual()] || null; }
  function es2027() { return !!conf(); }

  /* =========================================================
     3. SONIDOS SUAVES (los crea el navegador; se activan con el toque)
     ========================================================= */
  var AC = w.AudioContext || w.webkitAudioContext, ctx = null, sal = null, eco = null;
  function audio() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { return null; }
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(ctx.destination);
      sal = ctx.createGain(); sal.gain.value = .75; sal.connect(comp);
      eco = ctx.createConvolver();
      var len = Math.floor(ctx.sampleRate * 2.2), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var dt = buf.getChannelData(ch); for (var i = 0; i < len; i++) dt[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      eco.buffer = buf; var ev = ctx.createGain(); ev.gain.value = .28; eco.connect(ev); ev.connect(comp);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* nada */ } }
    return ctx;
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function nota(m, t, dur, vol, tipo, sinEco) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(hz(m), t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(sal); if (!sinEco) g.connect(eco); o.start(t); o.stop(t + dur + .05);
    if (tipo !== 'triangle') { var o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.frequency.setValueAtTime(hz(m) * 2.01, t); g2.gain.setValueAtTime(.0001, t); g2.gain.exponentialRampToValueAtTime(vol * .25, t + .01); g2.gain.exponentialRampToValueAtTime(.0001, t + dur * .5); o2.connect(g2); g2.connect(sal); o2.start(t); o2.stop(t + dur); }
  }
  function ruido(t, dur, vol, tipo, f1, f2) {
    if (!ctx) return;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, len, ctx.sampleRate), dt = b.getChannelData(0);
    for (var i = 0; i < len; i++) dt[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = b;
    var fl = ctx.createBiquadFilter(); fl.type = tipo || 'bandpass'; fl.frequency.setValueAtTime(f1 || 1200, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sal); s.start(t); s.stop(t + dur + .02);
  }
  function pum(t, vol) { // golpe grave y redondo (fuegos artificiales)
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .4);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .5, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .8);
    o.connect(g); g.connect(sal); o.start(t); o.stop(t + .85);
    ruido(t, .5, (vol || .5) * .35, 'lowpass', 1400, 200);
  }
  function crepitar(t, dur) { if (!ctx) return; for (var i = 0; i < 14; i++) ruido(t + Math.random() * dur, .05, .05, 'highpass', 4000); }
  function tic(t) { if (!ctx) return; ruido(t, .04, .12, 'bandpass', 3200); nota(96, t, .08, .02, 'triangle', true); }
  function acorde(t, notas, vol, sep) { (notas || [72, 76, 79, 84]).forEach(function (n, i) { nota(n, t + i * (sep || .03), 2.4, vol || .06); }); }
  function arpegio(t, notas, paso, vol, tipo) { notas.forEach(function (n, i) { nota(n, t + i * paso, 1.3, vol || .045, tipo); }); }
  function soplo(t, dur, vol) { ruido(t, dur, vol || .08, 'bandpass', 400, 2600); }

  /* =========================================================
     4. MÚSICA DE LA TEMÁTICA (archivo MP3; el panel puede cambiarla)
     ========================================================= */
  var CLAVE_MUSICA = 'cakeMusicaTemas';
  var musica = { audio: null, sonando: false, url: '', titulo: '', artista: '', enlace: '', volumen: .35, fundido: null };
  function prefMusica() { try { return localStorage.getItem(CLAVE_MUSICA) || 'on'; } catch (e) { return 'on'; } }
  function guardarPref(v) { try { localStorage.setItem(CLAVE_MUSICA, v); } catch (e) { /* nada */ } }
  function prepararMusica(tema) {
    var i = info(tema), m = i && i.musica ? i.musica : null;
    if (m) { musica.url = m.archivo; musica.titulo = m.titulo; musica.artista = m.artista; musica.enlace = m.enlace || ''; musica.fuente = m.fuente || ''; }
    var cfg = w.CAKE_SUPABASE_CONFIG || {};
    if (!cfg.url || !w.fetch) return Promise.resolve();
    return fetch(cfg.url + '/rest/v1/cake_theme_audio?theme=eq.' + encodeURIComponent(tema) + '&select=audio_url,track_title,artist,source_url,volume', { headers: { apikey: cfg.anonKey, Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; }).then(function (f) {
        if (!Array.isArray(f) || !f.length) return;
        var x = f[0];
        musica.url = x.audio_url || ''; // vacío = la temática no tiene música
        if (x.track_title) musica.titulo = x.track_title;
        if (x.artist != null) musica.artista = x.artist;
        if (x.source_url != null) musica.enlace = x.source_url;
        if (x.volume != null) musica.volumen = Math.max(0, Math.min(1, Number(x.volume) || .35));
      }).catch(function () { /* se usa la pista incluida */ });
  }
  function audioMusica() {
    if (!musica.url) return null;
    if (musica.audio) return musica.audio;
    var a = new Audio(); a.src = musica.url; a.loop = true; a.preload = 'auto'; a.setAttribute('playsinline', ''); a.volume = 0;
    musica.audio = a; return a;
  }
  function fundir(dest, seg, fin) {
    var a = musica.audio; if (!a) return; clearInterval(musica.fundido);
    var ini = a.volume, pasos = Math.max(1, Math.round(seg * 20)), p = 0;
    musica.fundido = setInterval(function () { p++; try { a.volume = Math.max(0, Math.min(1, ini + (dest - ini) * p / pasos)); } catch (e) { /* iPhone */ } if (p >= pasos) { clearInterval(musica.fundido); if (fin) fin(); } }, 50);
  }
  function desbloquearMusica() {
    if (prefMusica() === 'off') return;
    var a = audioMusica(); if (!a) return;
    try { a.muted = true; var p = a.play(); var ok = function () { if (!musica.sonando) { a.pause(); a.currentTime = 0; } a.muted = false; }; if (p && p.then) p.then(ok, function () { a.muted = false; }); else ok(); } catch (e) { a.muted = false; }
  }
  function tocarMusica() {
    var a = audioMusica(); if (!a) return;
    musica.sonando = true; a.muted = false;
    try { var p = a.play(); if (p && p.catch) p.catch(function () { musica.sonando = false; botonMusica(); }); } catch (e) { musica.sonando = false; }
    fundir(musica.volumen, 2.5); botonMusica();
  }
  function pararMusica() { musica.sonando = false; botonMusica(); if (musica.audio) fundir(0, .6, function () { if (!musica.sonando) musica.audio.pause(); }); }
  var btnMusica = null;
  function crearBotonMusica() {
    if (!musica.url || btnMusica) return;
    btnMusica = el('button', 't27-musica-btn'); btnMusica.type = 'button';
    btnMusica.innerHTML = '<i class="fas fa-music" aria-hidden="true"></i><span>Música</span>';
    btnMusica.addEventListener('click', function (ev) { ev.stopPropagation(); if (musica.sonando) { pararMusica(); guardarPref('off'); } else { guardarPref('on'); tocarMusica(); } });
    d.body.appendChild(btnMusica); botonMusica();
    var pie = d.querySelector('body > footer') || d.querySelector('footer');
    if (pie && !pie.querySelector('.credito-musica') && musica.titulo) {
      var p = el('p', 'credito-musica');
      p.appendChild(d.createTextNode('Música: «' + musica.titulo + '»' + (musica.artista ? ' de ' + musica.artista : '') + (musica.fuente ? ' · ' : '')));
      if (musica.fuente) { if (musica.enlace) { var a = el('a', '', musica.fuente); a.href = musica.enlace; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); } else p.appendChild(d.createTextNode(musica.fuente)); }
      pie.appendChild(p);
    }
  }
  function botonMusica() {
    if (!btnMusica) return;
    btnMusica.setAttribute('aria-pressed', musica.sonando ? 'true' : 'false');
    btnMusica.setAttribute('aria-label', musica.sonando ? 'Apagar música' : 'Encender música');
    btnMusica.title = musica.sonando ? 'Apagar música' : 'Encender música';
    var i = btnMusica.querySelector('i'); if (i) i.className = musica.sonando ? 'fas fa-music' : 'fas fa-volume-mute';
  }
  d.addEventListener('visibilitychange', function () {
    if (!es2027()) return;
    if (d.hidden) { if (ctx) try { ctx.suspend(); } catch (e) { /* nada */ } if (musica.audio && musica.sonando) musica.audio.pause(); }
    else { if (ctx) try { ctx.resume(); } catch (e) { /* nada */ } if (musica.audio && musica.sonando) { var p = musica.audio.play(); if (p && p.catch) p.catch(function () {}); } }
  });

  /* =========================================================
     5. ENTRADAS ANIMADAS — una escena distinta por temática
     ========================================================= */
  var ov = null, lienzo = null, g2 = null, W = 0, H = 0, raf = 0, parts = [], tiempos = [], est = { iniciado: false, terminado: false };
  function programar(ms, fn) { tiempos.push(setTimeout(fn, ms)); }
  function medir() {
    if (!lienzo) return;
    var r = Math.min(2, w.devicePixelRatio || 1); W = w.innerWidth; H = w.innerHeight;
    lienzo.width = Math.round(W * r); lienzo.height = Math.round(H * r); g2.setTransform(r, 0, 0, r, 0, 0);
  }
  var cacheRutas = {};
  function ruta(n) { if (!cacheRutas[n]) { try { cacheRutas[n] = new Path2D(w.CAKE_GLIFOS.ruta(n)); } catch (e) { cacheRutas[n] = null; } } return cacheRutas[n]; }
  function dibujarGlifo(n, x, y, s, rot, color, a, ex) {
    var p = ruta(n); if (!p) return;
    g2.save(); g2.globalAlpha = Math.max(0, Math.min(1, a)); g2.translate(x, y); if (rot) g2.rotate(rot); g2.scale(s / 24 * (ex || 1), s / 24); g2.translate(-12, -12);
    g2.fillStyle = color; g2.fill(p, w.CAKE_GLIFOS.par(n) ? 'evenodd' : 'nonzero'); g2.restore();
  }
  function bucle(ts) {
    raf = requestAnimationFrame(bucle);
    var t = ts / 1000; g2.clearRect(0, 0, W, H);
    var dtt = 1 / 60;
    parts = parts.filter(function (p) {
      p.vida -= dtt; if (p.vida <= 0) return false;
      p.vx = (p.vx || 0) * (p.roce || 1); p.vy = (p.vy || 0) + (p.grav || 0);
      p.x += p.vx; p.y += p.vy; p.rot = (p.rot || 0) + (p.vr || 0);
      var a = Math.min(1, p.vida / (p.desv || .6)) * (p.a == null ? 1 : p.a);
      if (p.tipo === 'chispa') { g2.globalAlpha = a; g2.fillStyle = p.c; g2.beginPath(); g2.arc(p.x, p.y, p.r, 0, 6.283); g2.fill(); if (p.brillo) { var gr = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); gr.addColorStop(0, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.globalAlpha = a * .35; g2.fillStyle = gr; g2.beginPath(); g2.arc(p.x, p.y, p.r * 4, 0, 6.283); g2.fill(); } }
      else dibujarGlifo(p.g, p.x, p.y, p.s, p.rot, p.c, a, p.aletea ? .35 + Math.abs(Math.sin(t * p.aletea)) * .65 : 1);
      return true;
    });
    g2.globalAlpha = 1;
  }
  function estallido(x, y, colores, n, fuerza, figura) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * 6.283, v = azar(.4, 1) * fuerza;
      if (figura && i % 5 === 0) parts.push({ g: figura, x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, grav: .03, roce: .975, s: azar(10, 20), rot: azar(0, 6), vr: azar(-.08, .08), c: elegir(colores), vida: azar(1.4, 2.4), desv: .8 });
      else parts.push({ tipo: 'chispa', x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, grav: .035, roce: .972, r: azar(1.2, 2.8), c: elegir(colores), vida: azar(1, 2), desv: .7, brillo: Math.random() < .3 });
    }
  }
  function lluviaGlifos(fig, colores, n, opciones) {
    opciones = opciones || {};
    for (var i = 0; i < n; i++) {
      var sube = opciones.sube;
      parts.push({ g: elegir([].concat(fig)), x: azar(0, W), y: sube ? H + azar(10, H * .5) : -azar(10, H * .6), vx: azar(-.4, .4), vy: sube ? -azar(1.6, 3.2) : azar(1, 2.2),
        s: azar(opciones.min || 14, opciones.max || 30), rot: azar(0, 6), vr: azar(-.02, .02) * (opciones.giro == null ? 1 : opciones.giro), c: elegir(colores), vida: azar(4, 7), desv: 1.2, a: opciones.a || .9, aletea: opciones.aletea || 0 });
    }
  }

  // Cada escena: arma(capa) agrega elementos; corre(t0) programa la secuencia y devuelve el momento del logo (ms).
  var ESCENAS = {
    // AÑO NUEVO: reloj dorado que marca la medianoche (3, 2, 1), fuegos artificiales champagne y el logo.
    reloj: { titulo: function () { return '¡Feliz Año Nuevo ' + (w.CakeTema ? w.CakeTema.anioNuevo() : '') + '!'; },
      arma: function (capa) {
        capa.innerHTML = '<div class="t27i-reloj"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="t27oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e7c8"/><stop offset=".5" stop-color="#d8b26a"/><stop offset="1" stop-color="#a9793c"/></linearGradient></defs>' +
          '<circle cx="100" cy="100" r="92" fill="#1b100b" stroke="url(#t27oro)" stroke-width="7"/><circle cx="100" cy="100" r="80" fill="none" stroke="rgba(216,178,106,.35)" stroke-width="1.5"/>' +
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { var a = i * 30 * Math.PI / 180, x1 = 100 + Math.sin(a) * 72, y1 = 100 - Math.cos(a) * 72, x2 = 100 + Math.sin(a) * (i % 3 ? 78 : 82), y2 = 100 - Math.cos(a) * (i % 3 ? 78 : 82); return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#d8b26a" stroke-width="' + (i % 3 ? 2 : 4) + '" stroke-linecap="round"/>'; }).join('') +
          '<g class="t27i-aguja-h"><line x1="100" y1="100" x2="100" y2="52" stroke="#f2e2bf" stroke-width="6" stroke-linecap="round"/></g><g class="t27i-aguja-m"><line x1="100" y1="100" x2="100" y2="30" stroke="#d8b26a" stroke-width="4" stroke-linecap="round"/></g><circle cx="100" cy="100" r="7" fill="#d8b26a"/></svg>' +
          '<span class="t27i-numero"></span></div>';
      },
      corre: function () {
        var num = ov.querySelector('.t27i-numero');
        ov.classList.add('reloj-gira');
        [3, 2, 1].forEach(function (n, i) { programar(900 + i * 800, function () { num.textContent = n; num.classList.remove('late'); void num.offsetWidth; num.classList.add('late'); if (ctx) { tic(ctx.currentTime); nota(84 - i * 0, ctx.currentTime, .4, .05); } }); });
        programar(3300, function () {
          ov.classList.add('medianoche'); num.textContent = '';
          var col = ['#f6e7c8', '#d8b26a', '#e2b0b4', '#fff6e3'];
          if (ctx) { pum(ctx.currentTime, .45); crepitar(ctx.currentTime + .15, 1.2); }
          estallido(W / 2, H * .42, col, esCelular ? 90 : 160, esCelular ? 7 : 9, 'estrella');
          [[.22, .3, 400], [.78, .28, 750], [.35, .2, 1100], [.66, .22, 1450]].forEach(function (f) { programar(f[2], function () { estallido(W * f[0], H * f[1], col, esCelular ? 50 : 90, 6, 'destello'); if (ctx) { pum(ctx.currentTime, .25); crepitar(ctx.currentTime + .1, .8); } }); });
        });
        return 3600;
      } },
    // CARIÑO: carta con sello de corazón; se abre, salen corazones y aparece el logo.
    sobre: { titulo: function () { return 'Con cariño, para ti 💌'; },
      arma: function (capa) { capa.innerHTML = '<div class="t27i-sobre"><div class="t27i-sobre-fondo"></div><div class="t27i-sobre-carta"></div><div class="t27i-sobre-frente"></div><div class="t27i-sobre-tapa"></div><span class="t27i-sobre-sello"></span></div>'; },
      corre: function () {
        programar(400, function () { lluviaGlifos('corazon', ['#e98aa3', '#f3b6c4', '#c26b83', '#ffffff'], esCelular ? 14 : 24, { sube: true, min: 12, max: 30, a: .75 }); if (ctx) arpegio(ctx.currentTime, [76, 79, 83, 88], .16, .04); });
        programar(1400, function () { ov.classList.add('sobre-abre'); if (ctx) { soplo(ctx.currentTime, .6, .04); nota(88, ctx.currentTime + .2, 1.4, .05); } });
        programar(2300, function () { estallido(W / 2, H * .5, ['#e98aa3', '#fbd3dc', '#d9a86a', '#fff'], esCelular ? 50 : 90, 6, 'corazon'); if (ctx) acorde(ctx.currentTime, [76, 80, 83, 88], .05, .04); });
        return 2350;
      } },
    // SEMANA SANTA: una corona de flores se abre con luz de amanecer; mariposas y huevitos pastel.
    flores: { titulo: function () { return 'Feliz Semana Santa'; },
      arma: function (capa) {
        var h = '<div class="t27i-rayos"></div><div class="t27i-corona">';
        for (var i = 0; i < 10; i++) h += '<i style="--i:' + i + '"></i>';
        h += '</div><div class="t27i-huevos">';
        ['#c9b8e2', '#f6e7b8', '#bcd3a4', '#f4c7d1', '#b9d3e6'].forEach(function (c, i) { h += '<i style="--c:' + c + ';--i:' + i + '"></i>'; });
        capa.innerHTML = h + '</div>';
      },
      corre: function () {
        programar(200, function () { ov.classList.add('amanece'); if (ctx) arpegio(ctx.currentTime, [67, 71, 74, 79, 83, 86], .14, .04, 'triangle'); });
        programar(900, function () { ov.classList.add('florece'); });
        programar(1600, function () { lluviaGlifos('mariposa', ['#b9a6d6', '#f6e7b8', '#ffffff'], esCelular ? 5 : 8, { sube: true, min: 18, max: 28, aletea: 11, giro: .3 }); });
        programar(2200, function () { ov.classList.add('huevos'); if (ctx) acorde(ctx.currentTime, [67, 71, 74, 79], .05); });
        return 2300;
      } },
    // DÍA DE LA MADRE: lluvia de pétalos, el lazo del ramo se desata y florece el logo.
    ramo: { titulo: function () { return 'Para ti, mamá, con todo nuestro amor'; },
      arma: function (capa) { capa.innerHTML = '<div class="t27i-lazo"><span class="t27i-lazo-izq"></span><span class="t27i-lazo-der"></span><span class="t27i-lazo-nudo"></span></div>'; },
      corre: function () {
        programar(150, function () { lluviaGlifos(['petalo', 'petalo', 'rosa'], ['#f3c6cf', '#e8b4c0', '#fbe7e3', '#d99aac'], esCelular ? 22 : 38, { min: 12, max: 26, a: .85 }); if (ctx) arpegio(ctx.currentTime, [79, 83, 86, 91, 86, 83], .2, .035); });
        programar(1300, function () { ov.classList.add('lazo-ve'); });
        programar(2100, function () { ov.classList.add('lazo-suelta'); if (ctx) { soplo(ctx.currentTime, .5, .03); acorde(ctx.currentTime + .2, [72, 76, 79, 84], .05); } });
        programar(2400, function () { estallido(W / 2, H * .5, ['#f3c6cf', '#fbe7e3', '#d8b27a'], esCelular ? 40 : 70, 5, 'petalo'); });
        return 2450;
      } },
    // DÍA DEL PADRE: reloj de bolsillo que gira, el moño se coloca y el logo aparece con brillo dorado.
    relojpapa: { titulo: function () { return 'Feliz día, papá'; },
      arma: function (capa) {
        capa.innerHTML = '<div class="t27i-bolsillo"><svg viewBox="0 0 200 230" aria-hidden="true"><defs><linearGradient id="t27oroP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e7cc"/><stop offset=".5" stop-color="#c49a52"/><stop offset="1" stop-color="#8a6a32"/></linearGradient></defs>' +
          '<rect x="88" y="4" width="24" height="18" rx="6" fill="url(#t27oroP)"/><circle cx="100" cy="30" r="12" fill="none" stroke="url(#t27oroP)" stroke-width="5"/>' +
          '<circle cx="100" cy="130" r="92" fill="url(#t27oroP)"/><circle cx="100" cy="130" r="80" fill="#f8f2e4"/>' +
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { var a = i * 30 * Math.PI / 180; return '<circle cx="' + (100 + Math.sin(a) * 68).toFixed(1) + '" cy="' + (130 - Math.cos(a) * 68).toFixed(1) + '" r="' + (i % 3 ? 2.2 : 4) + '" fill="#1f5157"/>'; }).join('') +
          '<g class="t27i-aguja-h"><line x1="100" y1="130" x2="100" y2="88" stroke="#1f5157" stroke-width="6" stroke-linecap="round"/></g><g class="t27i-aguja-m"><line x1="100" y1="130" x2="100" y2="68" stroke="#173a3e" stroke-width="4" stroke-linecap="round"/></g><circle cx="100" cy="130" r="6" fill="#c49a52"/></svg></div>' +
          '<span class="t27i-mono"></span>';
      },
      corre: function () {
        ov.classList.add('reloj-gira');
        for (var i = 0; i < 8; i++) (function (k) { programar(300 + k * 260, function () { if (ctx) tic(ctx.currentTime); }); })(i);
        programar(2000, function () { ov.classList.add('mono-ve'); if (ctx) { nota(43, ctx.currentTime, 1.6, .07, 'triangle'); acorde(ctx.currentTime + .1, [55, 62, 67, 71], .05, .05); } });
        programar(2500, function () { estallido(W / 2, H * .5, ['#d8b471', '#f3e7cc', '#c49a52'], esCelular ? 45 : 80, 5.5, 'destello'); });
        return 2550;
      } },
    // DÍA DEL NIÑO: un racimo de globos sube y trae el logo; estrellas y molinetes que giran.
    globos: { titulo: function () { return '¡Feliz Día del Niño!'; },
      arma: function (capa) {
        var h = '<div class="t27i-nubes"><i></i><i></i><i></i></div><div class="t27i-racimo">';
        ['#f6b7a3', '#f9d980', '#9fd3c4', '#a9cdf2', '#c7b6ec', '#f6b7a3', '#a9cdf2'].forEach(function (c, i) { h += '<i style="--c:' + c + ';--i:' + i + '"></i>'; });
        capa.innerHTML = h + '</div><span class="t27i-molinete izq"></span><span class="t27i-molinete der"></span>';
      },
      corre: function () {
        programar(100, function () { ov.classList.add('suben'); if (ctx) arpegio(ctx.currentTime, [72, 76, 79, 84, 88], .12, .045, 'triangle'); });
        programar(500, function () { lluviaGlifos('estrella', ['#f9d980', '#ffffff', '#f6b7a3'], esCelular ? 10 : 18, { sube: true, min: 10, max: 22 }); });
        programar(2100, function () { ov.classList.add('sueltan'); if (ctx) { ruido(ctx.currentTime, .08, .2, 'highpass', 1500); acorde(ctx.currentTime + .05, [72, 76, 79, 84], .05, .05); } });
        programar(2150, function () { estallido(W / 2, H * .45, ['#f6b7a3', '#f9d980', '#9fd3c4', '#a9cdf2', '#c7b6ec'], esCelular ? 60 : 110, 7, 'estrella'); });
        return 2200;
      } },
    // HALLOWEEN: niebla, velas que titilan, murciélagos y fantasmitas; el logo aparece entre la bruma.
    niebla: { titulo: function () { return 'Dulce o truco… ¡mejor dulce!'; },
      arma: function (capa) { capa.innerHTML = '<div class="t27i-bruma"><i></i><i></i></div><div class="t27i-velas"><i></i><i></i><i></i></div><div class="t27i-luna"></div>'; },
      corre: function () {
        programar(100, function () { ov.classList.add('velas'); if (ctx) { soplo(ctx.currentTime, 1.8, .04); arpegio(ctx.currentTime + .3, [69, 72, 76, 81, 79, 76], .22, .035); } });
        programar(700, function () { lluviaGlifos('murcielago', ['#140a0e', '#2b1820'], esCelular ? 6 : 10, { sube: true, min: 22, max: 40, aletea: 14, giro: .2, a: .9 }); });
        programar(1300, function () { lluviaGlifos('fantasma', ['#f6dccb', '#ffffff'], esCelular ? 4 : 6, { sube: true, min: 26, max: 44, giro: .1, a: .85 }); });
        programar(2300, function () { ov.classList.add('despeja'); if (ctx) acorde(ctx.currentTime, [69, 72, 76, 81], .05); estallido(W / 2, H * .5, ['#eaa46f', '#f6dccb', '#ffcf8a'], esCelular ? 40 : 70, 5, 'calabaza'); });
        return 2350;
      } },
    // TEMA OFICIAL: listón rosa satinado (el de la referencia) que gira, envuelve y se aparta revelando el logo.
    liston: { titulo: function () { return 'Dulces momentos, horneados con amor'; },
      arma: function (capa) {
        capa.innerHTML = '<svg class="t27i-liston" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
          '<linearGradient id="t27saten" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98b96"/><stop offset=".25" stop-color="#f3c9cf"/><stop offset=".5" stop-color="#e7a7b1"/><stop offset=".75" stop-color="#f8dde1"/><stop offset="1" stop-color="#c98b96"/></linearGradient>' +
          '<linearGradient id="t27satenB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe9ec"/><stop offset="1" stop-color="#b9737f"/></linearGradient></defs>' +
          '<path class="t27i-liston-a" d="M-80 470 C 160 330, 300 600, 470 420 S 760 120, 640 210 S 330 420, 500 300 S 880 60, 1090 160" fill="none" stroke="url(#t27saten)" stroke-width="46" stroke-linecap="round"/>' +
          '<path class="t27i-liston-b" d="M-80 470 C 160 330, 300 600, 470 420 S 760 120, 640 210 S 330 420, 500 300 S 880 60, 1090 160" fill="none" stroke="url(#t27satenB)" stroke-width="6" stroke-linecap="round" opacity=".55"/></svg>' +
          '<span class="t27i-brillo-liston"></span>';
      },
      corre: function () {
        programar(80, function () { ov.classList.add('liston-entra'); if (ctx) { soplo(ctx.currentTime, 1.6, .07); arpegio(ctx.currentTime + .4, [79, 83, 86, 91], .18, .03); } });
        programar(1900, function () { ov.classList.add('liston-sale'); if (ctx) soplo(ctx.currentTime, .9, .05); });
        programar(2150, function () { estallido(W / 2, H * .48, ['#f3c9cf', '#ffffff', '#c9a27a', '#22C55E'], esCelular ? 40 : 70, 5, 'destello'); if (ctx) acorde(ctx.currentTime, [72, 76, 79, 84], .055); });
        programar(2900, function () { ov.classList.add('gorro'); if (ctx) nota(91, ctx.currentTime, .6, .04); });
        return 2200;
      } },
    // JARDÍN ENCANTADO: una reja de jardín se abre entre la niebla; magnolias y mariposas salen volando.
    jardin: { titulo: function () { return 'Bienvenidos al jardín de Cake Chavez'; },
      arma: function (capa) { capa.innerHTML = '<div class="t27i-reja izq"></div><div class="t27i-reja der"></div><div class="t27i-bruma clara"><i></i><i></i></div>'; },
      corre: function () {
        programar(300, function () { if (ctx) { for (var i = 0; i < 7; i++) nota(elegir([88, 91, 93, 95, 98, 100]), ctx.currentTime + i * .18 + Math.random() * .08, 1.6, .03); } });
        programar(900, function () { ov.classList.add('reja-abre'); if (ctx) soplo(ctx.currentTime, 1.2, .04); });
        programar(1500, function () { lluviaGlifos('mariposa', ['#b9cde0', '#dbe9e4', '#ffffff', '#c9d6da'], esCelular ? 8 : 14, { sube: true, min: 18, max: 30, aletea: 10, giro: .3 }); lluviaGlifos('petalo', ['#ffffff', '#eef5f4'], esCelular ? 10 : 18, { min: 10, max: 18, a: .9 }); });
        programar(2300, function () { if (ctx) acorde(ctx.currentTime, [74, 79, 83, 86], .045); estallido(W / 2, H * .5, ['#ffffff', '#dbe9e4', '#b9cde0'], esCelular ? 40 : 70, 5, 'mariposa'); });
        return 2350;
      } }
  };

  function crearIntro(tema) {
    var c = conf(tema), escena = ESCENAS[c.intro], i = info(tema);
    ov = el('div'); ov.id = 't27-intro'; ov.className = 'esc-' + c.intro;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Bienvenida de ' + (i ? i.nombre : 'Cake Chavez'));
    ov.innerHTML = '<canvas class="t27i-lienzo" aria-hidden="true"></canvas><div class="t27i-capa t27i-escena" aria-hidden="true"></div>' +
      '<div class="t27i-logo" aria-hidden="true"><img src="img/navidad/logo-base.webp" alt="">' + (tema === 'tema-oficial' && info(tema) && info(tema).files['imagenes/gorro-chef.webp'] ? '<img class="t27i-gorro" src="' + info(tema).files['imagenes/gorro-chef.webp'] + '" alt="">' : '') + '</div>' +
      '<p class="t27i-titulo"></p><button type="button" class="t27i-toque"><span class="t27i-toque-icono" aria-hidden="true"></span><span>' + c.toque + '</span><span class="t27i-toque-nota"><i class="fas fa-volume-up" aria-hidden="true"></i> Sube el volumen</span></button>' +
      '<button type="button" class="t27i-saltar">Saltar intro <i class="fas fa-forward" aria-hidden="true"></i></button>';
    d.body.appendChild(ov);
    lienzo = ov.querySelector('.t27i-lienzo'); g2 = lienzo.getContext('2d'); medir();
    w.addEventListener('resize', medir);
    escena.arma(ov.querySelector('.t27i-escena'));
    ov.querySelector('.t27i-titulo').textContent = escena.titulo();
    raf = requestAnimationFrame(bucle);
    ov.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.t27i-saltar')) return; empezar(tema); });
    ov.querySelector('.t27i-saltar').addEventListener('click', function (ev) { ev.stopPropagation(); saltar(); });
  }
  function empezar(tema) {
    if (est.iniciado || est.terminado) return;
    est.iniciado = true; audio(); desbloquearMusica();
    ov.classList.add('iniciado');
    try { history.scrollRestoration = 'manual'; } catch (e) { /* nada */ }
    w.scrollTo(0, 0);
    var tLogo = ESCENAS[conf(tema).intro].corre();
    programar(tLogo, function () { ov.classList.add('logo'); });
    programar(tLogo + 500, function () { ov.classList.add('titulo'); });
    programar(tLogo + 900, function () { if (prefMusica() !== 'off') tocarMusica(); });
    programar(tLogo + (tema === 'tema-oficial' ? 2700 : 2300), volar);
    programar(tLogo + (tema === 'tema-oficial' ? 2700 : 2300) + 1100, aterrizar);
  }
  function volar() {
    w.scrollTo(0, 0);
    var destino = d.querySelector('.zona-portada .logo'), logo = ov.querySelector('.t27i-logo');
    if (!destino || !logo) { aterrizar(); return; }
    html.classList.add('t27-midiendo');
    var dr = destino.getBoundingClientRect(), ar = logo.getBoundingClientRect();
    html.classList.remove('t27-midiendo');
    if (!dr.width || !ar.width) { aterrizar(); return; }
    var esc = dr.width / ar.width;
    logo.style.transformOrigin = '0 0';
    logo.style.transition = 'transform 1.1s cubic-bezier(.7,0,.2,1), opacity .35s 1s';
    logo.style.transform = 'translate(' + (dr.left - ar.left) + 'px,' + (dr.top - ar.top) + 'px) scale(' + esc + ')';
    ov.classList.add('volando');
    if (ctx) soplo(ctx.currentTime, .9, .035);
  }
  function revelar() {
    var lista = [], portada = d.querySelector('.zona-portada');
    if (portada) Array.prototype.forEach.call(portada.children, function (x) { lista.push(x); });
    Array.prototype.forEach.call(d.body.children, function (x) {
      if (x === portada || x.id === 't27-intro' || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(x.tagName) || x.hidden) return;
      if (/(^|\s)(overlay|overlay-modal|carrito-lateral|cake-review-modal|cake-review-lightbox|t27-urgente)(\s|$)/.test(x.className || '')) return;
      lista.push(x);
    });
    html.classList.remove('t27-intro-activa');
    var vh = w.innerHeight, orden = 0;
    lista.forEach(function (x) {
      var cs = w.getComputedStyle(x); if (cs.display === 'none') return;
      var r = x.getBoundingClientRect(), visible = cs.position === 'fixed' || r.top < vh * 1.05;
      if (!visible || !x.animate) return;
      try { x.animate([{ opacity: 0, translate: '0 26px' }, { opacity: 1, translate: '0 0' }], { duration: 800, delay: 120 + (orden++) * 130, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); } catch (e) { /* sin animación */ }
    });
  }
  function cerrar(rapido) {
    est.terminado = true;
    ov.classList.add('terminado'); if (rapido) ov.classList.add('rapido');
    setTimeout(function () { cancelAnimationFrame(raf); w.removeEventListener('resize', medir); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); ov = null; parts = []; }, rapido ? 600 : 1000);
  }
  function aterrizar() { if (est.terminado) return; revelar(); cerrar(false); setTimeout(function () { w.CakeIntro.terminar(); }, 650); }
  function saltar() {
    if (est.terminado) return;
    tiempos.forEach(clearTimeout); tiempos = [];
    if (!est.iniciado) { audio(); desbloquearMusica(); }
    w.scrollTo(0, 0); revelar(); cerrar(true);
    if (prefMusica() !== 'off') setTimeout(tocarMusica, 200);
    setTimeout(function () { w.CakeIntro.terminar(); }, 400);
  }

  /* =========================================================
     6. DECORACIÓN DE LA TIENDA
     ========================================================= */
  function ambiente(c) {
    if (reducir || $('t27-ambiente')) return;
    var capa = el('div'); capa.id = 't27-ambiente'; capa.setAttribute('aria-hidden', 'true');
    var factor = esCelular || w.CAKE_LIGERO ? .6 : 1;
    c.amb.forEach(function (grupo) {
      var n = Math.max(1, Math.round(grupo.n * factor));
      for (var i = 0; i < n; i++) {
        var p = el('i'), t = azar(grupo.t[0], grupo.t[1]), dur = grupo.d ? azar(grupo.d[0], grupo.d[1]) : azar(14, 24);
        p.style.cssText = '--g:var(--g-' + grupo.g + ');--c:' + elegir(grupo.c) + ';--t:' + t.toFixed(0) + 'px;--d:' + dur.toFixed(1) + 's;--r:-' + azar(0, dur).toFixed(1) + 's;--x:' + azar(-60, 60).toFixed(0) + 'px;--y:' + azar(10, 85).toFixed(0) + 'vh;--o:' + (grupo.o || .55) + ';' + (grupo.anim ? '--anim:' + grupo.anim + ';' : '') + 'left:' + azar(2, 96).toFixed(1) + '%;';
        capa.appendChild(p);
      }
    });
    d.body.appendChild(capa);
  }
  function escenaResenas(tema, c) {
    var vieja = d.querySelector('.opiniones-escena.escena-navidad');
    if (!vieja || d.querySelector('.escena-t27')) return;
    var e = el('div', 'opiniones-escena escena-t27'); e.setAttribute('aria-hidden', 'true');
    e.appendChild(el('span', 't27-escena-fondo'));
    var img = el('img', 't27-escena-img'); img.src = info(tema) && info(tema).files['imagenes/escena.webp'] || ''; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    e.appendChild(img);
    var p = el('span', 't27-escena-p');
    for (var i = 0; i < (esCelular ? 7 : 11); i++) {
      var x = el('i'), dur = azar(5, 9);
      x.style.cssText = '--g:var(--g-' + elegir(c.escena) + ');--c:' + elegir(c.escenaCol) + ';--t:' + azar(12, 24).toFixed(0) + 'px;--d:' + dur.toFixed(1) + 's;--r:-' + azar(0, dur).toFixed(1) + 's;left:' + azar(4, 92).toFixed(0) + '%;bottom:' + azar(5, 50).toFixed(0) + '%';
      p.appendChild(x);
    }
    e.appendChild(p);
    vieja.parentNode.insertBefore(e, vieja.nextSibling);
  }
  function textosTemporada(tema) {
    var i = info(tema); if (!i) return;
    var t = $('navidad-esp-titulo'), et = $('navidad-esp-etiqueta'), sub = $('navidad-esp-subtitulo');
    if (t) t.textContent = i.especialidades; if (et) et.textContent = i.etiqueta; if (sub) sub.textContent = i.subtitulo;
    var titCuenta = d.querySelector('.cf-cuenta-titulo'); if (titCuenta && i.cuenta) titCuenta.textContent = i.cuenta;
    var raspa = d.querySelector('.cf-raspa-titulo'); if (raspa && /navide|navidad/i.test(raspa.textContent)) raspa.textContent = i.raspa;
  }
  function botonEspecialidades(tema) {
    var b = $('nav-btn-navidad'), i = info(tema); if (!b || !i) return;
    b.textContent = i.emoji + ' ' + i.especialidades;
    b.setAttribute('aria-label', i.especialidades);
  }
  d.querySelectorAll('[data-anio-actual]').forEach(function (x) { x.textContent = String(new Date().getFullYear()); });

  // Especialidades de la temática: productos marcados como especialidad de su tienda.
  var ajustesEsp = null;
  function cargarAjustesEsp(tema) {
    var cfg = w.CAKE_SUPABASE_CONFIG || {};
    if (!cfg.url || !w.fetch) return Promise.resolve(null);
    return fetch(cfg.url + '/rest/v1/cake_theme_specialty_settings?theme=eq.' + encodeURIComponent(tema) + '&select=*', { headers: { apikey: cfg.anonKey, Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; }).then(function (f) { ajustesEsp = Array.isArray(f) && f[0] ? f[0] : null; return ajustesEsp; }).catch(function () { return null; });
  }
  var promesaAjustes = null;
  function alCatalogo(productos) {
    var tema = temaActual();
    if (!conf(tema)) return; // Navidad conserva su sección de especialidades navideñas
    var lista = (productos || []).filter(function (p) { return p && p.is_theme_special === true && p.is_active !== false; });
    var dest = d.querySelector('.destacados-section');
    if (dest && !(productos || []).some(function (p) { return p && p.is_featured; })) dest.hidden = true;
    (promesaAjustes || (promesaAjustes = cargarAjustesEsp(tema))).then(function (aj) {
      var i = info(tema);
      var ajustes = { is_enabled: aj ? aj.is_enabled !== false : true, eyebrow: aj && aj.eyebrow || i.etiqueta, title: aj && aj.title || i.especialidades, subtitle: aj && aj.subtitle || i.subtitulo, footer_note: aj && aj.footer_note || '' };
      if (typeof w.renderizarNavidadCake === 'function') w.renderizarNavidadCake(ajustes, lista);
      botonEspecialidades(tema);
    });
  }

  /* =========================================================
     7. BOTONES DE CATEGORÍAS CON ILUSTRACIÓN (las diez temáticas)
     ========================================================= */
  var ICONOS = {
    personalizar: '<path class="r1 t" d="M5 23.5h22l2.2-13.5-7.4 5.2L16 6.2l-5.8 9L2.8 10z"/><rect class="r2 t" x="4.5" y="23.5" width="23" height="4.5" rx="1.5"/><circle class="p" cx="16" cy="5" r="1.6"/><circle class="p" cx="2.8" cy="9.6" r="1.3"/><circle class="p" cx="29.2" cy="9.6" r="1.3"/>',
    todos: '<path class="r1 t" d="M16 3.5l3.7 7.9 8.6 1-6.4 5.9 1.8 8.5L16 22.5l-7.7 4.3 1.8-8.5-6.4-5.9 8.6-1z"/>',
    pasteles: '<rect class="r1 t" x="4" y="17" width="24" height="10" rx="2"/><path class="r2 t" d="M6.5 17v-3.2c0-1.2 1-2.2 2.2-2.2h14.6c1.2 0 2.2 1 2.2 2.2V17"/><path class="t" d="M4 21c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0 4-1.6 6 0"/><path class="t" d="M16 11.6V7.5"/><path class="p" d="M16 3.2c1 1.1 1.3 2 .9 2.7-.4.6-1.4.6-1.8 0-.4-.7-.1-1.6.9-2.7z"/><path class="t" d="M2.5 27.5h27"/>',
    postres: '<path class="r2 t" d="M8 17.5h16l-2.3 10.5H10.3z"/><path class="t" d="M12 18l.8 9.8M16 18v9.8M20 18l-.8 9.8"/><path class="r1 t" d="M6.5 17.5c-1.6-3.6 1.4-6.6 4.5-5.6.6-3.2 3.3-5 5-5s4.4 1.8 5 5c3.1-1 6.1 2 4.5 5.6z"/><circle class="p" cx="16" cy="5" r="2.2"/>',
    galletas: '<circle class="r1 t" cx="16" cy="16" r="12"/><circle class="p" cx="11.5" cy="12" r="1.8"/><circle class="p" cx="19" cy="10.5" r="1.4"/><circle class="p" cx="20.5" cy="18" r="1.9"/><circle class="p" cx="13" cy="20" r="1.5"/><circle class="p" cx="16.5" cy="15" r="1.1"/>',
    bocaditos: '<path class="r2 t" d="M2.5 9.5 9 13v6l-6.5 3.5 1.6-6.5z"/><path class="r2 t" d="M29.5 9.5 23 13v6l6.5 3.5-1.6-6.5z"/><rect class="r1 t" x="9" y="10" width="14" height="12" rx="5"/><path class="t" d="M13.5 13l5 6M18.5 13l-5 6"/>',
    especialidades: '<rect class="r1 t" x="4" y="13" width="24" height="5.5" rx="1"/><rect class="r1 t" x="6" y="18.5" width="20" height="10" rx="1"/><path class="r2 t" d="M14 13h4v15.5h-4z"/><path class="r2 t" d="M16 12.6c-2.6-5.4-8-6-8-2.8 0 2.6 4.6 3.1 8 2.8zm0 0c2.6-5.4 8-6 8-2.8 0 2.6-4.6 3.1-8 2.8z"/>'
  };
  function iconoCategoria(btn) {
    if (btn.querySelector('.cc-ico')) return;
    var onclick = btn.getAttribute('onclick') || '', cat = btn.dataset.categoria || btn.dataset.category || '', k = null;
    var texto = (btn.textContent || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var prueba = function (palabra) { return new RegExp("filtrar\\('" + palabra).test(onclick) || cat === palabra || new RegExp('^' + palabra + '$').test(texto); };
    if (btn.id === 'nav-btn-navidad') return;
    if (btn.classList.contains('btn-personalizar') || /personalizar/.test(texto)) k = 'personalizar';
    else if (prueba('todos')) k = 'todos';
    else if (prueba('pasteles')) k = 'pasteles';
    else if (prueba('postres')) k = 'postres';
    else if (prueba('galletas')) k = 'galletas';
    else if (prueba('bocaditos')) k = 'bocaditos';
    else if (/especialidad/.test(texto) || prueba('especiales')) k = 'especialidades';
    else if (/pastel/.test(texto)) k = 'pasteles';
    else if (/postre|cupcake/.test(texto)) k = 'postres';
    else if (/galleta/.test(texto)) k = 'galletas';
    else k = 'especialidades';
    if (!k) return;
    var s = el('span', 'cc-ico'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<svg viewBox="0 0 32 32" focusable="false">' + ICONOS[k] + '</svg>';
    btn.insertBefore(s, btn.firstChild); btn.classList.add('cc-con-ico');
  }
  function iconosCategorias() {
    d.querySelectorAll('nav .nav-btn').forEach(iconoCategoria);
    // Las categorías del panel se dibujan después: se vuelven a ilustrar cuando cambian.
    if (w.MutationObserver && !iconosCategorias.obs) {
      iconosCategorias.obs = true;
      d.querySelectorAll('nav').forEach(function (n) { new MutationObserver(function () { n.querySelectorAll('.nav-btn').forEach(iconoCategoria); }).observe(n, { childList: true, subtree: true }); });
    }
  }

  /* =========================================================
     8. «¿NECESITAS UN PEDIDO URGENTE?» — las diez temáticas
     ========================================================= */
  var urg = null;
  function hoyISO(dias) { var f = new Date(); f.setDate(f.getDate() + (dias || 0)); return f.getFullYear() + '-' + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('0' + f.getDate()).slice(-2); }
  function crearUrgente() {
    if ($('t27-urgente')) return;
    var nav = d.querySelector('body > .zona-portada nav') || d.querySelector('nav');
    var fila = el('div', 't27-urgente-fila cf-excluir-editor');
    var b = el('button', 't27-urgente-btn'); b.type = 'button'; b.id = 't27-urgente-abrir';
    b.innerHTML = '<i class="fas fa-stopwatch" aria-hidden="true"></i><span>¿Necesitas un pedido urgente?</span>';
    b.addEventListener('click', abrirUrgente);
    fila.appendChild(b);
    if (nav && nav.parentNode) nav.parentNode.insertBefore(fila, nav.nextSibling); else d.body.appendChild(fila);

    urg = el('div', 't27-urgente cf-excluir-editor'); urg.id = 't27-urgente'; urg.hidden = true;
    urg.innerHTML = '<section class="t27-urgente-caja" role="dialog" aria-modal="true" aria-labelledby="t27-urg-titulo">' +
      '<button type="button" class="t27-urgente-x" aria-label="Cerrar">×</button>' +
      '<h2 id="t27-urg-titulo">¿Necesitas un pedido urgente?</h2>' +
      '<p class="t27-urg-sub">Cuéntanos qué necesitas. Revisaremos si es posible prepararlo a tiempo y te responderemos por WhatsApp.</p>' +
      '<form novalidate>' +
      '<label for="t27-urg-nombre">Tu nombre *</label><input id="t27-urg-nombre" autocomplete="name" maxlength="80" required>' +
      '<label for="t27-urg-que">¿Qué necesitas? *</label><select id="t27-urg-que" required><option value="">Elige una opción</option><option>Pastel</option><option>Postres</option><option>Galletas</option><option>Bocaditos</option><option>Pastel personalizado</option><option>Otro</option></select>' +
      '<div class="t27-urg-fila"><div><label for="t27-urg-fecha">¿Para qué día? *</label><input id="t27-urg-fecha" type="date" required></div><div><label for="t27-urg-hora">¿A qué hora?</label><input id="t27-urg-hora" type="time"></div></div>' +
      '<div class="t27-urg-fila"><div><label for="t27-urg-cantidad">Cantidad o personas</label><input id="t27-urg-cantidad" maxlength="40" placeholder="Ej.: 20 personas"></div><div><label for="t27-urg-entrega">Entrega</label><select id="t27-urg-entrega"><option>Recoger en tienda</option><option>A domicilio</option></select></div></div>' +
      '<label for="t27-urg-detalle">Detalles del pedido *</label><textarea id="t27-urg-detalle" maxlength="600" required placeholder="Sabor, diseño, mensaje, presupuesto aproximado…"></textarea>' +
      '<p class="t27-urg-aviso"><i class="fas fa-info-circle" aria-hidden="true"></i> Un pedido urgente no queda confirmado hasta que Cake Chavez revise la disponibilidad y te responda.</p>' +
      '<p class="t27-urg-error" role="alert"></p>' +
      '<div class="t27-urg-acciones"><button type="button" class="t27-urg-cerrar">Cancelar</button><button type="submit" class="t27-urg-enviar"><i class="fab fa-whatsapp" aria-hidden="true"></i> Enviar por WhatsApp</button></div>' +
      '</form></section>';
    d.body.appendChild(urg);
    urg.addEventListener('click', function (ev) { if (ev.target === urg) cerrarUrgente(); });
    urg.querySelector('.t27-urgente-x').addEventListener('click', cerrarUrgente);
    urg.querySelector('.t27-urg-cerrar').addEventListener('click', cerrarUrgente);
    urg.querySelector('form').addEventListener('submit', enviarUrgente);
    d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && urg && !urg.hidden) cerrarUrgente(); });
  }
  function abrirUrgente() {
    if (!urg) return;
    try { if (typeof w.reproducirSonidoGotita === 'function') w.reproducirSonidoGotita(); } catch (e) { /* nada */ }
    var f = $('t27-urg-fecha'); f.min = hoyISO(0); if (!f.value) f.value = hoyISO(0);
    urg.querySelector('.t27-urg-error').textContent = '';
    urg.hidden = false; html.classList.add('cake-ventana-abierta');
    setTimeout(function () { $('t27-urg-nombre').focus(); }, 60);
  }
  function cerrarUrgente() { if (!urg) return; urg.hidden = true; html.classList.remove('cake-ventana-abierta'); var b = $('t27-urgente-abrir'); if (b) b.focus(); }
  function enviarUrgente(ev) {
    ev.preventDefault();
    var v = function (id) { return ($(id).value || '').trim(); };
    var nombre = v('t27-urg-nombre'), que = v('t27-urg-que'), fecha = v('t27-urg-fecha'), detalle = v('t27-urg-detalle'), err = urg.querySelector('.t27-urg-error');
    var faltan = [];
    if (!nombre) faltan.push('tu nombre'); if (!que) faltan.push('qué necesitas'); if (!fecha) faltan.push('el día'); if (detalle.length < 5) faltan.push('los detalles');
    if (faltan.length) { err.textContent = 'Completa: ' + faltan.join(', ') + '.'; return; }
    if (fecha < hoyISO(0)) { err.textContent = 'Elige una fecha de hoy en adelante.'; return; }
    err.textContent = '';
    var i = info(), partes = fecha.split('-');
    var texto = '⏱️ *SOLICITUD DE PEDIDO URGENTE*\n' +
      'Hola, Cake Chavez. Quisiera saber si es posible preparar este pedido:\n\n' +
      '👤 Nombre: ' + nombre + '\n🍰 Necesito: ' + que + '\n📅 Para: ' + partes[2] + '/' + partes[1] + '/' + partes[0] + (v('t27-urg-hora') ? ' a las ' + v('t27-urg-hora') : '') + '\n' +
      (v('t27-urg-cantidad') ? '👥 Cantidad: ' + v('t27-urg-cantidad') + '\n' : '') + '🚗 Entrega: ' + v('t27-urg-entrega') + '\n📝 Detalles: ' + detalle + '\n' +
      '🎨 Tienda: ' + (i ? i.nombre : 'Cake Chavez') + '\n\nQuedo pendiente de su confirmación.';
    var numero = typeof w.NUMERO_WHATSAPP !== 'undefined' ? w.NUMERO_WHATSAPP : '50231253629';
    try { numero = NUMERO_WHATSAPP; } catch (e) { /* se usa el número oficial */ }
    var url = 'https://api.whatsapp.com/send?phone=' + numero + '&text=' + encodeURIComponent(texto);
    if (typeof w.cakeAbrirWhatsApp === 'function') w.cakeAbrirWhatsApp(url); else w.open(url, '_blank', 'noopener,noreferrer');
    cerrarUrgente();
  }

  /* =========================================================
     9. ENLACES: producto de otra temática / ya no disponible / enlace universal
     ========================================================= */
  function avisoEnlace(titulo, mensaje, conBotones) {
    var a = el('div', 't27-urgente cf-excluir-editor'); a.id = 't27-aviso-enlace';
    a.innerHTML = '<section class="t27-urgente-caja t27-aviso-caja" role="dialog" aria-modal="true" aria-labelledby="t27-aviso-titulo"><button type="button" class="t27-urgente-x" aria-label="Cerrar">×</button>' +
      '<div class="t27-aviso-icono" aria-hidden="true"></div><h2 id="t27-aviso-titulo"></h2><p class="t27-urg-sub"></p>' +
      '<div class="t27-urg-acciones"><button type="button" class="t27-urg-enviar" data-a="personalizar"><i class="fas fa-birthday-cake" aria-hidden="true"></i> Personalizar mi pastel</button><button type="button" class="t27-urg-cerrar" data-a="tienda"><i class="fas fa-store" aria-hidden="true"></i> Ver productos de la tienda</button></div></section>';
    a.querySelector('h2').textContent = titulo; a.querySelector('.t27-urg-sub').textContent = mensaje;
    if (!conBotones) a.querySelector('[data-a="personalizar"]').remove();
    d.body.appendChild(a); html.classList.add('cake-ventana-abierta');
    function cerrar() { a.remove(); html.classList.remove('cake-ventana-abierta'); }
    a.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-a]') : null;
      if (ev.target === a || (ev.target.closest && ev.target.closest('.t27-urgente-x'))) { cerrar(); return; }
      if (!b) return;
      cerrar();
      if (b.dataset.a === 'personalizar' && typeof w.abrirModalPersonalizar === 'function') w.abrirModalPersonalizar();
      if (b.dataset.a === 'tienda') { try { w.filtrar('todos'); } catch (e) { /* nada */ } var c = $('productos-container'); if (c) { if (typeof w.desplazarseHastaElementoConMenu === 'function') w.desplazarseHastaElementoConMenu(c); else c.scrollIntoView({ behavior: 'smooth' }); } }
    });
    setTimeout(function () { var b = a.querySelector('button[data-a]'); if (b) b.focus(); }, 60);
  }
  function catalogoListo() {
    return new Promise(function (ok) {
      var t0 = Date.now();
      (function mirar() { if (w.CAKE_PRODUCTOS_REMOTOS || Date.now() - t0 > 7000) ok(); else setTimeout(mirar, 150); })();
    });
  }
  function slug(s) { return typeof w.crearSlugProducto === 'function' ? w.crearSlugProducto(s) : String(s || '').toLowerCase(); }
  w.CakeEnlaces2027 = {
    atender: function () {
      var q = null; try { q = new URLSearchParams(w.location.search); } catch (e) { return; }
      var id = q.get('producto'), personalizar = q.get('personalizar');
      if (!id && personalizar == null) return;
      w.CakeIntro.listo(function () {
        if (personalizar != null && !id) { setTimeout(function () { if (typeof w.abrirModalPersonalizar === 'function') w.abrirModalPersonalizar(); }, 250); return; }
        catalogoListo().then(function () {
          var tarjeta = typeof w.buscarTarjetaPorIdentificador === 'function' ? w.buscarTarjetaPorIdentificador(id) : null;
          if (tarjeta) { w.manejarEnlaceDirectoProducto(); return; }
          var todos = w.CAKE_PRODUCTOS_TODAS_TEMATICAS || [], s = slug(id);
          var otro = todos.filter(function (p) { return String(p.id) === id || slug(p.slug || p.name) === s; })[0];
          if (otro) avisoEnlace('¡Este producto no está disponible en la temática actual!', '¡Este producto no está disponible en la temática actual! Pero puedes descubrir nuestros otros productos o personalizar tu propio pastel.', true);
          else avisoEnlace('Este producto ya no está disponible', 'El producto de este enlace ya no está publicado en Cake Chavez. Puedes descubrir nuestros otros productos o personalizar tu propio pastel.', true);
        });
      });
    }
  };

  /* =========================================================
     10. ARRANQUE
     ========================================================= */
  function arrancar() {
    iconosCategorias();
    crearUrgente();
    var tema = temaActual(), c = conf(tema);
    botonEspecialidades(tema);
    if (!c) {
      // Una temática nueva por ZIP puede no tener una animación programada: nunca dejar la tienda oculta.
      if (tema !== 'navidad') {
        html.classList.remove('t27-intro-activa');
        textosTemporada(tema);
        prepararMusica(tema).then(crearBotonMusica);
        w.CakeIntro.terminar();
      }
      return; // Navidad conserva su introducción y decoración originales.
    }
    textosTemporada(tema);
    ambiente(c);
    escenaResenas(tema, c);
    prepararMusica(tema).then(crearBotonMusica);
    var conIntro = !reducir && !/admin\.html/i.test(w.location.pathname);
    if (conIntro) { html.classList.add('t27-intro-activa'); crearIntro(tema); }
    else { html.classList.remove('t27-intro-activa'); w.CakeIntro.terminar();
      var primer = function () { d.removeEventListener('pointerdown', primer, true); if (prefMusica() !== 'off') tocarMusica(); };
      d.addEventListener('pointerdown', primer, true); }
  }
  w.CakeTemas2027 = {
    alCatalogo: alCatalogo,
    conf: conf,
    // Usado por cake-funciones.js: evento de la cuenta regresiva de la temática (null = sin cuenta).
    eventoCuenta: function () { var c = conf(); if (!c) return undefined; return c.cuenta ? c.cuenta() : null; },
    mensajesCuenta: function () { var c = conf(); return c ? c.mensajes : null; },
    abrirUrgente: function () { abrirUrgente(); }
  };
  function cuandoTema() { if (w.CakeTema) w.CakeTema.cuandoListo(arrancar); else arrancar(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', cuandoTema); else cuandoTema();
})();
