/* Página de fotos de clientes: bienvenida animada + ventanita para subir fotos.
   Las fotos quedan «pendientes» hasta que Cake Chávez las confirma en el panel. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var archivos = [];
  var client = null;
  var MAX = 5;

  function estado(texto, error) { var e = $('fotos-estado'); e.textContent = texto || ''; e.className = 'fotos-estado' + (error ? ' error' : ''); }
  function abrir() { $('fotos-modal').hidden = false; $('fotos-modal').setAttribute('aria-hidden', 'false'); }
  function cerrar() { $('fotos-modal').hidden = true; $('fotos-modal').setAttribute('aria-hidden', 'true'); }
  function esImagen(f) { return window.cakeEsImagen ? window.cakeEsImagen(f) : /^image\//.test(f.type || ''); }
  function pintarPrevias() {
    var cont = $('fotos-previas'); cont.replaceChildren();
    archivos.forEach(function (a, i) {
      var d = document.createElement('div');
      var img = document.createElement('img'); img.src = a.vista; img.alt = 'Foto ' + (i + 1);
      img.onerror = function () { img.replaceWith(document.createTextNode('📷')); };
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar foto');
      x.addEventListener('click', function () { URL.revokeObjectURL(a.vista); archivos.splice(i, 1); pintarPrevias(); });
      d.appendChild(img); d.appendChild(x); cont.appendChild(d);
    });
  }
  function uuid() { return window.cakeUUID ? window.cakeUUID() : Date.now() + '-' + Math.random().toString(16).slice(2); }

  async function enviar(ev) {
    ev.preventDefault();
    if (!client) { estado('No hay conexión con Cake Chávez. Inténtalo más tarde.', true); return; }
    var nombre = $('fotos-nombre').value.trim();
    var mensaje = $('fotos-mensaje').value.trim();
    if (!archivos.length) { estado('Elige al menos una foto.', true); return; }
    if (nombre.length < 2) { estado('Escribe tu nombre.', true); $('fotos-nombre').focus(); return; }
    if (!$('fotos-permiso').checked) { estado('Marca la casilla de autorización para enviar.', true); return; }
    var boton = $('fotos-enviar'); boton.disabled = true;
    var enviadas = 0;
    try {
      for (var i = 0; i < archivos.length; i++) {
        estado('Preparando y subiendo foto ' + (i + 1) + ' de ' + archivos.length + '…');
        var lista = window.cakePrepararImagen ? await window.cakePrepararImagen(archivos[i].file, { maxLado: 1800 }) : archivos[i].file;
        if (lista.size > 5 * 1024 * 1024) throw new Error('Una foto es muy pesada. Elige otra o toma una captura.');
        var ext = window.cakeExtensionImagen ? window.cakeExtensionImagen(lista) : (/png/.test(lista.type) ? 'png' : /webp/.test(lista.type) ? 'webp' : 'jpg');
        var ruta = 'clientes-felices/' + uuid() + '.' + ext;
        var sub = await client.storage.from('product-images').upload(ruta, lista, { cacheControl: '31536000', upsert: false, contentType: lista.type || 'image/jpeg' });
        if (sub.error) throw sub.error;
        var url = client.storage.from('product-images').getPublicUrl(sub.data.path).data.publicUrl;
        var ins = await client.from('cake_customer_photos').insert({ customer_name: nombre.slice(0, 80), message: mensaje.slice(0, 400), image_url: url });
        if (ins.error) throw ins.error;
        enviadas++;
      }
      archivos.forEach(function (a) { URL.revokeObjectURL(a.vista); });
      archivos = []; pintarPrevias();
      $('fotos-form').hidden = true; $('fotos-exito').hidden = false;
      estado('');
    } catch (e) {
      console.error(e);
      estado((enviadas ? 'Se enviaron ' + enviadas + ' foto(s), pero otra falló. ' : 'No se pudo enviar. ') + (e && e.message && /pesada|foto/i.test(e.message) ? e.message : 'Revisa tu internet e inténtalo de nuevo.'), true);
    } finally { boton.disabled = false; }
  }

  function cargarGaleria() {
    if (!client) return;
    client.from('cake_customer_photos').select('image_url,customer_name').eq('status', 'aprobada').order('created_at', { ascending: false }).limit(6).then(function (r) {
      if (r.error || !r.data || !r.data.length) return;
      var g = $('fotos-galeria-grid');
      r.data.forEach(function (f) { var img = document.createElement('img'); img.src = f.image_url; img.alt = f.customer_name ? 'Foto de ' + f.customer_name : 'Cliente feliz'; img.loading = 'lazy'; img.onerror = function () { img.remove(); }; g.appendChild(img); });
      $('fotos-galeria').hidden = false;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    try { client = window.getCakeSupabaseClient ? window.getCakeSupabaseClient() : null; } catch (e) { client = null; }
    if (window.CakeAnimaciones) window.CakeAnimaciones.iniciar($('fotos-lienzo'), 'corazones', { fondo: false });
    setTimeout(function () { var b = $('fotos-bienvenida'); if (b) b.remove(); }, 3200);
    $('fotos-abrir').addEventListener('click', abrir);
    $('fotos-cerrar').addEventListener('click', cerrar);
    $('fotos-modal').addEventListener('click', function (e) { if (e.target === $('fotos-modal')) cerrar(); });
    $('fotos-archivos').addEventListener('change', function (e) {
      var nuevos = Array.prototype.slice.call(e.target.files || []).filter(esImagen);
      e.target.value = '';
      if (!nuevos.length) { estado('Elige fotografías de tu galería.', true); return; }
      nuevos.forEach(function (f) { if (archivos.length < MAX) archivos.push({ file: f, vista: URL.createObjectURL(f) }); });
      pintarPrevias();
      estado(archivos.length >= MAX ? 'Máximo ' + MAX + ' fotos por envío.' : archivos.length + ' foto(s) lista(s).');
    });
    $('fotos-form').addEventListener('submit', enviar);
    $('fotos-otra').addEventListener('click', function () { $('fotos-exito').hidden = true; $('fotos-form').hidden = false; });
    cargarGaleria();
    // Si viene directo del QR, abre la ventanita después de la bienvenida.
    setTimeout(abrir, 2700);
  });
})();
