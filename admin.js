/* =========================================================
   ADMIN.JS — gestion segura de productos, ofertas, pedidos y opiniones.
   Autorización real: Supabase Auth + public.admin_users + políticas RLS.
   ========================================================= */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let client = null;
  let products = [];
  let reviews = [];
  let currentGallery = [];
  let activeOrdersView = 'nuevos';
  let activeOrders = [];
  let trashOrders = [];
  let trashProducts = [];
  let trashCount = 0;
  let editingOrder = null;
  let editOrderPreviewUrl = '';
  let clearOrderImage = false;
  // Fotos del pedido en edición: { url } guardadas o { file, preview } nuevas por subir.
  let editOrderPhotos = [];
  let editOrderRemovedPhotos = [];
  let manualOrderFiles = [];
  let lightboxImages = [];
  let lightboxIndex = 0;
  const CATEGORIES = ['pasteles', 'postres', 'galletas', 'bocaditos', 'especiales'];
  const STATUS = [['recibido', 'Pedidos nuevos'], ['entregado', 'Pedidos entregados'], ['cancelado', 'Pedidos cancelados']];
  function message(id, text, type = '') {const el = $(id);if (!el) return;el.textContent = text;el.className = `admin-message ${type}`.trim();}
  function globalMessage(text, type = '') {message('admin-global-message', text, type);}
  function esc(value) {return String(value != null ? value : '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);}
  function slugify(value) {return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');}
  function configuredClient() {try {var _window$getCakeSupaba, _window;return ((_window$getCakeSupaba = (_window = window).getCakeSupabaseClient) == null ? void 0 : _window$getCakeSupaba.call(_window)) || null;} catch (_) {return null;}}
  function showAuth() {$('admin-login-view').hidden = false;$('admin-app-view').hidden = true;}
  function showApp(user) {$('admin-login-view').hidden = true;$('admin-app-view').hidden = false;$('admin-user-line').textContent = `Sesión iniciada: ${user.email || 'administradora'}`;}
  function fmtQ(v) {return `Q${(Number(v) || 0).toFixed(2)}`;}
  // Acepta cualquier foto (también de teléfonos antiguos); se prepara antes de subirla.
  function isImage(file) {return !!file && (window.cakeEsImagen ? window.cakeEsImagen(file) : /^image\//i.test(file.type)) && file.size <= 25 * 1024 * 1024;}
  async function prepareImage(file) {
    if (!isImage(file)) throw new Error('Elige una fotografía (máximo 25 MB).');
    const ready = window.cakePrepararImagen ? await window.cakePrepararImagen(file, { maxLado: 2000 }) : file;
    if (ready.size > 5 * 1024 * 1024) throw new Error('La foto sigue siendo muy pesada. Elige otra o toma una captura de pantalla.');
    return ready;
  }
  const newUUID = () => window.cakeUUID ? window.cakeUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  async function uploadPhoto(file, folder = 'products') {
    file = await prepareImage(file);
    const cleanName = String(file.name || 'foto.jpg').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-90) || 'foto.jpg';
    const path = `${folder}/${newUUID()}/${cleanName}`;
    const { data, error } = await client.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
    if (error) throw error;
    const { data: urlData } = client.storage.from('product-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  }
  async function requireAdmin(user) {
    const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error || !data) {
      await client.auth.signOut();
      showAuth();
      message('admin-login-message', 'Este usuario inició sesión, pero no está autorizado en la tabla admin_users. Agrega su UUID mediante las instrucciones SQL.', 'error');
      return false;
    }
    return true;
  }
  function setTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === tab));
    document.querySelectorAll('.admin-section').forEach((s) => {const active = s.id === `admin-panel-${tab}`;s.classList.toggle('active', active);s.hidden = !active;});
    if (tab === 'orders') loadOrders();if (tab === 'reviews') loadReviews();if (tab === 'settings') {loadSettings();loadCapacitySettings();}
  }
  function updateStats() {
    $('stat-products').textContent = products.length;
    $('stat-offers').textContent = products.filter((p) => p.is_offer && p.is_active).length;
    // Se actualiza desde loadOrders; se conserva si se carga otra pestaña.
  }
  function productRow(p) {
    const row = document.createElement('article');row.className = 'admin-product-row';
    const img = document.createElement('img');img.src = p.image_url || '';img.alt = p.name || 'Producto';img.onerror = () => {img.style.visibility = 'hidden';};
    const meta = document.createElement('div');meta.className = 'admin-product-meta';
    const name = document.createElement('strong');name.textContent = p.name || '';
    const price = document.createElement('span');price.textContent = `${fmtQ(p.price)}${p.sale_price > 0 ? ` · Oferta ${fmtQ(p.sale_price)}` : ''}`;
    const flags = document.createElement('small');flags.textContent = [p.is_active ? 'Publicado' : 'Oculto', p.is_featured ? 'Destacado' : '', p.is_offer ? 'Oferta' : ''].filter(Boolean).join(' · ');
    meta.append(name, price, flags);
    const actions = document.createElement('div');actions.className = 'admin-row-actions';
    const edit = document.createElement('button');edit.type = 'button';edit.className = 'admin-button admin-button-outline';edit.textContent = 'Editar';edit.addEventListener('click', () => fillProduct(p));
    const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-button admin-button-danger';remove.textContent = 'Enviar a papelera';remove.addEventListener('click', () => deleteProduct(p));
    actions.append(edit, remove);row.append(img, meta, actions);return row;
  }
  async function loadProducts() {
    globalMessage('Cargando productos…');
    const { data, error } = await client.from('products').select('*').is('deleted_at', null).order('created_at', { ascending: false, nullsFirst: false }).order('display_order', { ascending: true });
    if (error) {globalMessage(`No se pudieron cargar productos: ${error.message}`, 'error');return;}
    products = data || [];updateStats();
    const list = $('admin-products-list');list.replaceChildren();
    await refreshTrashCount();
    if (!products.length) {list.appendChild(Object.assign(document.createElement('p'), { textContent: 'Todavía no hay productos en la base de datos. Puedes agregar uno o ejecutar el archivo SQL de productos iniciales.' }));} else
    products.forEach((p) => list.appendChild(productRow(p)));
    filterProducts();globalMessage('Productos actualizados.', 'success');
  }
  function filterProducts() {
    const q = String($('admin-product-search').value || '').trim().toLowerCase();
    $('admin-products-list').querySelectorAll('.admin-product-row').forEach((row, idx) => {const p = products[idx];row.hidden = !!q && !`${(p == null ? void 0 : p.name) || ''} ${(p == null ? void 0 : p.category) || ''} ${(p == null ? void 0 : p.slug) || ''}`.toLowerCase().includes(q);});
  }
  function resetProductForm() {
    $('admin-product-form').reset();$('product-id').value = '';delete $('product-slug').dataset.touched;$('product-form-title').textContent = 'Agregar producto';$('product-active').checked = true;$('product-order').value = String(products.length * 10 + 10);$('product-images').value = '';$('product-gallery-urls').value = '';$('product-current-gallery').replaceChildren();currentGallery = [];message('admin-product-message', '');
  }
  function fillProduct(p) {var _p$price, _p$price_small, _p$price_medium, _p$price_large, _p$sale_price, _p$display_order;
    $('product-id').value = p.id;$('product-slug').dataset.touched = 'true';$('product-form-title').textContent = `Editar: ${p.name}`;$('product-name').value = p.name || '';$('product-slug').value = p.slug || '';$('product-category').value = CATEGORIES.includes(p.category) ? p.category : 'especiales';$('product-price').value = (_p$price = p.price) != null ? _p$price : 0;$('product-price-small').value = (_p$price_small = p.price_small) != null ? _p$price_small : '';$('product-price-medium').value = (_p$price_medium = p.price_medium) != null ? _p$price_medium : '';$('product-price-large').value = (_p$price_large = p.price_large) != null ? _p$price_large : '';$('product-sale-price').value = (_p$sale_price = p.sale_price) != null ? _p$sale_price : '';$('product-description').value = p.description || '';$('product-gallery-urls').value = Array.isArray(p.gallery_urls) ? p.gallery_urls.join('\n') : '';$('product-occasion').value = p.occasion || '';$('product-order').value = (_p$display_order = p.display_order) != null ? _p$display_order : 100;$('product-has-sizes').checked = !!p.has_sizes;$('product-active').checked = p.is_active !== false;$('product-featured').checked = !!p.is_featured;$('product-is-offer').checked = !!p.is_offer;currentGallery = [p.image_url, ...(Array.isArray(p.gallery_urls) ? p.gallery_urls : [])].filter(Boolean);$('product-current-gallery').replaceChildren();currentGallery.forEach((url) => {const img = document.createElement('img');img.src = url;img.alt = 'Foto guardada';img.onerror = () => img.remove();$('product-current-gallery').appendChild(img);});window.scrollTo({ top: $('admin-panel-products').getBoundingClientRect().top + window.scrollY - 15, behavior: 'smooth' });
  }
  $('product-name').addEventListener('input', () => {if (!$('product-id').value || !$('product-slug').dataset.touched) $('product-slug').value = slugify($('product-name').value);});
  $('product-slug').addEventListener('input', () => {$('product-slug').dataset.touched = 'true';});
  async function saveProduct(event) {
    event.preventDefault();message('admin-product-message', 'Guardando…');
    try {
      const id = $('product-id').value || null;
      const fileList = Array.from($('product-images').files || []);
      if ($('product-category').value === 'especiales' && fileList.length > 4) throw new Error('Para una especialidad puedes seleccionar máximo 4 fotos: 1 portada y 3 adicionales.');
      const urls = [];
      for (const file of fileList) urls.push(await uploadPhoto(file, 'products'));
      const existing = $('product-id').value ? products.find((p) => p.id === $('product-id').value) : null;
      const externalUrls = String($('product-gallery-urls').value || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 15);
      const imageUrl = urls[0] || (existing == null ? void 0 : existing.image_url) || externalUrls[0] || '';
      if (!imageUrl) throw new Error('Agrega al menos una fotografía o URL de imagen.');
      const typedPrices = ['product-price-small', 'product-price-medium', 'product-price-large'].map((id) => $(id).value.trim() === '' ? null : Number($(id).value));
      const payload = {
        slug: slugify($('product-slug').value || $('product-name').value), name: $('product-name').value.trim(), category: $('product-category').value,
        description: $('product-description').value.trim(), image_url: imageUrl,
        gallery_urls: Array.from(new Set([...urls.slice(1), ...externalUrls.filter((u) => u !== imageUrl), ...((existing == null ? void 0 : existing.gallery_urls) || []).filter((u) => !urls.includes(u))])).slice(0, $('product-category').value === 'especiales' ? 3 : 20),
        price: Number($('product-price').value), price_small: typedPrices[0], price_medium: typedPrices[1], price_large: typedPrices[2],
        sale_price: $('product-sale-price').value.trim() === '' ? null : Number($('product-sale-price').value), has_sizes: $('product-has-sizes').checked,
        is_active: $('product-active').checked, is_featured: $('product-featured').checked, is_offer: $('product-is-offer').checked,
        occasion: $('product-occasion').value.trim(), display_order: Number($('product-order').value) || 100
      };
      if (!payload.slug || !payload.name) throw new Error('Completa el nombre y el enlace corto.');
      if (payload.sale_price !== null && payload.sale_price > 0 && payload.sale_price > payload.price) throw new Error('El precio de oferta normalmente debe ser menor o igual al precio base.');
      // created_at usa el valor automático de Supabase; así se ordena por la hora real de publicación.
      const query = id ? client.from('products').update(payload).eq('id', id) : client.from('products').insert(payload);
      const { error } = await query;
      if (error) throw error;
      message('admin-product-message', 'Producto guardado correctamente.', 'success');resetProductForm();await loadProducts();
    } catch (error) {message('admin-product-message', (error == null ? void 0 : error.message) || 'No se pudo guardar el producto.', 'error');}
  }
  async function deleteProduct(p) {
    if (!confirm(`¿Enviar “${p.name}” a la papelera? Podrás recuperarlo después.`)) return;
    const { error } = await client.from('products').update({
      deleted_at: new Date().toISOString(),
      deleted_previous_is_active: p.is_active !== false,
      is_active: false,
      updated_at: new Date().toISOString()
    }).eq('id', p.id);
    if (error) {globalMessage(`No se pudo enviar a la papelera: ${error.message}. Comprueba que ejecutaste el SQL de papelera.`, 'error');return;}
    await loadProducts();resetProductForm();globalMessage(`“${p.name}” se movió a la papelera.`, 'success');
    if (activeOrdersView === 'papelera') await loadTrash();
  }
  function normalizeOrderStatus(status) {
    const value = String(status || 'recibido').toLowerCase();
    if (value === 'entregado') return 'entregado';
    if (value === 'cancelado') return 'cancelado';
    return 'recibido';
  }
  function statusView(status) {
    const normalized = normalizeOrderStatus(status);
    return normalized === 'entregado' ? 'entregados' : normalized === 'cancelado' ? 'cancelados' : 'nuevos';
  }
  function updateOrderViewButtons() {
    const counts = {
      nuevos: activeOrders.filter((o) => statusView(o.status) === 'nuevos').length,
      entregados: activeOrders.filter((o) => statusView(o.status) === 'entregados').length,
      cancelados: activeOrders.filter((o) => statusView(o.status) === 'cancelados').length,
      papelera: trashCount
    };
    document.querySelectorAll('[data-order-view]').forEach((button) => {var _counts$view;
      const view = button.dataset.orderView;
      button.classList.toggle('active', view === activeOrdersView);
      button.setAttribute('aria-pressed', view === activeOrdersView ? 'true' : 'false');
      const count = button.querySelector('[data-order-view-count]');
      if (count) count.textContent = String((_counts$view = counts[view]) != null ? _counts$view : 0);
    });
  }
  async function refreshTrashCount() {
    const [ordersResult, productsResult] = await Promise.all([
    client.from('orders').select('order_code', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    client.from('products').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)]
    );
    if (!ordersResult.error && !productsResult.error) trashCount = (ordersResult.count || 0) + (productsResult.count || 0);
    updateOrderViewButtons();
  }
  function setOrdersView(view) {
    activeOrdersView = view;
    updateOrderViewButtons();
    if (view === 'papelera') loadTrash();else renderOrdersView();
  }
  function addInfoField(parent, label, value) {
    const item = document.createElement('div');item.className = 'admin-order-info-item';
    const caption = document.createElement('span');caption.textContent = label;
    const content = document.createElement('strong');content.textContent = value === null || value === undefined || String(value).trim() === '' ? 'No indicado' : String(value);
    item.append(caption, content);parent.appendChild(item);
  }
  function addInfoGroup(parent, title, fields) {
    const group = document.createElement('section');group.className = 'admin-order-info-group';
    const heading = document.createElement('h4');heading.textContent = title;group.appendChild(heading);
    const grid = document.createElement('div');grid.className = 'admin-order-info-grid';
    fields.forEach(([label, value]) => addInfoField(grid, label, value));
    group.appendChild(grid);parent.appendChild(group);
  }
  function imageStoragePath(url, bucket = 'product-images') {
    if (!url || typeof url !== 'string') return null;
    const escaped = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = url.match(new RegExp('/storage/v1/object/(?:public|sign)/' + escaped + '/([^?#]+)'));
    if (!match) return null;
    try {return decodeURIComponent(match[1]);} catch (_) {return match[1];}
  }
  async function removeStoredImages(urls) {
    const paths = Array.from(new Set((urls || []).map((url) => imageStoragePath(url)).filter(Boolean)));
    if (!paths.length) return;
    const { error } = await client.storage.from('product-images').remove(paths);
    if (error) throw new Error(`No se pudieron borrar las imágenes de Storage: ${error.message}`);
  }
  function paintLightbox() {
    const item = lightboxImages[lightboxIndex];if (!item) return;
    const image = $('admin-image-lightbox-image');image.src = item.url;image.alt = item.label || 'Fotografía del pedido';
    const many = lightboxImages.length > 1;
    ['admin-image-lightbox-prev', 'admin-image-lightbox-next', 'admin-image-lightbox-count'].forEach((id) => {const el = $(id);if (el) el.hidden = !many;});
    const count = $('admin-image-lightbox-count');if (count) count.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}${item.label ? ` · ${item.label}` : ''}`;
  }
  function openOrderImage(url, alt = 'Fotografía del pedido', list = null, index = 0) {var _$;
    const viewer = $('admin-image-lightbox');
    if (!viewer || !url) return;
    lightboxImages = Array.isArray(list) && list.length ? list : [{ url, label: alt }];
    lightboxIndex = Math.max(0, Math.min(index, lightboxImages.length - 1));
    paintLightbox();viewer.hidden = false;document.body.classList.add('admin-lightbox-open');
    (_$ = $('admin-image-lightbox-close')) == null || _$.focus();
  }
  function moveLightbox(step) {if (lightboxImages.length < 2) return;lightboxIndex = (lightboxIndex + step + lightboxImages.length) % lightboxImages.length;paintLightbox();}
  function closeOrderImage() {
    const viewer = $('admin-image-lightbox');if (!viewer) return;
    viewer.hidden = true;$('admin-image-lightbox-image').src = '';document.body.classList.remove('admin-lightbox-open');lightboxImages = [];
  }
  // Todas las fotos de un pedido: fotos de referencia/adjuntas y la foto de CADA producto pedido.
  function getOrderImages(order) {
    const payload = (order == null ? void 0 : order.payload) || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const list = [];const seen = new Set();
    const add = (url, label) => {const clean = String(url || '').trim();if (!clean || seen.has(clean)) return;seen.add(clean);list.push({ url: clean, label });};
    add(payload.photo_reference_url, 'Foto de referencia');
    (Array.isArray(payload.photos) ? payload.photos : []).forEach((url, i) => add(url, `Foto adjunta ${i + 1}`));
    add(payload.reference_image_url, 'Foto de referencia');
    add(payload.inspiration_image_url, 'Foto de inspiración');
    items.forEach((item) => add((item == null ? void 0 : item.image) || (item == null ? void 0 : item.imagen), (item == null ? void 0 : item.name) || (item == null ? void 0 : item.nombre) || 'Producto'));
    return list;
  }
  function createOrderRow(order, { trash = false } = {}) {
    const card = document.createElement('article');card.className = 'admin-order-row' + (trash ? ' admin-order-row-trash' : '');
    const payload = order.payload || {};
    const top = document.createElement('div');top.className = 'admin-order-top';
    const code = document.createElement('strong');code.className = 'admin-order-code';code.textContent = order.order_code || 'Pedido sin código';
    const date = document.createElement('small');date.className = 'admin-order-date';date.textContent = order.created_at ? new Date(order.created_at).toLocaleString('es-GT') : 'Fecha no disponible';top.append(code, date);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const referenceImage = payload.photo_reference_url || payload.reference_image_url || payload.inspiration_image_url || '';
    const allImages = getOrderImages(order);
    if (allImages.length) {
      // Muestra TODAS las fotos: la principal en grande y las demás en miniatura (2 o más productos = 2 o más fotos).
      const gallery = document.createElement('div');gallery.className = 'admin-order-gallery';
      allImages.forEach((photo, index) => {
        const imageButton = document.createElement('button');imageButton.type = 'button';imageButton.className = 'admin-order-image-button' + (index === 0 ? '' : ' admin-order-thumb-button');
        imageButton.setAttribute('aria-label', `Ampliar: ${photo.label}`);imageButton.title = photo.label;
        const img = document.createElement('img');img.className = 'admin-order-image';img.src = photo.url;img.alt = photo.label;img.loading = 'lazy';img.onerror = () => imageButton.remove();
        imageButton.appendChild(img);
        if (allImages.length > 1 && index === 0) {const badge = document.createElement('span');badge.className = 'admin-order-photo-count';badge.textContent = `${allImages.length} fotos`;imageButton.appendChild(badge);}
        imageButton.addEventListener('click', () => openOrderImage(photo.url, photo.label, allImages, index));gallery.appendChild(imageButton);
      });
      card.appendChild(gallery);
    } else {
      const noImage = document.createElement('div');noImage.className = 'admin-order-no-image';noImage.textContent = 'Este pedido no tiene fotografía adjunta.';card.appendChild(noImage);
    }
    const info = document.createElement('div');info.className = 'admin-order-info';
    const type = payload.order_type === 'pastel_personalizado' ? 'Pastel personalizado' : payload.order_type === 'pedido_administrador' ? 'Pedido añadido por administración' : 'Pedido de catálogo';
    addInfoGroup(info, 'Cliente', [['Nombre', payload.name], ['Teléfono', payload.phone], ['Tipo de pedido', type]]);
    addInfoGroup(info, 'Pastel y personalización', [['Ocasión', payload.occasion], ['Sabor', payload.flavor], ['Tamaño', payload.size], ['Colores o temática', payload.colors_theme || payload.theme]]);
    addInfoGroup(info, 'Entrega', [['Fecha deseada', payload.delivery_date], ['Dirección', payload.address]]);
    const itemsGroup = document.createElement('section');itemsGroup.className = 'admin-order-info-group admin-order-items-group';
    const itemsHeading = document.createElement('h4');itemsHeading.textContent = 'Artículos y total';itemsGroup.appendChild(itemsHeading);
    if (items.length) {
      const list = document.createElement('ul');list.className = 'admin-order-items';
      items.forEach((item) => {const li = document.createElement('li');const quantity = Number(item.quantity) || 1;const label = document.createElement('span');label.className = 'admin-order-item-label';const itemImage = item.image || item.imagen;if (itemImage) {const thumb = document.createElement('img');thumb.className = 'admin-order-item-thumb';thumb.src = itemImage;thumb.alt = '';thumb.loading = 'lazy';thumb.onerror = () => thumb.remove();thumb.addEventListener('click', () => {const list = getOrderImages(order);const idx = Math.max(0, list.findIndex((x) => x.url === String(itemImage).trim()));openOrderImage(itemImage, item.name || 'Producto', list, idx);});label.appendChild(thumb);}label.appendChild(document.createTextNode(`${quantity} × ${item.name || item.nombre || 'Producto'}`));const price = document.createElement('strong');price.textContent = item.price != null ? fmtQ(Number(item.price) * quantity) : 'Precio no indicado';li.append(label, price);list.appendChild(li);});
      itemsGroup.appendChild(list);
    } else {
      const empty = document.createElement('p');empty.className = 'admin-order-muted';empty.textContent = 'No se registraron artículos.';itemsGroup.appendChild(empty);
    }
    const total = document.createElement('div');total.className = 'admin-order-total';
    const totalLabel = document.createElement('span');totalLabel.textContent = 'Total informado';
    const totalValue = document.createElement('strong');totalValue.textContent = fmtQ(payload.total);
    total.append(totalLabel, totalValue);itemsGroup.appendChild(total);info.appendChild(itemsGroup);
    addInfoGroup(info, 'Detalles adicionales', [['Personalización / dedicatoria', payload.customization || payload.personalization], ['Fotos', allImages.length ? `${allImages.length} foto(s)` : payload.photo_reference_name || (referenceImage ? 'Imagen adjunta' : 'No adjunta')]]);
    card.append(top, info);

    if (trash) {
      const trashActions = document.createElement('div');trashActions.className = 'admin-row-actions admin-trash-actions';trashActions.style.justifyContent = 'flex-start';
      const restore = document.createElement('button');restore.type = 'button';restore.className = 'admin-button admin-button-primary';restore.textContent = 'Recuperar pedido';
      restore.addEventListener('click', async () => {const { error } = await client.from('orders').update({ deleted_at: null, status: order.deleted_previous_status || 'recibido', deleted_previous_status: null }).eq('order_code', order.order_code);if (error) {globalMessage(`No se pudo recuperar el pedido: ${error.message}`, 'error');return;}globalMessage(`Pedido ${order.order_code} recuperado.`, 'success');await loadOrders();});
      const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-button admin-button-danger';remove.textContent = 'Eliminar definitivamente';
      remove.addEventListener('click', () => permanentlyDeleteOrder(order));trashActions.append(restore, remove);card.appendChild(trashActions);
      return card;
    }

    const statusRow = document.createElement('div');statusRow.className = 'admin-order-status';
    const select = document.createElement('select');select.setAttribute('aria-label', 'Mover pedido a una sección');
    STATUS.forEach(([value, label]) => {const option = document.createElement('option');option.value = value;option.textContent = label;select.appendChild(option);});
    select.value = normalizeOrderStatus(order.status);
    const save = document.createElement('button');save.type = 'button';save.className = 'admin-button admin-button-primary';save.textContent = 'Guardar estado';
    save.addEventListener('click', async () => {const destination = statusView(select.value);await saveOrderStatus(order.order_code, select.value, destination);});
    statusRow.append(select, save);
    const actions = document.createElement('div');actions.className = 'admin-row-actions admin-order-actions';actions.style.justifyContent = 'flex-start';
    const edit = document.createElement('button');edit.type = 'button';edit.className = 'admin-button admin-button-outline';edit.textContent = 'Editar datos';edit.addEventListener('click', () => openOrderEdit(order));
    const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-button admin-button-danger';remove.textContent = 'Eliminar pedido';remove.addEventListener('click', () => moveOrderToTrash(order));
    actions.append(edit, remove);card.append(statusRow, actions);return card;
  }
  async function saveOrderStatus(code, status, destination) {
    const { error } = await client.from('orders').update({ status }).eq('order_code', code);
    if (error) {globalMessage(`No se pudo actualizar el pedido: ${error.message}`, 'error');return;}
    activeOrdersView = destination;
    globalMessage(`Pedido ${code} movido a ${destination === 'entregados' ? 'Pedidos entregados' : destination === 'cancelados' ? 'Pedidos cancelados' : 'Pedidos nuevos'}.`, 'success');
    await loadOrders();
  }
  async function moveOrderToTrash(order) {
    if (!confirm(`¿Enviar el pedido ${order.order_code} a la papelera? Podrás recuperarlo después.`)) return;
    const { error } = await client.from('orders').update({ deleted_at: new Date().toISOString(), deleted_previous_status: order.status || 'recibido', status: 'cancelado' }).eq('order_code', order.order_code);
    if (error) {globalMessage(`No se pudo enviar el pedido a la papelera: ${error.message}. Comprueba el SQL de papelera.`, 'error');return;}
    activeOrdersView = 'papelera';globalMessage(`Pedido ${order.order_code} enviado a la papelera.`, 'success');await loadOrders();
  }
  async function permanentlyDeleteOrder(order) {
    if (!confirm(`¿Eliminar definitivamente el pedido ${order.order_code}? Esta acción no se puede deshacer.`)) return;
    const payload = order.payload || {};
    try {
      // Solo se borran las fotos subidas para el pedido (carpeta custom-orders), nunca las del catálogo.
      const orderPhotos = [payload.photo_reference_url, payload.reference_image_url, payload.inspiration_image_url, ...(Array.isArray(payload.photos) ? payload.photos : [])].filter((url) => {const path = imageStoragePath(url);return path && path.startsWith('custom-orders/');});
      await removeStoredImages(orderPhotos);
      const { data, error } = await client.from('orders').delete().eq('order_code', order.order_code).select('order_code');
      if (error) throw error;
      if (!(data != null && data.length)) throw new Error('Supabase no confirmó la eliminación. Revisa los permisos de administrador.');
      globalMessage(`Pedido ${order.order_code} eliminado definitivamente.`, 'success');await loadTrash();
    } catch (error) {globalMessage((error == null ? void 0 : error.message) || 'No se pudo eliminar definitivamente el pedido.', 'error');}
  }
  async function permanentlyDeleteProduct(product) {
    if (!confirm(`¿Eliminar definitivamente “${product.name}” y sus fotos guardadas en Supabase Storage? Esta acción no se puede deshacer.`)) return;
    const urls = [product.image_url, ...(Array.isArray(product.gallery_urls) ? product.gallery_urls : [])];
    try {
      await removeStoredImages(urls);
      const { data, error } = await client.from('products').delete().eq('id', product.id).select('id');
      if (error) throw error;
      if (!(data != null && data.length)) throw new Error('Supabase no confirmó la eliminación. Revisa los permisos de administrador.');
      globalMessage(`“${product.name}” y sus fotografías guardadas fueron eliminados definitivamente.`, 'success');
      await loadProducts();await loadTrash();
    } catch (error) {globalMessage((error == null ? void 0 : error.message) || 'No se pudo eliminar definitivamente el producto.', 'error');}
  }
  function createTrashProductRow(product) {
    const row = document.createElement('article');row.className = 'admin-trash-product-row';
    const img = document.createElement('img');img.src = product.image_url || '';img.alt = product.name || 'Producto';img.loading = 'lazy';img.onerror = () => img.remove();
    const meta = document.createElement('div');meta.className = 'admin-product-meta';
    const name = document.createElement('strong');name.textContent = product.name || 'Producto sin nombre';
    const price = document.createElement('span');price.textContent = `${fmtQ(product.price)} · ${product.category || 'Sin categoría'}`;
    const date = document.createElement('small');date.textContent = product.deleted_at ? `Eliminado: ${new Date(product.deleted_at).toLocaleString('es-GT')}` : 'En papelera';meta.append(name, price, date);
    const actions = document.createElement('div');actions.className = 'admin-row-actions admin-trash-actions';
    const restore = document.createElement('button');restore.type = 'button';restore.className = 'admin-button admin-button-primary';restore.textContent = 'Recuperar producto';
    restore.addEventListener('click', async () => {const { error } = await client.from('products').update({ deleted_at: null, is_active: product.deleted_previous_is_active !== false, deleted_previous_is_active: null, updated_at: new Date().toISOString() }).eq('id', product.id);if (error) {globalMessage(`No se pudo recuperar el producto: ${error.message}`, 'error');return;}globalMessage(`“${product.name}” recuperado.`, 'success');await loadProducts();await loadTrash();});
    const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-button admin-button-danger';remove.textContent = 'Eliminar definitivamente';remove.addEventListener('click', () => permanentlyDeleteProduct(product));
    actions.append(restore, remove);row.append(img, meta, actions);return row;
  }
  async function loadTrash() {
    const list = $('admin-orders-list');list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando papelera…' }));
    const [ordersResult, productsResult] = await Promise.all([
    client.from('orders').select('order_code,status,payload,created_at,deleted_at,deleted_previous_status').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(500),
    client.from('products').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(500)]
    );
    if (ordersResult.error || productsResult.error) {const errors = [ordersResult.error, productsResult.error].filter(Boolean).map((e) => e.message).join(' · ');list.replaceChildren(Object.assign(document.createElement('p'), { textContent: `No se pudo cargar la papelera: ${errors}. Comprueba que ejecutaste el SQL de papelera.` }));return;}
    trashOrders = ordersResult.data || [];trashProducts = productsResult.data || [];trashCount = trashOrders.length + trashProducts.length;updateOrderViewButtons();list.replaceChildren();
    if (!trashOrders.length && !trashProducts.length) {list.appendChild(Object.assign(document.createElement('p'), { textContent: 'La papelera está vacía.' }));return;}
    if (trashOrders.length) {const title = document.createElement('h3');title.className = 'admin-order-group-title';title.textContent = `Pedidos eliminados (${trashOrders.length})`;list.appendChild(title);trashOrders.forEach((order) => list.appendChild(createOrderRow(order, { trash: true })));}
    if (trashProducts.length) {const title = document.createElement('h3');title.className = 'admin-order-group-title';title.textContent = `Productos eliminados (${trashProducts.length})`;list.appendChild(title);trashProducts.forEach((product) => list.appendChild(createTrashProductRow(product)));}
  }
  function renderOrdersView() {
    const list = $('admin-orders-list');if (!list) return;
    updateOrderViewButtons();list.replaceChildren();
    const filtered = activeOrders.filter((order) => statusView(order.status) === activeOrdersView);
    const labels = { nuevos: 'Pedidos nuevos', entregados: 'Pedidos entregados', cancelados: 'Pedidos cancelados' };
    const title = document.createElement('h3');title.className = 'admin-order-group-title';title.textContent = `${labels[activeOrdersView] || 'Pedidos'} (${filtered.length})`;list.appendChild(title);
    if (!filtered.length) {list.appendChild(Object.assign(document.createElement('p'), { textContent: activeOrdersView === 'nuevos' ? 'No hay pedidos nuevos.' : activeOrdersView === 'entregados' ? 'Todavía no hay pedidos entregados.' : 'Todavía no hay pedidos cancelados.' }));return;}
    filtered.forEach((order) => list.appendChild(createOrderRow(order)));
  }
  async function loadOrders() {
    const list = $('admin-orders-list');list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando pedidos…' }));
    const { data, error } = await client.from('orders').select('order_code,status,payload,created_at,deleted_at,deleted_previous_status').is('deleted_at', null).order('created_at', { ascending: false }).limit(500);
    if (error) {list.replaceChildren(Object.assign(document.createElement('p'), { textContent: `No se pudieron cargar pedidos: ${error.message}. Comprueba que ejecutaste el SQL de papelera.` }));return;}
    activeOrders = data || [];$('stat-orders').textContent = activeOrders.filter((o) => statusView(o.status) === 'nuevos').length;
    await refreshTrashCount();
    if (activeOrdersView === 'papelera') await loadTrash();else renderOrdersView();
  }
  function getOrderImage(order) {var _getOrderImages$;
    return ((_getOrderImages$ = getOrderImages(order)[0]) == null ? void 0 : _getOrderImages$.url) || '';
  }
  // Fotos adjuntas al pedido (no incluye la foto propia de cada producto del catálogo).
  function getAttachedOrderPhotos(order) {
    const payload = (order == null ? void 0 : order.payload) || {};const seen = new Set();const list = [];
    [payload.photo_reference_url, ...(Array.isArray(payload.photos) ? payload.photos : []), payload.reference_image_url, payload.inspiration_image_url].forEach((url) => {const clean = String(url || '').trim();if (clean && !seen.has(clean)) {seen.add(clean);list.push(clean);}});
    return list;
  }
  function setOrderEditImagePreview(url) {
    const image = $('edit-order-image-preview');
    const empty = $('edit-order-image-empty');
    if (url) {image.src = url;image.hidden = false;empty.hidden = true;} else
    {image.removeAttribute('src');image.hidden = true;empty.hidden = false;}
  }
  function revokeEditPreviews() {editOrderPhotos.forEach((photo) => {if (photo.preview) URL.revokeObjectURL(photo.preview);});}
  function renderEditOrderPhotos() {var _$2;
    const grid = $('edit-order-photos-grid');if (!grid) return;grid.replaceChildren();
    const itemImages = Array.from(((_$2 = $('edit-order-items-list')) == null ? void 0 : _$2.querySelectorAll('.admin-order-edit-item')) || []).map((row) => row.dataset.image || '').filter(Boolean);
    const main = editOrderPhotos[0] ? editOrderPhotos[0].preview || editOrderPhotos[0].url : itemImages[0] || '';
    setOrderEditImagePreview(main);
    editOrderPhotos.forEach((photo, index) => {
      const tile = document.createElement('div');tile.className = 'admin-photo-tile' + (photo.file ? ' is-new' : '');
      const img = document.createElement('img');img.src = photo.preview || photo.url;img.alt = `Foto ${index + 1}`;img.loading = 'lazy';
      img.addEventListener('click', () => setOrderEditImagePreview(photo.preview || photo.url));
      const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-photo-remove';remove.setAttribute('aria-label', 'Quitar esta foto');remove.textContent = '×';
      remove.addEventListener('click', () => {if (photo.url) editOrderRemovedPhotos.push(photo.url);if (photo.preview) URL.revokeObjectURL(photo.preview);editOrderPhotos.splice(index, 1);renderEditOrderPhotos();message('admin-order-edit-message', 'La foto se quitará cuando guardes los cambios.', '');});
      tile.append(img, remove);
      if (photo.file) {const tag = document.createElement('span');tag.className = 'admin-photo-tag';tag.textContent = 'Nueva';tile.appendChild(tag);}
      grid.appendChild(tile);
    });
  }
  function closeOrderEdit() {
    const modal = $('admin-order-edit-modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;document.body.classList.remove('admin-order-edit-open');
    $('edit-order-image-file').value = '';
    if (editOrderPreviewUrl) {URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl = '';}
    revokeEditPreviews();editOrderPhotos = [];editOrderRemovedPhotos = [];
    editingOrder = null;clearOrderImage = false;
    $('admin-order-edit-message').textContent = '';
  }
  function addOrderItemEditor(item = {}, originalIndex = null) {var _ref, _item$name, _ref2, _item$price, _ref3, _item$quantity;
    const list = $('edit-order-items-list');
    const row = document.createElement('article');row.className = 'admin-order-edit-item';if (originalIndex !== null) row.dataset.originalIndex = String(originalIndex);
    const fields = document.createElement('div');fields.className = 'admin-order-edit-item-fields';
    const makeField = (labelText, value, type, step) => {
      const wrap = document.createElement('label');wrap.className = 'admin-order-edit-item-field';wrap.appendChild(document.createTextNode(labelText));
      const input = document.createElement('input');input.type = type;input.value = value != null ? value : '';input.required = type === 'text';
      if (type === 'number') {input.min = '0';if (step) input.step = step;}
      wrap.appendChild(input);fields.appendChild(wrap);return input;
    };
    const name = makeField('Producto / pastel', (_ref = (_item$name = item.name) != null ? _item$name : item.nombre) != null ? _ref : '', 'text');
    const price = makeField('Precio unitario (Q)', (_ref2 = (_item$price = item.price) != null ? _item$price : item.precio) != null ? _ref2 : 0, 'number', '0.01');
    const quantity = makeField('Cantidad', (_ref3 = (_item$quantity = item.quantity) != null ? _item$quantity : item.cantidad) != null ? _ref3 : 1, 'number', '1');quantity.min = '1';quantity.max = '99';quantity.step = '1';
    const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-button admin-button-danger admin-order-edit-item-remove';remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {row.remove();renderEditOrderPhotos();});
    const itemImage = String(item.image || item.imagen || '').trim();
    row.dataset.image = itemImage;
    if (itemImage) {
      const thumbWrap = document.createElement('div');thumbWrap.className = 'admin-order-edit-item-photo';
      const thumb = document.createElement('img');thumb.src = itemImage;thumb.alt = 'Foto del producto';thumb.loading = 'lazy';thumb.onerror = () => thumbWrap.remove();
      const clear = document.createElement('button');clear.type = 'button';clear.className = 'admin-photo-remove';clear.setAttribute('aria-label', 'Quitar la foto de este artículo');clear.textContent = '×';
      clear.addEventListener('click', () => {row.dataset.image = '';thumbWrap.remove();renderEditOrderPhotos();});
      thumbWrap.append(thumb, clear);row.append(thumbWrap);
    }
    row.append(fields, remove);list.appendChild(row);
  }
  function openOrderEdit(order) {
    editingOrder = order;clearOrderImage = false;
    const payload = order.payload || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    $('edit-order-code').value = order.order_code || '';
    $('admin-order-edit-code').textContent = `Pedido ${order.order_code || 'sin código'} · Puedes modificar sus datos y su fotografía`;
    $('edit-order-name').value = payload.name || '';
    $('edit-order-phone').value = payload.phone || '';
    $('edit-order-type').value = payload.order_type === 'pastel_personalizado' ? 'Pastel personalizado' : payload.order_type === 'pedido_administrador' ? 'Pedido añadido por administración' : 'Pedido de catálogo';
    $('edit-order-date').value = String(payload.delivery_date || '').slice(0, 10);
    $('edit-order-address').value = payload.address || '';
    $('edit-order-occasion').value = payload.occasion || '';
    $('edit-order-flavor').value = payload.flavor || '';
    $('edit-order-size').value = payload.size || '';
    $('edit-order-theme').value = payload.colors_theme || payload.theme || '';
    $('edit-order-customization').value = payload.customization || payload.personalization || '';
    $('edit-order-total').value = Number(payload.total) || 0;
    $('edit-order-status').value = normalizeOrderStatus(order.status);
    $('edit-order-items-list').replaceChildren();
    items.forEach((item, index) => addOrderItemEditor(item, index));
    if (!items.length && payload.order_type !== 'pastel_personalizado') addOrderItemEditor({});
    $('edit-order-image-file').value = '';
    if (editOrderPreviewUrl) {URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl = '';}
    revokeEditPreviews();editOrderRemovedPhotos = [];
    editOrderPhotos = getAttachedOrderPhotos(order).map((url) => ({ url }));
    renderEditOrderPhotos();
    $('admin-order-edit-modal').hidden = false;
    document.body.classList.add('admin-order-edit-open');
    $('edit-order-name').focus();
  }
  async function saveOrderEdit(event) {
    event.preventDefault();
    if (!editingOrder) return;
    const order = editingOrder;
    const payload = Object.assign({}, order.payload || {});
    const saveButton = $('admin-order-edit-save');
    const uploadedPhotos = [];
    let persisted = false;
    saveButton.disabled = true;saveButton.textContent = 'Guardando…';
    message('admin-order-edit-message', 'Guardando los cambios…');
    try {
      payload.name = $('edit-order-name').value.trim();
      payload.phone = $('edit-order-phone').value.trim();
      payload.delivery_date = $('edit-order-date').value;
      payload.address = $('edit-order-address').value.trim();
      payload.occasion = $('edit-order-occasion').value.trim();
      payload.flavor = $('edit-order-flavor').value.trim();
      payload.size = $('edit-order-size').value.trim();
      payload.colors_theme = $('edit-order-theme').value.trim();
      payload.theme = payload.colors_theme;
      payload.customization = $('edit-order-customization').value.trim();
      if (Object.prototype.hasOwnProperty.call(payload, 'personalization')) payload.personalization = payload.customization;
      payload.total = Number($('edit-order-total').value) || 0;
      const previousItems = Array.isArray(payload.items) ? payload.items : [];
      payload.items = Array.from($('edit-order-items-list').querySelectorAll('.admin-order-edit-item')).map((row) => {var _inputs$, _inputs$2, _inputs$3;
        const inputs = row.querySelectorAll('input');
        const name = ((_inputs$ = inputs[0]) == null ? void 0 : _inputs$.value.trim()) || '';
        if (!name) throw new Error('Escribe el nombre de cada artículo o quita la fila vacía.');
        const price = Number((_inputs$2 = inputs[1]) == null ? void 0 : _inputs$2.value) || 0;
        const quantity = Math.max(1, Math.min(99, Math.round(Number((_inputs$3 = inputs[2]) == null ? void 0 : _inputs$3.value) || 1)));
        const originalIndex = row.dataset.originalIndex === undefined ? null : Number(row.dataset.originalIndex);
        const base = Object.assign({}, originalIndex !== null && previousItems[originalIndex] ? previousItems[originalIndex] : {});
        const image = row.dataset.image || '';
        if (image) base.image = image;else {base.image = '';delete base.imagen;}
        return Object.assign(Object.assign({}, base), {}, { name, price, quantity });
      });

      // Sube las fotos nuevas (una por una para no saturar el celular) y arma la lista final.
      const finalPhotos = [];
      for (let i = 0; i < editOrderPhotos.length; i++) {
        const photo = editOrderPhotos[i];
        if (photo.file) {
          message('admin-order-edit-message', `Subiendo foto ${i + 1} de ${editOrderPhotos.length}…`);
          const url = await uploadPhoto(photo.file, 'custom-orders');
          uploadedPhotos.push(url);finalPhotos.push(url);
        } else if (photo.url) finalPhotos.push(photo.url);
      }
      delete payload.reference_image_url;delete payload.inspiration_image_url;
      if (finalPhotos.length) {payload.photo_reference_url = finalPhotos[0];payload.photos = finalPhotos;} else
      {delete payload.photo_reference_url;payload.photos = [];payload.photo_reference_name = '';}

      const nextStatus = normalizeOrderStatus($('edit-order-status').value);
      const { error } = await client.from('orders').update({ payload, status: nextStatus }).eq('order_code', order.order_code);
      if (error) throw error;
      persisted = true;
      // Limpia del almacenamiento solo las fotos de pedido que se quitaron.
      const removedPaths = editOrderRemovedPhotos.filter((url) => !finalPhotos.includes(url)).map((url) => imageStoragePath(url)).filter((path) => path && path.startsWith('custom-orders/'));
      if (removedPaths.length) {
        const { error: removeError } = await client.storage.from('product-images').remove(removedPaths);
        if (removeError) globalMessage('El pedido se guardó, pero no se pudo limpiar una fotografía anterior: ' + removeError.message, 'error');
      }
      activeOrdersView = statusView(nextStatus);
      closeOrderEdit();
      globalMessage(`Pedido ${order.order_code} actualizado correctamente.`, 'success');
      await loadOrders();
    } catch (error) {
      if (uploadedPhotos.length && !persisted) {
        const paths = uploadedPhotos.map((url) => imageStoragePath(url)).filter(Boolean);
        if (paths.length) await client.storage.from('product-images').remove(paths).catch(() => {});
      }
      message('admin-order-edit-message', (error == null ? void 0 : error.message) || 'No se pudieron guardar los cambios.', 'error');
    } finally {
      saveButton.disabled = false;saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
    }
  }
  function toggleManualOrder(show) {
    const form = $('admin-add-order-form');if (!form) return;
    form.hidden = typeof show === 'boolean' ? !show : !form.hidden;
    if (!form.hidden) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function saveManualOrder(event) {
    event.preventDefault();message('admin-add-order-message', 'Guardando pedido…');
    const name = $('manual-order-name').value.trim();
    const phone = $('manual-order-phone').value.trim();
    const deliveryDate = $('manual-order-date').value;
    const productName = $('manual-order-product').value.trim();
    const size = $('manual-order-size').value.trim();
    const quantity = Math.max(1, Math.min(99, Number($('manual-order-quantity').value) || 1));
    const unitPrice = Number($('manual-order-price').value);
    const address = $('manual-order-address').value.trim();
    const notes = $('manual-order-notes').value.trim();
    if (!name || !phone || !deliveryDate || !productName || !address || !Number.isFinite(unitPrice) || unitPrice < 0) {message('admin-add-order-message', 'Completa los datos obligatorios y revisa el precio.', 'error');return;}
    const random = newUUID().replace(/-/g, '').toUpperCase();
    const orderCode = `CC-${random.slice(0, 16)}`;
    const itemName = `${productName}${size ? ` (${size})` : ''}`;
    const submit = $('admin-add-order-form').querySelector('[type=submit]');
    if (submit) submit.disabled = true;
    const uploaded = [];
    try {var _ref4;
      // 1) Sube las fotos (si las hay).
      for (let i = 0; i < manualOrderFiles.length; i++) {
        message('admin-add-order-message', `Subiendo foto ${i + 1} de ${manualOrderFiles.length}…`);
        uploaded.push(await uploadPhoto(manualOrderFiles[i].file, 'custom-orders'));
      }
      message('admin-add-order-message', 'Guardando pedido…');
      const payload = { order_type: 'pedido_administrador', name, phone, delivery_date: deliveryDate, address, total: Number((unitPrice * quantity).toFixed(2)), items: [{ name: itemName, price: unitPrice, quantity, image: uploaded[0] || '' }], customization: notes, source: 'panel_administrador' };
      if (uploaded.length) {payload.photo_reference_url = uploaded[0];payload.photos = uploaded;payload.photo_reference_name = `${uploaded.length} foto(s) del pedido`;}
      // 2) Registra el pedido validando el cupo del día.
      const { data, error } = await client.rpc('cake_register_order_with_capacity', { p_order_code: orderCode, p_payload: payload });
      if (error) throw new Error(`No se pudo registrar el pedido: ${error.message}`);
      const saved = ((_ref4 = Array.isArray(data) ? data[0] : data) == null ? void 0 : _ref4.order_code) || orderCode;
      // 3) Asegura que las fotos queden guardadas en el pedido (por si la función de cupo no copia campos nuevos).
      if (uploaded.length) {
        const { error: photoError } = await client.from('orders').update({ payload }).eq('order_code', saved);
        if (photoError) globalMessage(`El pedido se guardó, pero las fotos no se pudieron enlazar: ${photoError.message}`, 'error');
      }
      $('admin-add-order-form').reset();$('manual-order-quantity').value = '1';clearManualPhotos();
      message('admin-add-order-message', `Pedido ${saved} guardado correctamente${uploaded.length ? ` con ${uploaded.length} foto(s)` : ''}.`, 'success');
      activeOrdersView = 'nuevos';await loadOrders();
    } catch (error) {
      if (uploaded.length) {const paths = uploaded.map((url) => imageStoragePath(url)).filter(Boolean);if (paths.length) await client.storage.from('product-images').remove(paths).catch(() => {});}
      message('admin-add-order-message', (error == null ? void 0 : error.message) || 'No se pudo guardar el pedido.', 'error');
    } finally {if (submit) submit.disabled = false;}
  }
  function clearManualPhotos() {manualOrderFiles.forEach((item) => URL.revokeObjectURL(item.preview));manualOrderFiles = [];const input = $('manual-order-photos');if (input) input.value = '';renderManualPhotos();}
  function renderManualPhotos() {
    const grid = $('manual-order-photos-preview');if (!grid) return;grid.replaceChildren();
    manualOrderFiles.forEach((item, index) => {
      const tile = document.createElement('div');tile.className = 'admin-photo-tile is-new';
      const img = document.createElement('img');img.src = item.preview;img.alt = `Foto ${index + 1}`;
      img.onerror = () => {img.replaceWith(Object.assign(document.createElement('span'), { className: 'admin-photo-name', textContent: item.file.name || 'Foto' }));};
      const remove = document.createElement('button');remove.type = 'button';remove.className = 'admin-photo-remove';remove.setAttribute('aria-label', 'Quitar esta foto');remove.textContent = '×';
      remove.addEventListener('click', () => {URL.revokeObjectURL(item.preview);manualOrderFiles.splice(index, 1);renderManualPhotos();});
      tile.append(img, remove);grid.appendChild(tile);
    });
  }
  function addManualPhotos(event) {
    const files = Array.from(event.target.files || []);event.target.value = '';
    const valid = files.filter(isImage);
    if (valid.length < files.length) message('admin-add-order-message', 'Algunos archivos no eran fotos y no se agregaron.', 'error');
    valid.forEach((file) => {if (manualOrderFiles.length < 8) manualOrderFiles.push({ file, preview: URL.createObjectURL(file) });});
    if (files.length && manualOrderFiles.length >= 8) message('admin-add-order-message', 'Máximo 8 fotos por pedido.', '');
    renderManualPhotos();
  }
  async function loadReviews() {
    const { data, error } = await client.from('testimonials').
    select('*').
    order('created_at', { ascending: false }).
    limit(100);
    const list = $('admin-reviews-list');
    list.replaceChildren();
    if (error) {
      list.appendChild(Object.assign(document.createElement('p'), { textContent: `No se pudieron cargar opiniones: ${error.message}` }));
      return;
    }
    reviews = data || [];
    if (!reviews.length) {
      list.appendChild(Object.assign(document.createElement('p'), { textContent: 'Todavía no has recibido opiniones. Comparte el enlace para invitar a tus clientes.' }));
      return;
    }

    // Genera los enlaces de todas las fotos en una sola petición, no una por reseña.
    const allPhotoPaths = [...new Set(reviews.flatMap((review) => Array.isArray(review.photo_paths) ? review.photo_paths : []).filter((path) => typeof path === 'string' && path && !/^https?:\/\//i.test(path)))];
    const signedPhotoMap = new Map();
    if (allPhotoPaths.length) {
      try {
        const { data: signedRows, error: signedError } = await client.storage.from('review-photos').createSignedUrls(allPhotoPaths, 3600);
        if (signedError) throw signedError;
        (signedRows || []).forEach((item) => {
          if (item.path && item.signedUrl) signedPhotoMap.set(item.path, item.signedUrl);
        });
      } catch (signedError) {
        console.warn('No se pudieron preparar las vistas previas agrupadas; se intentará foto por foto:', signedError.message);
        const fallback = await Promise.all(allPhotoPaths.map(async (path) => {
          const { data: signed, error: oneError } = await client.storage.from('review-photos').createSignedUrl(path, 3600);
          return !oneError && signed != null && signed.signedUrl ? [path, signed.signedUrl] : null;
        }));
        fallback.filter(Boolean).forEach(([path, url]) => signedPhotoMap.set(path, url));
      }
    }

    for (const r of reviews) {
      const row = document.createElement('article');
      row.className = 'admin-review-row admin-review-row-v2';
      const paths = Array.isArray(r.photo_paths) ? r.photo_paths : [];
      const photos = paths.map((path) => /^https?:\/\//i.test(path) ? path : signedPhotoMap.get(path) || '').filter(Boolean);
      if (!photos.length && r.photo_url) photos.push(r.photo_url);
      const gallery = document.createElement('div');
      gallery.className = 'admin-review-gallery';
      photos.slice(0, 10).forEach((url) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Foto enviada en una reseña';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = () => img.remove();
        gallery.appendChild(img);
      });

      const text = document.createElement('div');
      text.className = 'admin-review-copy';
      const heading = document.createElement('strong');
      heading.textContent = `${r.customer_name} · ${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}`;
      const product = document.createElement('small');
      product.textContent = r.product_name || 'Producto no especificado';
      const p = document.createElement('p');
      p.textContent = r.review_text || '';
      const state = document.createElement('small');
      state.className = 'admin-review-state';
      state.textContent = r.is_published ? 'Publicada' : 'Pendiente de aprobación';
      text.append(heading, product, p, state);

      const actions = document.createElement('div');
      actions.className = 'admin-row-actions';
      const edit = document.createElement('button');
      edit.className = 'admin-button admin-button-outline';
      edit.textContent = 'Revisar';
      edit.addEventListener('click', () => fillReview(r));

      const publish = document.createElement('button');
      publish.className = 'admin-button admin-button-primary';
      publish.textContent = r.is_published ? 'Ocultar' : 'Aprobar y publicar';
      publish.addEventListener('click', async () => {
        publish.disabled = true;
        const nextPublished = !r.is_published;
        try {
          const { data: updated, error } = await client.from('testimonials').
          update({ is_published: nextPublished, published_at: nextPublished ? new Date().toISOString() : null }).
          eq('id', r.id).
          select('id, is_published, published_at').
          maybeSingle();
          if (error) throw error;
          if (!updated || updated.is_published !== nextPublished) {
            throw new Error('Supabase no confirmó el cambio. Revisa los permisos RLS de testimonials antes de volver a publicar.');
          }
          // Mantener el estado local sincronizado y refrescar la lista del administrador.
          r.is_published = updated.is_published;
          r.published_at = updated.published_at;
          globalMessage(nextPublished ? '¡Reseña publicada! La tienda la mostrará al instante o en unos segundos.' : 'Reseña ocultada.', 'success');
          await loadReviews();
        } catch (error) {
          publish.disabled = false;
          globalMessage(`No se pudo confirmar la publicación: ${error.message || 'Error desconocido'}`, 'error');
        }
      });

      const del = document.createElement('button');
      del.className = 'admin-button admin-button-danger';
      del.textContent = 'Eliminar';
      del.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta opinión? Esta acción no se puede deshacer.')) return;
        const { error } = await client.from('testimonials').delete().eq('id', r.id);
        if (error) {globalMessage(error.message, 'error');return;}
        if (paths.length) {
          const cleanup = await client.storage.from('review-photos').remove(paths);
          if (cleanup.error) console.warn('No se pudieron limpiar todas las fotos de la reseña:', cleanup.error.message);
        }
        await loadReviews();
      });
      actions.append(edit, publish, del);
      row.append(gallery, text, actions);
      list.appendChild(row);
    }
  }
  function fillReview(r) {var _$3;$('review-id').value = r.id;$('review-name').value = r.customer_name || '';$('review-product').value = r.product_name || '';$('review-text').value = r.review_text || '';$('review-rating').value = String(r.rating || 5);$('review-published').checked = !!r.is_published;(_$3 = $('admin-review-form')) == null || _$3.scrollIntoView({ behavior: 'smooth' });}
  async function saveReview(event) {event.preventDefault();message('admin-review-message', 'Guardando…');try {
      const existing = reviews.find((r) => r.id === $('review-id').value);let photoPaths = Array.isArray(existing == null ? void 0 : existing.photo_paths) ? [...existing.photo_paths] : [];const files = Array.from($('review-photo').files || []);if (files.length > 10 || photoPaths.length + files.length > 10) throw new Error('Una reseña puede tener máximo 10 fotografías en total.');
      for (const original of files) {const file = await prepareImage(original);const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';const path = `incoming/${newUUID()}.${ext}`;const { error } = await client.storage.from('review-photos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });if (error) throw error;photoPaths.push(path);}
      const payload = { customer_name: $('review-name').value.trim(), product_name: $('review-product').value.trim(), review_text: $('review-text').value.trim(), rating: Number($('review-rating').value), photo_paths: photoPaths, photo_url: (existing == null ? void 0 : existing.photo_url) || null, is_published: $('review-published').checked, published_at: $('review-published').checked ? (existing == null ? void 0 : existing.published_at) || new Date().toISOString() : null, consent_to_publish: true };const id = $('review-id').value;const q = id ? client.from('testimonials').update(payload).eq('id', id) : client.from('testimonials').insert(payload);const { error } = await q;if (error) throw error;message('admin-review-message', 'Opinión guardada.', 'success');$('admin-review-form').reset();$('review-id').value = '';await loadReviews();
    } catch (e) {message('admin-review-message', e.message || 'No se pudo guardar.', 'error');}}
  function setupReviewShareLink() {var _$4;const publicUrl = new URL('index.html', location.href);publicUrl.hash = 'opiniones';const url = publicUrl.href;const target = $('admin-review-share-url');if (target) target.textContent = url;(_$4 = $('admin-copy-review-link')) == null || _$4.addEventListener('click', async () => {try {await navigator.clipboard.writeText(url);message('admin-global-message', 'Enlace de reseñas copiado.', 'success');} catch (_) {const temp = document.createElement('textarea');temp.value = url;document.body.appendChild(temp);temp.select();document.execCommand('copy');temp.remove();message('admin-global-message', 'Enlace de reseñas copiado.', 'success');}});}
  async function loadSettings() {const { data, error } = await client.from('store_settings').select('*').eq('id', 1).maybeSingle();if (error) {message('admin-settings-message', error.message, 'error');return;}if (data) {$('setting-delivery').value = data.delivery_info || '';$('setting-payment').value = data.payment_info || '';$('setting-notice').value = data.order_notice || '';}}
  async function saveSettings(event) {event.preventDefault();message('admin-settings-message', 'Guardando…');const payload = { id: 1, delivery_info: $('setting-delivery').value.trim(), payment_info: $('setting-payment').value.trim(), order_notice: $('setting-notice').value.trim(), updated_at: new Date().toISOString() };const { error } = await client.from('store_settings').upsert(payload, { onConflict: 'id' });if (error) {message('admin-settings-message', error.message, 'error');return;}message('admin-settings-message', 'Información pública actualizada.', 'success');}
  async function loadCapacitySettings() {
    const { data, error } = await client.from('cake_order_capacity_settings').select('daily_limit').eq('id', 1).maybeSingle();
    if (error) {message('cake-capacity-settings-message', 'Primero ejecuta el archivo supabase/capacidad_pedidos.sql en Supabase. Detalle: ' + error.message, 'error');return;}
    if (data) $('cake-daily-limit').value = String(data.daily_limit);
    await loadCapacityOverrides();
  }
  async function saveCapacitySettings(event) {
    event.preventDefault();const limit = Number($('cake-daily-limit').value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {message('cake-capacity-settings-message', 'Escribe un número entre 1 y 500.', 'error');return;}
    message('cake-capacity-settings-message', 'Guardando…');
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.from('cake_order_capacity_settings').upsert({ id: 1, daily_limit: limit, updated_at: new Date().toISOString(), updated_by: (user == null ? void 0 : user.id) || null }, { onConflict: 'id' });
    if (error) {message('cake-capacity-settings-message', 'No se guardó: ' + error.message, 'error');return;}
    message('cake-capacity-settings-message', 'Límite general guardado.', 'success');
  }
  async function loadCapacityOverrides() {
    const list = $('cake-capacity-overrides-list');if (!list) return;list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando fechas especiales…' }));
    const { data, error } = await client.from('cake_order_capacity_overrides').select('*').order('delivery_date', { ascending: true }).limit(120);
    if (error) {list.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'No se pudieron cargar las fechas: ' + error.message }));return;}
    list.replaceChildren();if (!(data != null && data.length)) {list.appendChild(Object.assign(document.createElement('p'), { textContent: 'No hay fechas especiales configuradas.' }));return;}
    data.forEach((row) => {const item = document.createElement('article');item.className = 'admin-order-row';const title = document.createElement('strong');title.textContent = `${row.delivery_date} · límite ${row.daily_limit}`;const note = document.createElement('p');note.textContent = row.note || 'Sin nota';const del = document.createElement('button');del.type = 'button';del.className = 'admin-button admin-button-danger';del.textContent = 'Quitar excepción';del.addEventListener('click', async () => {if (!confirm(`¿Quitar la excepción del ${row.delivery_date}? Se usará el límite general.`)) return;const { error } = await client.from('cake_order_capacity_overrides').delete().eq('delivery_date', row.delivery_date);if (error) {message('cake-capacity-override-message', error.message, 'error');return;}await loadCapacityOverrides();});item.append(title, note, del);list.appendChild(item);});
  }
  async function saveCapacityOverride(event) {
    event.preventDefault();const date = $('cake-capacity-date').value,limit = Number($('cake-capacity-override-limit').value),note = $('cake-capacity-note').value.trim();
    if (!date || !Number.isInteger(limit) || limit < 0 || limit > 500) {message('cake-capacity-override-message', 'Revisa la fecha y usa un límite de 0 a 500.', 'error');return;}
    const { data: { user } } = await client.auth.getUser();const { error } = await client.from('cake_order_capacity_overrides').upsert({ delivery_date: date, daily_limit: limit, note, updated_at: new Date().toISOString(), updated_by: (user == null ? void 0 : user.id) || null }, { onConflict: 'delivery_date' });
    if (error) {message('cake-capacity-override-message', 'No se guardó: ' + error.message, 'error');return;}
    message('cake-capacity-override-message', 'Fecha especial guardada.', 'success');$('cake-capacity-override-form').reset();$('cake-capacity-override-limit').value = '0';await loadCapacityOverrides();
  }
  async function boot(user) {if (!(await requireAdmin(user))) return;showApp(user);await loadProducts();await loadSettings();await loadCapacitySettings();}
  document.addEventListener('DOMContentLoaded', async () => {var _$5, _$6, _$7, _$8, _$9, _$0, _$1, _$10, _$11, _$12, _$13, _$14, _$18;
    client = configuredClient();
    if (!client) {$('admin-config-notice').hidden = false;$('admin-login-view').hidden = true;return;}
    const forcePanel = new URLSearchParams(window.location.search).get('panel') === '1';
    $('admin-login-form').addEventListener('submit', async (event) => {
      event.preventDefault();message('admin-login-message', 'Verificando…');
      const { data, error } = await client.auth.signInWithPassword({ email: $('admin-email').value.trim(), password: $('admin-password').value });
      if (error) {message('admin-login-message', 'No se pudo iniciar sesión. Revisa tu correo y contraseña.', 'error');return;}
      if (!data.user) {message('admin-login-message', 'No se recibió una sesión válida.', 'error');return;}
      if (forcePanel) {await boot(data.user);return;}
      if (await requireAdmin(data.user)) window.location.href = 'index.html?modo=edicion';
    });
    $('admin-logout').addEventListener('click', async () => {await client.auth.signOut();showAuth();message('admin-login-message', 'Sesión cerrada.', 'success');});
    document.querySelectorAll('[data-admin-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.adminTab)));
    document.querySelectorAll('[data-order-view]').forEach((b) => b.addEventListener('click', () => setOrdersView(b.dataset.orderView)));
    (_$5 = $('admin-image-lightbox-close')) == null || _$5.addEventListener('click', closeOrderImage);
    (_$6 = $('admin-order-edit-close')) == null || _$6.addEventListener('click', closeOrderEdit);
    (_$7 = $('admin-order-edit-cancel')) == null || _$7.addEventListener('click', closeOrderEdit);
    (_$8 = $('admin-order-edit-modal')) == null || _$8.addEventListener('click', (event) => {if (event.target === $('admin-order-edit-modal')) closeOrderEdit();});
    (_$9 = $('admin-order-edit-form')) == null || _$9.addEventListener('submit', saveOrderEdit);
    (_$0 = $('edit-order-add-item')) == null || _$0.addEventListener('click', () => addOrderItemEditor({ name: '', price: 0, quantity: 1 }));
    (_$1 = $('edit-order-image-file')) == null || _$1.addEventListener('change', (event) => {const files = Array.from(event.target.files || []);event.target.value = '';if (!files.length) return;const valid = files.filter(isImage);if (!valid.length) {message('admin-order-edit-message', 'Elige fotografías (máximo 25 MB cada una).', 'error');return;}valid.forEach((file) => {if (editOrderPhotos.length < 10) editOrderPhotos.push({ file, preview: URL.createObjectURL(file) });});renderEditOrderPhotos();message('admin-order-edit-message', `${valid.length} foto(s) lista(s). Guarda los cambios para aplicarlas.`, '');});
    (_$10 = $('edit-order-remove-image')) == null || _$10.addEventListener('click', () => {if (!editOrderPhotos.length) {message('admin-order-edit-message', 'Este pedido no tiene fotos adjuntas.', '');return;}if (!confirm('¿Quitar todas las fotos adjuntas de este pedido?')) return;editOrderPhotos.forEach((photo) => {if (photo.url) editOrderRemovedPhotos.push(photo.url);if (photo.preview) URL.revokeObjectURL(photo.preview);});editOrderPhotos = [];renderEditOrderPhotos();message('admin-order-edit-message', 'Las fotos se quitarán cuando guardes los cambios.', '');});
    (_$11 = $('manual-order-photos')) == null || _$11.addEventListener('change', addManualPhotos);
    (_$12 = $('admin-image-lightbox-prev')) == null || _$12.addEventListener('click', (event) => {event.stopPropagation();moveLightbox(-1);});
    (_$13 = $('admin-image-lightbox-next')) == null || _$13.addEventListener('click', (event) => {event.stopPropagation();moveLightbox(1);});
    (_$14 = $('admin-image-lightbox')) == null || _$14.addEventListener('click', (event) => {if (event.target === $('admin-image-lightbox')) closeOrderImage();});
    document.addEventListener('keydown', (event) => {var _$15, _$16, _$17;if (event.key === 'Escape' && !((_$15 = $('admin-image-lightbox')) != null && _$15.hidden)) closeOrderImage();else if (event.key === 'Escape' && !((_$16 = $('admin-order-edit-modal')) != null && _$16.hidden)) closeOrderEdit();else if (!((_$17 = $('admin-image-lightbox')) != null && _$17.hidden) && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) moveLightbox(event.key === 'ArrowRight' ? 1 : -1);});
    $('admin-product-form').addEventListener('submit', saveProduct);$('admin-new-product').addEventListener('click', resetProductForm);$('admin-new-specialty').addEventListener('click', () => {resetProductForm();$('product-category').value = 'especiales';$('product-form-title').textContent = 'Agregar especialidad';$('product-name').focus();$('admin-product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });});$('admin-cancel-product').addEventListener('click', resetProductForm);$('admin-product-search').addEventListener('input', filterProducts);$('admin-refresh-orders').addEventListener('click', loadOrders);$('admin-toggle-add-order').addEventListener('click', () => toggleManualOrder());$('admin-cancel-add-order').addEventListener('click', () => toggleManualOrder(false));$('admin-add-order-form').addEventListener('submit', saveManualOrder);$('admin-review-form').addEventListener('submit', saveReview);setupReviewShareLink();(_$18 = $('admin-refresh-reviews')) == null || _$18.addEventListener('click', loadReviews);$('admin-cancel-review').addEventListener('click', () => {$('admin-review-form').reset();$('review-id').value = '';message('admin-review-message', '');});$('admin-settings-form').addEventListener('submit', saveSettings);$('cake-capacity-settings-form').addEventListener('submit', saveCapacitySettings);$('cake-capacity-override-form').addEventListener('submit', saveCapacityOverride);
    const { data: { session } } = await client.auth.getSession();
    if (session != null && session.user) {if (forcePanel) await boot(session.user);else window.location.replace('index.html?modo=edicion');} else
    showAuth();
  });
})();
