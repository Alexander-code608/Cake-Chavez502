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
  const CATEGORIES = ['pasteles','postres','galletas','bocaditos','especiales'];
  const STATUS = [['recibido','Recibido'],['en_preparacion','En preparación'],['listo','Listo para entrega'],['entregado','Entregado'],['cancelado','Cancelado']];
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
    const remove=document.createElement('button'); remove.type='button'; remove.className='admin-button admin-button-danger'; remove.textContent='Eliminar'; remove.addEventListener('click',()=>deleteProduct(p));
    actions.append(edit,remove); row.append(img,meta,actions); return row;
  }
  async function loadProducts() {
    globalMessage('Cargando productos…');
    const {data,error}=await client.from('products').select('*').order('display_order',{ascending:true}).order('created_at',{ascending:true});
    if(error){globalMessage(`No se pudieron cargar productos: ${error.message}`,'error');return;}
    products=data||[]; updateStats();
    const list=$('admin-products-list'); list.replaceChildren();
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
        gallery_urls:Array.from(new Set([...urls.slice(1),...externalUrls.filter(u=>u!==imageUrl),...(existing?.gallery_urls||[]).filter(u=>!urls.includes(u))])).slice(0,20),
        price:Number($('product-price').value), price_small:typedPrices[0], price_medium:typedPrices[1], price_large:typedPrices[2],
        sale_price:$('product-sale-price').value.trim()===''?null:Number($('product-sale-price').value), has_sizes:$('product-has-sizes').checked,
        is_active:$('product-active').checked, is_featured:$('product-featured').checked, is_offer:$('product-is-offer').checked,
        occasion:$('product-occasion').value.trim(), display_order:Number($('product-order').value)||100
      };
      if(!payload.slug || !payload.name) throw new Error('Completa el nombre y el enlace corto.');
      if(payload.sale_price!==null && payload.sale_price>0 && payload.sale_price>payload.price) throw new Error('El precio de oferta normalmente debe ser menor o igual al precio base.');
      const query=id?client.from('products').update(payload).eq('id',id):client.from('products').insert(payload);
      const {error}=await query;
      if(error) throw error;
      message('admin-product-message','Producto guardado correctamente.','success'); resetProductForm(); await loadProducts();
    } catch(error) { message('admin-product-message',error?.message||'No se pudo guardar el producto.','error'); }
  }
  async function deleteProduct(p) {
    if(!confirm(`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`)) return;
    const {error}=await client.from('products').delete().eq('id',p.id);
    if(error){globalMessage(`No se pudo eliminar: ${error.message}`,'error');return;}
    await loadProducts(); resetProductForm(); globalMessage(`Se eliminó “${p.name}”.`,'success');
  }
  function createOrderRow(order) {
    const card=document.createElement('article'); card.className='admin-order-row';
    const payload=order.payload||{};
    const top=document.createElement('div'); top.className='admin-order-top';
    const code=document.createElement('strong'); code.className='admin-order-code'; code.textContent=order.order_code;
    const date=document.createElement('small'); date.style.color='var(--muted)'; date.textContent=order.created_at?new Date(order.created_at).toLocaleString('es-GT'):'Fecha no disponible'; top.append(code,date);
    const items=Array.isArray(payload.items)?payload.items:[];
    const firstImage=items.find(i=>i.image)?.image;
    const referenceImage=payload.photo_reference_url||payload.reference_image_url||payload.inspiration_image_url||'';
    const orderImage=referenceImage||firstImage;
    if(orderImage){const img=document.createElement('img');img.className='admin-order-image';img.src=orderImage;img.alt=referenceImage?'Foto de referencia del pastel personalizado':'Foto del producto pedido';img.loading='lazy';img.onerror=()=>img.remove();card.appendChild(img);}
    const detail=document.createElement('p');detail.className='admin-order-detail';
    const itemText=items.map(i=>`${i.quantity||1}× ${i.name||'Producto'}${i.price!=null?' ('+fmtQ(i.price)+')':''}`).join(', ');
    detail.textContent=`Tipo: ${payload.order_type==='pastel_personalizado'?'Pastel personalizado':'Pedido de catálogo'}\nCliente: ${payload.name||'No indicado'}\nOcasión: ${payload.occasion||'No indicada'}\nSabor: ${payload.flavor||'No indicado'}\nTamaño: ${payload.size||'No indicado'}\nColores/temática: ${payload.colors_theme||'No indicado'}\nFecha deseada: ${payload.delivery_date||'No indicada'}\nDirección: ${payload.address||'Por confirmar'}\nArtículos: ${itemText||'No indicados'}\nTotal informado: ${fmtQ(payload.total)}\nDetalles adicionales: ${payload.customization||payload.personalization||'No registrados'}\nFoto de referencia: ${payload.photo_reference_name||'No adjunta al sistema'}\nURL de imagen guardada: ${payload.photo_reference_url||'No hay imagen guardada'}`;
    const statusRow=document.createElement('div');statusRow.className='admin-order-status';
    const select=document.createElement('select');STATUS.forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);});select.value=order.status||'recibido';
    const save=document.createElement('button');save.type='button';save.className='admin-button admin-button-primary';save.textContent='Guardar estado';save.addEventListener('click',async()=>{const {error}=await client.from('orders').update({status:select.value}).eq('order_code',order.order_code);if(error){globalMessage(`No se pudo actualizar el pedido: ${error.message}`,'error');return;}globalMessage(`Estado de ${order.order_code} actualizado.`,'success');await loadOrders();});
    statusRow.append(select,save);
    const actions=document.createElement('div');actions.className='admin-row-actions';actions.style.justifyContent='flex-start';
    const delivered=document.createElement('button');delivered.type='button';delivered.className='admin-button admin-button-primary';delivered.textContent='Marcar entregado';delivered.addEventListener('click',()=>setOrderStatus(order.order_code,'entregado'));
    const cancel=document.createElement('button');cancel.type='button';cancel.className='admin-button admin-button-danger';cancel.textContent='Cancelar pedido';cancel.addEventListener('click',()=>{if(confirm('¿Marcar este pedido como cancelado? Se conservará en el historial.'))setOrderStatus(order.order_code,'cancelado');});
    const edit=document.createElement('button');edit.type='button';edit.className='admin-button admin-button-outline';edit.textContent='Editar datos';edit.addEventListener('click',()=>editOrder(order));
    actions.append(delivered,cancel,edit);card.append(top,detail,statusRow,actions);return card;
  }
  async function setOrderStatus(code,status){const {error}=await client.from('orders').update({status}).eq('order_code',code);if(error){globalMessage(`No se pudo actualizar el pedido: ${error.message}`,'error');return;}globalMessage('Pedido actualizado; se conserva su registro.','success');await loadOrders();}
  async function editOrder(order){
    const p={...(order.payload||{})};
    const name=prompt('Nombre del cliente:',p.name||'');if(name===null)return;
    const delivery=prompt('Fecha de entrega (AAAA-MM-DD):',p.delivery_date||'');if(delivery===null)return;
    const address=prompt('Dirección de entrega:',p.address||'');if(address===null)return;
    const customization=prompt('Detalles / personalización / dedicatoria:',p.customization||p.personalization||'');if(customization===null)return;
    if(p.order_type==='pastel_personalizado'){const occasion=prompt('Ocasión:',p.occasion||'');if(occasion===null)return;const flavor=prompt('Sabor:',p.flavor||'');if(flavor===null)return;const size=prompt('Tamaño:',p.size||'');if(size===null)return;const colors=prompt('Colores o temática:',p.colors_theme||'');if(colors===null)return;p.occasion=occasion.trim();p.flavor=flavor.trim();p.size=size.trim();p.colors_theme=colors.trim();}
    p.name=name.trim();p.delivery_date=delivery.trim();p.address=address.trim();p.customization=customization.trim();
    const {error}=await client.from('orders').update({payload:p}).eq('order_code',order.order_code);
    if(error){globalMessage(`No se pudieron guardar los datos: ${error.message}`,'error');return;}
    globalMessage('Datos del pedido guardados.','success');await loadOrders();
  }
  async function loadOrders() {
    const list=$('admin-orders-list');list.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Cargando pedidos…'}));
    const {data,error}=await client.from('orders').select('order_code,status,payload,created_at').order('created_at',{ascending:false}).limit(300);
    if(error){list.replaceChildren(Object.assign(document.createElement('p'),{textContent:`No se pudieron cargar pedidos: ${error.message}`}));return;}
    const rows=data||[];$('stat-orders').textContent=rows.filter(o=>!['entregado','cancelado'].includes(o.status)).length;list.replaceChildren();
    if(!rows.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:'No hay pedidos registrados para seguimiento todavía.'}));return;}
    const groups=[['recibido','Pedidos nuevos'],['en_preparacion','En preparación'],['listo','Listos para entrega'],['entregado','Pedidos entregados'],['cancelado','Pedidos cancelados']];
    groups.forEach(([status,label])=>{const matching=rows.filter(o=>(o.status||'recibido')===status);if(!matching.length)return;const heading=document.createElement('h3');heading.className='admin-order-group-title';heading.textContent=`${label} (${matching.length})`;list.appendChild(heading);matching.forEach(o=>list.appendChild(createOrderRow(o)));});
  }
  async function loadReviews() {
    const {data,error}=await client.from('testimonials').select('*').order('created_at',{ascending:false});const list=$('admin-reviews-list');list.replaceChildren();
    if(error){list.appendChild(Object.assign(document.createElement('p'),{textContent:`No se pudieron cargar opiniones: ${error.message}`}));return;}reviews=data||[];
    if(!reviews.length){list.appendChild(Object.assign(document.createElement('p'),{textContent:'Todavía no has registrado opiniones reales.'}));return;}
    reviews.forEach(r=>{const row=document.createElement('article');row.className='admin-review-row'+(r.photo_url?'':' no-image');if(r.photo_url){const img=document.createElement('img');img.src=r.photo_url;img.alt='Foto de opinión';img.onerror=()=>img.remove();row.appendChild(img);}const text=document.createElement('div');const heading=document.createElement('strong');heading.textContent=`${r.customer_name} · ${'★'.repeat(Number(r.rating)||5)}`;const p=document.createElement('p');p.textContent=r.review_text;const state=document.createElement('small');state.style.color='var(--muted)';state.textContent=r.is_published?'Publicada':'Borrador / pendiente';text.append(heading,p,state);const actions=document.createElement('div');actions.className='admin-row-actions';const edit=document.createElement('button');edit.className='admin-button admin-button-outline';edit.textContent='Editar';edit.addEventListener('click',()=>fillReview(r));const publish=document.createElement('button');publish.className='admin-button admin-button-primary';publish.textContent=r.is_published?'Ocultar':'Publicar';publish.addEventListener('click',async()=>{const {error}=await client.from('testimonials').update({is_published:!r.is_published}).eq('id',r.id);if(error){globalMessage(error.message,'error');return;}await loadReviews();});const del=document.createElement('button');del.className='admin-button admin-button-danger';del.textContent='Eliminar';del.addEventListener('click',async()=>{if(!confirm('¿Eliminar esta opinión?'))return;const {error}=await client.from('testimonials').delete().eq('id',r.id);if(error){globalMessage(error.message,'error');return;}await loadReviews();});actions.append(edit,publish,del);row.append(text,actions);list.appendChild(row);});
  }
  function fillReview(r){$('review-id').value=r.id;$('review-name').value=r.customer_name||'';$('review-text').value=r.review_text||'';$('review-rating').value=String(r.rating||5);$('review-published').checked=!!r.is_published;$('admin-review-form')?.scrollIntoView({behavior:'smooth'});}
  async function saveReview(event){event.preventDefault();message('admin-review-message','Guardando…');try{let photoUrl=reviews.find(r=>r.id===$('review-id').value)?.photo_url||'';const file=$('review-photo').files?.[0];if(file)photoUrl=await uploadPhoto(file,'reviews');const payload={customer_name:$('review-name').value.trim(),review_text:$('review-text').value.trim(),rating:Number($('review-rating').value),photo_url:photoUrl||null,is_published:$('review-published').checked};const id=$('review-id').value;const q=id?client.from('testimonials').update(payload).eq('id',id):client.from('testimonials').insert(payload);const {error}=await q;if(error)throw error;message('admin-review-message','Opinión guardada.','success');$('admin-review-form').reset();$('review-id').value='';await loadReviews();}catch(e){message('admin-review-message',e.message||'No se pudo guardar.','error');}}
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
    $('admin-product-form').addEventListener('submit',saveProduct);$('admin-new-product').addEventListener('click',resetProductForm);$('admin-cancel-product').addEventListener('click',resetProductForm);$('admin-product-search').addEventListener('input',filterProducts);$('admin-refresh-orders').addEventListener('click',loadOrders);$('admin-review-form').addEventListener('submit',saveReview);$('admin-cancel-review').addEventListener('click',()=>{$('admin-review-form').reset();$('review-id').value='';message('admin-review-message','');});$('admin-settings-form').addEventListener('submit',saveSettings);$('cake-capacity-settings-form').addEventListener('submit',saveCapacitySettings);$('cake-capacity-override-form').addEventListener('submit',saveCapacityOverride);
    const {data:{session}}=await client.auth.getSession();
    if(session?.user){if(forcePanel) await boot(session.user);else window.location.replace('index.html?modo=edicion');}
    else showAuth();
  });
})();
