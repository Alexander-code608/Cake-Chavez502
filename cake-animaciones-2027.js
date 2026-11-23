/* =========================================================
   CAKE-ANIMACIONES-2027.JS — Diez animaciones propias para el QR de cada temática 2027.
   - Navidad conserva sus diez animaciones originales (cake-animaciones.js).
   - Cada temática nueva muestra solo sus diez animaciones en la ventana del QR.
   - Todas quedan registradas, así un QR creado en cualquier temática se abre
     siempre con su animación aunque después cambie la temática de la tienda.
   - Usa las figuras de temas/glifos-2027.js. Un solo lienzo, pocas partículas.
   ========================================================= */
(function () {
  'use strict';
  var w = window, base = w.CakeAnimaciones;
  if (!base) return;

  var PAL = {
    'anio-nuevo': { c: ['#f2e2bf', '#d8b26a', '#e2b0b4', '#fff6e3', '#b98a4a'], f: ['#1b100b', '#3a2418'] },
    'carino-amistad': { c: ['#f6a9bb', '#e97f9c', '#fbd3dc', '#ffffff', '#d9a86a'], f: ['#5a2234', '#a8566f'] },
    'semana-santa': { c: ['#c9b8e2', '#f6e7b8', '#bcd3a4', '#ffffff', '#f4c7d1'], f: ['#4f5a3c', '#8a9d70'] },
    'dia-madre': { c: ['#f3c6cf', '#e39cae', '#fbe7e3', '#ffffff', '#d8b27a'], f: ['#5b3141', '#9a6276'] },
    'dia-padre': { c: ['#d8b471', '#f3e7cc', '#8fb5b0', '#ffffff', '#c49a52'], f: ['#0d2326', '#2c5d62'] },
    'dia-nino': { c: ['#f9d980', '#f6b7a3', '#9fd3c4', '#a9cdf2', '#ffffff', '#c7b6ec'], f: ['#4f86c4', '#a9d1f5'] },
    'halloween': { c: ['#eaa46f', '#f6dccb', '#d9a25f', '#c58aa0', '#ffffff'], f: ['#140a0e', '#4a2836'] },
    'tema-oficial': { c: ['#f7c6ce', '#e8a9b4', '#22C55E', '#ffffff', '#c9a27a'], f: ['#000000', '#2a1d20'] },
    'tematica-adicional': { c: ['#ffffff', '#dbe9e4', '#b9cde0', '#a9c2b4', '#e8eef2'], f: ['#3f5e55', '#8fb3a3'] }
  };
  function A(tema, id, nombre, emoji, motor, figura) { return { id: id, nombre: nombre, emoji: emoji, motor: motor, figura: figura, tema: tema, fondo: PAL[tema].f }; }
  var L = {
    'anio-nuevo': [
      A('anio-nuevo', 'an-fuegos', 'Fuegos dorados', '🎆', 'fuegos', 'destello'), A('anio-nuevo', 'an-estrellas', 'Lluvia de estrellas', '⭐', 'caer', 'estrella'),
      A('anio-nuevo', 'an-destellos', 'Destellos de champagne', '✨', 'titilar', 'destello'), A('anio-nuevo', 'an-copas', 'Brindis de copas', '🥂', 'subir', 'copa'),
      A('anio-nuevo', 'an-confeti', 'Confeti dorado', '🎊', 'lluvia', 'circulo'), A('anio-nuevo', 'an-burbujas', 'Burbujas de champagne', '🫧', 'burbujas', 'circulo'),
      A('anio-nuevo', 'an-reloj', 'Medianoche', '🕛', 'pulso', 'reloj'), A('anio-nuevo', 'an-globos', 'Globos dorados', '🎈', 'subir', 'globo'),
      A('anio-nuevo', 'an-espiral', 'Estrellas en espiral', '🌟', 'espiral', 'estrella'), A('anio-nuevo', 'an-fuente', 'Fuente de luces', '🎇', 'fuente', 'destello')],
    'carino-amistad': [
      A('carino-amistad', 'ca-corazones', 'Lluvia de corazones', '💗', 'caer', 'corazon'), A('carino-amistad', 'ca-globos', 'Corazones al cielo', '💞', 'subir', 'corazon'),
      A('carino-amistad', 'ca-petalos', 'Pétalos de rosa', '🌹', 'caer', 'petalo'), A('carino-amistad', 'ca-latido', 'Latido de amor', '💓', 'pulso', 'corazon'),
      A('carino-amistad', 'ca-flores', 'Flores de amistad', '🌸', 'espiral', 'flor'), A('carino-amistad', 'ca-confeti', 'Confeti rosa', '🎊', 'lluvia', 'corazon'),
      A('carino-amistad', 'ca-destellos', 'Brillitos de cariño', '✨', 'titilar', 'destello'), A('carino-amistad', 'ca-regalos', 'Regalitos', '🎁', 'subir', 'regalo'),
      A('carino-amistad', 'ca-mariposas', 'Mariposas enamoradas', '🦋', 'revolotear', 'mariposa'), A('carino-amistad', 'ca-fuente', 'Fuente de corazones', '💝', 'fuente', 'corazon')],
    'semana-santa': [
      A('semana-santa', 'ss-flores', 'Flores de primavera', '🌼', 'caer', 'flor'), A('semana-santa', 'ss-huevos', 'Huevitos de colores', '🥚', 'fuente', 'huevo'),
      A('semana-santa', 'ss-mariposas', 'Mariposas', '🦋', 'revolotear', 'mariposa'), A('semana-santa', 'ss-hojas', 'Hojas de olivo', '🌿', 'caer', 'hoja'),
      A('semana-santa', 'ss-conejitos', 'Conejitos', '🐰', 'subir', 'conejo'), A('semana-santa', 'ss-luz', 'Luz del amanecer', '🌅', 'pulso', 'destello'),
      A('semana-santa', 'ss-petalos', 'Pétalos lavanda', '💜', 'caer', 'petalo'), A('semana-santa', 'ss-corona', 'Corona de flores', '💐', 'espiral', 'flor'),
      A('semana-santa', 'ss-destellos', 'Destellos dorados', '✨', 'titilar', 'destello'), A('semana-santa', 'ss-burbujas', 'Burbujas de primavera', '🫧', 'burbujas', 'circulo')],
    'dia-madre': [
      A('dia-madre', 'dm-rosas', 'Lluvia de rosas', '🌹', 'caer', 'rosa'), A('dia-madre', 'dm-petalos', 'Pétalos suaves', '🌸', 'caer', 'petalo'),
      A('dia-madre', 'dm-corazones', 'Corazones para mamá', '💗', 'subir', 'corazon'), A('dia-madre', 'dm-latido', 'Te quiero, mamá', '💓', 'pulso', 'corazon'),
      A('dia-madre', 'dm-ramo', 'Ramo de flores', '💐', 'espiral', 'flor'), A('dia-madre', 'dm-mariposas', 'Mariposas', '🦋', 'revolotear', 'mariposa'),
      A('dia-madre', 'dm-regalos', 'Regalos para mamá', '🎁', 'subir', 'regalo'), A('dia-madre', 'dm-destellos', 'Destellos dorados', '✨', 'titilar', 'destello'),
      A('dia-madre', 'dm-fuente', 'Fuente de pétalos', '🌷', 'fuente', 'petalo'), A('dia-madre', 'dm-perlas', 'Perlas', '🫧', 'burbujas', 'circulo')],
    'dia-padre': [
      A('dia-padre', 'dp-corbatas', 'Lluvia de corbatas', '🎀', 'caer', 'corbata'), A('dia-padre', 'dp-reloj', 'Tic tac', '⌚', 'pulso', 'reloj'),
      A('dia-padre', 'dp-estrellas', 'Papá estrella', '⭐', 'caer', 'estrella'), A('dia-padre', 'dp-regalos', 'Regalos para papá', '🎁', 'subir', 'regalo'),
      A('dia-padre', 'dp-hojas', 'Hojas de eucalipto', '🌿', 'caer', 'hoja'), A('dia-padre', 'dp-destellos', 'Destellos dorados', '✨', 'titilar', 'destello'),
      A('dia-padre', 'dp-fuegos', 'Celebración', '🎆', 'fuegos', 'destello'), A('dia-padre', 'dp-espiral', 'Corbatas en giro', '👔', 'espiral', 'corbata'),
      A('dia-padre', 'dp-confeti', 'Confeti elegante', '🎊', 'lluvia', 'circulo'), A('dia-padre', 'dp-fuente', 'Fuente de estrellas', '🌟', 'fuente', 'estrella')],
    'dia-nino': [
      A('dia-nino', 'dn-globos', 'Globos al cielo', '🎈', 'subir', 'globo'), A('dia-nino', 'dn-estrellas', 'Lluvia de estrellas', '⭐', 'caer', 'estrella'),
      A('dia-nino', 'dn-ositos', 'Ositos saltarines', '🧸', 'fuente', 'osito'), A('dia-nino', 'dn-molinetes', 'Molinetes', '🌀', 'espiral', 'molinete'),
      A('dia-nino', 'dn-confeti', 'Confeti de colores', '🎉', 'lluvia', 'circulo'), A('dia-nino', 'dn-burbujas', 'Burbujas de jabón', '🫧', 'burbujas', 'circulo'),
      A('dia-nino', 'dn-fuegos', 'Fiesta de colores', '🎆', 'fuegos', 'estrella'), A('dia-nino', 'dn-mariposas', 'Mariposas', '🦋', 'revolotear', 'mariposa'),
      A('dia-nino', 'dn-chispitas', 'Chispitas', '✨', 'titilar', 'destello'), A('dia-nino', 'dn-regalos', 'Regalitos', '🎁', 'subir', 'regalo')],
    'halloween': [
      A('halloween', 'hw-murcielagos', 'Murciélagos', '🦇', 'revolotear', 'murcielago'), A('halloween', 'hw-fantasmas', 'Fantasmitas', '👻', 'subir', 'fantasma'),
      A('halloween', 'hw-calabazas', 'Calabazas', '🎃', 'caer', 'calabaza'), A('halloween', 'hw-hojas', 'Hojas de otoño', '🍂', 'caer', 'hoja'),
      A('halloween', 'hw-luces', 'Luces mágicas', '🕯️', 'titilar', 'circulo'), A('halloween', 'hw-calabaza', 'Calabaza encantada', '🎃', 'pulso', 'calabaza'),
      A('halloween', 'hw-hechizo', 'Hechizo dulce', '🌟', 'espiral', 'estrella'), A('halloween', 'hw-chispas', 'Chispas de bruja', '🎆', 'fuegos', 'destello'),
      A('halloween', 'hw-pocima', 'Pócima de burbujas', '🧪', 'burbujas', 'circulo'), A('halloween', 'hw-dulces', 'Fuente de dulces', '🍬', 'fuente', 'calabaza')],
    'tema-oficial': [
      A('tema-oficial', 'of-lazos', 'Lazos rosas', '🎀', 'caer', 'lazo'), A('tema-oficial', 'of-destellos', 'Destellos', '✨', 'titilar', 'destello'),
      A('tema-oficial', 'of-pasteles', 'Pastelitos', '🎂', 'subir', 'pastel'), A('tema-oficial', 'of-corazones', 'Corazones', '💗', 'caer', 'corazon'),
      A('tema-oficial', 'of-confeti', 'Confeti verde y rosa', '🎊', 'lluvia', 'circulo'), A('tema-oficial', 'of-liston', 'Listón en giro', '🎀', 'espiral', 'lazo'),
      A('tema-oficial', 'of-latido', 'Con amor, Cake Chavez', '💓', 'pulso', 'corazon'), A('tema-oficial', 'of-burbujas', 'Burbujas', '🫧', 'burbujas', 'circulo'),
      A('tema-oficial', 'of-fuegos', 'Celebración', '🎆', 'fuegos', 'destello'), A('tema-oficial', 'of-fuente', 'Fuente de estrellas', '🌟', 'fuente', 'estrella')],
    'tematica-adicional': [
      A('tematica-adicional', 'ja-mariposas', 'Mariposas del jardín', '🦋', 'revolotear', 'mariposa'), A('tematica-adicional', 'ja-petalos', 'Pétalos de magnolia', '🤍', 'caer', 'petalo'),
      A('tematica-adicional', 'ja-flores', 'Flores del jardín', '🌼', 'espiral', 'flor'), A('tematica-adicional', 'ja-hojas', 'Hojas al viento', '🍃', 'caer', 'hoja'),
      A('tematica-adicional', 'ja-rocio', 'Rocío brillante', '✨', 'titilar', 'destello'), A('tematica-adicional', 'ja-niebla', 'Burbujas de niebla', '🫧', 'burbujas', 'circulo'),
      A('tematica-adicional', 'ja-magnolia', 'Magnolia', '🌸', 'pulso', 'flor'), A('tematica-adicional', 'ja-fuente', 'Fuente de mariposas', '🦋', 'fuente', 'mariposa'),
      A('tematica-adicional', 'ja-confeti', 'Confeti plateado', '🎊', 'lluvia', 'circulo'), A('tematica-adicional', 'ja-estrellas', 'Estrellas del jardín', '⭐', 'caer', 'estrella')]
  };
  var porId = {};
  Object.keys(L).forEach(function (t) { L[t].forEach(function (a) { porId[a.id] = a; }); });

  function azar(a, b) { return a + Math.random() * (b - a); }
  function elegir(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  var cache = {};
  function ruta(n) {
    if (cache[n]) return cache[n];
    var G = w.CAKE_GLIFOS, d = G ? G.ruta(n) : 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z';
    try { cache[n] = new Path2D(d); } catch (e) { cache[n] = null; }
    return cache[n];
  }
  function figura(c, n, x, y, s, rot, color, alfa, escX) {
    var p = ruta(n);
    c.save(); c.globalAlpha = alfa; c.translate(x, y); if (rot) c.rotate(rot); c.scale((s / 24) * (escX || 1), s / 24); c.translate(-12, -12);
    c.fillStyle = color;
    if (p) c.fill(p, w.CAKE_GLIFOS && w.CAKE_GLIFOS.par(n) ? 'evenodd' : 'nonzero');
    else { c.beginPath(); c.arc(12, 12, 8, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function brillo(c, x, y, r, color, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  // Motores parametrizados: cada uno usa la figura y la paleta de la animación.
  var M = {
    caer: { n: 34, crear: function (W, H, ini, info, col) { return { x: azar(0, W), y: ini ? azar(-H, H) : -30, s: azar(12, 28), v: azar(35, 80), f: azar(0, 6), r: azar(0, 6), vr: azar(-1.4, 1.4), c: elegir(col), a: azar(.7, 1) }; },
      mover: function (p, dt, W, H) { p.y += p.v * dt; p.f += dt * 1.3; p.x += Math.sin(p.f) * 22 * dt; p.r += p.vr * dt; return p.y < H + 30; },
      dibujar: function (c, p, info) { figura(c, info.figura, p.x, p.y, p.s, p.r, p.c, p.a); } },
    subir: { n: 18, crear: function (W, H, ini, info, col) { return { x: azar(20, W - 20), y: ini ? azar(H * .2, H * 1.2) : H + 40, s: azar(22, 40), v: azar(30, 60), f: azar(0, 6), c: elegir(col), a: azar(.85, 1) }; },
      mover: function (p, dt) { p.y -= p.v * dt; p.f += dt; p.x += Math.sin(p.f) * 14 * dt; return p.y > -60; },
      dibujar: function (c, p, info) { figura(c, info.figura, p.x, p.y, p.s, Math.sin(p.f) * .12, p.c, p.a); } },
    revolotear: { n: 12, crear: function (W, H, ini, info, col) { return { x: ini ? azar(-W * .2, W) : -40, y: azar(H * .1, H * .9), s: azar(22, 38), v: azar(45, 90), f: azar(0, 6), fa: azar(8, 13), c: elegir(col), a: azar(.85, 1) }; },
      mover: function (p, dt, W) { p.x += p.v * dt; p.f += dt; p.y += Math.sin(p.f * 1.6) * 30 * dt; return p.x < W + 50; },
      dibujar: function (c, p, info) { figura(c, info.figura, p.x, p.y, p.s, Math.sin(p.f) * .2, p.c, p.a, .35 + Math.abs(Math.sin(p.f * p.fa)) * .65); } },
    titilar: { n: 44, crear: function (W, H, ini, info, col) { return { x: azar(0, W), y: azar(0, H), s: azar(8, 22), f: azar(0, 6), vf: azar(1.2, 2.6), c: elegir(col) }; },
      mover: function (p, dt) { p.f += dt * p.vf; return true; },
      dibujar: function (c, p, info) { var a = Math.max(0, Math.sin(p.f)); if (a < .02) return; brillo(c, p.x, p.y, p.s * 1.4, 'rgba(255,240,210,.5)', a * .5); figura(c, info.figura, p.x, p.y, p.s * (.5 + a * .5), p.f * .3, p.c, a); } },
    lluvia: { n: 70, crear: function (W, H, ini, info, col) { return { x: azar(0, W), y: ini ? azar(-H, 0) : -12, w: azar(5, 10), h: azar(8, 14), v: azar(60, 130), rot: azar(0, 6), vr: azar(-5, 5), f: azar(0, 6), c: elegir(col), fig: Math.random() < .25 }; },
      mover: function (p, dt, W, H) { p.y += p.v * dt; p.rot += p.vr * dt; p.f += dt * 3; p.x += Math.sin(p.f) * 30 * dt; return p.y < H + 20; },
      dibujar: function (c, p, info) {
        if (p.fig && info.figura !== 'circulo') { figura(c, info.figura, p.x, p.y, 14, p.rot, p.c, .95); return; }
        c.save(); c.globalAlpha = .95; c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.abs(Math.cos(p.f))); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); } },
    burbujas: { n: 28, crear: function (W, H, ini, info, col) { return { x: azar(0, W), y: ini ? azar(0, H) : H + 30, r: azar(6, 26), v: azar(25, 60), f: azar(0, 6), c: elegir(col) }; },
      mover: function (p, dt) { p.y -= p.v * dt; p.f += dt; p.x += Math.sin(p.f) * 15 * dt; return p.y > -40; },
      dibujar: function (c, p) {
        c.globalAlpha = .85;
        var g = c.createRadialGradient(p.x - p.r * .35, p.y - p.r * .35, p.r * .1, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, p.c);
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.stroke(); } },
    espiral: { n: 30, crear: function (W, H, ini, info, col, i) { return { ang: azar(0, 6.28), rad: ini ? azar(0, Math.max(W, H) * .6) : 4, vr: azar(28, 55), va: azar(.5, 1.1) * (i % 2 ? 1 : -1), s: azar(12, 24), c: elegir(col) }; },
      mover: function (p, dt, W, H) { p.rad += p.vr * dt; p.ang += p.va * dt; return p.rad < Math.max(W, H) * .75; },
      dibujar: function (c, p, info, W, H) { var x = W / 2 + Math.cos(p.ang) * p.rad, y = H / 2 + Math.sin(p.ang) * p.rad; figura(c, info.figura, x, y, p.s, p.ang, p.c, Math.min(1, p.rad / 40)); } },
    fuente: { n: 34, crear: function (W, H, ini, info, col) { return { x: W / 2 + azar(-10, 10), y: H + 20, vx: azar(-110, 110), vy: -azar(H * .75, H * 1.15), s: azar(12, 26), r: azar(0, 6), vr: azar(-3, 3), c: elegir(col), t: ini ? azar(0, 2.6) : 0 }; },
      mover: function (p, dt, W, H) { if (p.t > 0) { p.t -= dt; return true; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += H * .55 * dt; p.r += p.vr * dt; return p.y < H + 40; },
      dibujar: function (c, p, info) { if (p.t > 0) return; figura(c, info.figura, p.x, p.y, p.s, p.r, p.c, .95); } }
  };
  function motorPulso(c, W, H, info, col, ligero) {
    var t = 0, ondas = [], peq = [];
    for (var i = 0; i < (ligero ? 10 : 18); i++) peq.push({ x: azar(0, W), y: azar(0, H), s: azar(8, 16), f: azar(0, 6), c: elegir(col) });
    return function (dt) {
      t += dt;
      var lat = 1 + Math.max(0, Math.sin(t * 4.2)) * .12 * (Math.sin(t * 2.1) > 0 ? 1 : .4);
      if (Math.floor(t / .95) !== Math.floor((t - dt) / .95)) ondas.push({ r: 10, a: .7 });
      var cx = W / 2, cy = H / 2, tam = Math.min(W, H) * .34;
      ondas = ondas.filter(function (o) { o.r += 90 * dt; o.a -= .35 * dt; if (o.a <= 0) return false; c.globalAlpha = o.a; c.strokeStyle = col[0]; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, o.r, 0, Math.PI * 2); c.stroke(); return true; });
      peq.forEach(function (p) { p.f += dt * 1.5; var a = Math.max(0, Math.sin(p.f)); figura(c, info.figura, p.x, p.y, p.s, 0, p.c, a * .7); });
      brillo(c, cx, cy, tam * 1.1, 'rgba(255,235,200,.35)', 1);
      figura(c, info.figura, cx, cy, tam * lat, 0, col[1] || col[0], 1);
    };
  }
  function motorFuegos(c, W, H, info, col, ligero) {
    var chispas = [], cohetes = [], espera = 0;
    return function (dt) {
      espera -= dt;
      if (espera <= 0) { cohetes.push({ x: azar(W * .15, W * .85), y: H + 5, vy: -azar(H * .9, H * 1.2), meta: azar(H * .15, H * .45), color: elegir(col) }); espera = azar(.5, 1.1); }
      cohetes = cohetes.filter(function (r) {
        r.y += r.vy * dt;
        c.globalAlpha = 1; c.fillStyle = r.color; c.beginPath(); c.arc(r.x, r.y, 2.2, 0, Math.PI * 2); c.fill();
        if (r.y <= r.meta) {
          var n = ligero ? 26 : 44;
          for (var i = 0; i < n; i++) { var ang = (i / n) * Math.PI * 2, vel = azar(60, 170); chispas.push({ x: r.x, y: r.y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, vida: azar(.9, 1.6), t: 0, color: r.color, fig: i % 6 === 0 }); }
          return false;
        }
        return true;
      });
      chispas = chispas.filter(function (s) {
        s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 70 * dt; s.vx *= .985;
        var resto = 1 - s.t / s.vida; if (resto <= 0) return false;
        if (s.fig) figura(c, info.figura, s.x, s.y, 9, s.t * 4, s.color, resto);
        else { c.globalAlpha = resto; c.fillStyle = s.color; c.beginPath(); c.arc(s.x, s.y, 2, 0, Math.PI * 2); c.fill(); }
        return true;
      });
    };
  }

  function iniciar2027(canvas, info, opciones) {
    opciones = opciones || {};
    var c = canvas.getContext('2d'), ligero = !!w.CAKE_LIGERO;
    var dpr = Math.min(ligero ? 1 : 2, w.devicePixelRatio || 1);
    var W = 0, H = 0, activo = true, ultimo = 0, raf = 0, col = PAL[info.tema].c;
    function medir() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(50, rect.width); H = Math.max(50, rect.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    medir();
    var paso;
    if (info.motor === 'fuegos') paso = motorFuegos(c, W, H, info, col, ligero);
    else if (info.motor === 'pulso') paso = motorPulso(c, W, H, info, col, ligero);
    else {
      var m = M[info.motor] || M.caer;
      var cantidad = Math.round(m.n * (ligero ? .5 : 1) * (W < 400 ? .75 : 1));
      var parts = [];
      for (var i = 0; i < cantidad; i++) parts.push(m.crear(W, H, true, info, col, i));
      paso = function (dt) {
        for (var j = 0; j < parts.length; j++) {
          if (!m.mover(parts[j], dt, W, H)) parts[j] = m.crear(W, H, false, info, col, j);
          m.dibujar(c, parts[j], info, W, H);
        }
      };
    }
    function cuadro(ts) {
      if (!activo) return;
      var dt = ultimo ? Math.min(.05, (ts - ultimo) / 1000) : .016; ultimo = ts;
      if (opciones.fondo !== false) {
        var g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, info.fondo[0]); g.addColorStop(1, info.fondo[1]);
        c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, W, H);
      } else c.clearRect(0, 0, W, H);
      paso(dt);
      c.globalAlpha = 1;
      raf = w.requestAnimationFrame(cuadro);
    }
    function visibilidad() { if (document.hidden) { w.cancelAnimationFrame(raf); ultimo = 0; } else if (activo) raf = w.requestAnimationFrame(cuadro); }
    document.addEventListener('visibilitychange', visibilidad);
    var alCambiar = function () { medir(); };
    w.addEventListener('resize', alCambiar);
    raf = w.requestAnimationFrame(cuadro);
    return function detener() { activo = false; w.cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibilidad); w.removeEventListener('resize', alCambiar); };
  }

  var listaNavidad = base.lista, buscarBase = base.buscar, iniciarBase = base.iniciar;
  function temaActual() { return w.CakeTema && w.CakeTema.actual ? w.CakeTema.actual : 'navidad'; }
  var api = {
    get lista() { return L[temaActual()] || listaNavidad; },
    listaDe: function (tema) { return L[tema] || listaNavidad; },
    todas: function () { var r = listaNavidad.slice(); Object.keys(L).forEach(function (t) { r = r.concat(L[t]); }); return r; },
    buscar: function (id) { return porId[id] || buscarBase(id); },
    iniciar: function (canvas, id, opciones) { return porId[id] ? iniciar2027(canvas, porId[id], opciones) : iniciarBase(canvas, id, opciones); }
  };
  w.CakeAnimaciones = api;
})();
