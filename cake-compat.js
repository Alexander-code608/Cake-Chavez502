/* =========================================================
   CAKE CHAVEZ — COMPATIBILIDAD Y RENDIMIENTO
   Se carga PRIMERO en index.html y admin.html.
   1. Completa funciones que no existen en celulares antiguos
      (así los pedidos, fotos y reseñas funcionan en cualquier teléfono).
   2. Detecta teléfonos sencillos y activa el "modo ligero"
      (menos animaciones pesadas para que la página no se trabe).
   3. Prepara las fotos antes de subirlas: las gira bien, las achica
      y las convierte a JPG si el teléfono usa un formato raro.
   Escrito en JavaScript clásico (ES5) a propósito: funciona en todos lados.
   ========================================================= */
(function () {
  'use strict';
  var w = window, d = document;

  /* ---------- 1. Funciones que faltan en navegadores antiguos ---------- */
  try { if (typeof w.globalThis === 'undefined') w.globalThis = w; } catch (e) { /* nada */ }

  if (w.Promise && !Promise.prototype['finally']) {
    Promise.prototype['finally'] = function (fn) {
      var P = this.constructor || Promise;
      return this.then(
        function (v) { return P.resolve(fn && fn()).then(function () { return v; }); },
        function (r) { return P.resolve(fn && fn()).then(function () { throw r; }); }
      );
    };
  }
  if (w.Promise && !Promise.allSettled) {
    Promise.allSettled = function (lista) {
      return Promise.all(Array.prototype.map.call(lista, function (p) {
        return Promise.resolve(p).then(
          function (v) { return { status: 'fulfilled', value: v }; },
          function (r) { return { status: 'rejected', reason: r }; }
        );
      }));
    };
  }
  if (!Object.fromEntries) {
    Object.fromEntries = function (pares) {
      var o = {};
      Array.prototype.forEach.call(Array.from ? Array.from(pares) : pares, function (par) { o[par[0]] = par[1]; });
      return o;
    };
  }
  if (!Array.prototype.flat) {
    Object.defineProperty(Array.prototype, 'flat', {
      configurable: true, writable: true,
      value: function (prof) {
        prof = prof === undefined ? 1 : Number(prof) || 0;
        var aplanar = function (arr, p) {
          return arr.reduce(function (acc, v) { return acc.concat(Array.isArray(v) && p > 0 ? aplanar(v, p - 1) : v); }, []);
        };
        return aplanar(this, prof);
      }
    });
  }
  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, 'flatMap', {
      configurable: true, writable: true,
      value: function (fn, ctx) { return Array.prototype.map.call(this, fn, ctx).flat(1); }
    });
  }
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (buscar, nuevo) {
      if (buscar instanceof RegExp) return this.replace(buscar, nuevo);
      return this.split(String(buscar)).join(typeof nuevo === 'function' ? nuevo(String(buscar)) : nuevo);
    };
  }
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (largo, relleno) {
      var s = String(this); largo = largo >> 0; relleno = relleno === undefined ? ' ' : String(relleno);
      if (s.length >= largo || !relleno) return s;
      var falta = largo - s.length;
      while (relleno.length < falta) relleno += relleno;
      return relleno.slice(0, falta) + s;
    };
  }
  if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
      configurable: true, writable: true,
      value: function (buscado) {
        for (var i = 0; i < this.length; i++) {
          if (this[i] === buscado || (buscado !== buscado && this[i] !== this[i])) return true;
        }
        return false;
      }
    });
  }
  if (!Object.entries) Object.entries = function (o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); };
  if (!Object.values) Object.values = function (o) { return Object.keys(o).map(function (k) { return o[k]; }); };
  if (w.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;
  if (w.Element) {
    var EP = Element.prototype;
    if (!EP.matches) EP.matches = EP.msMatchesSelector || EP.webkitMatchesSelector;
    if (!EP.closest) {
      EP.closest = function (sel) {
        var el = this;
        while (el && el.nodeType === 1) { if (el.matches(sel)) return el; el = el.parentElement || el.parentNode; }
        return null;
      };
    }
    var agregarNodos = function (padre, nodos, antes) {
      var frag = d.createDocumentFragment();
      Array.prototype.forEach.call(nodos, function (n) { frag.appendChild(n instanceof Node ? n : d.createTextNode(String(n))); });
      if (antes) padre.insertBefore(frag, padre.firstChild); else padre.appendChild(frag);
    };
    if (!EP.append) EP.append = function () { agregarNodos(this, arguments, false); };
    if (!EP.prepend) EP.prepend = function () { agregarNodos(this, arguments, true); };
    if (!EP.replaceChildren) {
      EP.replaceChildren = function () {
        while (this.firstChild) this.removeChild(this.firstChild);
        agregarNodos(this, arguments, false);
      };
    }
    if (!EP.remove) EP.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
    if (w.DocumentFragment && !DocumentFragment.prototype.append) {
      DocumentFragment.prototype.append = function () { agregarNodos(this, arguments, false); };
    }
  }

  // Identificador único seguro (crypto.randomUUID no existe en teléfonos antiguos).
  w.cakeUUID = function () {
    var c = w.crypto || w.msCrypto;
    try { if (c && typeof c.randomUUID === 'function') return c.randomUUID(); } catch (e) { /* sigue */ }
    if (c && typeof c.getRandomValues === 'function') {
      var b = new Uint8Array(16);
      c.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = '';
      for (var i = 0; i < b.length; i++) h += (b[i] + 0x100).toString(16).slice(1);
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
      var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  // Navegadores dentro de Facebook, Instagram, Messenger, TikTok, etc.
  var ua = navigator.userAgent || '';
  w.CAKE_NAVEGADOR_INTERNO = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|TikTok|musical_ly|Snapchat|Twitter|; wv\)/i.test(ua);

  // Abre WhatsApp de la forma más segura para cada teléfono.
  w.cakeAbrirEnlaceExterno = function (url, ventanaPreparada) {
    try {
      if (ventanaPreparada && !ventanaPreparada.closed) {
        try { ventanaPreparada.opener = null; } catch (e) { /* nada */ }
        ventanaPreparada.location.href = url;
        return;
      }
    } catch (e) { /* sigue con el respaldo */ }
    w.location.href = url;
  };
  // Prepara una pestaña en el mismo toque (evita bloqueos en iPhone). En navegadores internos no se usa.
  w.cakePrepararVentana = function () {
    if (w.CAKE_NAVEGADOR_INTERNO) return null;
    try { return w.open('about:blank', '_blank'); } catch (e) { return null; }
  };

  // Convierte "25/12/2026" o "2026-12-25" en "2026-12-25" (teléfonos sin calendario).
  w.cakeNormalizarFecha = function (valor) {
    var v = String(valor || '').trim();
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    return v;
  };
  // Si el teléfono no tiene calendario, el campo muestra cómo escribir la fecha.
  function prepararCamposFecha() {
    var prueba = d.createElement('input');
    try { prueba.setAttribute('type', 'date'); } catch (e) { /* nada */ }
    if (prueba.type === 'date') return;
    Array.prototype.forEach.call(d.querySelectorAll('input[type="date"]'), function (campo) {
      campo.setAttribute('placeholder', 'DD/MM/AAAA');
      campo.setAttribute('inputmode', 'numeric');
      campo.addEventListener('blur', function () { campo.value = w.cakeNormalizarFecha(campo.value); });
    });
  }

  /* ---------- 2. Modo ligero para teléfonos sencillos ---------- */
  var html = d.documentElement;
  var memoria = Number(navigator.deviceMemory || 0);
  var nucleos = Number(navigator.hardwareConcurrency || 0);
  var ahorroDatos = !!(navigator.connection && navigator.connection.saveData);
  var reducir = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cssModerno = !!(w.CSS && CSS.supports && CSS.supports('(inset: 0)'));
  var ligero = ahorroDatos || reducir || !cssModerno || (memoria > 0 && memoria <= 2) || (nucleos > 0 && nucleos <= 3);
  try { if (localStorage.getItem('cakeModoLigero') === '1') ligero = true; } catch (e) { /* nada */ }
  w.CAKE_LIGERO = ligero;
  if (ligero) html.className += ' cake-ligero';
  if ((w.innerWidth || 1024) < 700) html.className += ' cake-movil';

  /* ---------- 3. Preparar fotos antes de subirlas ---------- */
  var TIPOS_OK = /^image\/(jpeg|jpg|png|webp|gif)$/i;
  var EXT_IMAGEN = /\.(jpe?g|png|webp|gif|heic|heif|bmp|avif|jfif)$/i;
  var orientaSolo = !!(w.CSS && CSS.supports && CSS.supports('image-orientation', 'from-image'));

  w.cakeEsImagen = function (file) {
    if (!file) return false;
    var tipo = String(file.type || '');
    if (/^image\//i.test(tipo)) return true;
    return !tipo && EXT_IMAGEN.test(String(file.name || ''));
  };

  function leerOrientacionJPEG(file) {
    return new Promise(function (resolve) {
      if (orientaSolo || !w.FileReader || !/jpe?g/i.test(file.type || file.name || '')) { resolve(1); return; }
      var lector = new FileReader();
      lector.onerror = function () { resolve(1); };
      lector.onload = function () {
        try {
          var v = new DataView(lector.result);
          if (v.getUint16(0, false) !== 0xFFD8) { resolve(1); return; }
          var off = 2, largo = v.byteLength;
          while (off < largo) {
            var marca = v.getUint16(off, false); off += 2;
            if (marca === 0xFFE1) {
              if (v.getUint32(off += 2, false) !== 0x45786966) { resolve(1); return; }
              var little = v.getUint16(off += 6, false) === 0x4949;
              off += v.getUint32(off + 4, little);
              var tags = v.getUint16(off, little); off += 2;
              for (var i = 0; i < tags; i++) {
                if (v.getUint16(off + i * 12, little) === 0x0112) { resolve(v.getUint16(off + i * 12 + 8, little)); return; }
              }
            } else if ((marca & 0xFF00) !== 0xFF00) break;
            else off += v.getUint16(off, false);
          }
        } catch (e) { /* sin datos */ }
        resolve(1);
      };
      lector.readAsArrayBuffer(file.slice ? file.slice(0, 65536) : file);
    });
  }

  function cargarImagen(file) {
    return new Promise(function (resolve, reject) {
      var URLc = w.URL || w.webkitURL;
      var url = URLc.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, liberar: function () { URLc.revokeObjectURL(url); } }); };
      img.onerror = function () { URLc.revokeObjectURL(url); reject(new Error('no-decodifica')); };
      img.src = url;
    });
  }

  function lienzoABlob(canvas, calidad) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) { canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', calidad); return; }
      try {
        var datos = canvas.toDataURL('image/jpeg', calidad).split(',');
        var bin = atob(datos[1]), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: 'image/jpeg' }));
      } catch (e) { resolve(null); }
    });
  }

  function crearArchivo(blob, nombre) {
    try { return new File([blob], nombre, { type: blob.type, lastModified: Date.now() }); }
    catch (e) { blob.name = nombre; return blob; } // Safari antiguo no permite new File()
  }

  /**
   * Devuelve una foto lista para subir (Promise).
   * opciones: { maxLado: 1800, maxBytes: 1.5 MB, limiteOriginal: 25 MB }
   */
  w.cakePrepararImagen = function (file, opciones) {
    opciones = opciones || {};
    var maxLado = opciones.maxLado || 1800;
    var maxBytes = opciones.maxBytes || 1.5 * 1024 * 1024;
    var limite = opciones.limiteOriginal || 25 * 1024 * 1024;
    if (!file) return Promise.reject(new Error('No se eligió ninguna foto.'));
    if (!w.cakeEsImagen(file)) return Promise.reject(new Error('El archivo elegido no es una foto. Elige una imagen de tu galería.'));
    if (file.size > limite) return Promise.reject(new Error('La foto es demasiado grande. Elige una foto de menos de ' + Math.round(limite / 1048576) + ' MB.'));
    var tipoOk = TIPOS_OK.test(file.type || '');
    var esGif = /gif/i.test(file.type || '');
    if (esGif && file.size <= 5 * 1024 * 1024) return Promise.resolve(file);

    return leerOrientacionJPEG(file).then(function (orientacion) {
      if (tipoOk && file.size <= maxBytes && orientacion === 1) {
        return cargarImagen(file).then(function (r) {
          var grande = Math.max(r.img.naturalWidth || r.img.width, r.img.naturalHeight || r.img.height) > maxLado * 1.4;
          r.liberar();
          return grande ? convertir(orientacion) : file;
        }, function () { return file; });
      }
      return convertir(orientacion);
    });

    function convertir(orientacion) {
      return cargarImagen(file).then(function (r) {
        var img = r.img;
        var ancho = img.naturalWidth || img.width, alto = img.naturalHeight || img.height;
        var escala = Math.min(1, maxLado / Math.max(ancho, alto));
        var cw = Math.max(1, Math.round(ancho * escala)), ch = Math.max(1, Math.round(alto * escala));
        var girada = orientacion >= 5 && orientacion <= 8;
        var canvas = d.createElement('canvas');
        canvas.width = girada ? ch : cw; canvas.height = girada ? cw : ch;
        var c = canvas.getContext('2d');
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
        switch (orientacion) {
          case 2: c.transform(-1, 0, 0, 1, cw, 0); break;
          case 3: c.transform(-1, 0, 0, -1, cw, ch); break;
          case 4: c.transform(1, 0, 0, -1, 0, ch); break;
          case 5: c.transform(0, 1, 1, 0, 0, 0); break;
          case 6: c.transform(0, 1, -1, 0, ch, 0); break;
          case 7: c.transform(0, -1, -1, 0, ch, cw); break;
          case 8: c.transform(0, -1, 1, 0, 0, cw); break;
        }
        c.drawImage(img, 0, 0, cw, ch);
        r.liberar();
        return lienzoABlob(canvas, 0.84).then(function (blob) {
          if (!blob) {
            if (tipoOk && file.size <= 5 * 1024 * 1024) return file;
            throw new Error('No se pudo preparar la foto en este teléfono. Prueba con otra foto o con una captura de pantalla.');
          }
          var base = String(file.name || 'foto').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'foto';
          return crearArchivo(blob, base + '.jpg');
        });
      }, function () {
        // El navegador no puede leer el formato (por ejemplo HEIC en Android).
        if (tipoOk && file.size <= 5 * 1024 * 1024) return file;
        throw new Error('Este teléfono guardó la foto en un formato que no se puede leer (por ejemplo HEIC). Elige otra foto, o toma una captura de pantalla de la foto y súbela.');
      });
    }
  };

  // Extensión correcta según el tipo de la foto ya preparada.
  w.cakeExtensionImagen = function (file) {
    var t = String((file && file.type) || '').toLowerCase();
    if (t.indexOf('png') >= 0) return 'png';
    if (t.indexOf('webp') >= 0) return 'webp';
    if (t.indexOf('gif') >= 0) return 'gif';
    return 'jpg';
  };

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', prepararCamposFecha);
  else prepararCamposFecha();
})();
