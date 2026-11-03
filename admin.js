/* =========================================================
   ADMIN.JS — gestion segura de productos, ofertas, pedidos y opiniones.
   Autorización real: Supabase Auth + public.admin_users + políticas RLS.
   ========================================================= */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
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
  const CATEGORIES = ['pasteles','postres','galletas','bocaditos','especiales'];
  const STATUS = [['recibido','Pedidos nuevos'],['entregado','Pedidos entregados'],['cancelado','Pedidos cancelados']];
  function message(id, text, type='') { const el=$(id); if(!el)return; el.textContent=text; el.className=`admin-message ${type}`.trim(); }
  function globalMessage(text,type='') { message('admin-global-message',text,type); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function slugify(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function configuredClient() { try { return window.getCakeSupabaseClient?.() || null; } catch (_) { return null; } }
  function showAuth() { $('admin-login-view').hidden=false; $('admin-app-view').hidden=true; }
  function showApp(user) { $('admin-login-view').hidden=true; $('admin-app-view').hidden=false; $('admin-user-line').textContent=`Sesión iniciada: ${user.email || 'administradora'}`; }
  function fmtQ(v) { return `Q${(Number(v)||0).toFixed(2)}`; }
  function isImage(file) { return !!file && /^image\/(jpeg|png|webp|gif)$/i.test(file.type) && file.size <= 5*1024*1024; }
  async function uploadPhoto(file, folder='products') {
    if (!isImage(file)) throw new Error('Elige una foto JPG, PNG, WebP o GIF de máximo 5 MB.');
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-90) || 'foto';
    const path = `${folder}/${crypto.randomUUID()}/${cleanName}`;
    const { data, error } = await client.storage.from('product-images').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
    if (error) throw error;
    const { data: urlData } = client.storage.from('product-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  }
  async function requireAdmin(user) {
    const { data, error } = await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if (error || !data) {
      await client.auth.signOut();
      showAuth();
      message('admin-login-message','Este usuario inició sesión, pero no está autorizado en la tabla admin_users. Agrega su UUID mediante las instrucciones SQL.','error');
      return false;
    }
    return true;
  }
  function setTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===tab));
    document.querySelectorAll('.admin-section').forEach(s=>{const active=s.id===`admin-panel-${tab}`;s.classList.toggle('active',active);s.hidden=!active;});
    if(tab==='orders') loadOrders(); if(tab==='reviews') loadReviews(); if(tab==='settings') { loadSettings(); loadCapacitySettings(); }
  }
  function updateStats() {
    $('stat-products').textContent=products.length;
    $('stat-offers').textContent=products.filter(p=>p.is_offer&&p.is_active).length;
    // Se actualiza desde loadOrders; se conserva si se carga otra pestaña.
  }
  function productRow(p) {
    const row=document.createElement('article'); row.className='admin-product-row';
    const img=document.createElement('img'); img.src=p.image_url||''; img.alt=p.name||'Producto'; img.onerror=()=>{img.style.visibility='hidden';};
    const meta=document.createElement('div'); meta.className='admin-product-meta';
    const name=document.createElement('strong'); name.textContent=p.name||'';
    const price=document.createElement('span'); price.textContent=`${fmtQ(p.price)}${p.sale_price>0?` · Oferta ${fmtQ(p.sale_price)}`:''}`;
    const flags=document.createElement('small'); flags.textContent=[p.is_active?'Publicado':'Oculto',p.is_featured?'Destacado':'',p.is_offer?'Oferta':''].filter(Boolean).join(' · ');
    meta.append(name,price,flags);
    const actions=document.createElement('div'); actions.className='admin-row-actions';
    const edit=document.createElement('button'); edit.type='button'; edit.className='admin-button admin-button-outline'; edit.textContent='Editar'; edit.addEventListener('click',()=>fillProduct(p));
    const remove=document.createElement('button'); remove.type='button'; remove.className='admin-button admin-button-danger'; remove.textContent='Enviar a papelera'; remove.addEventListener('click',()=>deleteProduct(p));
    actions.append(edit,remove); row.append(img,meta,actions); return row;
  }
  async function loadProducts() {
    globalMessage('Cargando productos…');
    const {data,error}=await client.from('products').select('*').is('deleted_at',null).order('created_at',{ascending:false,nullsFirst:false}).order('display_order',{ascending:true});
    if(error){globalMessage(`No se pudieron cargar productos: ${error.message}`,'error');return;}
    products=data||[]; updateStats();
    const list=$('admin-products-list'); list.replaceChildren();
    await refreshTrashCount();
    if(!products.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:'Todavía no hay productos en la base de datos. Puedes agregar uno o ejecutar el archivo SQL de productos iniciales.'}));}
    else products.forEach(p=>list.appendChild(productRow(p)));
    filterProducts(); globalMessage('Productos actualizados.','success');
  }
  function filterProducts() {
    const q=String($('admin-product-search').value||'').trim().toLowerCase();
    $('admin-products-list').querySelectorAll('.admin-product-row').forEach((row,idx)=>{const p=products[idx];row.hidden=!!q&&!`${p?.name||''} ${p?.category||''} ${p?.slug||''}`.toLowerCase().includes(q);});
  }
  function resetProductForm() {
    $('admin-product-form').reset(); $('product-id').value=''; delete $('product-slug').dataset.touched; $('product-form-title').textContent='Agregar producto'; $('product-active').checked=true; $('product-order').value=String(products.length*10+10); $('product-images').value=''; $('product-gallery-urls').value=''; $('product-current-gallery').replaceChildren(); currentGallery=[]; message('admin-product-message','');
  }
  function fillProduct(p) {
    $('product-id').value=p.id; $('product-slug').dataset.touched='true'; $('product-form-title').textContent=`Editar: ${p.name}`; $('product-name').value=p.name||''; $('product-slug').value=p.slug||''; $('product-category').value=CATEGORIES.includes(p.category)?p.category:'especiales'; $('product-price').value=p.price??0; $('product-price-small').value=p.price_small??''; $('product-price-medium').value=p.price_medium??''; $('product-price-large').value=p.price_large??''; $('product-sale-price').value=p.sale_price??''; $('product-description').value=p.description||''; $('product-gallery-urls').value=Array.isArray(p.gallery_urls)?p.gallery_urls.join('\n'):''; $('product-occasion').value=p.occasion||''; $('product-order').value=p.display_order??100; $('product-has-sizes').checked=!!p.has_sizes; $('product-active').checked=p.is_active!==false; $('product-featured').checked=!!p.is_featured; $('product-is-offer').checked=!!p.is_offer; currentGallery=[p.image_url,...(Array.isArray(p.gallery_urls)?p.gallery_urls:[])].filter(Boolean); $('product-current-gallery').replaceChildren(); currentGallery.forEach(url=>{const img=document.createElement('img');img.src=url;img.alt='Foto guardada';img.onerror=()=>img.remove();$('product-current-gallery').appendChild(img);}); window.scrollTo({top:$('admin-panel-products').getBoundingClientRect().top+window.scrollY-15,behavior:'smooth'});
  }
  $('product-name').addEventListener('input',()=>{if(!$('product-id').value||!$('product-slug').dataset.touched) $('product-slug').value=slugify($('product-name').value);});
  $('product-slug').addEventListener('input',()=>{$('product-slug').dataset.touched='true';});
  async function saveProduct(event) {
    event.preventDefault(); message('admin-product-message','Guardando…');
    try {
      const id=$('product-id').value||null;
      const fileList=Array.from($('product-images').files||[]);
      if($('product-category').value==='especiales' && fileList.length>4) throw new Error('Para una especialidad puedes seleccionar máximo 4 fotos: 1 portada y 3 adicionales.');
      const urls=[];
      for(const file of fileList) urls.push(await uploadPhoto(file,'products'));
      const existing=$('product-id').value?products.find(p=>p.id===$('product-id').value):null;
      const externalUrls=String($('product-gallery-urls').value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,15);
      const imageUrl=urls[0]||existing?.image_url||externalUrls[0]||'';
      if(!imageUrl) throw new Error('Agrega al menos una fotografía o URL de imagen.');
      const typedPrices=['product-price-small','product-price-medium','product-price-large'].map(id=>$(id).value.trim()===''?null:Number($(id).value));
      const payload={
        slug:slugify($('product-slug').value||$('product-name').value), name:$('product-name').value.trim(), category:$('product-category').value,
        description:$('product-description').value.trim(), image_url:imageUrl,
        gallery_urls:Array.from(new Set([...urls.slice(1),...externalUrls.filter(u=>u!==imageUrl),...(existing?.gallery_urls||[]).filter(u=>!urls.includes(u))])).slice(0, $('product-category').value==='especiales' ? 3 : 20),
        price:Number($('product-price').value), price_small:typedPrices[0], price_medium:typedPrices[1], price_large:typedPrices[2],
        sale_price:$('product-sale-price').value.trim()===''?null:Number($('product-sale-price').value), has_sizes:$('product-has-sizes').checked,
        is_active:$('product-active').checked, is_featured:$('product-featured').checked, is_offer:$('product-is-offer').checked,
        occasion:$('product-occasion').value.trim(), display_order:Number($('product-order').value)||100
      };
      if(!payload.slug || !payload.name) throw new Error('Completa el nombre y el enlace corto.');
      if(payload.sale_price!==null && payload.sale_price>0 && payload.sale_price>payload.price) throw new Error('El precio de oferta normalmente debe ser menor o igual al precio base.');
      // created_at usa el valor automático de Supabase; así se ordena por la hora real de publicación.
      const query=id?client.from('products').update(payload).eq('id',id):client.from('products').insert(payload);
      const {error}=await query;
      if(error) throw error;
      message('admin-product-message','Producto guardado correctamente.','success'); resetProductForm(); await loadProducts();
    } catch(error) { message('admin-product-message',error?.message||'No se pudo guardar el producto.','error'); }
  }
  async function deleteProduct(p) {
    if(!confirm(`¿Enviar “${p.name}” a la papelera? Podrás recuperarlo después.`)) return;
    const {error}=await client.from('products').update({
      deleted_at:new Date().toISOString(),
      deleted_previous_is_active:p.is_active!==false,
      is_active:false,
      updated_at:new Date().toISOString()
    }).eq('id',p.id);
    if(error){globalMessage(`No se pudo enviar a la papelera: ${error.message}. Comprueba que ejecutaste el SQL de papelera.`,'error');return;}
    await loadProducts(); resetProductForm(); globalMessage(`“${p.name}” se movió a la papelera.`,'success');
    if(activeOrdersView==='papelera') await loadTrash();
  }
  function normalizeOrderStatus(status) {
    const value=String(status||'recibido').toLowerCase();
    if(value==='entregado') return 'entregado';
    if(value==='cancelado') return 'cancelado';
    return 'recibido';
  }
  function statusView(status) {
    const normalized=normalizeOrderStatus(status);
    return normalized==='entregado'?'entregados':normalized==='cancelado'?'cancelados':'nuevos';
  }
  function updateOrderViewButtons() {
    const counts={
      nuevos:activeOrders.filter(o=>statusView(o.status)==='nuevos').length,
      entregados:activeOrders.filter(o=>statusView(o.status)==='entregados').length,
      cancelados:activeOrders.filter(o=>statusView(o.status)==='cancelados').length,
      papelera:trashCount
    };
    document.querySelectorAll('[data-order-view]').forEach(button=>{
      const view=button.dataset.orderView;
      button.classList.toggle('active',view===activeOrdersView);
      button.setAttribute('aria-pressed',view===activeOrdersView?'true':'false');
      const count=button.querySelector('[data-order-view-count]');
      if(count) count.textContent=String(counts[view]??0);
    });
  }
  async function refreshTrashCount() {
    const [ordersResult,productsResult]=await Promise.all([
      client.from('orders').select('order_code',{count:'exact',head:true}).not('deleted_at','is',null),
      client.from('products').select('id',{count:'exact',head:true}).not('deleted_at','is',null)
    ]);
    if(!ordersResult.error&&!productsResult.error) trashCount=(ordersResult.count||0)+(productsResult.count||0);
    updateOrderViewButtons();
  }
  function setOrdersView(view) {
    activeOrdersView=view;
    updateOrderViewButtons();
    if(view==='papelera') loadTrash(); else renderOrdersView();
  }
  function addInfoField(parent,label,value) {
    const item=document.createElement('div');item.className='admin-order-info-item';
    const caption=document.createElement('span');caption.textContent=label;
    const content=document.createElement('strong');content.textContent=(value===null||value===undefined||String(value).trim()==='')?'No indicado':String(value);
    item.append(caption,content);parent.appendChild(item);
  }
  function addInfoGroup(parent,title,fields) {
    const group=document.createElement('section');group.className='admin-order-info-group';
    const heading=document.createElement('h4');heading.textContent=title;group.appendChild(heading);
    const grid=document.createElement('div');grid.className='admin-order-info-grid';
    fields.forEach(([label,value])=>addInfoField(grid,label,value));
    group.appendChild(grid);parent.appendChild(group);
  }
  function imageStoragePath(url,bucket='product-images') {
    if(!url||typeof url!=='string') return null;
    const escaped=bucket.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=url.match(new RegExp('/storage/v1/object/(?:public|sign)/'+escaped+'/([^?#]+)'));
    if(!match) return null;
    try{return decodeURIComponent(match[1]);}catch(_){return match[1];}
  }
  async function removeStoredImages(urls) {
    const paths=Array.from(new Set((urls||[]).map(url=>imageStoragePath(url)).filter(Boolean)));
    if(!paths.length) return;
    const {error}=await client.storage.from('product-images').remove(paths);
    if(error) throw new Error(`No se pudieron borrar las imágenes de Storage: ${error.message}`);
  }
  function openOrderImage(url,alt='Fotografía del pedido') {
    const viewer=$('admin-image-lightbox');
    if(!viewer||!url) return;
    const image=$('admin-image-lightbox-image');
    image.src=url;image.alt=alt;viewer.hidden=false;document.body.classList.add('admin-lightbox-open');
    $('admin-image-lightbox-close')?.focus();
  }
  function closeOrderImage() {
    const viewer=$('admin-image-lightbox');if(!viewer)return;
    viewer.hidden=true;$('admin-image-lightbox-image').src='';document.body.classList.remove('admin-lightbox-open');
  }
  function createOrderRow(order,{trash=false}={}) {
    const card=document.createElement('article'); card.className='admin-order-row'+(trash?' admin-order-row-trash':'');
    const payload=order.payload||{};
    const top=document.createElement('div'); top.className='admin-order-top';
    const code=document.createElement('strong'); code.className='admin-order-code'; code.textContent=order.order_code||'Pedido sin código';
    const date=document.createElement('small'); date.className='admin-order-date'; date.textContent=order.created_at?new Date(order.created_at).toLocaleString('es-GT'):'Fecha no disponible'; top.append(code,date);
    const items=Array.isArray(payload.items)?payload.items:[];
    const firstImage=items.find(i=>i?.image)?.image;
    const referenceImage=payload.photo_reference_url||payload.reference_image_url||payload.inspiration_image_url||'';
    const orderImage=referenceImage||firstImage;
    if(orderImage){
      const imageButton=document.createElement('button');imageButton.type='button';imageButton.className='admin-order-image-button';
      imageButton.setAttribute('aria-label','Ampliar fotografía del pedido');
      const img=document.createElement('img');img.className='admin-order-image';img.src=orderImage;img.alt=referenceImage?'Foto de referencia del pastel personalizado':'Foto del producto pedido';img.loading='lazy';img.onerror=()=>imageButton.remove();
      imageButton.appendChild(img);imageButton.addEventListener('click',()=>openOrderImage(orderImage,img.alt));card.appendChild(imageButton);
    } else {
      const noImage=document.createElement('div');noImage.className='admin-order-no-image';noImage.textContent='Este pedido no tiene fotografía adjunta.';card.appendChild(noImage);
    }
    const info=document.createElement('div');info.className='admin-order-info';
    const type=payload.order_type==='pastel_personalizado'?'Pastel personalizado':payload.order_type==='pedido_administrador'?'Pedido añadido por administración':'Pedido de catálogo';
    addInfoGroup(info,'Cliente', [['Nombre',payload.name],['Teléfono',payload.phone],['Tipo de pedido',type]]);
    addInfoGroup(info,'Pastel y personalización', [['Ocasión',payload.occasion],['Sabor',payload.flavor],['Tamaño',payload.size],['Colores o temática',payload.colors_theme||payload.theme]]);
    addInfoGroup(info,'Entrega', [['Fecha deseada',payload.delivery_date],['Dirección',payload.address]]);
    const itemsGroup=document.createElement('section');itemsGroup.className='admin-order-info-group admin-order-items-group';
    const itemsHeading=document.createElement('h4');itemsHeading.textContent='Artículos y total';itemsGroup.appendChild(itemsHeading);
    if(items.length){
      const list=document.createElement('ul');list.className='admin-order-items';
      items.forEach(item=>{const li=document.createElement('li');const quantity=Number(item.quantity)||1;const label=document.createElement('span');label.textContent=`${quantity} × ${item.name||'Producto'}`;const price=document.createElement('strong');price.textContent=item.price!=null?fmtQ(Number(item.price)*quantity):'Precio no indicado';li.append(label,price);list.appendChild(li);});
      itemsGroup.appendChild(list);
    } else {
      const empty=document.createElement('p');empty.className='admin-order-muted';empty.textContent='No se registraron artículos.';itemsGroup.appendChild(empty);
    }
    const total=document.createElement('div');total.className='admin-order-total';
    const totalLabel=document.createElement('span');totalLabel.textContent='Total informado';
    const totalValue=document.createElement('strong');totalValue.textContent=fmtQ(payload.total);
    total.append(totalLabel,totalValue);itemsGroup.appendChild(total);info.appendChild(itemsGroup);
    addInfoGroup(info,'Detalles adicionales', [['Personalización / dedicatoria',payload.customization||payload.personalization],['Foto de referencia',payload.photo_reference_name|| (referenceImage?'Imagen adjunta':'No adjunta')]]);
    card.append(top,info);

    if(trash){
      const trashActions=document.createElement('div');trashActions.className='admin-row-actions admin-trash-actions';trashActions.style.justifyContent='flex-start';
      const restore=document.createElement('button');restore.type='button';restore.className='admin-button admin-button-primary';restore.textContent='Recuperar pedido';
      restore.addEventListener('click',async()=>{const {error}=await client.from('orders').update({deleted_at:null,status:order.deleted_previous_status||'recibido',deleted_previous_status:null}).eq('order_code',order.order_code);if(error){globalMessage(`No se pudo recuperar el pedido: ${error.message}`,'error');return;}globalMessage(`Pedido ${order.order_code} recuperado.`,'success');await loadOrders();});
      const remove=document.createElement('button');remove.type='button';remove.className='admin-button admin-button-danger';remove.textContent='Eliminar definitivamente';
      remove.addEventListener('click',()=>permanentlyDeleteOrder(order));trashActions.append(restore,remove);card.appendChild(trashActions);
      return card;
    }

    const statusRow=document.createElement('div');statusRow.className='admin-order-status';
    const select=document.createElement('select');select.setAttribute('aria-label','Mover pedido a una sección');
    STATUS.forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);});
    select.value=normalizeOrderStatus(order.status);
    const save=document.createElement('button');save.type='button';save.className='admin-button admin-button-primary';save.textContent='Guardar estado';
    save.addEventListener('click',async()=>{const destination=statusView(select.value);await saveOrderStatus(order.order_code,select.value,destination);});
    statusRow.append(select,save);
    const actions=document.createElement('div');actions.className='admin-row-actions admin-order-actions';actions.style.justifyContent='flex-start';
    const edit=document.createElement('button');edit.type='button';edit.className='admin-button admin-button-outline';edit.textContent='Editar datos';edit.addEventListener('click',()=>openOrderEdit(order));
    const remove=document.createElement('button');remove.type='button';remove.className='admin-button admin-button-danger';remove.textContent='Eliminar pedido';remove.addEventListener('click',()=>moveOrderToTrash(order));
    actions.append(edit,remove);card.append(statusRow,actions);return card;
  }
  async function saveOrderStatus(code,status,destination) {
    const {error}=await client.from('orders').update({status}).eq('order_code',code);
    if(error){globalMessage(`No se pudo actualizar el pedido: ${error.message}`,'error');return;}
    activeOrdersView=destination;
    globalMessage(`Pedido ${code} movido a ${destination==='entregados'?'Pedidos entregados':destination==='cancelados'?'Pedidos cancelados':'Pedidos nuevos'}.`,'success');
    await loadOrders();
  }
  async function moveOrderToTrash(order) {
    if(!confirm(`¿Enviar el pedido ${order.order_code} a la papelera? Podrás recuperarlo después.`))return;
    const {error}=await client.from('orders').update({deleted_at:new Date().toISOString(),deleted_previous_status:order.status||'recibido',status:'cancelado'}).eq('order_code',order.order_code);
    if(error){globalMessage(`No se pudo enviar el pedido a la papelera: ${error.message}. Comprueba el SQL de papelera.`,'error');return;}
    activeOrdersView='papelera';globalMessage(`Pedido ${order.order_code} enviado a la papelera.`,'success');await loadOrders();
  }
  async function permanentlyDeleteOrder(order) {
    if(!confirm(`¿Eliminar definitivamente el pedido ${order.order_code}? Esta acción no se puede deshacer.`))return;
    const payload=order.payload||{};
    try {
      await removeStoredImages([payload.photo_reference_url,payload.reference_image_url,payload.inspiration_image_url]);
      const {data,error}=await client.from('orders').delete().eq('order_code',order.order_code).select('order_code');
      if(error)throw error;
      if(!data?.length)throw new Error('Supabase no confirmó la eliminación. Revisa los permisos de administrador.');
      globalMessage(`Pedido ${order.order_code} eliminado definitivamente.`,'success');await loadTrash();
    } catch(error) {globalMessage(error?.message||'No se pudo eliminar definitivamente el pedido.','error');}
  }
  async function permanentlyDeleteProduct(product) {
    if(!confirm(`¿Eliminar definitivamente “${product.name}” y sus fotos guardadas en Supabase Storage? Esta acción no se puede deshacer.`))return;
    const urls=[product.image_url,...(Array.isArray(product.gallery_urls)?product.gallery_urls:[])];
    try {
      await removeStoredImages(urls);
      const {data,error}=await client.from('products').delete().eq('id',product.id).select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('Supabase no confirmó la eliminación. Revisa los permisos de administrador.');
      globalMessage(`“${product.name}” y sus fotografías guardadas fueron eliminados definitivamente.`,'success');
      await loadProducts();await loadTrash();
    } catch(error) {globalMessage(error?.message||'No se pudo eliminar definitivamente el producto.','error');}
  }
  function createTrashProductRow(product) {
    const row=document.createElement('article');row.className='admin-trash-product-row';
    const img=document.createElement('img');img.src=product.image_url||'';img.alt=product.name||'Producto';img.loading='lazy';img.onerror=()=>img.remove();
    const meta=document.createElement('div');meta.className='admin-product-meta';
    const name=document.createElement('strong');name.textContent=product.name||'Producto sin nombre';
    const price=document.createElement('span');price.textContent=`${fmtQ(product.price)} · ${product.category||'Sin categoría'}`;
    const date=document.createElement('small');date.textContent=product.deleted_at?`Eliminado: ${new Date(product.deleted_at).toLocaleString('es-GT')}`:'En papelera';meta.append(name,price,date);
    const actions=document.createElement('div');actions.className='admin-row-actions admin-trash-actions';
    const restore=document.createElement('button');restore.type='button';restore.className='admin-button admin-button-primary';restore.textContent='Recuperar producto';
    restore.addEventListener('click',async()=>{const {error}=await client.from('products').update({deleted_at:null,is_active:product.deleted_previous_is_active!==false,deleted_previous_is_active:null,updated_at:new Date().toISOString()}).eq('id',product.id);if(error){globalMessage(`No se pudo recuperar el producto: ${error.message}`,'error');return;}globalMessage(`“${product.name}” recuperado.`,'success');await loadProducts();await loadTrash();});
    const remove=document.createElement('button');remove.type='button';remove.className='admin-button admin-button-danger';remove.textContent='Eliminar definitivamente';remove.addEventListener('click',()=>permanentlyDeleteProduct(product));
    actions.append(restore,remove);row.append(img,meta,actions);return row;
  }
  async function loadTrash() {
    const list=$('admin-orders-list');list.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Cargando papelera…'}));
    const [ordersResult,productsResult]=await Promise.all([
      client.from('orders').select('order_code,status,payload,created_at,deleted_at,deleted_previous_status').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(500),
      client.from('products').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}).limit(500)
    ]);
    if(ordersResult.error||productsResult.error){const errors=[ordersResult.error,productsResult.error].filter(Boolean).map(e=>e.message).join(' · ');list.replaceChildren(Object.assign(document.createElement('p'),{textContent:`No se pudo cargar la papelera: ${errors}. Comprueba que ejecutaste el SQL de papelera.`}));return;}
    trashOrders=ordersResult.data||[];trashProducts=productsResult.data||[];trashCount=trashOrders.length+trashProducts.length;updateOrderViewButtons();list.replaceChildren();
    if(!trashOrders.length&&!trashProducts.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:'La papelera está vacía.'}));return;}
    if(trashOrders.length){const title=document.createElement('h3');title.className='admin-order-group-title';title.textContent=`Pedidos eliminados (${trashOrders.length})`;list.appendChild(title);trashOrders.forEach(order=>list.appendChild(createOrderRow(order,{trash:true})));}
    if(trashProducts.length){const title=document.createElement('h3');title.className='admin-order-group-title';title.textContent=`Productos eliminados (${trashProducts.length})`;list.appendChild(title);trashProducts.forEach(product=>list.appendChild(createTrashProductRow(product)));}
  }
  function renderOrdersView() {
    const list=$('admin-orders-list');if(!list)return;
    updateOrderViewButtons();list.replaceChildren();
    const filtered=activeOrders.filter(order=>statusView(order.status)===activeOrdersView);
    const labels={nuevos:'Pedidos nuevos',entregados:'Pedidos entregados',cancelados:'Pedidos cancelados'};
    const title=document.createElement('h3');title.className='admin-order-group-title';title.textContent=`${labels[activeOrdersView]||'Pedidos'} (${filtered.length})`;list.appendChild(title);
    if(!filtered.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:activeOrdersView==='nuevos'?'No hay pedidos nuevos.':activeOrdersView==='entregados'?'Todavía no hay pedidos entregados.':'Todavía no hay pedidos cancelados.'}));return;}
    filtered.forEach(order=>list.appendChild(createOrderRow(order)));
  }
  async function loadOrders() {
    const list=$('admin-orders-list');list.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Cargando pedidos…'}));
    const {data,error}=await client.from('orders').select('order_code,status,payload,created_at,deleted_at,deleted_previous_status').is('deleted_at',null).order('created_at',{ascending:false}).limit(500);
    if(error){list.replaceChildren(Object.assign(document.createElement('p'),{textContent:`No se pudieron cargar pedidos: ${error.message}. Comprueba que ejecutaste el SQL de papelera.`}));return;}
    activeOrders=data||[];$('stat-orders').textContent=activeOrders.filter(o=>statusView(o.status)==='nuevos').length;
    await refreshTrashCount();
    if(activeOrdersView==='papelera') await loadTrash(); else renderOrdersView();
  }
  function getOrderImage(order) {
    const payload=order?.payload||{};
    const items=Array.isArray(payload.items)?payload.items:[];
    return payload.photo_reference_url||payload.reference_image_url||payload.inspiration_image_url||items.find(item=>item?.image||item?.imagen)?.image||items.find(item=>item?.imagen)?.imagen||'';
  }
  function setOrderEditImagePreview(url) {
    const image=$('edit-order-image-preview');
    const empty=$('edit-order-image-empty');
    if(url){image.src=url;image.hidden=false;empty.hidden=true;}
    else {image.removeAttribute('src');image.hidden=true;empty.hidden=false;}
  }
  function closeOrderEdit() {
    const modal=$('admin-order-edit-modal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;document.body.classList.remove('admin-order-edit-open');
    $('edit-order-image-file').value='';
    if(editOrderPreviewUrl){URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl='';}
    editingOrder=null;clearOrderImage=false;
    $('admin-order-edit-message').textContent='';
  }
  function addOrderItemEditor(item={},originalIndex=null) {
    const list=$('edit-order-items-list');
    const row=document.createElement('article');row.className='admin-order-edit-item';if(originalIndex!==null)row.dataset.originalIndex=String(originalIndex);
    const fields=document.createElement('div');fields.className='admin-order-edit-item-fields';
    const makeField=(labelText,value,type,step)=>{
      const wrap=document.createElement('label');wrap.className='admin-order-edit-item-field';wrap.appendChild(document.createTextNode(labelText));
      const input=document.createElement('input');input.type=type;input.value=value??'';input.required=type==='text';
      if(type==='number'){input.min='0';if(step)input.step=step;}
      wrap.appendChild(input);fields.appendChild(wrap);return input;
    };
    const name=makeField('Producto / pastel',item.name??item.nombre??'','text');
    const price=makeField('Precio unitario (Q)',item.price??item.precio??0,'number','0.01');
    const quantity=makeField('Cantidad',item.quantity??item.cantidad??1,'number','1');quantity.min='1';quantity.max='99';quantity.step='1';
    const remove=document.createElement('button');remove.type='button';remove.className='admin-button admin-button-danger admin-order-edit-item-remove';remove.textContent='Quitar';
    remove.addEventListener('click',()=>row.remove());
    row.append(fields,remove);list.appendChild(row);
  }
  function openOrderEdit(order) {
    editingOrder=order;clearOrderImage=false;
    const payload=order.payload||{};
    const items=Array.isArray(payload.items)?payload.items:[];
    $('edit-order-code').value=order.order_code||'';
    $('admin-order-edit-code').textContent=`Pedido ${order.order_code||'sin código'} · Puedes modificar sus datos y su fotografía`;
    $('edit-order-name').value=payload.name||'';
    $('edit-order-phone').value=payload.phone||'';
    $('edit-order-type').value=payload.order_type==='pastel_personalizado'?'Pastel personalizado':payload.order_type==='pedido_administrador'?'Pedido añadido por administración': 'Pedido de catálogo';
    $('edit-order-date').value=String(payload.delivery_date||'').slice(0,10);
    $('edit-order-address').value=payload.address||'';
    $('edit-order-occasion').value=payload.occasion||'';
    $('edit-order-flavor').value=payload.flavor||'';
    $('edit-order-size').value=payload.size||'';
    $('edit-order-theme').value=payload.colors_theme||payload.theme||'';
    $('edit-order-customization').value=payload.customization||payload.personalization||'';
    $('edit-order-total').value=Number(payload.total)||0;
    $('edit-order-status').value=normalizeOrderStatus(order.status);
    $('edit-order-items-list').replaceChildren();
    items.forEach((item,index)=>addOrderItemEditor(item,index));
    if(!items.length && payload.order_type!=='pastel_personalizado') addOrderItemEditor({});
    $('edit-order-image-file').value='';
    if(editOrderPreviewUrl){URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl='';}
    setOrderEditImagePreview(getOrderImage(order));
    $('admin-order-edit-modal').hidden=false;
    document.body.classList.add('admin-order-edit-open');
    $('edit-order-name').focus();
  }
  async function saveOrderEdit(event) {
    event.preventDefault();
    if(!editingOrder)return;
    const order=editingOrder;
    const payload={...(order.payload||{})};
    const saveButton=$('admin-order-edit-save');
    let uploadedPhotoUrl='';
    let persisted=false;
    saveButton.disabled=true;saveButton.textContent='Guardando…';
    message('admin-order-edit-message','Guardando los cambios…');
    try {
      payload.name=$('edit-order-name').value.trim();
      payload.phone=$('edit-order-phone').value.trim();
      payload.delivery_date=$('edit-order-date').value;
      payload.address=$('edit-order-address').value.trim();
      payload.occasion=$('edit-order-occasion').value.trim();
      payload.flavor=$('edit-order-flavor').value.trim();
      payload.size=$('edit-order-size').value.trim();
      payload.colors_theme=$('edit-order-theme').value.trim();
      payload.theme=payload.colors_theme;
      payload.customization=$('edit-order-customization').value.trim();
      if(Object.prototype.hasOwnProperty.call(payload,'personalization'))payload.personalization=payload.customization;
      payload.total=Number($('edit-order-total').value)||0;
      const previousItems=Array.isArray(payload.items)?payload.items:[];
      payload.items=Array.from($('edit-order-items-list').querySelectorAll('.admin-order-edit-item')).map(row=>{
        const inputs=row.querySelectorAll('input');
        const name=inputs[0]?.value.trim()||'';
        if(!name)throw new Error('Escribe el nombre de cada artículo o quita la fila vacía.');
        const price=Number(inputs[1]?.value)||0;
        const quantity=Math.max(1,Math.min(99,Math.round(Number(inputs[2]?.value)||1)));
        const originalIndex=row.dataset.originalIndex===undefined?null:Number(row.dataset.originalIndex);
        return {...(originalIndex!==null&&previousItems[originalIndex]?previousItems[originalIndex]:{}),name,price,quantity};
      });

      const file=$('edit-order-image-file').files?.[0];
      const currentPhoto=getOrderImage(order);
      if(file){
        uploadedPhotoUrl=await uploadPhoto(file,'custom-orders');
        payload.photo_reference_url=uploadedPhotoUrl;
        payload.photo_reference_name=file.name.slice(0,200);
      } else if(clearOrderImage){
        delete payload.photo_reference_url;delete payload.reference_image_url;delete payload.inspiration_image_url;
        payload.photo_reference_name='';
        payload.items=(payload.items||[]).map(item=>({...item,image:''}));
      }

      const nextStatus=normalizeOrderStatus($('edit-order-status').value);
      const {error}=await client.from('orders').update({payload,status:nextStatus}).eq('order_code',order.order_code);
      if(error)throw error;
      persisted=true;
      if((file||clearOrderImage)&&currentPhoto){
        const path=imageStoragePath(currentPhoto);
        if(path&&path.startsWith('custom-orders/')){
          const {error:removeError}=await client.storage.from('product-images').remove([path]);
          if(removeError)globalMessage('El pedido se guardó, pero no se pudo limpiar la fotografía anterior: '+removeError.message,'error');
        }
      }
      activeOrdersView=statusView(nextStatus);
      closeOrderEdit();
      globalMessage(`Pedido ${order.order_code} actualizado correctamente.`,'success');
      await loadOrders();
    } catch(error) {
      if(uploadedPhotoUrl&&!persisted){
        const path=imageStoragePath(uploadedPhotoUrl);
        if(path)await client.storage.from('product-images').remove([path]).catch(()=>{});
      }
      message('admin-order-edit-message',error?.message||'No se pudieron guardar los cambios.','error');
    } finally {
      saveButton.disabled=false;saveButton.innerHTML='<i class="fas fa-save"></i> Guardar cambios';
    }
  }
  function toggleManualOrder(show) {
    const form=$('admin-add-order-form');if(!form)return;
    form.hidden=typeof show==='boolean'?!show:!form.hidden;
    if(!form.hidden)form.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function saveManualOrder(event) {
    event.preventDefault();message('admin-add-order-message','Guardando pedido…');
    const name=$('manual-order-name').value.trim();
    const phone=$('manual-order-phone').value.trim();
    const deliveryDate=$('manual-order-date').value;
    const productName=$('manual-order-product').value.trim();
    const size=$('manual-order-size').value.trim();
    const quantity=Math.max(1,Math.min(99,Number($('manual-order-quantity').value)||1));
    const unitPrice=Number($('manual-order-price').value);
    const address=$('manual-order-address').value.trim();
    const notes=$('manual-order-notes').value.trim();
    if(!name||!phone||!deliveryDate||!productName||!address||!Number.isFinite(unitPrice)||unitPrice<0){message('admin-add-order-message','Completa los datos obligatorios y revisa el precio.','error');return;}
    const random=(window.crypto?.randomUUID?crypto.randomUUID().replace(/-/g,''):`${Date.now()}${Math.random().toString(16).slice(2)}`).toUpperCase();
    const orderCode=`CC-${random.slice(0,16)}`;
    const itemName=`${productName}${size?` (${size})`:''}`;
    const payload={order_type:'pedido_administrador',name,phone,delivery_date:deliveryDate,address,total:Number((unitPrice*quantity).toFixed(2)),items:[{name:itemName,price:unitPrice,quantity,image:''}],customization:notes,source:'panel_administrador'};
    const {data,error}=await client.rpc('cake_register_order_with_capacity',{p_order_code:orderCode,p_payload:payload});
    if(error){message('admin-add-order-message',`No se pudo registrar el pedido: ${error.message}`,'error');return;}
    const saved=(Array.isArray(data)?data[0]:data)?.order_code||orderCode;
    $('admin-add-order-form').reset();$('manual-order-quantity').value='1';
    message('admin-add-order-message',`Pedido ${saved} guardado correctamente.`,'success');
    activeOrdersView='nuevos';await loadOrders();
  }
  async function loadReviews() {
    const { data, error } = await client.from('testimonials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
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
    const allPhotoPaths = [...new Set(reviews.flatMap(review => Array.isArray(review.photo_paths) ? review.photo_paths : []).filter(path => typeof path === 'string' && path && !/^https?:\/\//i.test(path)))];
    const signedPhotoMap = new Map();
    if (allPhotoPaths.length) {
      try {
        const { data: signedRows, error: signedError } = await client.storage.from('review-photos').createSignedUrls(allPhotoPaths, 3600);
        if (signedError) throw signedError;
        (signedRows || []).forEach(item => {
          if (item.path && item.signedUrl) signedPhotoMap.set(item.path, item.signedUrl);
        });
      } catch (signedError) {
        console.warn('No se pudieron preparar las vistas previas agrupadas; se intentará foto por foto:', signedError.message);
        const fallback = await Promise.all(allPhotoPaths.map(async path => {
          const { data: signed, error: oneError } = await client.storage.from('review-photos').createSignedUrl(path, 3600);
          return !oneError && signed?.signedUrl ? [path, signed.signedUrl] : null;
        }));
        fallback.filter(Boolean).forEach(([path, url]) => signedPhotoMap.set(path, url));
      }
    }

    for (const r of reviews) {
      const row = document.createElement('article');
      row.className = 'admin-review-row admin-review-row-v2';
      const paths = Array.isArray(r.photo_paths) ? r.photo_paths : [];
      const photos = paths.map(path => /^https?:\/\//i.test(path) ? path : (signedPhotoMap.get(path) || '')).filter(Boolean);
      if (!photos.length && r.photo_url) photos.push(r.photo_url);
      const gallery = document.createElement('div');
      gallery.className = 'admin-review-gallery';
      photos.slice(0, 10).forEach(url => {
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
          const { data: updated, error } = await client.from('testimonials')
            .update({ is_published: nextPublished, published_at: nextPublished ? new Date().toISOString() : null })
            .eq('id', r.id)
            .select('id, is_published, published_at')
            .maybeSingle();
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
        if (error) { globalMessage(error.message, 'error'); return; }
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
  function fillReview(r){$('review-id').value=r.id;$('review-name').value=r.customer_name||'';$('review-product').value=r.product_name||'';$('review-text').value=r.review_text||'';$('review-rating').value=String(r.rating||5);$('review-published').checked=!!r.is_published;$('admin-review-form')?.scrollIntoView({behavior:'smooth'});}
  async function saveReview(event){event.preventDefault();message('admin-review-message','Guardando…');try{
    const existing=reviews.find(r=>r.id===$('review-id').value);let photoPaths=Array.isArray(existing?.photo_paths)?[...existing.photo_paths]:[];const files=Array.from($('review-photo').files||[]);if(files.length>10||photoPaths.length+files.length>10)throw new Error('Una reseña puede tener máximo 10 fotografías en total.');
    for(const file of files){if(!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size>5*1024*1024)throw new Error('Cada foto debe ser JPG, PNG o WebP y pesar máximo 5 MB.');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`incoming/${crypto.randomUUID()}.${ext}`;const {error}=await client.storage.from('review-photos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;photoPaths.push(path);}
    const payload={customer_name:$('review-name').value.trim(),product_name:$('review-product').value.trim(),review_text:$('review-text').value.trim(),rating:Number($('review-rating').value),photo_paths:photoPaths,photo_url:existing?.photo_url||null,is_published:$('review-published').checked,published_at:$('review-published').checked?(existing?.published_at||new Date().toISOString()):null,consent_to_publish:true};const id=$('review-id').value;const q=id?client.from('testimonials').update(payload).eq('id',id):client.from('testimonials').insert(payload);const {error}=await q;if(error)throw error;message('admin-review-message','Opinión guardada.','success');$('admin-review-form').reset();$('review-id').value='';await loadReviews();
  }catch(e){message('admin-review-message',e.message||'No se pudo guardar.','error');}}
  function setupReviewShareLink(){const publicUrl=new URL('index.html',location.href);publicUrl.hash='opiniones';const url=publicUrl.href;const target=$('admin-review-share-url');if(target)target.textContent=url;$('admin-copy-review-link')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);message('admin-global-message','Enlace de reseñas copiado.','success');}catch(_){const temp=document.createElement('textarea');temp.value=url;document.body.appendChild(temp);temp.select();document.execCommand('copy');temp.remove();message('admin-global-message','Enlace de reseñas copiado.','success');}});}
  async function loadSettings(){const {data,error}=await client.from('store_settings').select('*').eq('id',1).maybeSingle();if(error){message('admin-settings-message',error.message,'error');return;}if(data){$('setting-delivery').value=data.delivery_info||'';$('setting-payment').value=data.payment_info||'';$('setting-notice').value=data.order_notice||'';}}
  async function saveSettings(event){event.preventDefault();message('admin-settings-message','Guardando…');const payload={id:1,delivery_info:$('setting-delivery').value.trim(),payment_info:$('setting-payment').value.trim(),order_notice:$('setting-notice').value.trim(),updated_at:new Date().toISOString()};const {error}=await client.from('store_settings').upsert(payload,{onConflict:'id'});if(error){message('admin-settings-message',error.message,'error');return;}message('admin-settings-message','Información pública actualizada.','success');}
  async function loadCapacitySettings(){
    const {data,error}=await client.from('cake_order_capacity_settings').select('daily_limit').eq('id',1).maybeSingle();
    if(error){message('cake-capacity-settings-message','Primero ejecuta el archivo supabase/capacidad_pedidos.sql en Supabase. Detalle: '+error.message,'error');return;}
    if(data)$('cake-daily-limit').value=String(data.daily_limit);
    await loadCapacityOverrides();
  }
  async function saveCapacitySettings(event){
    event.preventDefault();const limit=Number($('cake-daily-limit').value);
    if(!Number.isInteger(limit)||limit<1||limit>500){message('cake-capacity-settings-message','Escribe un número entre 1 y 500.','error');return;}
    message('cake-capacity-settings-message','Guardando…');
    const {data:{user}}=await client.auth.getUser();
    const {error}=await client.from('cake_order_capacity_settings').upsert({id:1,daily_limit:limit,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'id'});
    if(error){message('cake-capacity-settings-message','No se guardó: '+error.message,'error');return;}
    message('cake-capacity-settings-message','Límite general guardado.','success');
  }
  async function loadCapacityOverrides(){
    const list=$('cake-capacity-overrides-list');if(!list)return;list.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Cargando fechas especiales…'}));
    const {data,error}=await client.from('cake_order_capacity_overrides').select('*').order('delivery_date',{ascending:true}).limit(120);
    if(error){list.replaceChildren(Object.assign(document.createElement('p'),{textContent:'No se pudieron cargar las fechas: '+error.message}));return;}
    list.replaceChildren();if(!data?.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:'No hay fechas especiales configuradas.'}));return;}
    data.forEach(row=>{const item=document.createElement('article');item.className='admin-order-row';const title=document.createElement('strong');title.textContent=`${row.delivery_date} · límite ${row.daily_limit}`;const note=document.createElement('p');note.textContent=row.note||'Sin nota';const del=document.createElement('button');del.type='button';del.className='admin-button admin-button-danger';del.textContent='Quitar excepción';del.addEventListener('click',async()=>{if(!confirm(`¿Quitar la excepción del ${row.delivery_date}? Se usará el límite general.`))return;const {error}=await client.from('cake_order_capacity_overrides').delete().eq('delivery_date',row.delivery_date);if(error){message('cake-capacity-override-message',error.message,'error');return;}await loadCapacityOverrides();});item.append(title,note,del);list.appendChild(item);});
  }
  async function saveCapacityOverride(event){
    event.preventDefault();const date=$('cake-capacity-date').value,limit=Number($('cake-capacity-override-limit').value),note=$('cake-capacity-note').value.trim();
    if(!date||!Number.isInteger(limit)||limit<0||limit>500){message('cake-capacity-override-message','Revisa la fecha y usa un límite de 0 a 500.','error');return;}
    const {data:{user}}=await client.auth.getUser();const {error}=await client.from('cake_order_capacity_overrides').upsert({delivery_date:date,daily_limit:limit,note,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'delivery_date'});
    if(error){message('cake-capacity-override-message','No se guardó: '+error.message,'error');return;}
    message('cake-capacity-override-message','Fecha especial guardada.','success');$('cake-capacity-override-form').reset();$('cake-capacity-override-limit').value='0';await loadCapacityOverrides();
  }
  async function boot(user){if(!(await requireAdmin(user)))return;showApp(user);await loadProducts();await loadSettings();await loadCapacitySettings();}
  document.addEventListener('DOMContentLoaded',async()=>{
    client=configuredClient();
    if(!client){$('admin-config-notice').hidden=false;$('admin-login-view').hidden=true;return;}
    const forcePanel = new URLSearchParams(window.location.search).get('panel') === '1';
    $('admin-login-form').addEventListener('submit',async event=>{
      event.preventDefault();message('admin-login-message','Verificando…');
      const {data,error}=await client.auth.signInWithPassword({email:$('admin-email').value.trim(),password:$('admin-password').value});
      if(error){message('admin-login-message','No se pudo iniciar sesión. Revisa tu correo y contraseña.','error');return;}
      if(!data.user){message('admin-login-message','No se recibió una sesión válida.','error');return;}
      if(forcePanel){await boot(data.user);return;}
      if(await requireAdmin(data.user)) window.location.href='index.html?modo=edicion';
    });
    $('admin-logout').addEventListener('click',async()=>{await client.auth.signOut();showAuth();message('admin-login-message','Sesión cerrada.','success');});
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.adminTab)));
    document.querySelectorAll('[data-order-view]').forEach(b=>b.addEventListener('click',()=>setOrdersView(b.dataset.orderView)));
    $('admin-image-lightbox-close')?.addEventListener('click',closeOrderImage);
    $('admin-order-edit-close')?.addEventListener('click',closeOrderEdit);
    $('admin-order-edit-cancel')?.addEventListener('click',closeOrderEdit);
    $('admin-order-edit-modal')?.addEventListener('click',event=>{if(event.target===$('admin-order-edit-modal'))closeOrderEdit();});
    $('admin-order-edit-form')?.addEventListener('submit',saveOrderEdit);
    $('edit-order-add-item')?.addEventListener('click',()=>addOrderItemEditor({name:'',price:0,quantity:1}));
    $('edit-order-image-file')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;if(!isImage(file)){message('admin-order-edit-message','Elige una foto JPG, PNG, WebP o GIF de máximo 5 MB.','error');event.target.value='';return;}if(editOrderPreviewUrl)URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl=URL.createObjectURL(file);clearOrderImage=false;setOrderEditImagePreview(editOrderPreviewUrl);message('admin-order-edit-message','Nueva imagen lista. Guarda los cambios para aplicarla.','');});
    $('edit-order-remove-image')?.addEventListener('click',()=>{clearOrderImage=true;$('edit-order-image-file').value='';if(editOrderPreviewUrl){URL.revokeObjectURL(editOrderPreviewUrl);editOrderPreviewUrl='';}setOrderEditImagePreview('');message('admin-order-edit-message','La imagen se quitará cuando guardes los cambios.','');});
    $('admin-image-lightbox')?.addEventListener('click',event=>{if(event.target===$('admin-image-lightbox'))closeOrderImage();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('admin-order-edit-modal')?.hidden)closeOrderEdit();else if(event.key==='Escape'&&!$('admin-image-lightbox')?.hidden)closeOrderImage();});
    $('admin-product-form').addEventListener('submit',saveProduct);$('admin-new-product').addEventListener('click',resetProductForm);$('admin-new-specialty').addEventListener('click',()=>{resetProductForm();$('product-category').value='especiales';$('product-form-title').textContent='Agregar especialidad';$('product-name').focus();$('admin-product-form').scrollIntoView({behavior:'smooth',block:'start'});});$('admin-cancel-product').addEventListener('click',resetProductForm);$('admin-product-search').addEventListener('input',filterProducts);$('admin-refresh-orders').addEventListener('click',loadOrders);$('admin-toggle-add-order').addEventListener('click',()=>toggleManualOrder());$('admin-cancel-add-order').addEventListener('click',()=>toggleManualOrder(false));$('admin-add-order-form').addEventListener('submit',saveManualOrder);$('admin-review-form').addEventListener('submit',saveReview);setupReviewShareLink();$('admin-refresh-reviews')?.addEventListener('click',loadReviews);$('admin-cancel-review').addEventListener('click',()=>{$('admin-review-form').reset();$('review-id').value='';message('admin-review-message','');});$('admin-settings-form').addEventListener('submit',saveSettings);$('cake-capacity-settings-form').addEventListener('submit',saveCapacitySettings);$('cake-capacity-override-form').addEventListener('submit',saveCapacityOverride);
    const {data:{session}}=await client.auth.getSession();
    if(session?.user){if(forcePanel) await boot(session.user);else window.location.replace('index.html?modo=edicion');}
    else showAuth();
  });
})();
