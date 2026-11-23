(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let token, section, principal=false, timer, busy=false;
 try { token=localStorage.getItem('cake-acceso-token'); if(!/^[a-f0-9]{64}$/.test(token||'')) { token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem('cake-acceso-token',token); } } catch { token=null; }
 const client=()=>window.CakeAdmin?.getClient?.() || window.getCakeSupabaseClient?.();
 const meta=()=>({token,navegador:navigator.userAgent,tipo:navigator.userAgentData?.mobile===true?'Móvil':null});
 async function call(accion,body={}) {
 if(!token) throw new Error('Permite el almacenamiento de este navegador para autorizarlo.');
 const c=client(); if(!c) throw new Error('No se pudo conectar con Supabase.');
 const {data,error}=await c.functions.invoke('cake-acceso',{body:{...meta(),...body,accion}});
 if(error) { let d;try{d=await error.context?.json();}catch{} const e=new Error(d?.error||'No se pudo conectar con el control de acceso.'); e.details=d;throw e; }
 if(!data?.ok) {const e=new Error(data?.error||'No se pudo completar la operación.');e.details=data;throw e;}
 return data;
 }
 const fmt=v=>v?new Intl.DateTimeFormat('es-GT',{timeZone:'America/Guatemala',dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Sin registro';
 function field(label,name,type='text') {return `<label>${label}<input name="${name}" type="${type}" required maxlength="180" ${name==='codigo'?'inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code"':''}></label>`;}
 function flow(mode='dispositivo') {
 $('acc-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='acc-dialog';dialog.className='acc-dialog';
 dialog.innerHTML=`<h2>${mode==='registro'?'Autorizar persona nueva':'Autorizar este dispositivo'}</h2><p>El código temporal es diferente de tu contraseña personal.</p><form id="acc-flow"></form><p id="acc-status" role="status"></p><button type="button" id="acc-close" class="admin-button admin-button-outline">Volver al inicio de sesión</button>`;
 document.body.append(dialog);dialog.showModal();
 const form=$('acc-flow');let solicitud,permiso;
 const status=(s)=>{$('acc-status').textContent=s;};
 const submit=async fn=>{form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;status('Procesando…');try{await fn(Object.fromEntries(new FormData(form)));}catch(err){status(err.message);}finally{if(btn.isConnected)btn.disabled=false;}};};
 const complete=()=>{
 form.innerHTML=(mode==='registro'?field('Nombre completo','nombre')+field('Correo electrónico personal permanente','email','email'):'')+field('Nombre de este dispositivo','dispositivo')+'<button class="admin-button admin-button-primary">Guardar y enviar contraseña personal</button>';
 submit(async values=>{const result=await call('completar',{...values,solicitud,permiso});form.innerHTML='';status(result.mensaje);});
 };
 const verify=()=>{
 form.innerHTML='<p>Introduce el código de autorización para continuar</p>'+field('Código de seis dígitos','codigo')+'<button class="admin-button admin-button-primary">Verificar código</button><p>Vence en dos minutos. Tres errores bloquean este dispositivo durante 30 días.</p>';
 submit(async values=>{const r=await call('verificar',{solicitud,codigo:values.codigo});permiso=r.permiso;status('Código verificado.');complete();});
 };
 form.innerHTML=(mode==='dispositivo'?field('Nombre con el que fuiste registrado','nombre')+field('Correo electrónico registrado','email','email'):'<p>Solicita a la administradora principal que apruebe tu registro.</p>')+`<button class="admin-button admin-button-primary">${mode==='dispositivo'?'Solicitar autorización para este dispositivo':'Solicitar código de autorización'}</button>`;
 submit(async values=>{const r=await call('solicitar',{...values,proposito:mode});solicitud=r.solicitud;verify();status('El servicio aceptó el envío del código. Solicítalo a la administradora.');});
 $('acc-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 }
 function lock(text) {
 document.documentElement.classList.add('acc-pendiente');
 const gate=$('acc-gate');if(gate){gate.hidden=false;gate.querySelector('p').textContent=text;}
 $('admin-app-view')?.setAttribute('inert','');
 }
 function unlock() {document.documentElement.classList.remove('acc-pendiente');$('admin-app-view')?.removeAttribute('inert');if($('acc-gate'))$('acc-gate').hidden=true;}
 async function check() {
 if(busy)return false;busy=true;
 try {
 const r=await call('comprobar');principal=r.principal;unlock();return true;
 } catch(e) {
 // Si la función cake-acceso todavía no está instalada (sin respuesta del servidor), no se bloquea
 // a la administradora: se muestra un aviso y el panel sigue funcionando como antes.
 // También si Supabase responde «función no encontrada» (404 sin el formato { ok } de cake-acceso).
 if(!e.details||e.details.code==='NOT_FOUND'||!Object.prototype.hasOwnProperty.call(e.details,'ok')){unlock();avisoSinInstalar();return true;}
 lock(e.message);
 if(e.details?.rechazado){await client()?.auth.signOut();clearInterval(timer);$('admin-app-view').hidden=true;$('admin-login-view').hidden=false;}
 return false;
 } finally {busy=false;}
 }
 function avisoSinInstalar(){if($('acc-aviso-instalar'))return;const a=document.createElement('p');a.id='acc-aviso-instalar';a.className='admin-message';a.textContent='Control de dispositivos aún no activado: instala la función «cake-acceso» (ver documentación 12). Mientras tanto el acceso funciona solo con correo y contraseña.';$('admin-app-view')?.prepend(a);}
 window.CakeAcceso={comprobar:async()=>{lock('Verificando autorización del dispositivo…');return check();}};
 async function render() {
 if(!section)return;
 if(!principal){section.innerHTML='<h2>Personas con acceso al administrador</h2><p>Solo la cuenta principal puede consultar y administrar esta información.</p>';return;}
 section.innerHTML='<p role="status">Cargando personas y actividad…</p>';
 try {
 const r=await call('listar');
 section.innerHTML='<div class="admin-section-head"><h2>Personas con acceso al administrador</h2><button id="acc-invite" class="admin-button admin-button-primary">Registrar persona nueva</button></div><p id="acc-panel-status" role="status"></p>'+
 r.personas.map(p=>`<article class="acc-person"><h3>${esc(p.nombre)}</h3><p>${esc(p.email)} · ${esc(p.rol)} · ${p.eliminada?'Retirada':esc(p.estado)}</p><p>Último inicio de sesión: ${esc(fmt(p.ultimo_ingreso))}</p><details><summary>Ver información y dispositivos</summary>${p.foto_url&&/^https:\/\//.test(p.foto_url)?`<img class="acc-avatar" src="${esc(p.foto_url)}" alt="Foto de perfil" referrerpolicy="no-referrer">`:''}${p.cake_dispositivos.map(d=>`<div class="acc-device"><strong>${esc(d.nombre)}</strong><p>${esc(d.tipo||'Tipo no disponible')} · ${esc(d.navegador||'Navegador no disponible')}</p><p>Primer acceso: ${esc(fmt(d.primer_ingreso))}<br>Última actividad: ${esc(fmt(d.ultimo_ingreso))}<br>${d.autorizado?'Autorizado':'Revocado'}</p>${d.autorizado?`<button class="admin-button admin-button-outline" data-action="revocar" data-device="${esc(d.id)}">Revocar dispositivo</button>`:''}</div>`).join('')||'<p>No hay dispositivos registrados.</p>'}</details>${p.rol!=='principal'&&!p.eliminada?`<div class="acc-actions"><button class="admin-button admin-button-outline" data-action="${p.estado==='activa'?'pausar':'activar'}" data-person="${esc(p.id)}">${p.estado==='activa'?'Pausar':'Activar'}</button><button class="admin-button admin-button-danger" data-action="eliminar" data-person="${esc(p.id)}">Retirar acceso</button></div>`:''}</article>`).join('')+
 '<h3>Bloqueos de autorización</h3>'+r.bloqueos.filter(b=>b.clave.startsWith('d:')).map(b=>`<div class="acc-device"><p>Dispositivo ${esc(b.clave.slice(2,14))}… · Hasta ${esc(fmt(b.bloqueado_hasta))}</p><button class="admin-button admin-button-outline" data-action="desbloquear" data-key="${esc(b.clave)}">Permitir nueva autorización</button></div>`).join('')+
 '<h3>Actividad reciente (últimos 200 eventos)</h3><ol class="acc-log">'+r.actividad.map(a=>{const p=r.personas.find(p=>p.id===a.persona_id);return `<li>${esc(fmt(a.fecha))} · ${esc(p?p.nombre+' · '+p.email:'Solicitud sin persona registrada')} · ${esc(a.evento.replace(/_/g,' '))}</li>`;}).join('')+'</ol>';
 $('acc-invite').onclick=()=>flow('registro');
 }catch(e){section.textContent=e.message;}
 }
 function init() {
 const login=$('admin-login-view');if(!login)return;
 const addition=document.createElement('div');addition.className='acc-login-additions';
 addition.innerHTML='<button type="button" id="acc-existing" class="admin-button admin-button-outline">Iniciar sesión con mi cuenta existente</button><button type="button" id="acc-new" class="admin-button admin-button-outline">Solicitar registro de persona nueva</button>';
 $('admin-login-form').after(addition);$('acc-existing').onclick=()=>flow();$('acc-new').onclick=()=>flow('registro');
 const gate=document.createElement('aside');gate.id='acc-gate';gate.className='acc-gate';gate.hidden=true;gate.innerHTML='<h2>Autorización de dispositivo</h2><p role="status"></p><button id="acc-gate-authorize" class="admin-button admin-button-primary">Autorizar este dispositivo</button><button id="acc-gate-exit" class="admin-button admin-button-outline">Volver al inicio de sesión</button>';document.body.append(gate);
 $('acc-gate-authorize').onclick=async()=>{await client()?.auth.signOut();$('admin-app-view').hidden=true;flow();};
 $('acc-gate-exit').onclick=async()=>{await client()?.auth.signOut();$('admin-app-view').hidden=true;login.hidden=false;unlock();};
 section=$('admin-panel-acceso');if(!section){section=document.createElement('section');section.id='admin-panel-acceso';section.className='admin-section';section.hidden=true;$('admin-app-view')?.append(section);}
 section.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;if(!confirm('¿Confirmas esta acción de acceso?'))return;btn.disabled=true;try{await call(btn.dataset.action,{persona:btn.dataset.person,dispositivo_id:btn.dataset.device,clave:btn.dataset.key});await render();}catch(err){$('acc-panel-status').textContent=err.message;btn.disabled=false;}});
 document.addEventListener('click',e=>{if(e.target.closest('[data-admin-tab="acceso"]'))render();});
 document.addEventListener('cake-admin-listo',async()=>{lock('Verificando autorización del dispositivo…');if(await check()){if(!section.hidden)render();}clearInterval(timer);timer=setInterval(check,15000);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&timer)check();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
