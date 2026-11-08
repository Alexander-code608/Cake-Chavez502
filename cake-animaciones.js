/* =========================================================
   CAKE-ANIMACIONES.JS — 10 animaciones para el mensaje secreto con QR.
   Ligeras: un solo canvas, pocas partículas y se pausan si la pantalla
   no está visible. En celulares sencillos (modo ligero) usan aún menos.
   ========================================================= */
(function () {
  'use strict';
  var w = window;

  var LISTA = [
    { id: 'nieve',      nombre: 'Nieve mágica',         emoji: '❄️', fondo: ['#0f1d3a', '#3b2a5c'] },
    { id: 'corazones',  nombre: 'Lluvia de corazones',  emoji: '💖', fondo: ['#3a0f22', '#7a2346'] },
    { id: 'fuegos',     nombre: 'Fuegos artificiales',  emoji: '🎆', fondo: ['#070b1f', '#1f1440'] },
    { id: 'confeti',    nombre: 'Confeti de fiesta',    emoji: '🎉', fondo: ['#2b1236', '#5a1f4a'] },
    { id: 'estrellas',  nombre: 'Estrellas fugaces',    emoji: '🌠', fondo: ['#050816', '#1b2550'] },
    { id: 'burbujas',   nombre: 'Burbujas brillantes',  emoji: '🫧', fondo: ['#0d2b3a', '#2a4d6e'] },
    { id: 'petalos',    nombre: 'Pétalos de rosa',      emoji: '🌸', fondo: ['#3a1424', '#6b2a43'] },
    { id: 'globos',     nombre: 'Globos al cielo',      emoji: '🎈', fondo: ['#1f1530', '#4a2a5e'] },
    { id: 'regalo',     nombre: 'Regalo sorpresa',      emoji: '🎁', fondo: ['#2a0f12', '#5c1a24'] },
    { id: 'dorado',     nombre: 'Luces doradas',        emoji: '✨', fondo: ['#1a1206', '#3d2a0c'] }
  ];

  function buscar(id) {
    for (var i = 0; i < LISTA.length; i++) if (LISTA[i].id === id) return LISTA[i];
    return LISTA[0];
  }
  function azar(a, b) { return a + Math.random() * (b - a); }
  function elegir(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function corazon(c, x, y, s, color, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s / 16, s / 16);
    c.beginPath();
    c.moveTo(0, 5);
    c.bezierCurveTo(-8, -2, -8, -10, 0, -6);
    c.bezierCurveTo(8, -10, 8, -2, 0, 5);
    c.fillStyle = color; c.fill(); c.restore();
  }
  function estrella(c, x, y, r, color) {
    c.save(); c.translate(x, y); c.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 === 0 ? r : r * 0.45;
      c.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    c.closePath(); c.fillStyle = color; c.fill(); c.restore();
  }
  function brillo(c, x, y, r, color) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  // Cada animación: crear(W,H,cantidad) -> partícula ; mover(p, dt, W, H) ; dibujar(c, p)
  var MOTORES = {
    nieve: {
      n: 70,
      crear: function (W, H, inicio) { return { x: azar(0, W), y: inicio ? azar(-H, H) : -10, r: azar(1.2, 4), v: azar(18, 55), f: azar(0, 6), a: azar(.5, 1) }; },
      mover: function (p, dt, W, H) { p.y += p.v * dt; p.f += dt; p.x += Math.sin(p.f) * 12 * dt; return p.y < H + 10; },
      dibujar: function (c, p) { c.globalAlpha = p.a; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
    },
    corazones: {
      n: 34,
      crear: function (W, H, inicio) { return { x: azar(0, W), y: inicio ? azar(0, H) : H + 20, s: azar(10, 26), v: azar(30, 70), f: azar(0, 6), c: elegir(['#ff6fa5', '#ff9cc4', '#ff3d7f', '#ffd1e3']), r: azar(-.4, .4) }; },
      mover: function (p, dt) { p.y -= p.v * dt; p.f += dt * 1.5; p.x += Math.sin(p.f) * 20 * dt; return p.y > -30; },
      dibujar: function (c, p) { c.globalAlpha = .9; corazon(c, p.x, p.y, p.s, p.c, p.r + Math.sin(p.f) * .2); }
    },
    confeti: {
      n: 80,
      crear: function (W, H, inicio) { return { x: azar(0, W), y: inicio ? azar(-H, 0) : -12, w: azar(5, 10), h: azar(8, 14), v: azar(60, 130), rot: azar(0, 6), vr: azar(-5, 5), f: azar(0, 6), c: elegir(['#ff6fa5', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffffff']) }; },
      mover: function (p, dt, W, H) { p.y += p.v * dt; p.rot += p.vr * dt; p.f += dt * 3; p.x += Math.sin(p.f) * 30 * dt; return p.y < H + 20; },
      dibujar: function (c, p) { c.save(); c.globalAlpha = .95; c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.abs(Math.cos(p.f))); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); }
    },
    estrellas: {
      n: 60,
      fondo: true,
      crear: function (W, H, inicio, i) {
        if (i < 45) return { tipo: 'fija', x: azar(0, W), y: azar(0, H), r: azar(.6, 1.8), f: azar(0, 6) };
        return { tipo: 'fugaz', x: azar(W * .2, W * 1.2), y: azar(-H * .3, H * .4), v: azar(380, 620), largo: azar(70, 150), espera: azar(0, 5) };
      },
      mover: function (p, dt, W, H) {
        if (p.tipo === 'fija') { p.f += dt * 2; return true; }
        if (p.espera > 0) { p.espera -= dt; return true; }
        p.x -= p.v * dt; p.y += p.v * .45 * dt;
        if (p.x < -200 || p.y > H + 100) { p.x = azar(W * .3, W * 1.3); p.y = azar(-H * .3, H * .3); p.espera = azar(1, 5); }
        return true;
      },
      dibujar: function (c, p) {
        if (p.tipo === 'fija') { c.globalAlpha = .4 + Math.abs(Math.sin(p.f)) * .6; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); return; }
        if (p.espera > 0) return;
        var g = c.createLinearGradient(p.x, p.y, p.x + p.largo, p.y - p.largo * .45);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 1; c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.largo, p.y - p.largo * .45); c.stroke();
        brillo(c, p.x, p.y, 6, 'rgba(255,255,255,.9)');
      }
    },
    burbujas: {
      n: 30,
      crear: function (W, H, inicio) { return { x: azar(0, W), y: inicio ? azar(0, H) : H + 30, r: azar(8, 30), v: azar(25, 60), f: azar(0, 6) }; },
      mover: function (p, dt) { p.y -= p.v * dt; p.f += dt; p.x += Math.sin(p.f) * 15 * dt; return p.y > -40; },
      dibujar: function (c, p) {
        c.globalAlpha = .85;
        var g = c.createRadialGradient(p.x - p.r * .35, p.y - p.r * .35, p.r * .1, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.6, 'rgba(173,232,255,.18)'); g.addColorStop(1, 'rgba(255,170,220,.45)');
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.stroke();
      }
    },
    petalos: {
      n: 40,
      crear: function (W, H, inicio) { return { x: azar(-50, W), y: inicio ? azar(-H, H) : -20, s: azar(7, 13), v: azar(35, 70), vx: azar(10, 35), rot: azar(0, 6), vr: azar(-2, 2), f: azar(0, 6), c: elegir(['#ff8fb7', '#ffb3cd', '#ff6f9f', '#ffd0df']) }; },
      mover: function (p, dt, W, H) { p.y += p.v * dt; p.x += (p.vx + Math.sin(p.f) * 25) * dt; p.f += dt * 1.4; p.rot += p.vr * dt; return p.y < H + 20 && p.x < W + 40; },
      dibujar: function (c, p) { c.save(); c.globalAlpha = .9; c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, .55 + Math.abs(Math.sin(p.f)) * .45); c.fillStyle = p.c; c.beginPath(); c.ellipse ? c.ellipse(0, 0, p.s, p.s * .6, 0, 0, Math.PI * 2) : c.arc(0, 0, p.s * .7, 0, Math.PI * 2); c.fill(); c.restore(); }
    },
    globos: {
      n: 16,
      crear: function (W, H, inicio) { return { x: azar(20, W - 20), y: inicio ? azar(H * .3, H * 1.2) : H + 60, r: azar(18, 30), v: azar(35, 65), f: azar(0, 6), c: elegir(['#ff6fa5', '#ffd166', '#f4f1ff', '#e9c46a', '#ff9cc4', '#9b5de5']) }; },
      mover: function (p, dt) { p.y -= p.v * dt; p.f += dt; p.x += Math.sin(p.f) * 14 * dt; return p.y > -90; },
      dibujar: function (c, p) {
        c.globalAlpha = .95;
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y + p.r * 1.2);
        c.quadraticCurveTo(p.x + Math.sin(p.f * 2) * 8, p.y + p.r * 2, p.x, p.y + p.r * 3); c.stroke();
        c.fillStyle = p.c; c.beginPath(); c.ellipse ? c.ellipse(p.x, p.y, p.r * .85, p.r * 1.05, 0, 0, Math.PI * 2) : c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(p.x - p.r * .3, p.y - p.r * .4, p.r * .2, 0, Math.PI * 2); c.fill();
      }
    },
    dorado: {
      n: 40,
      crear: function (W, H) { return { x: azar(0, W), y: azar(0, H), r: azar(8, 34), vx: azar(-8, 8), vy: azar(-12, -3), f: azar(0, 6), c: elegir(['rgba(255,214,120,.55)', 'rgba(255,190,90,.45)', 'rgba(255,240,200,.5)', 'rgba(255,150,190,.35)']) }; },
      mover: function (p, dt, W, H) { p.x += p.vx * dt; p.y += p.vy * dt; p.f += dt; if (p.y < -40) { p.y = H + 30; p.x = azar(0, W); } return true; },
      dibujar: function (c, p) { c.globalAlpha = .5 + Math.abs(Math.sin(p.f)) * .5; brillo(c, p.x, p.y, p.r, p.c); }
    }
  };

  // Fuegos artificiales y regalo tienen motores propios.
  function motorFuegos(c, W, H, ligero) {
    var chispas = [], cohetes = [], espera = 0;
    var colores = ['#ff6fa5', '#ffd166', '#4cc9f0', '#06d6a0', '#ffffff', '#f72585'];
    return function (dt) {
      espera -= dt;
      if (espera <= 0) { cohetes.push({ x: azar(W * .15, W * .85), y: H + 5, vy: -azar(H * .9, H * 1.2), meta: azar(H * .15, H * .45), color: elegir(colores) }); espera = azar(.5, 1.1); }
      cohetes = cohetes.filter(function (r) {
        r.y += r.vy * dt;
        c.globalAlpha = 1; c.fillStyle = r.color; c.beginPath(); c.arc(r.x, r.y, 2.2, 0, Math.PI * 2); c.fill();
        if (r.y <= r.meta) {
          var cantidad = ligero ? 28 : 48;
          for (var i = 0; i < cantidad; i++) { var ang = (i / cantidad) * Math.PI * 2, vel = azar(60, 170); chispas.push({ x: r.x, y: r.y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, vida: azar(.9, 1.6), t: 0, color: r.color }); }
          return false;
        }
        return true;
      });
      chispas = chispas.filter(function (s) {
        s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 70 * dt; s.vx *= .985;
        var resto = 1 - s.t / s.vida; if (resto <= 0) return false;
        c.globalAlpha = resto; c.fillStyle = s.color; c.beginPath(); c.arc(s.x, s.y, 2, 0, Math.PI * 2); c.fill();
        return true;
      });
    };
  }
  function motorRegalo(c, W, H, ligero) {
    var t = 0, chispas = [], abierto = false;
    var colores = ['#ffd166', '#ff6fa5', '#ffffff', '#e9c46a'];
    return function (dt) {
      t += dt;
      var cx = W / 2, base = H * .62, lado = Math.min(W, H) * .26;
      var abrir = Math.min(1, Math.max(0, (t - 1.2) / .6));
      if (abrir >= 1 && !abierto) {
        abierto = true;
        for (var i = 0; i < (ligero ? 50 : 90); i++) chispas.push({ x: cx, y: base - lado, vx: azar(-160, 160), vy: azar(-320, -120), t: 0, vida: azar(1.2, 2.4), color: elegir(colores), r: azar(1.5, 3.5) });
      }
      if (abierto && Math.random() < .25) chispas.push({ x: cx + azar(-lado * .3, lado * .3), y: base - lado, vx: azar(-60, 60), vy: azar(-220, -90), t: 0, vida: azar(1, 2), color: elegir(colores), r: azar(1, 2.5) });
      var bote = abrir < 1 ? Math.sin(t * 9) * 3 * (1 - abrir) : 0;
      // caja
      c.globalAlpha = 1;
      c.fillStyle = '#c2185b'; c.fillRect(cx - lado / 2, base - lado + bote, lado, lado);
      c.fillStyle = '#ffd166'; c.fillRect(cx - lado * .08, base - lado + bote, lado * .16, lado);
      // tapa
      c.save(); c.translate(cx - lado * .6, base - lado + bote); c.rotate(-abrir * 1.1);
      c.fillStyle = '#e91e63'; c.fillRect(0, -lado * .2, lado * 1.2, lado * .2);
      c.fillStyle = '#ffd166'; c.fillRect(lado * .52, -lado * .2, lado * .16, lado * .2);
      c.beginPath(); c.ellipse ? c.ellipse(lado * .45, -lado * .28, lado * .14, lado * .08, -.5, 0, Math.PI * 2) : c.arc(lado * .45, -lado * .28, lado * .1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse ? c.ellipse(lado * .75, -lado * .28, lado * .14, lado * .08, .5, 0, Math.PI * 2) : c.arc(lado * .75, -lado * .28, lado * .1, 0, Math.PI * 2); c.fill();
      c.restore();
      if (abierto) brillo(c, cx, base - lado, lado * .9, 'rgba(255,220,140,.35)');
      chispas = chispas.filter(function (s) {
        s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt;
        var resto = 1 - s.t / s.vida; if (resto <= 0) return false;
        c.globalAlpha = resto; estrella(c, s.x, s.y, s.r * 2, s.color); return true;
      });
    };
  }

  /**
   * Inicia una animación en un canvas. Devuelve una función para detenerla.
   * opciones: { fondo: true } pinta el degradado de fondo de la animación.
   */
  function iniciar(canvas, id, opciones) {
    opciones = opciones || {};
    var info = buscar(id);
    var c = canvas.getContext('2d');
    var ligero = !!w.CAKE_LIGERO;
    var dpr = Math.min(ligero ? 1 : 2, w.devicePixelRatio || 1);
    var W = 0, H = 0, activo = true, ultimo = 0, raf = 0;
    function medir() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(50, rect.width); H = Math.max(50, rect.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    medir();
    var paso;
    if (id === 'fuegos') paso = motorFuegos(c, W, H, ligero);
    else if (id === 'regalo') paso = motorRegalo(c, W, H, ligero);
    else {
      var m = MOTORES[info.id] || MOTORES.nieve;
      var cantidad = Math.round(m.n * (ligero ? .5 : 1) * (W < 400 ? .75 : 1));
      var parts = [];
      for (var i = 0; i < cantidad; i++) parts.push(m.crear(W, H, true, i));
      paso = function (dt) {
        for (var j = 0; j < parts.length; j++) {
          if (!m.mover(parts[j], dt, W, H)) parts[j] = m.crear(W, H, false, j);
          m.dibujar(c, parts[j]);
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
    function visibilidad() {
      if (document.hidden) { w.cancelAnimationFrame(raf); ultimo = 0; }
      else if (activo) raf = w.requestAnimationFrame(cuadro);
    }
    document.addEventListener('visibilitychange', visibilidad);
    var alCambiar = function () { medir(); };
    w.addEventListener('resize', alCambiar);
    raf = w.requestAnimationFrame(cuadro);
    return function detener() {
      activo = false; w.cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibilidad);
      w.removeEventListener('resize', alCambiar);
    };
  }

  w.CakeAnimaciones = { lista: LISTA, buscar: buscar, iniciar: iniciar };
})();
