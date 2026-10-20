/*
 * Cake Chavez — modo de edición visual.
 * La tienda pública se ve igual; los controles se muestran únicamente a usuarios
 * autenticados que también aparecen en public.admin_users.
 */
(() => {
  'use strict';

  const CATEGORIES = [
    ['pasteles', 'Añadir pastel'],
    ['postres', 'Añadir postre'],
    ['galletas', 'Añadir galletas'],
    ['bocaditos', 'Añadir bocaditos'],
    ['especiales', 'Añadir especial']
  ];
  const $ = id => document.getElementById(id);
  const state = { client: null, user: null, isAdmin: false, modalTarget: null, productsObserver: null, contentAvailable: true };
  const CONTENT_SELECTOR = 'h1, h2, h3, h4, p, .catalogo-etiqueta, .destacados-etiqueta, .seccion-etiqueta, .destacado-sello, .catalogo-beneficios span, .cake-tematica-card strong, .cake-tematica-card small, footer > p';
  const EXCLUDED_SELECTOR = [
    '#productos-container', '.producto', '.cake-ofertas-grid', '.galeria-inspiracion-grid',
    '#cake-opiniones-publicadas', '#cake-asistente', '.carrito-lateral', '.overlay-modal', 'form', 'nav',
    '#carrusel-slides-wrapper', '.carrusel-slide', '.cake-editor-ui', '.cake-editor-modal',
    '#cake-info-entrega', '#cake-info-pagos', '#cake-info-anticipacion'
  ].join(',');

  function clientFromConfig() {
    try { return typeof window.getCakeSupabaseClient === 'function' ? window.getCakeSupabaseClient() : null; }
    catch (_) { return null; }
  }

  function scopeFor(element) {
    const root = element.closest('section, header, footer');
    if (!root) return 'body';
    if (root.id) return `${root.tagName.toLowerCase()}#${root.id}`;
    const classes = Array.from(root.classList).filter(c => c !== 'animar-entrada-top').sort().join('.');
    const siblings = Array.from(root.parentElement?.children || []).filter(el => el.tagName === root.tagName);
    return `${root.tagName.toLowerCase()}.${classes || 'sin-clase'}:${siblings.indexOf(root)}`;
  }

  function getContentTargets() {
    const all = Array.from(document.querySelectorAll(`${CONTENT_SELECTOR}, img`));
    const counters = new Map();
    return all.filter(el => {
      if (el.closest(EXCLUDED_SELECTOR)) return false;
      if (el.matches('img')) {
        if (el.classList.contains('img-producto') || el.classList.contains('destacado-imagen')) return false;
        if (!el.getAttribute('src')) return false;
        return true;
      }
      // Only plain-text blocks are editable here; avoid replacing icons, links or embedded controls.
      if (el.children.length > 0) return false;
      if (!el.textContent.trim()) return false;
      return true;
    }).map(el => {
      const kind = el.matches('img') ? 'image' : 'text';
      const keyScope = `${scopeFor(el)}|${kind}`;
      const index = counters.get(keyScope) || 0;
      counters.set(keyScope, index + 1);
      const key = `v1:${keyScope}:${index}`;
      el.dataset.cakeContentKey = key;
      return { el, key, kind };
    });
  }

  function safeImageUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^https:\/\//i.test(url) || /^http:\/\//i.test(url) || /^(\.\.\/|\.\/|img\/)/i.test(url)) return url;
    return '';
  }

  function setTargetValue(target, value, keepEditorControl = false) {
    if (!target || !value) return;
    if (target.kind === 'text' && typeof value.text === 'string') {
      const control = keepEditorControl ? target.el.querySelector(':scope > .cake-editor-action') : null;
      target.el.textContent = value.text;
      if (control) target.el.appendChild(control);
    } else if (target.kind === 'image') {
      const src = safeImageUrl(value.src);
      if (src) target.el.src = src;
      if (typeof value.alt === 'string') target.el.alt = value.alt;
    }
  }

  function toast(text, kind = 'info') {
    let node = $('cake-editor-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'cake-editor-toast';
      node.className = 'cake-editor-toast cake-editor-ui';
      node.setAttribute('role', 'status');
      document.body.appendChild(node);
    }
    node.textContent = text;
    node.dataset.kind = kind;
    node.classList.add('visible');
    window.clearTimeout(node._hideTimer);
    node._hideTimer = window.setTimeout(() => node.classList.remove('visible'), 4200);
  }

  async function loadAndApplyContent(targets) {
    const client = state.client;
    if (!client) return;
    const { data, error } = await client.from('site_content').select('content_key, content_value');
    if (error) {
      state.contentAvailable = false;
      console.info('La edición visual de textos necesita la tabla site_content. La tienda seguirá funcionando.', error.message);
      return;
    }
    const saved = new Map((data || []).map(row => [row.content_key, row.content_value || {}]));
    targets.forEach(target => setTargetValue(target, saved.get(target.key)));
  }

  function makeEditorUI() {
    if ($('cake-editor-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'cake-editor-toolbar';
    toolbar.className = 'cake-editor-toolbar cake-editor-ui';
    toolbar.innerHTML = `
      <div class="cake-editor-brand"><span class="cake-editor-mark">✦</span><span><strong>Modo edición</strong><small>Solo tú ves estas herramientas</small></span></div>
      <div class="cake-editor-toolbar-actions">
        <button type="button" id="cake-editor-add-product" class="cake-editor-primary">＋ Añadir producto</button>
        <a href="admin.html?panel=1" class="cake-editor-secondary">Panel avanzado</a>
        <button type="button" id="cake-editor-logout" class="cake-editor-logout">Salir</button>
      </div>`;
    document.body.appendChild(toolbar);

    const contentModal = document.createElement('div');
    contentModal.id = 'cake-editor-content-modal';
    contentModal.className = 'cake-editor-modal cake-editor-ui';
    contentModal.hidden = true;
    contentModal.innerHTML = `
      <div class="cake-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="cake-editor-content-title">
        <button type="button" class="cake-editor-close" data-close-content aria-label="Cerrar">×</button>
        <span class="cake-editor-kicker">CAKE CHÁVEZ · EDICIÓN VISUAL</span>
        <h2 id="cake-editor-content-title">Editar contenido</h2>
        <form id="cake-editor-content-form">
          <div id="cake-editor-text-fields">
            <label for="cake-editor-text-value">Texto que se verá en la página</label>
            <textarea id="cake-editor-text-value" rows="4" maxlength="2000"></textarea>
          </div>
          <div id="cake-editor-image-fields" hidden>
            <label for="cake-editor-image-file">Elegir una imagen nueva</label>
            <input id="cake-editor-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
            <small>JPG, PNG, WebP o GIF. Máximo 5 MB. También puedes pegar una URL segura.</small>
            <label for="cake-editor-image-url">URL de la imagen (opcional)</label>
            <input id="cake-editor-image-url" type="text" placeholder="https://… o img/mi-foto.jpg">
            <label for="cake-editor-image-alt">Descripción de la imagen</label>
            <input id="cake-editor-image-alt" type="text" maxlength="240">
          </div>
          <p id="cake-editor-content-message" class="cake-editor-message" role="status"></p>
          <div class="cake-editor-form-actions">
            <button type="submit" class="cake-editor-primary">Guardar cambios</button>
            <button type="button" class="cake-editor-secondary" data-close-content>Cancelar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(contentModal);

    const productModal = document.createElement('div');
    productModal.id = 'cake-editor-product-modal';
    productModal.className = 'cake-editor-modal cake-editor-ui';
    productModal.hidden = true;
    productModal.innerHTML = `
      <div class="cake-editor-dialog cake-editor-product-dialog" role="dialog" aria-modal="true" aria-labelledby="cake-editor-product-title">
        <button type="button" class="cake-editor-close" data-close-product aria-label="Cerrar">×</button>
        <span class="cake-editor-kicker">CATÁLOGO · PRODUCTOS</span>
        <h2 id="cake-editor-product-title">Añadir producto</h2>
        <form id="cake-editor-product-form">
          <input id="cake-editor-product-id" type="hidden">
          <div class="cake-editor-form-grid">
            <div><label for="cake-editor-product-name">Nombre</label><input id="cake-editor-product-name" required maxlength="140"></div>
            <div><label for="cake-editor-product-category">Categoría</label><select id="cake-editor-product-category" required><option value="pasteles">Pasteles</option><option value="postres">Postres</option><option value="galletas">Galletas</option><option value="bocaditos">Bocaditos</option><option value="especiales">Especiales</option></select></div>
            <div><label for="cake-editor-product-slug">Enlace corto</label><input id="cake-editor-product-slug" required maxlength="140"></div>
            <div><label for="cake-editor-product-price">Precio base (Q)</label><input id="cake-editor-product-price" type="number" min="0" step="0.01" required></div>
            <div><label for="cake-editor-product-small">Precio pequeño (Q)</label><input id="cake-editor-product-small" type="number" min="0" step="0.01" placeholder="Opcional"></div>
            <div><label for="cake-editor-product-medium">Precio mediano (Q)</label><input id="cake-editor-product-medium" type="number" min="0" step="0.01" placeholder="Opcional"></div>
            <div><label for="cake-editor-product-large">Precio grande (Q)</label><input id="cake-editor-product-large" type="number" min="0" step="0.01" placeholder="Opcional"></div>
            <div><label for="cake-editor-product-sale">Precio de oferta (Q)</label><input id="cake-editor-product-sale" type="number" min="0" step="0.01" placeholder="Opcional"></div>
            <div class="cake-editor-full"><label for="cake-editor-product-description">Descripción</label><textarea id="cake-editor-product-description" rows="3" maxlength="1000"></textarea></div>
            <div class="cake-editor-full"><label for="cake-editor-product-image-url">Foto actual o URL de foto</label><input id="cake-editor-product-image-url" type="text" placeholder="https://… o img/pasteles/mi-foto.jpg"></div>
            <div class="cake-editor-full"><label for="cake-editor-product-images">Subir fotos desde tu computadora</label><input id="cake-editor-product-images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple><small>La primera foto será la principal; las demás se agregarán a la galería. Máximo 5 MB cada una.</small></div>
            <div class="cake-editor-full"><label for="cake-editor-product-gallery">Otras fotos (una URL por línea)</label><textarea id="cake-editor-product-gallery" rows="2" placeholder="https://…"></textarea></div>
            <div><label for="cake-editor-product-occasion">Temática u ocasión</label><input id="cake-editor-product-occasion" maxlength="140" placeholder="Cumpleaños, boda, flores…"></div>
            <div><label for="cake-editor-product-order">Orden de aparición</label><input id="cake-editor-product-order" type="number" step="1" value="100"></div>
            <div class="cake-editor-checks">
              <label><input id="cake-editor-product-sizes" type="checkbox"> Tiene varios tamaños</label>
              <label><input id="cake-editor-product-active" type="checkbox" checked> Publicado en la tienda</label>
              <label><input id="cake-editor-product-featured" type="checkbox"> Mostrar como destacado</label>
              <label><input id="cake-editor-product-offer" type="checkbox"> Incluir en ofertas</label>
            </div>
          </div>
          <p id="cake-editor-product-message" class="cake-editor-message" role="status"></p>
          <div class="cake-editor-form-actions"><button type="submit" class="cake-editor-primary">Guardar producto</button><button type="button" class="cake-editor-secondary" data-close-product>Cancelar</button></div>
        </form>
      </div>`;
    document.body.appendChild(productModal);
  }

  function contentValueFromElement(target) {
    if (target.kind === 'image') return { kind: 'image', src: target.el.getAttribute('src') || '', alt: target.el.getAttribute('alt') || '' };
    const clone = target.el.cloneNode(true);
    clone.querySelectorAll('.cake-editor-action').forEach(button => button.remove());
    return { kind: 'text', text: clone.textContent.trim() };
  }

  function openContentEditor(target) {
    state.modalTarget = target;
    const current = contentValueFromElement(target);
    $('cake-editor-content-title').textContent = target.kind === 'image' ? 'Cambiar imagen' : 'Editar texto';
    $('cake-editor-text-fields').hidden = target.kind !== 'text';
    $('cake-editor-image-fields').hidden = target.kind !== 'image';
    $('cake-editor-text-value').value = target.kind === 'text' ? current.text : '';
    $('cake-editor-image-file').value = '';
    $('cake-editor-image-url').value = target.kind === 'image' ? current.src : '';
    $('cake-editor-image-alt').value = target.kind === 'image' ? current.alt : '';
    $('cake-editor-content-message').textContent = '';
    $('cake-editor-content-modal').hidden = false;
    document.body.classList.add('cake-editor-modal-open');
    if (target.kind === 'text') $('cake-editor-text-value').focus();
  }

  async function uploadImage(file, folder) {
    if (!file) return '';
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Elige un archivo JPG, PNG, WebP o GIF de máximo 5 MB.');
    }
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-80) || 'foto';
    const path = `${folder}/${crypto.randomUUID()}/${safeName}`;
    const { data, error } = await state.client.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) throw error;
    return state.client.storage.from('product-images').getPublicUrl(data.path).data.publicUrl;
  }

  function closeContentModal() {
    $('cake-editor-content-modal').hidden = true;
    state.modalTarget = null;
    document.body.classList.remove('cake-editor-modal-open');
  }

  async function saveContent(event) {
    event.preventDefault();
    const target = state.modalTarget;
    if (!target || !state.user) return;
    const message = $('cake-editor-content-message');
    message.textContent = 'Guardando…';
    try {
      let contentValue;
      if (target.kind === 'text') {
        contentValue = { kind: 'text', text: $('cake-editor-text-value').value.trim() };
      } else {
        const file = $('cake-editor-image-file').files?.[0];
        let src = file ? await uploadImage(file, 'site-content') : safeImageUrl($('cake-editor-image-url').value);
        if (!src) throw new Error('Selecciona una imagen o coloca una URL segura.');
        contentValue = { kind: 'image', src, alt: $('cake-editor-image-alt').value.trim() };
      }
      const { error } = await state.client.from('site_content').upsert({
        content_key: target.key, content_value: contentValue,
        updated_at: new Date().toISOString(), updated_by: state.user.id
      }, { onConflict: 'content_key' });
      if (error) throw error;
      setTargetValue(target, contentValue, true);
      message.textContent = 'Cambios guardados. Ya se verán también para tus clientes.';
      toast('Contenido guardado correctamente.', 'success');
      window.setTimeout(closeContentModal, 550);
    } catch (error) {
      message.textContent = error?.message || 'No se pudieron guardar los cambios.';
      toast(message.textContent, 'error');
    }
  }

  function addTextEditControl(target) {
    if (target.el.querySelector(':scope > .cake-editor-action')) return;
    target.el.classList.add('cake-editor-target');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cake-editor-action cake-editor-ui';
    button.textContent = '✏️ Editar';
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openContentEditor(target); });
    target.el.appendChild(button);
  }

  function addImageEditControl(target) {
    const parent = target.el.parentElement;
    if (!parent || Array.from(parent.querySelectorAll('.cake-editor-image-action')).some(button => button.dataset.cakeImageAction === target.key)) return;
    parent.classList.add('cake-editor-image-parent');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cake-editor-image-action cake-editor-ui';
    button.dataset.cakeImageAction = target.key;
    button.textContent = '✏️ Foto';
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openContentEditor(target); });
    parent.appendChild(button);
  }

  function attachContentControls(targets) {
    targets.forEach(target => {
      if (!target.el.isConnected) return;
      if (target.kind === 'text') addTextEditControl(target);
      else addImageEditControl(target);
    });
  }

  function slugify(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140);
  }

  function productBySlug(slug) {
    return (window.CAKE_PRODUCTOS_REMOTOS || []).find(product => product.slug === slug) || null;
  }

  // Los productos nuevos se colocan al principio de su categoría, no al final.
  function firstDisplayOrderForCategory(category) {
    const orders = (window.CAKE_PRODUCTOS_REMOTOS || [])
      .filter(product => product.category === category && product.is_active !== false)
      .map(product => Number(product.display_order))
      .filter(Number.isFinite);
    return orders.length ? Math.min(...orders) - 10 : 0;
  }

  function openProductEditor(product = null, category = 'pasteles') {
    const form = $('cake-editor-product-form');
    form.reset();
    $('cake-editor-product-id').value = product?.id || '';
    $('cake-editor-product-title').textContent = product ? `Editar: ${product.name}` : `Añadir ${category === 'pasteles' ? 'pastel' : category === 'postres' ? 'postre' : category === 'galletas' ? 'galletas' : category === 'bocaditos' ? 'bocaditos' : 'producto especial'}`;
    $('cake-editor-product-name').value = product?.name || '';
    $('cake-editor-product-category').value = CATEGORIES.some(([value]) => value === (product?.category || category)) ? (product?.category || category) : 'pasteles';
    $('cake-editor-product-slug').value = product?.slug || '';
    $('cake-editor-product-price').value = product?.price ?? '0';
    $('cake-editor-product-small').value = product?.price_small ?? '';
    $('cake-editor-product-medium').value = product?.price_medium ?? '';
    $('cake-editor-product-large').value = product?.price_large ?? '';
    $('cake-editor-product-sale').value = product?.sale_price ?? '';
    $('cake-editor-product-description').value = product?.description || '';
    $('cake-editor-product-image-url').value = product?.image_url || '';
    $('cake-editor-product-gallery').value = Array.isArray(product?.gallery_urls) ? product.gallery_urls.join('\n') : '';
    $('cake-editor-product-images').value = '';
    $('cake-editor-product-occasion').value = product?.occasion || '';
    $('cake-editor-product-order').value = String(product?.display_order ?? firstDisplayOrderForCategory(category));
    delete $('cake-editor-product-order').dataset.touched;
    $('cake-editor-product-sizes').checked = !!product?.has_sizes;
    $('cake-editor-product-active').checked = product?.is_active !== false;
    $('cake-editor-product-featured').checked = !!product?.is_featured;
    $('cake-editor-product-offer').checked = !!product?.is_offer;
    $('cake-editor-product-message').textContent = '';
    $('cake-editor-product-modal').hidden = false;
    document.body.classList.add('cake-editor-modal-open');
    $('cake-editor-product-name').focus();
  }

  function closeProductModal() {
    $('cake-editor-product-modal').hidden = true;
    document.body.classList.remove('cake-editor-modal-open');
  }

  function decorateProductCards() {
    if (!state.isAdmin) return;
    document.querySelectorAll('#productos-container .producto').forEach(card => {
      if (card.querySelector(':scope > .cake-editor-product-actions')) return;
      const product = productBySlug(card.dataset.productSlug || '');
      if (!product) return;
      card.classList.add('cake-editor-product-card');
      const actions = document.createElement('div');
      actions.className = 'cake-editor-product-actions cake-editor-ui';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.textContent = '✏️ Editar';
      edit.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openProductEditor(product, product.category); });
      const del = document.createElement('button');
      del.type = 'button'; del.textContent = '🗑️ Eliminar';
      del.addEventListener('click', async event => {
        event.preventDefault(); event.stopPropagation();
        if (!product.id || !confirm(`¿Seguro que deseas eliminar «${product.name}»? Esta acción no se puede deshacer.`)) return;
        const { error } = await state.client.from('products').delete().eq('id', product.id);
        if (error) { toast(`No se pudo eliminar: ${error.message}`, 'error'); return; }
        toast('Producto eliminado.', 'success');
        window.setTimeout(() => window.location.reload(), 500);
      });
      actions.append(edit, del);
      card.appendChild(actions);
    });
  }

  function selectedCatalogCategory() {
    const nav = document.querySelector('.zona-portada nav');
    const active = nav?.querySelector('.nav-btn.active');
    return active?.dataset.cakeEditorCategory || 'todos';
  }

  function updateCategoryAddTiles() {
    const selected = selectedCatalogCategory();
    document.querySelectorAll('#productos-container [data-cake-add-tile]').forEach(tile => {
      tile.hidden = selected !== 'todos' && tile.dataset.cakeAddTile !== selected;
    });
  }

  function addCategoryButtons() {
    const nav = document.querySelector('.zona-portada nav');
    const catalog = $('productos-container');
    if (!nav || !catalog) return;

    const categoryButtons = Array.from(nav.querySelectorAll('.nav-btn'));
    CATEGORIES.forEach(([category]) => {
      const categoryButton = categoryButtons.find(button => button.textContent.trim().toLowerCase().includes(category));
      if (categoryButton) categoryButton.dataset.cakeEditorCategory = category;
    });

    const tiles = document.createDocumentFragment();
    CATEGORIES.forEach(([category, label]) => {
      if (catalog.querySelector(`[data-cake-add-tile="${category}"]`)) return;
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'cake-editor-add-tile cake-editor-ui';
      add.dataset.cakeAddTile = category;
      add.hidden = true;
      add.setAttribute('aria-label', `Añadir un producto nuevo a ${category}`);
      add.innerHTML = `<span class="cake-editor-add-tile-badge">NUEVO</span><span class="cake-editor-add-tile-plus" aria-hidden="true">＋</span><strong>${label}</strong><small>Agregar uno nuevo al inicio</small>`;
      add.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openProductEditor(null, category);
      });
      tiles.appendChild(add);
    });
    if (tiles.childNodes.length) catalog.insertBefore(tiles, catalog.firstChild);

    // El filtro de la tienda sigue funcionando igual; solo cambia qué botón de alta se ve.
    categoryButtons.forEach(button => {
      if (button.dataset.cakeEditorTileListener === '1') return;
      button.dataset.cakeEditorTileListener = '1';
      button.addEventListener('click', () => window.setTimeout(updateCategoryAddTiles, 0));
    });
    updateCategoryAddTiles();
  }

  async function saveProduct(event) {
    event.preventDefault();
    const message = $('cake-editor-product-message');
    message.textContent = 'Guardando producto…';
    try {
      const id = $('cake-editor-product-id').value || null;
      const name = $('cake-editor-product-name').value.trim();
      if (!name) throw new Error('Escribe el nombre del producto.');
      const category = $('cake-editor-product-category').value;
      const manualSlug = $('cake-editor-product-slug').value.trim();
      const slug = slugify(manualSlug || name);
      if (!slug) throw new Error('Escribe un nombre para el enlace corto.');
      const files = Array.from($('cake-editor-product-images').files || []);
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadImage(file, 'products'));
      let imageUrl = uploaded[0] || safeImageUrl($('cake-editor-product-image-url').value);
      if (!imageUrl && id) imageUrl = productBySlug(slug)?.image_url || '';
      if (!imageUrl) throw new Error('Selecciona una foto o escribe una URL de imagen.');
      const otherUrls = $('cake-editor-product-gallery').value.split(/\r?\n/).map(value => safeImageUrl(value)).filter(Boolean);
      const gallery = Array.from(new Set([...uploaded.slice(1), ...otherUrls])).filter(value => value !== imageUrl).slice(0, 20);
      const numberOrNull = elementId => $(elementId).value.trim() === '' ? null : Number($(elementId).value);
      const payload = {
        slug, name, category,
        description: $('cake-editor-product-description').value.trim(),
        image_url: imageUrl, gallery_urls: gallery,
        price: Number($('cake-editor-product-price').value) || 0,
        has_sizes: $('cake-editor-product-sizes').checked,
        price_small: numberOrNull('cake-editor-product-small'),
        price_medium: numberOrNull('cake-editor-product-medium'),
        price_large: numberOrNull('cake-editor-product-large'),
        sale_price: numberOrNull('cake-editor-product-sale'),
        is_active: $('cake-editor-product-active').checked,
        is_featured: $('cake-editor-product-featured').checked,
        is_offer: $('cake-editor-product-offer').checked,
        occasion: $('cake-editor-product-occasion').value.trim(),
        display_order: $('cake-editor-product-order').value.trim() === '' ? firstDisplayOrderForCategory(category) : Number($('cake-editor-product-order').value),
        updated_at: new Date().toISOString()
      };
      const query = id ? state.client.from('products').update(payload).eq('id', id) : state.client.from('products').insert(payload);
      const { error } = await query;
      if (error) throw error;
      message.textContent = 'Producto guardado. Actualizando la tienda…';
      toast('Producto guardado correctamente.', 'success');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      message.textContent = error?.message || 'No se pudo guardar el producto.';
      toast(message.textContent, 'error');
    }
  }

  async function enableEditor(user, targets) {
    state.user = user;
    const { data, error } = await state.client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error || !data) return;
    state.isAdmin = true;
    makeEditorUI();
    attachContentControls(targets);
    addCategoryButtons();
    decorateProductCards();
    const catalog = $('productos-container');
    if (catalog && window.MutationObserver) {
      state.productsObserver = new MutationObserver(() => {
        // script.js puede reconstruir el catálogo después de cargar los productos de Supabase.
        // Si eso ocurre, vuelve a insertar los accesos rápidos de alta al principio de la cuadrícula.
        if (!catalog.querySelector('[data-cake-add-tile]')) addCategoryButtons();
        decorateProductCards();
      });
      state.productsObserver.observe(catalog, { childList: true, subtree: true });
    }
    $('cake-editor-add-product').addEventListener('click', () => {
      const active = document.querySelector('.nav-btn.active[data-cake-editor-category]')?.dataset.cakeEditorCategory || 'pasteles';
      openProductEditor(null, active);
    });
    $('cake-editor-logout').addEventListener('click', async () => {
      const { error: signOutError } = await state.client.auth.signOut();
      if (signOutError) { toast(`No se pudo cerrar sesión: ${signOutError.message}`, 'error'); return; }
      window.location.href = 'index.html';
    });
    $('cake-editor-content-form').addEventListener('submit', saveContent);
    $('cake-editor-product-form').addEventListener('submit', saveProduct);
    document.querySelectorAll('[data-close-content]').forEach(button => button.addEventListener('click', closeContentModal));
    document.querySelectorAll('[data-close-product]').forEach(button => button.addEventListener('click', closeProductModal));
    [$('cake-editor-content-modal'), $('cake-editor-product-modal')].forEach(modal => modal.addEventListener('click', event => {
      if (event.target === modal) { modal.hidden = true; document.body.classList.remove('cake-editor-modal-open'); }
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { closeContentModal(); closeProductModal(); }
    });
    $('cake-editor-product-name').addEventListener('input', () => {
      if (!$('cake-editor-product-id').value) $('cake-editor-product-slug').value = slugify($('cake-editor-product-name').value);
    });
    $('cake-editor-product-slug').addEventListener('input', () => { $('cake-editor-product-slug').dataset.touched = 'true'; });
    $('cake-editor-product-order').addEventListener('input', () => { $('cake-editor-product-order').dataset.touched = 'true'; });
    $('cake-editor-product-category').addEventListener('change', () => {
      if (!$('cake-editor-product-id').value && !$('cake-editor-product-order').dataset.touched) {
        $('cake-editor-product-order').value = String(firstDisplayOrderForCategory($('cake-editor-product-category').value));
      }
    });
    // If the content migration has not been run, clearly explain the one-time setup.
    if (!state.contentAvailable) toast('Para guardar cambios de textos e imágenes, ejecuta supabase-site-editor.sql en Supabase. La edición de productos usa la tabla existente.', 'info');
    const mode = new URLSearchParams(window.location.search);
    if (mode.has('modo')) window.history.replaceState({}, '', window.location.pathname);
  }

  (async function init() {
    // Capture stable target keys before script.js builds any dynamic catalog sections.
    const contentTargets = getContentTargets();
    state.client = clientFromConfig();
    if (state.client) await loadAndApplyContent(contentTargets);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initializeAuthAndEditor(contentTargets), { once: true });
    } else {
      initializeAuthAndEditor(contentTargets);
    }
  })();

  async function initializeAuthAndEditor(contentTargets) {
    if (!state.client) return;
    const { data, error } = await state.client.auth.getSession();
    if (error || !data?.session?.user) return;
    await enableEditor(data.session.user, contentTargets);
  }
})();
