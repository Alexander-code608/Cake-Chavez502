/* =========================================================
   CAKE-QR.JS — dibuja códigos QR bonitos y tarjetas para imprimir.
   Usa vendor/qrcode.min.js (MIT, Kazuhiko Arase). Sin internet extra.
   ========================================================= */
(function () {
  'use strict';
  var w = window;

  function urlBaseSitio() {
    // Carpeta donde está la página actual (funciona en GitHub Pages y en cualquier hosting).
    var href = String(w.location.href).split('#')[0].split('?')[0];
    return href.replace(/[^\/]*$/, '');
  }

  function matriz(texto) {
    if (typeof w.qrcode !== 'function') throw new Error('No se cargó el generador de QR.');
    var qr = w.qrcode(0, 'H');
    qr.addData(String(texto), 'Byte');
    qr.make();
    return qr;
  }

  function cargarImagen(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function redondeado(c, x, y, ancho, alto, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + ancho, y, x + ancho, y + alto, r);
    c.arcTo(x + ancho, y + alto, x, y + alto, r);
    c.arcTo(x, y + alto, x, y, r);
    c.arcTo(x, y, x + ancho, y, r);
    c.closePath();
  }

  // Dibuja el QR en un canvas (color ciruela sobre blanco). Devuelve una promesa con el canvas.
  function dibujarQR(texto, tamano, opciones) {
    opciones = opciones || {};
    var qr = matriz(texto);
    var n = qr.getModuleCount();
    var margen = 3;
    var total = n + margen * 2;
    var lado = Math.max(120, tamano || 320);
    var celda = lado / total;
    var canvas = document.createElement('canvas');
    canvas.width = lado; canvas.height = lado;
    var c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, lado, lado);
    var color = opciones.color || '#3a1526';
    for (var fila = 0; fila < n; fila++) {
      for (var col = 0; col < n; col++) {
        if (!qr.isDark(fila, col)) continue;
        var esOjo = (fila < 7 && col < 7) || (fila < 7 && col >= n - 7) || (fila >= n - 7 && col < 7);
        c.fillStyle = esOjo ? (opciones.colorOjos || '#a83b65') : color;
        var x = (col + margen) * celda, y = (fila + margen) * celda;
        c.fillRect(Math.floor(x), Math.floor(y), Math.ceil(celda), Math.ceil(celda));
      }
    }
    var logo = opciones.logo === false ? null : (opciones.logo || 'img/navidad/logo-base.webp');
    return cargarImagen(logo).then(function (img) {
      if (img) {
        var lo = lado * 0.22;
        var lx = (lado - lo) / 2, ly = (lado - lo) / 2;
        c.fillStyle = '#ffffff';
        redondeado(c, lx - 6, ly - 6, lo + 12, lo + 12, 12);
        c.fill();
        var proporcion = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
        var aw = lo, ah = lo;
        if (proporcion > 1) ah = lo / proporcion; else aw = lo * proporcion;
        try { c.drawImage(img, lx + (lo - aw) / 2, ly + (lo - ah) / 2, aw, ah); } catch (e) { /* sin logo */ }
      }
      return canvas;
    });
  }

  function partirTexto(c, texto, ancho) {
    var palabras = String(texto || '').split(/\s+/), lineas = [], linea = '';
    palabras.forEach(function (p) {
      var prueba = linea ? linea + ' ' + p : p;
      if (c.measureText(prueba).width > ancho && linea) { lineas.push(linea); linea = p; } else linea = prueba;
    });
    if (linea) lineas.push(linea);
    return lineas;
  }

  // Tarjeta lista para imprimir y pegar en la caja del pastel.
  function tarjetaRegalo(datos) {
    datos = datos || {};
    var W = 900, H = 1200;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var c = canvas.getContext('2d');
    var g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2a1119'); g.addColorStop(1, '#4a1a30');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // borde dorado
    c.strokeStyle = '#e9c46a'; c.lineWidth = 6;
    redondeado(c, 28, 28, W - 56, H - 56, 36); c.stroke();
    c.strokeStyle = 'rgba(255,127,179,.55)'; c.lineWidth = 2;
    redondeado(c, 44, 44, W - 88, H - 88, 28); c.stroke();
    c.textAlign = 'center';
    c.fillStyle = '#ff9cc4';
    c.font = '600 34px Poppins, Arial, sans-serif';
    c.fillText('💌 TIENES UN MENSAJE SECRETO', W / 2, 140);
    c.fillStyle = '#fff4f8';
    c.font = 'italic 600 60px "Playfair Display", Georgia, serif';
    var para = datos.para ? 'Para ' + datos.para : 'Para ti';
    partirTexto(c, para, W - 160).slice(0, 2).forEach(function (l, i) { c.fillText(l, W / 2, 230 + i * 70); });
    return dibujarQR(datos.url, 560, {}).then(function (qr) {
      c.fillStyle = '#ffffff';
      redondeado(c, (W - 600) / 2, 330, 600, 600, 32); c.fill();
      c.drawImage(qr, (W - 560) / 2, 350, 560, 560);
      c.fillStyle = '#ffe6f0';
      c.font = '400 32px Poppins, Arial, sans-serif';
      c.fillText('Escanéame con la cámara de tu celular', W / 2, 1000);
      c.fillStyle = '#e9c46a';
      c.font = 'italic 600 44px "Playfair Display", Georgia, serif';
      c.fillText('Cake Chávez', W / 2, 1080);
      c.fillStyle = 'rgba(255,230,240,.7)';
      c.font = '400 24px Poppins, Arial, sans-serif';
      c.fillText('Dulces momentos, horneados con amor ♡', W / 2, 1125);
      return canvas;
    });
  }

  function aBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) { canvas.toBlob(function (b) { resolve(b); }, 'image/png'); return; }
      var datos = canvas.toDataURL('image/png').split(',');
      var bin = atob(datos[1]), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      resolve(new Blob([arr], { type: 'image/png' }));
    });
  }

  function descargar(canvas, nombre) {
    return aBlob(canvas).then(function (blob) {
      var a = document.createElement('a');
      var url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
      a.href = url; a.download = nombre || 'cake-chavez-qr.png';
      document.body.appendChild(a); a.click(); a.remove();
      if (blob) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  }

  // Comparte la imagen (WhatsApp, etc.) en celulares compatibles; si no, la descarga.
  function compartir(canvas, nombre, texto) {
    return aBlob(canvas).then(function (blob) {
      var archivo = null;
      try { archivo = new File([blob], nombre || 'cake-chavez-qr.png', { type: 'image/png' }); } catch (e) { archivo = null; }
      if (archivo && navigator.canShare && navigator.share && navigator.canShare({ files: [archivo] })) {
        return navigator.share({ files: [archivo], text: texto || '', title: 'Cake Chávez' }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          return descargar(canvas, nombre);
        });
      }
      return descargar(canvas, nombre);
    });
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto);
    return new Promise(function (resolve) {
      var t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e) { /* nada */ }
      t.remove(); resolve();
    });
  }

  w.CakeQR = {
    urlBaseSitio: urlBaseSitio,
    urlRegalo: function (token) { return urlBaseSitio() + 'regalo.html?t=' + encodeURIComponent(token); },
    urlFotos: function () { return urlBaseSitio() + 'fotos.html'; },
    dibujar: dibujarQR,
    tarjetaRegalo: tarjetaRegalo,
    descargar: descargar,
    compartir: compartir,
    copiar: copiar,
    aBlob: aBlob
  };
})();
