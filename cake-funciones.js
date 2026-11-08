/* =========================================================
   CAKE-FUNCIONES.JS — funciones nuevas 2026 de la tienda pública.
   1  Barra de aviso de cupos navideños          (administrable)
   4  Preguntas frecuentes                        (administrable)
   5  Guía visual de porciones                    (administrable)
   6  Extras y complementos en el carrito         (administrable)
   7  Galería «Clientes felices»                  (fotos aprobadas en el panel)
   13 Ticket digital del pedido
   15 Raspa y gana navideño                       (premios administrables)
   16 Calculadora «¿Cuánto pastel necesito?»
   18 Mensaje secreto con QR para regalos         (10 animaciones)
   19 Cuenta regresiva para Nochebuena y Año Nuevo (administrable)
   + Categorías editables y datos obligatorios del pedido.
   Si todavía no se ejecutó el SQL nuevo, cada función se oculta sola
   y la tienda sigue funcionando como antes.
   ========================================================= */
(function () {
  'use strict';
  var w = window;
  var $ = function (id) { return document.getElementById(id); };
  var CF = {
    ajustes: null,
    categorias: null,
    extras: [],
    premios: [],
    fotos: [],
    faqs: [],
    regalo: null
  };
  w.CakeFunciones = CF;

  /* ---------------- utilidades ---------------- */
  function cliente() { try { return w.getCakeSupabaseClient ? w.getCakeSupabaseClient() : null; } catch (e) { return null; } }
  function el(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined && texto !== null) e.textContent = String(texto); return e; }
  function q(v) { return 'Q' + (Number(v) || 0).toFixed(2); }
  function qCorto(v) { var n = Number(v) || 0; return 'Q' + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)); }
  function sonido() { try { if (typeof w.reproducirSonidoGotita === 'function') w.reproducirSonidoGotita(); } catch (e) { /* nada */ } }
  function leerJSON(clave, defecto) { try { var v = JSON.parse(localStorage.getItem(clave) || 'null'); return v === null ? defecto : v; } catch (e) { return defecto; } }
  function guardarJSON(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* nada */ } }
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function fechaBonita(iso, conDia) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || '');
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return (conDia ? DIAS[d.getDay()] + ' ' : '') + Number(m[3]) + ' de ' + MESES[Number(m[2]) - 1] + (conDia ? ' de ' + m[1] : '');
  }
  function horaBonita(hhmm) {
    var m = String(hhmm || '').match(/^(\d{2}):(\d{2})$/);
    if (!m) return String(hhmm || '');
    var h = Number(m[1]), sufijo = h >= 12 ? 'p. m.' : 'a. m.';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + m[2] + ' ' + sufijo;
  }
  CF.fechaBonita = fechaBonita;
  CF.horaBonita = horaBonita;
  // Convierte "14:30", "2:30 pm", "2.30pm" o "1430" en "14:30".
  CF.normalizarHora = function (valor) {
    var v = String(valor || '').trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, ':');
    var m = v.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a:m:|p:m:|a|p)?$/);
    if (!m) return '';
    var h = Number(m[1]), min = Number(m[2] || 0), suf = m[3] || '';
    if (/^p/.test(suf) && h < 12) h += 12;
    if (/^a/.test(suf) && h === 12) h = 0;
    if (h > 23 || min > 59) return '';
    return ('0' + h).slice(-2) + ':' + ('0' + min).slice(-2);
  };
  // Número para WhatsApp: 8 dígitos de Guatemala -> 502XXXXXXXX
  CF.telefonoWhatsApp = function (tel) {
    var d = String(tel || '').replace(/\D/g, '');
    if (d.length === 8) d = '502' + d;
    return d;
  };
  function ahoraGuatemala() { return new Date(); }
  function fechaEvento(texto) {
    // "2026-12-24T00:00" se interpreta en hora de Guatemala (UTC-6).
    var t = String(texto || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T00:00';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) t += ':00-06:00';
    var d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  /* =========================================================
     CARGA DE DATOS (todo en paralelo; si falta una tabla, se ignora)
     ========================================================= */
  function consulta(promesa) {
    return Promise.resolve(promesa).then(function (r) { return r && !r.error ? r.data : null; }, function () { return null; });
  }

  CF.cargarCategorias = function (client) {
    client = client || cliente();
    if (!client) return Promise.resolve(null);
    return consulta(client.from('cake_categories').select('*').eq('is_active', true).order('display_order', { ascending: true }))
      .then(function (data) {
        if (Array.isArray(data) && data.length) {
          CF.categorias = data;
          w.CAKE_CATEGORIAS = data;
          construirMenuCategorias(data);
        }
        return data;
      });
  };

  function construirMenuCategorias(cats) {
    var nav = document.querySelector('.zona-portada nav');
    if (!nav) return;
    var todos = null;
    Array.prototype.forEach.call(nav.querySelectorAll('.nav-btn'), function (b) {
      var oc = b.getAttribute('onclick') || '';
      var m = oc.match(/filtrar\('([^']+)'/);
      if (!m) return;
      if (m[1] === 'todos') { todos = b; return; }
      b.remove();
    });
    if (!todos) return;
    var ancla = todos;
    cats.forEach(function (c) {
      if (c.slug === 'especiales') return;
      var b = el('button', 'nav-btn', c.name);
      b.type = 'button';
      b.dataset.cakeEditorCategory = c.slug;
      b.dataset.cfCategoria = c.slug;
      b.setAttribute('onclick', "filtrar('" + c.slug + "', this)");
      ancla.parentNode.insertBefore(b, ancla.nextSibling);
      ancla = b;
    });
    var esp = cats.filter(function (c) { return c.slug === 'especiales'; })[0];
    var botonEsp = Array.prototype.filter.call(nav.querySelectorAll('.nav-btn'), function (b) { return /cake-especialidades/.test(b.getAttribute('onclick') || ''); })[0];
    if (botonEsp && esp && esp.name) botonEsp.textContent = esp.name;
  }

  CF.categoriasValidas = function () {
    var base = ['pasteles', 'postres', 'galletas', 'bocaditos', 'especiales'];
    if (!CF.categorias) return base;
    var lista = CF.categorias.map(function (c) { return c.slug; });
    if (lista.indexOf('especiales') < 0) lista.push('especiales');
    return lista;
  };
  CF.esCategoriaPastel = function (slug) {
    if (!CF.categorias) return slug === 'pasteles';
    var c = CF.categorias.filter(function (x) { return x.slug === slug; })[0];
    return c ? !!c.is_cake : slug === 'pasteles';
  };

  CF.cargarTodo = function (client) {
    client = client || cliente();
    if (!client) { prepararCarritoSinConexion(); return Promise.resolve(); }
    return Promise.all([
      consulta(client.from('cake_features_settings').select('*').eq('id', 1).maybeSingle()),
      consulta(client.from('cake_faqs').select('*').eq('is_active', true).order('display_order', { ascending: true })),
      consulta(client.from('cake_extras').select('*').eq('is_active', true).order('display_order', { ascending: true })),
      consulta(client.from('cake_prizes').select('*').eq('is_active', true).order('display_order', { ascending: true })),
      consulta(client.from('cake_customer_photos').select('id,customer_name,message,image_url,created_at').eq('status', 'aprobada').order('display_order', { ascending: true }).order('created_at', { ascending: false }).limit(36))
    ]).then(function (r) {
      CF.ajustes = r[0];
      CF.faqs = r[1] || [];
      CF.extras = r[2] || [];
      CF.premios = r[3] || [];
      CF.fotos = r[4] || [];
      var a = CF.ajustes || {};
      if (CF.ajustes) {
        pintarBarraCupos(client);
        pintarCuentaRegresiva();
      }
      pintarFAQ();
      prepararGuiaPorciones();
      prepararCalculadoraFiesta();
      if (CF.ajustes && a.extras_enabled !== false) pintarExtrasCarrito();
      prepararRaspaYGana();
      pintarGaleriaClientes();
      mostrarAccesoUltimoTicket();
    });
  };

  function prepararCarritoSinConexion() {
    prepararGuiaPorciones();
    prepararCalculadoraFiesta();
    mostrarAccesoUltimoTicket();
  }

  /* =========================================================
     1. BARRA DE AVISO DE CUPOS NAVIDEÑOS
     ========================================================= */
  function pintarBarraCupos(client) {
    var a = CF.ajustes, barra = $('cf-barra-cupos');
    if (!barra || !a || a.banner_enabled === false) return;
    try { if (sessionStorage.getItem('cf-barra-cerrada') === String(a.updated_at || '1')) return; } catch (e) { /* nada */ }
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (a.banner_deadline) {
      var lim = fechaEvento(a.banner_deadline);
      if (lim && lim.getTime() + 86400000 < Date.now()) return; // la fecha límite ya pasó
    }
    var texto = String(a.banner_text || '').replace(/\{fecha\}/g, a.banner_deadline ? fechaBonita(a.banner_deadline) : 'la fecha límite');
    var t = barra.querySelector('.cf-barra-texto');
    t.textContent = texto;
    var cupos = barra.querySelector('.cf-barra-cupos-lista');
    cupos.replaceChildren();
    barra.hidden = false;
    barra.querySelector('.cf-barra-cerrar').onclick = function () {
      barra.hidden = true;
      try { sessionStorage.setItem('cf-barra-cerrada', String(a.updated_at || '1')); } catch (e) { /* nada */ }
    };
    var fechas = Array.isArray(a.banner_dates) ? a.banner_dates.filter(function (f) { return /^\d{4}-\d{2}-\d{2}$/.test(f); }).slice(0, 4) : [];
    if (a.banner_show_spots === false || !fechas.length || !client) return;
    Promise.all(fechas.map(function (f) {
      return client.rpc('cake_check_order_date', { p_date: f }).then(function (r) { return { f: f, d: r.error ? null : (Array.isArray(r.data) ? r.data[0] : r.data) }; }, function () { return { f: f, d: null }; });
    })).then(function (res) {
      res.forEach(function (x) {
        if (!x.d || x.d.remaining === undefined) return;
        var fd = fechaEvento(x.f); if (fd && fd.getTime() + 86400000 < Date.now()) return;
        var quedan = Math.max(0, Number(x.d.remaining) || 0);
        var chip = el('span', 'cf-cupo-chip' + (quedan === 0 ? ' agotado' : quedan <= 2 ? ' pocos' : ''));
        chip.textContent = fechaBonita(x.f).replace(' de ', ' ').replace('diciembre', 'dic') + ': ' + (quedan === 0 ? '¡Agotado!' : 'quedan ' + quedan + (quedan === 1 ? ' cupo' : ' cupos'));
        cupos.appendChild(chip);
      });
    });
  }

  /* =========================================================
     19. CUENTA REGRESIVA NOCHEBUENA / AÑO NUEVO
     ========================================================= */
  var relojTimer = null, mensajeTimer = null;
  function pintarCuentaRegresiva() {
    var a = CF.ajustes, sec = $('cf-cuenta-regresiva');
    if (!sec || !a || a.countdown_enabled === false) return;
    var eventos = (Array.isArray(a.countdown_events) ? a.countdown_events : []).map(function (e) { return { label: String(e.label || 'Celebración'), fecha: fechaEvento(e.date) }; })
      .filter(function (e) { return e.fecha; }).sort(function (x, y) { return x.fecha - y.fecha; });
    if (!eventos.length) return;
    var mensajes = (Array.isArray(a.countdown_messages) ? a.countdown_messages : []).map(String).filter(Boolean);
    var titulo = sec.querySelector('.cf-cuenta-titulo');
    var nums = { d: sec.querySelector('[data-cf-d]'), h: sec.querySelector('[data-cf-h]'), m: sec.querySelector('[data-cf-m]'), s: sec.querySelector('[data-cf-s]') };
    var msj = sec.querySelector('.cf-cuenta-mensaje');
    function tic() {
      var ahora = Date.now();
      var prox = eventos.filter(function (e) { return e.fecha.getTime() > ahora; })[0];
      if (!prox) { sec.hidden = true; clearInterval(relojTimer); return; }
      sec.hidden = false;
      var dif = Math.floor((prox.fecha.getTime() - ahora) / 1000);
      titulo.textContent = 'Faltan para ' + prox.label;
      nums.d.textContent = String(Math.floor(dif / 86400));
      nums.h.textContent = ('0' + Math.floor(dif % 86400 / 3600)).slice(-2);
      nums.m.textContent = ('0' + Math.floor(dif % 3600 / 60)).slice(-2);
      nums.s.textContent = ('0' + dif % 60).slice(-2);
    }
    tic();
    clearInterval(relojTimer);
    relojTimer = setInterval(tic, 1000);
    if (mensajes.length && msj) {
      var i = 0;
      msj.textContent = mensajes[0];
      clearInterval(mensajeTimer);
      if (mensajes.length > 1) mensajeTimer = setInterval(function () {
        i = (i + 1) % mensajes.length;
        msj.classList.add('cf-cambiando');
        setTimeout(function () { msj.textContent = mensajes[i]; msj.classList.remove('cf-cambiando'); }, 350);
      }, 6000);
    }
  }

  /* =========================================================
     4. PREGUNTAS FRECUENTES (si hay preguntas en el panel, reemplazan a las fijas)
     ========================================================= */
  function pintarFAQ() {
    var lista = document.querySelector('#preguntas-frecuentes .preguntas-lista');
    if (!lista || !CF.faqs.length) return;
    lista.replaceChildren();
    CF.faqs.forEach(function (f) {
      var d = el('details', 'pregunta-item');
      d.appendChild(el('summary', '', f.question));
      d.appendChild(el('p', '', f.answer));
      lista.appendChild(d);
    });
    // Solo una abierta a la vez (más ordenado en celular).
    lista.addEventListener('toggle', function (ev) {
      if (!ev.target.open) return;
      Array.prototype.forEach.call(lista.querySelectorAll('details[open]'), function (o) { if (o !== ev.target) o.open = false; });
    }, true);
  }

  /* =========================================================
     5. GUÍA VISUAL DE PORCIONES
     ========================================================= */
  var GUIA_DEFECTO = [
    { label: 'Molde de 6"', slices: '8 a 10 rebanadas', note: 'Ideal para reuniones pequeñas', tiers: 1 },
    { label: 'Molde de 8"', slices: '14 a 16 rebanadas', note: 'Perfecto para la familia', tiers: 1 },
    { label: 'Molde de 10"', slices: '22 a 25 rebanadas', note: 'Para fiestas medianas', tiers: 1 },
    { label: '2 pisos (6" + 8")', slices: '30 a 35 rebanadas', note: 'Para celebraciones grandes', tiers: 2 }
  ];
  function svgPastel(rebanadas, pisos, escala) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('aria-hidden', 'true');
    var r = 26 + escala * 24;
    var cx = 60, cy = 60;
    function nodo(tag, attrs) { var n = document.createElementNS(ns, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; }
    nodo('circle', { cx: cx, cy: cy + 3, r: r + 2, fill: 'rgba(0,0,0,.25)' });
    nodo('circle', { cx: cx, cy: cy, r: r, fill: '#f8d7e4', stroke: '#ff7fb3', 'stroke-width': 2 });
    nodo('circle', { cx: cx, cy: cy, r: r - 5, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '3 4' });
    var n = Math.max(4, Math.min(40, rebanadas || 8));
    for (var i = 0; i < n; i++) {
      var ang = i * 2 * Math.PI / n;
      nodo('line', { x1: cx, y1: cy, x2: cx + Math.cos(ang) * r, y2: cy + Math.sin(ang) * r, stroke: '#a83b65', 'stroke-width': n > 24 ? .8 : 1.2 });
    }
    if (pisos > 1) {
      nodo('circle', { cx: cx, cy: cy, r: r * .55, fill: '#ffe9f1', stroke: '#ff7fb3', 'stroke-width': 2 });
      var n2 = Math.max(4, Math.round(n * .35));
      for (var j = 0; j < n2; j++) {
        var a2 = j * 2 * Math.PI / n2;
        nodo('line', { x1: cx, y1: cy, x2: cx + Math.cos(a2) * r * .55, y2: cy + Math.sin(a2) * r * .55, stroke: '#a83b65', 'stroke-width': 1 });
      }
    }
    nodo('circle', { cx: cx, cy: cy, r: 4, fill: '#e63946' });
    return svg;
  }
  function primerNumero(texto) { var m = String(texto || '').match(/\d+/g); if (!m) return 0; return m.length > 1 ? Math.round((Number(m[0]) + Number(m[1])) / 2) : Number(m[0]); }
  function prepararGuiaPorciones() {
    var cont = $('cf-guia-lista');
    if (!cont) return;
    var guia = CF.ajustes && Array.isArray(CF.ajustes.portion_guide) && CF.ajustes.portion_guide.length ? CF.ajustes.portion_guide : GUIA_DEFECTO;
    cont.replaceChildren();
    var max = Math.max.apply(null, guia.map(function (g) { return primerNumero(g.slices); }).concat([1]));
    guia.forEach(function (g, i) {
      var card = el('article', 'cf-guia-card');
      card.style.setProperty('--i', String(i));
      var reb = primerNumero(g.slices);
      card.appendChild(svgPastel(reb, Number(g.tiers) || 1, Math.min(1, reb / max)));
      card.appendChild(el('strong', 'cf-guia-molde', g.label));
      card.appendChild(el('span', 'cf-guia-rebanadas', g.slices));
      if (g.note) card.appendChild(el('small', '', g.note));
      cont.appendChild(card);
    });
  }
  CF.abrirGuia = function () {
    sonido();
    var m = $('cf-modal-guia'); if (!m) return;
    abrirModal(m);
  };

  /* ---------- ventanitas genéricas ---------- */
  var modalesAbiertos = [];
  function abrirModal(m) {
    m.hidden = false;
    m.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cake-ventana-abierta');
    requestAnimationFrame(function () { m.classList.add('cf-visible'); });
    if (modalesAbiertos.indexOf(m) < 0) modalesAbiertos.push(m);
  }
  function cerrarModal(m) {
    if (!m || m.hidden) return;
    m.classList.remove('cf-visible');
    m.setAttribute('aria-hidden', 'true');
    modalesAbiertos = modalesAbiertos.filter(function (x) { return x !== m; });
    setTimeout(function () {
      m.hidden = true;
      if (!modalesAbiertos.length && typeof w.cakeRevisarVentanas === 'function') w.cakeRevisarVentanas();
      else if (!modalesAbiertos.length) document.documentElement.classList.remove('cake-ventana-abierta');
    }, 220);
  }
  CF.abrirModal = abrirModal;
  CF.cerrarModal = cerrarModal;
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var cerrar = t.closest ? t.closest('[data-cf-cerrar]') : null;
    if (cerrar) { cerrarModal(cerrar.closest('.cf-modal')); return; }
    if (t.classList && t.classList.contains('cf-modal') && !t.hasAttribute('data-cf-fijo')) cerrarModal(t);
    var guia = t.closest ? t.closest('[data-cf-guia]') : null;
    if (guia) { ev.preventDefault(); CF.abrirGuia(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && modalesAbiertos.length) {
      var m = modalesAbiertos[modalesAbiertos.length - 1];
      if (!m.hasAttribute('data-cf-fijo')) cerrarModal(m);
    }
  });

  /* =========================================================
     16. CALCULADORA «¿CUÁNTO PASTEL NECESITO?»
     ========================================================= */
  function productosConRebanadas() {
    var lista = [];
    var remotos = Array.isArray(w.CAKE_PRODUCTOS_REMOTOS) ? w.CAKE_PRODUCTOS_REMOTOS : [];
    var navidad = Array.isArray(w.CAKE_NAVIDAD_ITEMS) ? w.CAKE_NAVIDAD_ITEMS : [];
    remotos.filter(function (p) { return p.is_active !== false && !p.deleted_at; }).concat(navidad).forEach(function (p) {
      var tam = [['Pequeño', p.price_small, p.slices_small], ['Mediano', p.price_medium, p.slices_medium], ['Grande', p.price_large, p.slices_large]]
        .map(function (t) { return { nombre: t[0], precio: Number(t[1]) || 0, rebanadas: Number(t[2]) || 0 }; })
        .filter(function (t) { return t.precio > 0 && t.rebanadas > 0; });
      if (tam.length) lista.push({ p: p, tamanos: tam });
    });
    return lista;
  }
  function prepararCalculadoraFiesta() {
    var form = $('cf-calc-form');
    if (!form || form.dataset.listo) return;
    form.dataset.listo = '1';
    var otros = 'no';
    Array.prototype.forEach.call(form.querySelectorAll('[data-cf-postres]'), function (b) {
      b.addEventListener('click', function () {
        otros = b.dataset.cfPostres;
        Array.prototype.forEach.call(form.querySelectorAll('[data-cf-postres]'), function (x) { x.classList.toggle('activo', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });
    Array.prototype.forEach.call(form.querySelectorAll('[data-cf-mas]'), function (b) {
      b.addEventListener('click', function () {
        var input = $(b.dataset.cfMas); var v = Math.max(0, Math.min(500, (Number(input.value) || 0) + Number(b.dataset.paso)));
        input.value = String(v);
      });
    });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      sonido();
      var adultos = Math.max(0, Math.min(500, Number($('cf-calc-adultos').value) || 0));
      var ninos = Math.max(0, Math.min(500, Number($('cf-calc-ninos').value) || 0));
      var res = $('cf-calc-resultado');
      res.hidden = false;
      res.replaceChildren();
      if (adultos + ninos === 0) { res.appendChild(el('p', 'cf-calc-aviso', 'Indica cuántas personas asistirán.')); return; }
      var porciones = adultos + ninos * 0.75;
      if (otros === 'si') porciones *= 0.8;
      porciones = Math.max(1, Math.ceil(porciones));
      var cab = el('div', 'cf-calc-total');
      cab.appendChild(el('span', '', 'Necesitas aproximadamente'));
      var num = el('strong', '', porciones + ' rebanadas');
      cab.appendChild(num);
      cab.appendChild(el('small', '', adultos + ' adulto(s) · ' + ninos + ' niño(s)' + (otros === 'si' ? ' · con otros postres' : '')));
      res.appendChild(cab);
      var lista = productosConRebanadas();
      var opciones = [];
      lista.forEach(function (x) {
        var ok = x.tamanos.filter(function (t) { return t.rebanadas >= porciones; }).sort(function (a, b) { return a.rebanadas - b.rebanadas; })[0];
        if (ok) opciones.push({ p: x.p, t: ok, tamanos: x.tamanos });
      });
      opciones.sort(function (a, b) { return a.t.precio - b.t.precio; });
      if (!lista.length) {
        res.appendChild(el('p', 'cf-calc-aviso', 'Pronto verás aquí los pasteles recomendados. Mientras tanto, revisa la guía de porciones o escríbenos.'));
      } else if (!opciones.length) {
        res.appendChild(el('p', 'cf-calc-aviso', 'Ningún pastel de la tienda alcanza solo para ' + porciones + ' rebanadas. Te recomendamos combinar 2 pasteles o pedir un pastel personalizado de varios pisos.'));
        var b = el('button', 'boton-principal-rosa', '✨ Pedir pastel personalizado'); b.type = 'button';
        b.addEventListener('click', function () { if (typeof w.abrirModalPersonalizar === 'function') w.abrirModalPersonalizar(); });
        res.appendChild(b);
      } else {
        res.appendChild(el('p', 'cf-calc-sub', 'Estos pasteles te alcanzan:'));
        var grid = el('div', 'cf-calc-grid');
        opciones.slice(0, 8).forEach(function (o) {
          var card = el('article', 'cf-calc-card');
          var img = el('img'); img.src = o.p.image_url || ''; img.alt = o.p.name || 'Pastel'; img.loading = 'lazy'; img.onerror = function () { img.remove(); };
          card.appendChild(img);
          var info = el('div', 'cf-calc-info');
          info.appendChild(el('strong', '', o.p.name));
          info.appendChild(el('span', 'cf-calc-tam', o.t.nombre + ' · ' + o.t.rebanadas + ' rebanadas'));
          info.appendChild(el('span', 'cf-calc-precio', q(o.t.precio)));
          var bt = el('button', 'cf-btn cf-btn-rosa', 'Elegir este'); bt.type = 'button';
          bt.addEventListener('click', function () { CF.abrirProductoConTamano(o.p, o.t.nombre); });
          info.appendChild(bt);
          card.appendChild(info);
          grid.appendChild(card);
        });
        res.appendChild(grid);
      }
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  CF.abrirProductoConTamano = function (p, tamano) {
    if (typeof w.abrirVentanita !== 'function') return;
    var galeria = [p.image_url].concat(Array.isArray(p.gallery_urls) ? p.gallery_urls : []).filter(Boolean);
    w.abrirVentanita(p.name, Number(p.price_small) || 0, Number(p.price_medium) || 0, Number(p.price_large) || 0, 'pastel', p.image_url, p.description || '', galeria,
      { rebanadas: [p.slices_small, p.slices_medium, p.slices_large], tamano: tamano });
  };

  /* =========================================================
     6. EXTRAS Y COMPLEMENTOS EN EL CARRITO
     ========================================================= */
  function pintarExtrasCarrito() {
    var cont = $('cf-extras-carrito');
    if (!cont) return;
    cont.hidden = !CF.extras.length;
    var lista = cont.querySelector('.cf-extras-lista');
    lista.replaceChildren();
    CF.extras.forEach(function (x) {
      var b = el('button', 'cf-extra'); b.type = 'button';
      b.dataset.extraId = x.id;
      var img = el('img'); img.src = x.image_url || ''; img.alt = ''; img.loading = 'lazy'; img.onerror = function () { img.remove(); };
      b.appendChild(img);
      b.appendChild(el('span', 'cf-extra-nombre', x.name));
      b.appendChild(el('span', 'cf-extra-precio', Number(x.price) > 0 ? '+ ' + qCorto(x.price) : 'Gratis'));
      b.appendChild(el('span', 'cf-extra-mas', '＋'));
      b.title = x.description || x.name;
      b.addEventListener('click', function () {
        sonido();
        if (typeof w.cakeAgregarAlCarrito === 'function') w.cakeAgregarAlCarrito({ nombre: '✨ ' + x.name, precio: Number(x.price) || 0, cantidad: 1, imagen: x.image_url || '', tipo: 'extra' });
        b.classList.add('cf-agregado');
        setTimeout(function () { b.classList.remove('cf-agregado'); }, 900);
      });
      lista.appendChild(b);
    });
    CF.alActualizarCarrito();
  }
  CF.alActualizarCarrito = function () {
    var cont = $('cf-extras-carrito');
    var items = (typeof orden !== 'undefined' && Array.isArray(orden)) ? orden : [];
    if (cont && CF.extras.length) {
      Array.prototype.forEach.call(cont.querySelectorAll('.cf-extra'), function (b) {
        var x = CF.extras.filter(function (e) { return e.id === b.dataset.extraId; })[0];
        var dentro = x && items.some(function (i) { return i.nombre === '✨ ' + x.name; });
        b.classList.toggle('cf-ya', !!dentro);
      });
    }
    pintarPremioEnCarrito();
  };

  /* =========================================================
     15. RASPA Y GANA NAVIDEÑO
     ========================================================= */
  var CLAVE_PREMIO = 'cake-raspa-gana-2026';
  function premioGuardado() { return leerJSON(CLAVE_PREMIO, null); }
  CF.premioParaPedido = function () {
    var p = premioGuardado();
    if (!p || p.usado || !p.revelado) return null;
    if (!(CF.ajustes && CF.ajustes.scratch_enabled !== false)) return null;
    return { id: p.id, name: p.name, detail: p.detail || '' };
  };
  CF.marcarPremioUsado = function (codigo) {
    var p = premioGuardado(); if (!p) return;
    p.usado = true; p.pedido = codigo || ''; guardarJSON(CLAVE_PREMIO, p);
    pintarPremioEnCarrito();
    prepararRaspaYGana(true);
  };
  function pintarPremioEnCarrito() {
    var caja = $('cf-premio-carrito'); if (!caja) return;
    var p = CF.premioParaPedido();
    caja.hidden = !p;
    if (p) caja.querySelector('strong').textContent = p.name;
  }
  function elegirPremio() {
    var total = CF.premios.reduce(function (s, p) { return s + Math.max(1, Number(p.weight) || 1); }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < CF.premios.length; i++) {
      r -= Math.max(1, Number(CF.premios[i].weight) || 1);
      if (r <= 0) return CF.premios[i];
    }
    return CF.premios[0];
  }
  function prepararRaspaYGana(repintar) {
    var sec = $('cf-raspa');
    if (!sec) return;
    var a = CF.ajustes;
    if (!a || a.scratch_enabled === false || !CF.premios.length) { sec.hidden = true; return; }
    sec.hidden = false;
    if (a.scratch_title) sec.querySelector('.cf-raspa-titulo').textContent = a.scratch_title;
    if (a.scratch_subtitle) sec.querySelector('.cf-raspa-sub').textContent = a.scratch_subtitle;
    var tarjeta = sec.querySelector('.cf-raspa-tarjeta');
    var premioBox = sec.querySelector('.cf-raspa-premio');
    var estado = sec.querySelector('.cf-raspa-estado');
    var guardado = premioGuardado();
    function pintarPremio(p) {
      premioBox.replaceChildren();
      if (p.image_url) { var img = el('img'); img.src = p.image_url; img.alt = ''; img.onerror = function () { img.remove(); }; premioBox.appendChild(img); }
      var tx = el('div', 'cf-raspa-premio-texto');
      tx.appendChild(el('span', 'cf-raspa-gano', '¡Ganaste!'));
      tx.appendChild(el('strong', '', p.name));
      if (p.detail) tx.appendChild(el('small', '', p.detail));
      premioBox.appendChild(tx);
    }
    if (guardado && guardado.revelado) {
      pintarPremio(guardado);
      var lienzo = tarjeta.querySelector('canvas'); if (lienzo) lienzo.remove();
      tarjeta.classList.add('cf-revelada');
      estado.textContent = guardado.usado ? '✅ Ya usaste este premio en tu pedido ' + (guardado.pedido || '') + '. ¡Gracias por tu compra!' : '🎁 Tu premio se agregará automáticamente a tu próximo pedido.';
      return;
    }
    if (repintar) return;
    var canvas = tarjeta.querySelector('canvas');
    if (!canvas) { canvas = el('canvas', 'cf-raspa-capa'); tarjeta.appendChild(canvas); }
    var premio = guardado && guardado.id ? guardado : null;
    if (premio) pintarPremio(premio);
    var c = canvas.getContext('2d');
    var W = 0, H = 0, raspando = false, contador = 0, revelado = false;
    function pintarCapa() {
      var rect = tarjeta.getBoundingClientRect();
      W = Math.round(rect.width); H = Math.round(rect.height);
      canvas.width = W; canvas.height = H;
      var g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#b8862b'); g.addColorStop(.35, '#f6d77a'); g.addColorStop(.55, '#fff1b8'); g.addColorStop(.75, '#e2b44a'); g.addColorStop(1, '#9c6d1c');
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (var i = 0; i < 40; i++) { c.beginPath(); c.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8 + .4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#5c3a0a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 ' + Math.round(Math.min(W, 520) / 14) + 'px Poppins, Arial, sans-serif';
      c.fillText('✨ Raspa aquí con tu dedo ✨', W / 2, H / 2 - 12);
      c.font = '400 ' + Math.round(Math.min(W, 520) / 24) + 'px Poppins, Arial, sans-serif';
      c.fillText('Descubre tu regalito navideño', W / 2, H / 2 + 22);
    }
    pintarCapa();
    function punto(ev) {
      var rect = canvas.getBoundingClientRect();
      var t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      return { x: (t.clientX - rect.left) * (W / rect.width), y: (t.clientY - rect.top) * (H / rect.height) };
    }
    function raspar(ev) {
      if (!raspando || revelado) return;
      if (ev.cancelable) ev.preventDefault();
      if (!premio) {
        var elegido = elegirPremio();
        premio = { id: elegido.id, name: elegido.name, detail: elegido.detail || '', image_url: elegido.image_url || '', revelado: false };
        guardarJSON(CLAVE_PREMIO, premio);
        pintarPremio(premio);
      }
      var pt = punto(ev);
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(pt.x, pt.y, Math.max(18, W / 16), 0, Math.PI * 2); c.fill();
      contador++;
      if (contador % 8 === 0) revisar();
    }
    function revisar() {
      try {
        var datos = c.getImageData(0, 0, W, H).data, vacios = 0, total = 0;
        for (var i = 3; i < datos.length; i += 64) { total++; if (datos[i] === 0) vacios++; }
        if (vacios / total > 0.5) revelar();
      } catch (e) { if (contador > 60) revelar(); }
    }
    function revelar() {
      if (revelado) return;
      revelado = true;
      canvas.classList.add('cf-desvanecer');
      setTimeout(function () { canvas.remove(); }, 600);
      tarjeta.classList.add('cf-revelada');
      premio.revelado = true; premio.fecha = new Date().toISOString();
      guardarJSON(CLAVE_PREMIO, premio);
      estado.textContent = '🎁 ¡Felicidades! Tu premio se agregará automáticamente a tu próximo pedido.';
      lluviaConfeti(sec);
      pintarPremioEnCarrito();
    }
    function inicio(ev) { raspando = true; raspar(ev); }
    function fin() { raspando = false; if (!revelado && contador) revisar(); }
    canvas.addEventListener('mousedown', inicio);
    canvas.addEventListener('mousemove', raspar);
    w.addEventListener('mouseup', fin);
    canvas.addEventListener('touchstart', inicio, { passive: false });
    canvas.addEventListener('touchmove', raspar, { passive: false });
    canvas.addEventListener('touchend', fin);
    estado.textContent = 'Un boleto por persona. ¡Mucha suerte! 🍀';
  }
  function lluviaConfeti(contenedor) {
    if (w.CAKE_LIGERO) return;
    var capa = el('div', 'cf-confeti'); capa.setAttribute('aria-hidden', 'true');
    var colores = ['#ff6fa5', '#ffd166', '#06d6a0', '#4cc9f0', '#ffffff'];
    for (var i = 0; i < 36; i++) {
      var p = el('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colores[i % colores.length];
      p.style.animationDelay = (Math.random() * .6) + 's';
      p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      capa.appendChild(p);
    }
    contenedor.appendChild(capa);
    setTimeout(function () { capa.remove(); }, 3600);
  }
  CF.lluviaConfeti = lluviaConfeti;

  /* =========================================================
     7. GALERÍA «CLIENTES FELICES»
     ========================================================= */
  var galeriaIndice = 0;
  function pintarGaleriaClientes() {
    var sec = $('cf-clientes-felices');
    if (!sec) return;
    var a = CF.ajustes;
    if (!a || a.gallery_enabled === false) { sec.hidden = true; return; }
    sec.hidden = false;
    if (a.gallery_title) sec.querySelector('.cf-galeria-titulo').textContent = a.gallery_title;
    var grid = sec.querySelector('.cf-galeria-grid');
    grid.replaceChildren();
    if (!CF.fotos.length) {
      grid.appendChild(el('p', 'cf-galeria-vacia', '¡Sé la primera familia en compartir su foto con un pastel de Cake Chávez! 📸'));
      return;
    }
    var mostrar = CF.fotos.slice(0, 12);
    mostrar.forEach(function (f, i) {
      var b = el('button', 'cf-galeria-item'); b.type = 'button';
      b.setAttribute('aria-label', 'Ver foto de ' + (f.customer_name || 'cliente'));
      var img = el('img'); img.src = f.image_url; img.alt = f.customer_name ? 'Foto de ' + f.customer_name : 'Cliente feliz de Cake Chávez'; img.loading = 'lazy'; img.decoding = 'async';
      img.onerror = function () { b.remove(); };
      b.appendChild(img);
      if (f.customer_name) b.appendChild(el('span', 'cf-galeria-nombre', f.customer_name));
      b.addEventListener('click', function () { abrirFotoCliente(i); });
      grid.appendChild(b);
    });
    var mas = sec.querySelector('.cf-galeria-mas');
    if (mas) {
      mas.hidden = CF.fotos.length <= 12;
      mas.onclick = function () {
        CF.fotos.slice(12).forEach(function (f, j) {
          var i = j + 12;
          var b = el('button', 'cf-galeria-item'); b.type = 'button';
          var img = el('img'); img.src = f.image_url; img.alt = 'Cliente feliz'; img.loading = 'lazy'; img.onerror = function () { b.remove(); };
          b.appendChild(img);
          if (f.customer_name) b.appendChild(el('span', 'cf-galeria-nombre', f.customer_name));
          b.addEventListener('click', function () { abrirFotoCliente(i); });
          grid.appendChild(b);
        });
        mas.hidden = true;
      };
    }
  }
  function abrirFotoCliente(i) {
    var m = $('cf-modal-foto'); if (!m) return;
    galeriaIndice = (i + CF.fotos.length) % CF.fotos.length;
    var f = CF.fotos[galeriaIndice];
    var img = m.querySelector('img'); img.src = f.image_url; img.alt = f.customer_name || 'Cliente feliz';
    m.querySelector('.cf-foto-nombre').textContent = f.customer_name ? '💗 ' + f.customer_name : '💗 Cliente feliz';
    m.querySelector('.cf-foto-mensaje').textContent = f.message || '';
    m.querySelector('.cf-foto-contador').textContent = (galeriaIndice + 1) + ' / ' + CF.fotos.length;
    abrirModal(m);
  }
  CF.moverFotoCliente = function (paso) { abrirFotoCliente(galeriaIndice + paso); };

  /* =========================================================
     DATOS OBLIGATORIOS DEL PEDIDO (dirección, fecha, hora y teléfono)
     ========================================================= */
  function marcarError(id, texto) {
    var campo = $(id); if (!campo) return;
    var caja = campo.closest('.cf-campo') || campo.parentNode;
    var err = caja.querySelector('.cf-error');
    if (!err) { err = el('small', 'cf-error'); caja.appendChild(err); }
    err.textContent = texto || '';
    campo.classList.toggle('cf-campo-error', !!texto);
    campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
  }
  CF.validarDatosCliente = function () {
    var nombre = ($('cliente-nombre').value || '').trim();
    var telefono = ($('cliente-telefono').value || '').trim();
    var fechaCampo = $('cliente-fecha');
    var fecha = w.cakeNormalizarFecha ? w.cakeNormalizarFecha(fechaCampo.value) : fechaCampo.value;
    var hora = CF.normalizarHora($('cliente-hora').value);
    var direccion = ($('cliente-direccion').value || '').trim();
    var errores = [];
    function rev(id, ok, msg) { marcarError(id, ok ? '' : msg); if (!ok) errores.push(id); }
    rev('cliente-nombre', nombre.length >= 2, 'Escribe tu nombre.');
    var dig = telefono.replace(/\D/g, '');
    rev('cliente-telefono', dig.length >= 8 && dig.length <= 15, 'Escribe tu número de WhatsApp (8 dígitos).');
    var fechaOk = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
    var hoy = new Date(); var hoyIso = hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
    rev('cliente-fecha', fechaOk && fecha > hoyIso, fechaOk ? 'Elige una fecha a partir de mañana.' : 'Elige la fecha de entrega.');
    rev('cliente-hora', !!hora, 'Elige la hora de entrega.');
    rev('cliente-direccion', direccion.length >= 4, 'Escribe la dirección de entrega.');
    if (errores.length) {
      var primero = $(errores[0]);
      if (primero) { try { primero.focus(); } catch (e) { /* nada */ } primero.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return null;
    }
    if (hora) $('cliente-hora').value = hora;
    return { nombre: nombre, telefono: telefono, fecha: fecha, hora: hora, direccion: direccion };
  };
  CF.limpiarDatosCliente = function () {
    ['cliente-nombre', 'cliente-telefono', 'cliente-fecha', 'cliente-hora', 'cliente-direccion'].forEach(function (id) { var c = $(id); if (c) { c.value = ''; marcarError(id, ''); } });
  };
  document.addEventListener('input', function (ev) {
    var id = ev.target && ev.target.id;
    if (id && /^cliente-(nombre|telefono|fecha|hora|direccion)$/.test(id) && ev.target.classList.contains('cf-campo-error')) marcarError(id, '');
  });

  /* =========================================================
     18. MENSAJE SECRETO CON QR PARA REGALOS (asistente)
     ========================================================= */
  var asistente = { animacion: 'nieve', detener: null, alTerminar: null, datos: null };
  CF.regaloActivo = function () { return !(CF.ajustes && CF.ajustes.gift_qr_enabled === false) && !!w.CakeAnimaciones; };
  CF.preguntarRegalo = function (datos, alTerminar) {
    var m = $('cf-modal-regalo');
    if (!m || !CF.regaloActivo()) { alTerminar(null); return; }
    asistente.alTerminar = alTerminar;
    asistente.datos = datos;
    mostrarPaso('pregunta');
    abrirModal(m);
  };
  function mostrarPaso(paso) {
    var m = $('cf-modal-regalo');
    Array.prototype.forEach.call(m.querySelectorAll('[data-cf-paso]'), function (p) { p.hidden = p.dataset.cfPaso !== paso; });
    m.querySelector('.cf-regalo-caja').scrollTop = 0;
    if (asistente.detener) { asistente.detener(); asistente.detener = null; }
    if (paso === 'animacion') { pintarAnimaciones(); vistaPrevia(); }
    if (paso === 'mensaje') {
      var de = $('cf-regalo-de');
      if (de && !de.value && asistente.datos) de.value = asistente.datos.nombre || '';
      contarMensaje();
      setTimeout(function () { var p = $('cf-regalo-para'); if (p) p.focus(); }, 80);
    }
  }
  function pintarAnimaciones() {
    var grid = $('cf-regalo-animaciones');
    if (grid.childNodes.length) { marcarAnimacion(); return; }
    w.CakeAnimaciones.lista.forEach(function (a, i) {
      var b = el('button', 'cf-anim'); b.type = 'button';
      b.dataset.anim = a.id;
      b.style.background = 'linear-gradient(160deg,' + a.fondo[0] + ',' + a.fondo[1] + ')';
      b.appendChild(el('span', 'cf-anim-num', String(i + 1)));
      b.appendChild(el('span', 'cf-anim-emoji', a.emoji));
      b.appendChild(el('span', 'cf-anim-nombre', a.nombre));
      b.addEventListener('click', function () { asistente.animacion = a.id; marcarAnimacion(); vistaPrevia(); });
      grid.appendChild(b);
    });
    marcarAnimacion();
  }
  function marcarAnimacion() {
    Array.prototype.forEach.call(document.querySelectorAll('#cf-regalo-animaciones .cf-anim'), function (b) {
      var sel = b.dataset.anim === asistente.animacion;
      b.classList.toggle('activo', sel); b.setAttribute('aria-pressed', sel ? 'true' : 'false');
    });
    var info = w.CakeAnimaciones.buscar(asistente.animacion);
    var t = $('cf-regalo-anim-elegida'); if (t) t.textContent = info.emoji + ' ' + info.nombre;
  }
  function vistaPrevia() {
    var canvas = $('cf-regalo-preview');
    if (!canvas || !w.CakeAnimaciones) return;
    if (asistente.detener) asistente.detener();
    asistente.detener = w.CakeAnimaciones.iniciar(canvas, asistente.animacion, {});
  }
  function contarMensaje() {
    var t = $('cf-regalo-mensaje'), c = $('cf-regalo-contador');
    if (t && c) c.textContent = t.value.length + ' / 600';
  }
  function terminarAsistente(regalo) {
    var m = $('cf-modal-regalo');
    if (asistente.detener) { asistente.detener(); asistente.detener = null; }
    cerrarModal(m);
    var fn = asistente.alTerminar; asistente.alTerminar = null;
    if (fn) fn(regalo);
  }
  function prepararAsistente() {
    var m = $('cf-modal-regalo'); if (!m) return;
    m.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-cf-accion]') : null;
      if (!b) return;
      var acc = b.dataset.cfAccion;
      sonido();
      if (acc === 'no') terminarAsistente(null);
      else if (acc === 'si') mostrarPaso('animacion');
      else if (acc === 'a-mensaje') mostrarPaso('mensaje');
      else if (acc === 'a-animacion') mostrarPaso('animacion');
      else if (acc === 'a-pregunta') mostrarPaso('pregunta');
      else if (acc === 'cancelar') { if (asistente.detener) { asistente.detener(); asistente.detener = null; } cerrarModal(m); asistente.alTerminar = null; }
      else if (acc === 'crear') {
        var para = ($('cf-regalo-para').value || '').trim();
        var mensaje = ($('cf-regalo-mensaje').value || '').trim();
        var de = ($('cf-regalo-de').value || '').trim();
        marcarError('cf-regalo-para', para ? '' : 'Escribe el nombre de quien recibirá el regalo.');
        marcarError('cf-regalo-mensaje', mensaje.length >= 3 ? '' : 'Escribe tu mensaje o dedicatoria.');
        if (!para || mensaje.length < 3) return;
        var info = w.CakeAnimaciones.buscar(asistente.animacion);
        terminarAsistente({ animation: info.id, animation_name: info.nombre, recipient_name: para.slice(0, 80), sender_name: de.slice(0, 80), message: mensaje.slice(0, 600) });
      }
    });
    var t = $('cf-regalo-mensaje'); if (t) t.addEventListener('input', contarMensaje);
  }

  /* =========================================================
     13. TICKET DIGITAL DEL PEDIDO
     ========================================================= */
  var CLAVE_TICKET = 'cake-ultimo-ticket-v1';
  CF.mostrarTicket = function (t, guardar) {
    if (!t) return;
    if (guardar !== false) guardarJSON(CLAVE_TICKET, t);
    var m = $('cf-modal-ticket'); if (!m) return;
    var c = m.querySelector('.cf-ticket');
    $('cf-ticket-codigo').textContent = t.codigo;
    $('cf-ticket-creado').textContent = new Date(t.creado).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
    $('cf-ticket-cliente').textContent = t.nombre;
    $('cf-ticket-telefono').textContent = t.telefono;
    $('cf-ticket-entrega').textContent = fechaBonita(t.fecha, true) + ' · ' + horaBonita(t.hora);
    $('cf-ticket-direccion').textContent = t.direccion;
    var lista = $('cf-ticket-items'); lista.replaceChildren();
    (t.items || []).forEach(function (i) {
      var li = el('li');
      if (i.imagen) { var img = el('img'); img.src = i.imagen; img.alt = ''; img.onerror = function () { img.remove(); }; li.appendChild(img); }
      var n = el('span', 'cf-ticket-item-nombre'); n.appendChild(el('b', '', i.cantidad + '× ')); n.appendChild(document.createTextNode(i.nombre));
      li.appendChild(n);
      li.appendChild(el('strong', '', q(i.precio * i.cantidad)));
      lista.appendChild(li);
    });
    $('cf-ticket-total').textContent = q(t.total);
    var prem = $('cf-ticket-premio'); prem.hidden = !t.premio; if (t.premio) prem.querySelector('strong').textContent = t.premio.name;
    var reg = $('cf-ticket-regalo'); reg.hidden = !t.regalo;
    if (t.regalo && w.CakeQR) {
      var url = w.CakeQR.urlRegalo(t.regalo.token);
      $('cf-ticket-regalo-para').textContent = 'Para ' + t.regalo.recipient_name;
      var cajaQR = $('cf-ticket-qr'); cajaQR.replaceChildren();
      w.CakeQR.dibujar(url, 360).then(function (cv) { cv.className = 'cf-ticket-qr-img'; cajaQR.appendChild(cv); }).catch(function () { cajaQR.textContent = url; });
      $('cf-ticket-qr-descargar').onclick = function () { w.CakeQR.tarjetaRegalo({ url: url, para: t.regalo.recipient_name }).then(function (cv) { w.CakeQR.descargar(cv, 'qr-regalo-' + t.codigo + '.png'); }); };
      $('cf-ticket-qr-abrir').href = url;
    }
    c.classList.remove('cf-ticket-entrada'); void c.offsetWidth; c.classList.add('cf-ticket-entrada');
    abrirModal(m);
    if (guardar !== false) lluviaConfeti(m.querySelector('.cf-modal-caja') || m);
    mostrarAccesoUltimoTicket();
  };
  CF.verUltimoTicket = function () { var t = leerJSON(CLAVE_TICKET, null); if (t) CF.mostrarTicket(t, false); };
  function mostrarAccesoUltimoTicket() {
    var b = $('cf-ver-ultimo-ticket'); if (!b) return;
    b.hidden = !leerJSON(CLAVE_TICKET, null);
  }
  function cargarImg(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      if (/^https?:/i.test(src) && src.indexOf(location.origin) !== 0) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  function dibujarTicket(t, conFotos) {
    var W = 900;
    var items = t.items || [];
    var alto = 980 + items.length * 96 + (t.premio ? 90 : 0) + (t.regalo ? 470 : 0);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = alto;
    var c = cv.getContext('2d');
    c.fillStyle = '#1d1216'; c.fillRect(0, 0, W, alto);
    var x0 = 50, ancho = W - 100;
    c.fillStyle = '#fffafc';
    c.beginPath(); c.moveTo(x0 + 30, 40); c.arcTo(x0 + ancho, 40, x0 + ancho, alto - 40, 30); c.arcTo(x0 + ancho, alto - 40, x0, alto - 40, 30); c.arcTo(x0, alto - 40, x0, 40, 30); c.arcTo(x0, 40, x0 + ancho, 40, 30); c.fill();
    var y = 70;
    return Promise.all([cargarImg('img/navidad/logo-base.webp')].concat(items.map(function (i) { return conFotos ? cargarImg(i.imagen) : Promise.resolve(null); }))).then(function (imgs) {
      var logo = imgs[0];
      if (logo) { var lw = 240, lh = lw * (logo.naturalHeight / logo.naturalWidth); c.drawImage(logo, (W - lw) / 2, y, lw, lh); y += lh + 20; } else y += 40;
      c.textAlign = 'center'; c.fillStyle = '#a83b65'; c.font = '600 30px Poppins, Arial, sans-serif'; c.fillText('TICKET DE PEDIDO', W / 2, y); y += 50;
      c.fillStyle = '#2a1119'; c.font = '700 44px Poppins, Arial, sans-serif'; c.fillText(t.codigo, W / 2, y); y += 36;
      c.fillStyle = '#8a6f7a'; c.font = '400 24px Poppins, Arial, sans-serif'; c.fillText('Registrado: ' + new Date(t.creado).toLocaleString('es-GT'), W / 2, y); y += 40;
      function linea() { c.strokeStyle = '#e8c5d3'; c.setLineDash([10, 8]); c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 40, y); c.lineTo(x0 + ancho - 40, y); c.stroke(); c.setLineDash([]); y += 40; }
      linea();
      c.textAlign = 'left';
      function dato(etq, val) {
        c.fillStyle = '#a83b65'; c.font = '600 22px Poppins, Arial, sans-serif'; c.fillText(etq, x0 + 50, y);
        c.fillStyle = '#2a1119'; c.font = '400 26px Poppins, Arial, sans-serif';
        var palabras = String(val || '').split(' '), l = '', yy = y + 34;
        palabras.forEach(function (p) { var pr = l ? l + ' ' + p : p; if (c.measureText(pr).width > ancho - 100 && l) { c.fillText(l, x0 + 50, yy); yy += 32; l = p; } else l = pr; });
        c.fillText(l, x0 + 50, yy); y = yy + 44;
      }
      dato('CLIENTE', t.nombre + ' · ' + t.telefono);
      dato('ENTREGA', fechaBonita(t.fecha, true) + ' · ' + horaBonita(t.hora));
      dato('DIRECCIÓN', t.direccion);
      linea();
      items.forEach(function (i, k) {
        var img = imgs[k + 1];
        if (img) { try { c.save(); c.beginPath(); c.arc(x0 + 82, y + 18, 36, 0, Math.PI * 2); c.clip(); c.drawImage(img, x0 + 46, y - 18, 72, 72); c.restore(); } catch (e) { /* nada */ } }
        c.fillStyle = '#2a1119'; c.font = '400 25px Poppins, Arial, sans-serif';
        var nom = i.cantidad + '× ' + i.nombre; while (c.measureText(nom).width > ancho - 330 && nom.length > 4) nom = nom.slice(0, -2);
        c.fillText(nom + (nom.length < (i.cantidad + '× ' + i.nombre).length ? '…' : ''), x0 + 136, y + 28);
        c.textAlign = 'right'; c.font = '600 26px Poppins, Arial, sans-serif'; c.fillText(q(i.precio * i.cantidad), x0 + ancho - 50, y + 28); c.textAlign = 'left';
        y += 96;
      });
      linea();
      c.fillStyle = '#2a1119'; c.font = '700 36px Poppins, Arial, sans-serif'; c.fillText('TOTAL', x0 + 50, y + 10);
      c.textAlign = 'right'; c.fillStyle = '#a83b65'; c.fillText(q(t.total), x0 + ancho - 50, y + 10); c.textAlign = 'left'; y += 60;
      if (t.premio) { c.fillStyle = '#b8862b'; c.font = '600 26px Poppins, Arial, sans-serif'; c.fillText('🎁 Premio: ' + t.premio.name, x0 + 50, y + 10); y += 90; }
      var paso = t.regalo && w.CakeQR ? w.CakeQR.dibujar(w.CakeQR.urlRegalo(t.regalo.token), 360) : Promise.resolve(null);
      return paso.then(function (qr) {
        if (qr) {
          linea();
          c.textAlign = 'center'; c.fillStyle = '#a83b65'; c.font = '600 26px Poppins, Arial, sans-serif'; c.fillText('💌 Mensaje secreto para ' + t.regalo.recipient_name, W / 2, y); y += 20;
          c.drawImage(qr, (W - 360) / 2, y, 360, 360); y += 390; c.textAlign = 'left';
        }
        c.textAlign = 'center'; c.fillStyle = '#8a6f7a'; c.font = '400 22px Poppins, Arial, sans-serif';
        c.fillText('Presenta este ticket el día de tu entrega. ¡Gracias por elegir Cake Chávez! ♡', W / 2, alto - 80);
        return cv;
      });
    });
  }
  CF.guardarTicketImagen = function () {
    var t = leerJSON(CLAVE_TICKET, null); if (!t || !w.CakeQR) return;
    var boton = $('cf-ticket-guardar'); if (boton) boton.disabled = true;
    dibujarTicket(t, true).then(function (cv) {
      try { cv.toDataURL(); return cv; } catch (e) { return dibujarTicket(t, false); }
    }).then(function (cv) { return w.CakeQR.compartir(cv, 'ticket-' + t.codigo + '.png', 'Mi pedido de Cake Chávez ' + t.codigo); })
      .catch(function () { alert('No se pudo crear la imagen. Toma una captura de pantalla de tu ticket.'); })
      .then(function () { if (boton) boton.disabled = false; });
  };

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function iniciar() {
    prepararAsistente();
    var b = $('cf-ver-ultimo-ticket'); if (b) b.addEventListener('click', CF.verUltimoTicket);
    var g = $('cf-ticket-guardar'); if (g) g.addEventListener('click', CF.guardarTicketImagen);
    var prev = $('cf-foto-prev'), next = $('cf-foto-next');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); CF.moverFotoCliente(-1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); CF.moverFotoCliente(1); });
    var subir = $('cf-galeria-subir'); if (subir) subir.href = 'fotos.html';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
