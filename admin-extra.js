/* =========================================================
   ADMIN-EXTRA.JS — pestañas «Carrusel» y «Navidad» del panel.
   - Carrusel: imágenes debajo del logo (tabla cake_carousel_slides).
   - Navidad: textos y productos de la ventanita navideña
     (tablas cake_christmas_settings y cake_christmas_items).
   La seguridad real la dan Supabase Auth + admin_users + RLS.
   ========================================================= */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const BUCKET = 'product-images';
  const SQL_HINT = 'Primero ejecuta en Supabase el archivo supabase/navidad_carrusel_fotos.sql (incluido en el ZIP).';
  let client = null;
  let slides = [];
  let carouselFiles = [];
  let xmasItems = [];
  let xmasGallery = []; // { url } guardadas o { file, preview } nuevas
  let xmasRemoved = [];
  const loaded = { carousel: false, navidad: false };

  function msg(id, text, type = '') {const el = $(id);if (!el) return;el.textContent = text;el.className = `admin-message ${type}`.trim();}
  function fmtQ(v) {return `Q${(Number(v) || 0).toFixed(2)}`;}
  function friendly(error) {
    const text = String(error && error.message ? error.message : error || 'Error desconocido');
    if (/does not exist|schema cache|relation .* does not exist|42P01|PGRST205/i.test(text)) return `${SQL_HINT} (Detalle: ${text})`;
    if (/row-level security|permission denied|not allowed/i.test(text)) return `Tu usuario no tiene permiso para guardar. Revisa que esté en admin_users y que ejecutaste el SQL nuevo. (Detalle: ${text})`;
    return text;
  }
  const newUUID = () => window.cakeUUID ? window.cakeUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  function isImage(file) {return !!file && (window.cakeEsImagen ? window.cakeEsImagen(file) : /^image\//i.test(file.type)) && file.size <= 25 * 1024 * 1024;}
  async function upload(file, folder) {
    const ready = window.cakePrepararImagen ? await window.cakePrepararImagen(file, { maxLado: 2000 }) : file;
    if (ready.size > 5 * 1024 * 1024) throw new Error('Una foto sigue siendo muy pesada. Elige otra o toma una captura de pantalla.');
    const name = String(ready.name || 'foto.jpg').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-80) || 'foto.jpg';
    const path = `${folder}/${newUUID()}/${name}`;
    const { data, error } = await client.storage.from(BUCKET).upload(path, ready, { cacheControl: '31536000', upsert: false, contentType: ready.type || 'image/jpeg' });
    if (error) throw error;
    return client.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
  }
  function storagePath(url) {
    const m = String(url || '').match(/\/storage\/v1\/object\/(?:public|sign)\/product-images\/([^?#]+)/);
    if (!m) return null;
    try {return decodeURIComponent(m[1]);} catch (_) {return m[1];}
  }
  async function removeFiles(urls, folder) {
    const paths = urls.map(storagePath).filter((p) => p && p.startsWith(`${folder}/`));
    if (!paths.length) return;
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error) console.warn('No se pudieron borrar algunas fotos del almacenamiento:', error.message);
  }
  function tile(src, onRemove, isNew) {
    const box = document.createElement('div');box.className = 'admin-photo-tile' + (isNew ? ' is-new' : '');
    const img = document.createElement('img');img.src = src;img.alt = 'Foto';img.loading = 'lazy';
    img.onerror = () => {img.replaceWith(Object.assign(document.createElement('span'), { className: 'admin-photo-name', textContent: 'Foto' }));};
    box.appendChild(img);
    if (onRemove) {
      const x = document.createElement('button');x.type = 'button';x.className = 'admin-photo-remove';x.textContent = '×';x.setAttribute('aria-label', 'Quitar foto');
      x.addEventListener('click', onRemove);box.appendChild(x);
    }
    if (isNew) box.appendChild(Object.assign(document.createElement('span'), { className: 'admin-photo-tag', textContent: 'Nueva' }));
    return box;
  }
  function button(text, cls, onClick, label) {
    const b = document.createElement('button');b.type = 'button';b.className = `admin-button ${cls}`;b.innerHTML = text;
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);return b;
  }

  /* =================== CARRUSEL =================== */
  function renderCarouselPreview() {
    const grid = $('carousel-image-preview');if (!grid) return;grid.replaceChildren();
    const editing = slides.find((s) => s.id === $('carousel-id').value);
    if (editing && !carouselFiles.length) grid.appendChild(tile(editing.image_url, null, false));
    carouselFiles.forEach((item, i) => grid.appendChild(tile(item.preview, () => {URL.revokeObjectURL(item.preview);carouselFiles.splice(i, 1);renderCarouselPreview();}, true)));
  }
  function resetCarouselForm() {
    $('carousel-form').reset();$('carousel-id').value = '';$('carousel-active').checked = true;
    $('carousel-form-title').textContent = 'Agregar imagen al carrusel';
    $('carousel-image').multiple = true;
    $('carousel-order').value = String((slides.length + 1) * 10);
    carouselFiles.forEach((f) => URL.revokeObjectURL(f.preview));carouselFiles = [];
    renderCarouselPreview();msg('carousel-message', '');
  }
  function fillCarousel(slide) {var _slide$display_order;
    resetCarouselForm();
    $('carousel-id').value = slide.id;$('carousel-form-title').textContent = 'Editar imagen del carrusel';
    $('carousel-image').multiple = false;
    $('carousel-title').value = slide.title || '';$('carousel-subtitle').value = slide.subtitle || '';
    $('carousel-order').value = (_slide$display_order = slide.display_order) != null ? _slide$display_order : 10;$('carousel-active').checked = slide.is_active !== false;
    renderCarouselPreview();
    $('carousel-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function loadCarousel() {
    const list = $('carousel-list');list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando imágenes…' }));
    const { data, error } = await client.from('cake_carousel_slides').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) {list.replaceChildren(Object.assign(document.createElement('p'), { textContent: friendly(error) }));return;}
    slides = data || [];loaded.carousel = true;list.replaceChildren();
    if (!$('carousel-id').value) $('carousel-order').value = String((slides.length + 1) * 10);
    if (!slides.length) {
      list.appendChild(Object.assign(document.createElement('p'), { className: 'admin-order-hint', textContent: 'Todavía no agregaste imágenes. Mientras tanto, la tienda muestra las fotos de tus productos en el carrusel.' }));
      return;
    }
    list.appendChild(Object.assign(document.createElement('p'), { className: 'admin-order-hint', textContent: `La tienda muestra ${slides.filter((s) => s.is_active !== false).length} imagen(es) en este orden. Usa las flechas para cambiar el orden.` }));
    slides.forEach((slide, index) => {
      const row = document.createElement('article');row.className = 'admin-carousel-row' + (slide.is_active === false ? ' is-hidden' : '');
      const img = document.createElement('img');img.src = slide.image_url;img.alt = slide.title || 'Imagen del carrusel';img.loading = 'lazy';
      const meta = document.createElement('div');meta.className = 'admin-product-meta';
      meta.append(Object.assign(document.createElement('strong'), { textContent: slide.title || `Imagen ${index + 1}` }),
      Object.assign(document.createElement('span'), { textContent: slide.subtitle || 'Sin texto' }),
      Object.assign(document.createElement('small'), { textContent: slide.is_active === false ? 'Oculta' : 'Visible en la tienda' }));
      const actions = document.createElement('div');actions.className = 'admin-row-actions';
      actions.append(
        button('<i class="fas fa-arrow-up"></i>', 'admin-button-outline', () => moveSlide(index, -1), 'Subir'),
        button('<i class="fas fa-arrow-down"></i>', 'admin-button-outline', () => moveSlide(index, 1), 'Bajar'),
        button('Editar', 'admin-button-outline', () => fillCarousel(slide)),
        button(slide.is_active === false ? 'Mostrar' : 'Ocultar', 'admin-button-outline', () => toggleSlide(slide)),
        button('Eliminar', 'admin-button-danger', () => deleteSlide(slide))
      );
      row.append(img, meta, actions);list.appendChild(row);
    });
  }
  async function moveSlide(index, step) {
    const other = index + step;if (other < 0 || other >= slides.length) return;
    // Renumera todo de 10 en 10 para que el orden quede limpio.
    const ordered = slides.slice();const tmp = ordered[index];ordered[index] = ordered[other];ordered[other] = tmp;
    const updates = ordered.map((s, i) => client.from('cake_carousel_slides').update({ display_order: (i + 1) * 10, updated_at: new Date().toISOString() }).eq('id', s.id));
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) msg('carousel-message', friendly(failed.error), 'error');
    await loadCarousel();
  }
  async function toggleSlide(slide) {
    const { error } = await client.from('cake_carousel_slides').update({ is_active: slide.is_active === false, updated_at: new Date().toISOString() }).eq('id', slide.id);
    if (error) {msg('carousel-message', friendly(error), 'error');return;}
    await loadCarousel();
  }
  async function deleteSlide(slide) {
    if (!confirm('¿Eliminar esta imagen del carrusel?')) return;
    const { error } = await client.from('cake_carousel_slides').delete().eq('id', slide.id);
    if (error) {msg('carousel-message', friendly(error), 'error');return;}
    await removeFiles([slide.image_url], 'carousel');
    if ($('carousel-id').value === slide.id) resetCarouselForm();
    msg('carousel-message', 'Imagen eliminada.', 'success');
    await loadCarousel();
  }
  async function saveCarousel(event) {
    event.preventDefault();
    const id = $('carousel-id').value;
    const submit = $('carousel-form').querySelector('[type=submit]');submit.disabled = true;
    const uploaded = [];
    try {
      const base = { title: $('carousel-title').value.trim(), subtitle: $('carousel-subtitle').value.trim(), is_active: $('carousel-active').checked, updated_at: new Date().toISOString() };
      let order = Number($('carousel-order').value) || 10;
      if (id) {
        const current = slides.find((s) => s.id === id);
        const payload = Object.assign(Object.assign({}, base), {}, { display_order: order });
        if (carouselFiles[0]) {msg('carousel-message', 'Subiendo foto…');const url = await upload(carouselFiles[0].file, 'carousel');uploaded.push(url);payload.image_url = url;}
        const { error } = await client.from('cake_carousel_slides').update(payload).eq('id', id);
        if (error) throw error;
        if (payload.image_url && current) await removeFiles([current.image_url], 'carousel');
        msg('carousel-message', 'Imagen actualizada.', 'success');
      } else {
        if (!carouselFiles.length) throw new Error('Elige al menos una fotografía.');
        for (let i = 0; i < carouselFiles.length; i++) {
          msg('carousel-message', `Subiendo foto ${i + 1} de ${carouselFiles.length}…`);
          const url = await upload(carouselFiles[i].file, 'carousel');uploaded.push(url);
          const { error } = await client.from('cake_carousel_slides').insert(Object.assign(Object.assign({}, base), {}, { image_url: url, display_order: order }));
          if (error) throw error;
          order += 10;
        }
        msg('carousel-message', `${uploaded.length} imagen(es) agregada(s) al carrusel.`, 'success');
      }
      const okText = $('carousel-message').textContent;
      resetCarouselForm();msg('carousel-message', okText, 'success');
      await loadCarousel();
    } catch (error) {
      msg('carousel-message', friendly(error), 'error');
    } finally {submit.disabled = false;}
  }

  /* =================== NAVIDAD =================== */
  async function loadXmasSettings() {
    const { data, error } = await client.from('cake_christmas_settings').select('*').eq('id', 1).maybeSingle();
    if (error) {msg('xmas-settings-message', friendly(error), 'error');return;}
    if (data) {
      $('xmas-enabled').checked = data.is_enabled !== false;
      $('xmas-eyebrow').value = data.eyebrow || '';$('xmas-title').value = data.title || '';
      $('xmas-subtitle').value = data.subtitle || '';$('xmas-note').value = data.footer_note || '';
    }
  }
  async function saveXmasSettings(event) {
    event.preventDefault();msg('xmas-settings-message', 'Guardando…');
    const payload = { id: 1, is_enabled: $('xmas-enabled').checked, eyebrow: $('xmas-eyebrow').value.trim(), title: $('xmas-title').value.trim(), subtitle: $('xmas-subtitle').value.trim(), footer_note: $('xmas-note').value.trim(), updated_at: new Date().toISOString() };
    const { error } = await client.from('cake_christmas_settings').upsert(payload, { onConflict: 'id' });
    if (error) {msg('xmas-settings-message', friendly(error), 'error');return;}
    msg('xmas-settings-message', 'Textos guardados. La tienda ya los muestra.', 'success');
  }
  function renderXmasGallery() {
    const grid = $('xmas-item-gallery');if (!grid) return;grid.replaceChildren();
    xmasGallery.forEach((photo, i) => grid.appendChild(tile(photo.preview || photo.url, () => {
      if (photo.url) xmasRemoved.push(photo.url);
      if (photo.preview) URL.revokeObjectURL(photo.preview);
      xmasGallery.splice(i, 1);renderXmasGallery();
    }, !!photo.file)));
  }
  function resetXmasForm() {
    $('xmas-item-form').reset();$('xmas-item-id').value = '';$('xmas-item-active').checked = true;
    $('xmas-item-title').textContent = 'Agregar producto navideño';
    $('xmas-item-order').value = String((xmasItems.length + 1) * 10);
    xmasGallery.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));xmasGallery = [];xmasRemoved = [];
    renderXmasGallery();msg('xmas-item-message', '');
  }
  function fillXmas(item) {var _item$price, _item$price_small, _item$price_medium, _item$price_large, _item$display_order;
    resetXmasForm();
    $('xmas-item-id').value = item.id;$('xmas-item-title').textContent = `Editar: ${item.name}`;
    $('xmas-item-name').value = item.name || '';$('xmas-item-badge').value = item.badge || '';
    $('xmas-item-description').value = item.description || '';$('xmas-item-price').value = (_item$price = item.price) != null ? _item$price : 0;
    $('xmas-item-price-small').value = (_item$price_small = item.price_small) != null ? _item$price_small : '';$('xmas-item-price-medium').value = (_item$price_medium = item.price_medium) != null ? _item$price_medium : '';$('xmas-item-price-large').value = (_item$price_large = item.price_large) != null ? _item$price_large : '';
    $('xmas-item-order').value = (_item$display_order = item.display_order) != null ? _item$display_order : 10;$('xmas-item-active').checked = item.is_active !== false;
    xmasGallery = [item.image_url, ...(Array.isArray(item.gallery_urls) ? item.gallery_urls : [])].filter(Boolean).map((url) => ({ url }));
    renderXmasGallery();
    $('xmas-item-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function loadXmasItems() {
    const list = $('xmas-items-list');list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando productos…' }));
    const { data, error } = await client.from('cake_christmas_items').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) {list.replaceChildren(Object.assign(document.createElement('p'), { textContent: friendly(error) }));return;}
    xmasItems = data || [];loaded.navidad = true;list.replaceChildren();
    if (!$('xmas-item-id').value) $('xmas-item-order').value = String((xmasItems.length + 1) * 10);
    if (!xmasItems.length) {list.appendChild(Object.assign(document.createElement('p'), { className: 'admin-order-hint', textContent: 'Todavía no hay productos navideños. Agrega el primero con el formulario.' }));return;}
    xmasItems.forEach((item) => {
      const row = document.createElement('article');row.className = 'admin-product-row';
      const img = document.createElement('img');img.src = item.image_url || '';img.alt = item.name || 'Producto';img.loading = 'lazy';img.onerror = () => {img.style.visibility = 'hidden';};
      const sizes = [item.price_small, item.price_medium, item.price_large].map(Number).filter((v) => v > 0);
      const meta = document.createElement('div');meta.className = 'admin-product-meta';
      meta.append(Object.assign(document.createElement('strong'), { textContent: item.name || '' }),
      Object.assign(document.createElement('span'), { textContent: sizes.length ? `Desde ${fmtQ(Math.min(...sizes))} (con tamaños)` : Number(item.price) > 0 ? fmtQ(item.price) : 'Sin precio: se consulta por WhatsApp' }),
      Object.assign(document.createElement('small'), { textContent: [item.is_active === false ? 'Oculto' : 'Publicado', item.badge || ''].filter(Boolean).join(' · ') }));
      const actions = document.createElement('div');actions.className = 'admin-row-actions';
      actions.append(
        button('Editar', 'admin-button-outline', () => fillXmas(item)),
        button(item.is_active === false ? 'Publicar' : 'Ocultar', 'admin-button-outline', () => toggleXmas(item)),
        button('Eliminar', 'admin-button-danger', () => deleteXmas(item))
      );
      row.append(img, meta, actions);list.appendChild(row);
    });
  }
  async function toggleXmas(item) {
    const { error } = await client.from('cake_christmas_items').update({ is_active: item.is_active === false, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) {msg('xmas-item-message', friendly(error), 'error');return;}
    await loadXmasItems();
  }
  async function deleteXmas(item) {
    if (!confirm(`¿Eliminar «${item.name}» de las especialidades navideñas?`)) return;
    const { error } = await client.from('cake_christmas_items').delete().eq('id', item.id);
    if (error) {msg('xmas-item-message', friendly(error), 'error');return;}
    await removeFiles([item.image_url, ...(Array.isArray(item.gallery_urls) ? item.gallery_urls : [])], 'navidad');
    if ($('xmas-item-id').value === item.id) resetXmasForm();
    msg('xmas-item-message', 'Producto eliminado.', 'success');
    await loadXmasItems();
  }
  const numOrNull = (id) => {const v = $(id).value.trim();return v === '' ? null : Math.max(0, Number(v) || 0);};
  async function saveXmas(event) {
    event.preventDefault();
    const submit = $('xmas-item-form').querySelector('[type=submit]');submit.disabled = true;
    const uploaded = [];
    try {
      const name = $('xmas-item-name').value.trim();
      if (!name) throw new Error('Escribe el nombre del producto.');
      const urls = [];
      for (let i = 0; i < xmasGallery.length; i++) {
        const photo = xmasGallery[i];
        if (photo.file) {msg('xmas-item-message', `Subiendo foto ${i + 1} de ${xmasGallery.length}…`);const url = await upload(photo.file, 'navidad');uploaded.push(url);urls.push(url);} else
        if (photo.url) urls.push(photo.url);
      }
      if (!urls.length) throw new Error('Agrega al menos una fotografía del producto.');
      const payload = {
        name, badge: $('xmas-item-badge').value.trim(), description: $('xmas-item-description').value.trim(),
        price: Math.max(0, Number($('xmas-item-price').value) || 0),
        price_small: numOrNull('xmas-item-price-small'), price_medium: numOrNull('xmas-item-price-medium'), price_large: numOrNull('xmas-item-price-large'),
        image_url: urls[0], gallery_urls: urls.slice(1, 6),
        display_order: Number($('xmas-item-order').value) || 10, is_active: $('xmas-item-active').checked, updated_at: new Date().toISOString()
      };
      const id = $('xmas-item-id').value;
      const { error } = id ? await client.from('cake_christmas_items').update(payload).eq('id', id) : await client.from('cake_christmas_items').insert(payload);
      if (error) throw error;
      await removeFiles(xmasRemoved.filter((url) => !urls.includes(url)), 'navidad');
      resetXmasForm();msg('xmas-item-message', 'Producto navideño guardado. Ya aparece en la tienda.', 'success');
      await loadXmasItems();
    } catch (error) {
      if (uploaded.length) await removeFiles(uploaded, 'navidad');
      msg('xmas-item-message', friendly(error), 'error');
    } finally {submit.disabled = false;}
  }

  /* =================== ARRANQUE =================== */
  function onTab(tab) {
    if (tab === 'carousel' && !loaded.carousel) loadCarousel();
    if (tab === 'navidad' && !loaded.navidad) {loadXmasSettings();loadXmasItems();}
  }
  document.addEventListener('DOMContentLoaded', () => {
    try {client = window.getCakeSupabaseClient ? window.getCakeSupabaseClient() : null;} catch (_) {client = null;}
    if (!client || !$('carousel-form')) return;
    document.querySelectorAll('[data-admin-tab]').forEach((b) => b.addEventListener('click', () => onTab(b.dataset.adminTab)));
    $('carousel-form').addEventListener('submit', saveCarousel);
    $('carousel-cancel').addEventListener('click', resetCarouselForm);
    $('carousel-refresh').addEventListener('click', loadCarousel);
    $('carousel-image').addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []).filter(isImage);event.target.value = '';
      if (!files.length) {msg('carousel-message', 'Elige fotografías (máximo 25 MB cada una).', 'error');return;}
      if ($('carousel-id').value) {carouselFiles.forEach((f) => URL.revokeObjectURL(f.preview));carouselFiles = [{ file: files[0], preview: URL.createObjectURL(files[0]) }];} else
      files.slice(0, 12).forEach((file) => carouselFiles.push({ file, preview: URL.createObjectURL(file) }));
      renderCarouselPreview();msg('carousel-message', 'Fotos listas. Pulsa «Guardar».');
    });
    $('xmas-settings-form').addEventListener('submit', saveXmasSettings);
    $('xmas-item-form').addEventListener('submit', saveXmas);
    $('xmas-item-cancel').addEventListener('click', resetXmasForm);
    $('xmas-refresh').addEventListener('click', () => {loadXmasSettings();loadXmasItems();});
    $('xmas-item-images').addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []).filter(isImage);event.target.value = '';
      if (!files.length) {msg('xmas-item-message', 'Elige fotografías (máximo 25 MB cada una).', 'error');return;}
      files.forEach((file) => {if (xmasGallery.length < 6) xmasGallery.push({ file, preview: URL.createObjectURL(file) });});
      renderXmasGallery();msg('xmas-item-message', xmasGallery.length >= 6 ? 'Máximo 6 fotos por producto.' : 'Fotos listas. Pulsa «Guardar producto».');
    });
  });
})();
