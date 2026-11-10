// =====================================================================
// CAKE CHÁVEZ — FUNCIÓN "cake-recordatorios" (Supabase Edge Function)
// ---------------------------------------------------------------------
// Envía por WhatsApp (WhatsApp Business Platform / Cloud API de Meta)
// recordatorios de los pedidos que se entregan HOY y MAÑANA a la lista
// independiente de números administrada en el panel.
//
// NO toca el aviso de pedidos nuevos que ya existe en la página
// (ese sigue saliendo desde script.js hacia tu número de siempre).
//
// Secretos que necesita (Supabase > Edge Functions > Secrets):
//   WHATSAPP_TOKEN            token permanente de un usuario del sistema de Meta
//   WHATSAPP_PHONE_NUMBER_ID  identificador del número que ENVÍA los mensajes
//   WHATSAPP_WABA_ID          identificador de la cuenta de WhatsApp Business
//   WHATSAPP_APP_ID           (opcional) identificador de tu app de Meta; solo para
//                             crear la plantilla desde el panel con un botón
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.
// Ninguna de estas claves llega nunca al navegador.
//
// Acciones (cuerpo JSON {"accion": "..."}):
//   cron            -> la llama la tarea automática cada 15 min (clave x-cake-cron).
//   estado          -> (administradora) revisa conexión y estado de la plantilla.
//   prueba          -> (administradora) manda un mensaje de prueba.
//   crear_plantilla -> (administradora) crea la plantilla en Meta para su aprobación.
//   revisar_ahora   -> (administradora) envía ya los recordatorios pendientes.
// =====================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Versión de la API de Meta (si Meta la retira en el futuro, solo cambia este número).
const GRAPH = 'https://graph.facebook.com/v25.0';
const MAX_INTENTOS = 3;
const ADMIN_URL_POR_DEFECTO = 'https://alexander-code608.github.io/Cake-Chavez502/admin.html?panel=1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import {
  type Ajustes, type Pedido, type Destinatario, type Tipo,
  ahoraGuatemala, enSilencio, fechaBonita, horaBonita, hhmm, sumarDias, estadoTexto, limpiarParam, nombrePastel,
  fotoPedido, baseDelSitio, logoSitio, tiposPendientes, pedidosParaAviso,
} from './reglas.ts';

type DatosMensaje = {
  imagen: string; titulo: string; pastel: string; cliente: string; fecha: string; hora: string; estado: string; referencia: string; codigo: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function env(name: string) {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : '';
}

// ---------- WhatsApp ----------
type ResultadoEnvio = { ok: boolean; id?: string; error?: string };

async function enviarPlantilla(destino: string, ajustes: Ajustes, datos: DatosMensaje): Promise<ResultadoEnvio> {
  const token = env('WHATSAPP_TOKEN');
  const phoneId = env('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneId) return { ok: false, error: 'Faltan los secretos WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID.' };
  const cuerpo = {
    messaging_product: 'whatsapp',
    to: destino,
    type: 'template',
    template: {
      name: ajustes.template_name,
      language: { code: ajustes.template_language },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: datos.imagen } }] },
        {
          type: 'body',
          parameters: [datos.titulo, datos.pastel, datos.cliente, datos.fecha, datos.hora, datos.estado, datos.referencia]
            .map((t) => ({ type: 'text', text: t })),
        },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: datos.codigo }] },
      ],
    },
  };
  try {
    const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    if (!r.ok) return { ok: false, error: `Meta respondió ${r.status}: ${texto.slice(0, 600)}` };
    let id = '';
    try { id = JSON.parse(texto)?.messages?.[0]?.id ?? ''; } catch { /* nada */ }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: `No se pudo conectar con WhatsApp: ${(e as Error).message}` };
  }
}

// ---------- Registro anti-duplicados ----------
// Reserva el envío ANTES de mandarlo. Devuelve el id de la fila si hay que enviar, o null si ya se envió.
async function reservarEnvio(db: SupabaseClient, clave: { order_code: string; delivery_date: string; kind: Tipo; phone: string }) {
  const { data: nueva, error } = await db.from('cake_reminder_log')
    .insert({ ...clave, status: 'enviando', attempts: 1 })
    .select('id').maybeSingle();
  if (!error && nueva) return nueva.id as number;
  if (error && error.code !== '23505') throw new Error(`No se pudo guardar el registro de envíos: ${error.message}`);
  // Ya existe: solo se reintenta si falló antes y aún quedan intentos.
  const { data: previa, error: e2 } = await db.from('cake_reminder_log')
    .select('id,status,attempts')
    .match(clave).maybeSingle();
  if (e2 || !previa) throw new Error(`No se pudo leer el registro de envíos: ${(e2 ?? error)?.message}`);
  if (previa.status !== 'error' || previa.attempts >= MAX_INTENTOS) return null;
  const { data: tomada, error: e3 } = await db.from('cake_reminder_log')
    .update({ status: 'enviando', attempts: previa.attempts + 1, error: null })
    .eq('id', previa.id).eq('status', 'error').eq('attempts', previa.attempts)
    .select('id').maybeSingle();
  if (e3) throw new Error(`No se pudo actualizar el registro de envíos: ${e3.message}`);
  return tomada ? tomada.id as number : null;
}
async function terminarEnvio(db: SupabaseClient, id: number, r: ResultadoEnvio) {
  const { error } = await db.from('cake_reminder_log')
    .update(r.ok ? { status: 'enviado', wa_message_id: r.id || null, error: null } : { status: 'error', error: (r.error || 'Error desconocido').slice(0, 1000) })
    .eq('id', id);
  if (error) throw new Error(`No se pudo guardar el resultado del envío: ${error.message}`);
}
// Si una ejecución anterior se cortó a mitad de un envío, se marca para revisión (no se reenvía a ciegas).
async function marcarEnviosColgados(db: SupabaseClient) {
  const hace = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { error } = await db.from('cake_reminder_log')
    .update({ status: 'sin_confirmar', error: 'El envío quedó interrumpido; revisa en WhatsApp si llegó.' })
    .eq('status', 'enviando').lt('updated_at', hace);
  if (error) console.error('No se pudieron revisar los envíos interrumpidos', error.message);
}

// ---------- Proceso principal ----------
async function leerAjustes(db: SupabaseClient): Promise<Ajustes> {
  const { data, error } = await db.from('cake_reminder_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`No se pudieron leer los ajustes: ${error.message}`);
  return {
    enabled: !!data?.enabled,
    send_tomorrow_at: hhmm(data?.send_tomorrow_at ?? '18:00') || '18:00',
    send_today_at: hhmm(data?.send_today_at ?? '07:00') || '07:00',
    admin_url: data?.admin_url || ADMIN_URL_POR_DEFECTO,
    template_name: data?.template_name || 'cake_recordatorio_entrega',
    template_language: data?.template_language || 'es',
  };
}

async function procesarRecordatorios(db: SupabaseClient, opciones: { forzar: boolean }) {
  const ajustes = await leerAjustes(db);
  const resumen = { enviados: 0, errores: 0, omitidos: 0, pedidos: 0, motivo: '' };
  if (!ajustes.enabled) { resumen.motivo = 'Los recordatorios están pausados.'; return resumen; }

  const { fecha: hoy, hora } = ahoraGuatemala();
  if (!opciones.forzar && enSilencio(hora)) { resumen.motivo = 'Horario de silencio (noche).'; return resumen; }

  const tipos = tiposPendientes(hoy, hora, ajustes, opciones.forzar);
  if (!tipos.length) { resumen.motivo = 'Todavía no es la hora configurada.'; return resumen; }

  const { data: destinos, error: eDest } = await db.from('cake_reminder_recipients')
    .select('phone,label').eq('is_active', true).eq('consent_confirmed', true);
  if (eDest) throw new Error(`No se pudieron leer los números: ${eDest.message}`);
  if (!destinos?.length) { resumen.motivo = 'No hay números activos.'; return resumen; }

  await marcarEnviosColgados(db);

  for (const { tipo, fecha } of tipos) {
    const { data: pedidos, error: ePed } = await db.from('orders')
      .select('order_code,status,payload')
      .is('deleted_at', null)
      .eq('payload->>delivery_date', fecha)
      .limit(300);
    if (ePed) throw new Error(`No se pudieron leer los pedidos: ${ePed.message}`);

    const activos = pedidosParaAviso((pedidos || []) as Pedido[], fecha, tipo, hora, opciones.forzar);
    resumen.pedidos += activos.length;

    const base = baseDelSitio(ajustes.admin_url);
    const logo = logoSitio(ajustes.admin_url);
    for (let i = 0; i < activos.length; i++) {
      const p = activos[i];
      const payload = (p.payload || {}) as Record<string, unknown>;
      const titulo = tipo === 'hoy' ? 'HOY' : 'MAÑANA';
      const datos: DatosMensaje = {
        imagen: fotoPedido(payload, base) || logo,
        titulo,
        pastel: limpiarParam(nombrePastel(payload), 200),
        cliente: limpiarParam(payload.name, 80, 'Sin nombre'),
        fecha: limpiarParam(fechaBonita(String(payload.delivery_date ?? fecha))),
        hora: limpiarParam(horaBonita(String(payload.delivery_time ?? ''))),
        estado: estadoTexto(p.status),
        referencia: limpiarParam(`Pedido ${p.order_code} · ${i + 1} de ${activos.length} para ${titulo.toLowerCase()}`),
        codigo: p.order_code,
      };
      for (const d of destinos as Destinatario[]) {
        const idFila = await reservarEnvio(db, { order_code: p.order_code, delivery_date: fecha, kind: tipo, phone: d.phone });
        if (idFila == null) { resumen.omitidos++; continue; }
        let r = await enviarPlantilla(d.phone, ajustes, datos);
        // Si Meta no pudo usar la foto del pastel, se reintenta con el logo.
        if (!r.ok && datos.imagen !== logo && /media|image|download|131053|131052/i.test(r.error || '')) {
          r = await enviarPlantilla(d.phone, ajustes, { ...datos, imagen: logo });
        }
        await terminarEnvio(db, idFila, r);
        if (r.ok) resumen.enviados++; else resumen.errores++;
      }
    }
  }
  return resumen;
}

async function enviarPrueba(db: SupabaseClient, soloTelefono?: string) {
  const ajustes = await leerAjustes(db);
  let consulta = db.from('cake_reminder_recipients').select('phone,label').eq('consent_confirmed', true);
  consulta = soloTelefono ? consulta.eq('phone', soloTelefono) : consulta.eq('is_active', true);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  const destinos = (data || []) as Destinatario[];
  if (!destinos.length) return { ok: false, mensaje: 'No hay números activos para la prueba.', resultados: [] };
  const { fecha } = ahoraGuatemala();
  const codigo = `PRUEBA-${Date.now().toString(36).toUpperCase()}`;
  const resultados: { phone: string; ok: boolean; error?: string }[] = [];
  for (const d of destinos) {
    const idFila = await reservarEnvio(db, { order_code: codigo, delivery_date: fecha, kind: 'prueba', phone: d.phone });
    if (idFila == null) continue;
    const r = await enviarPlantilla(d.phone, ajustes, {
      imagen: logoSitio(ajustes.admin_url),
      titulo: 'MAÑANA (PRUEBA)',
      pastel: 'Pastel de prueba',
      cliente: 'Mensaje de prueba de Cake Chávez',
      fecha: fechaBonita(sumarDias(fecha, 1)),
      hora: '10:00 AM',
      estado: 'Pendiente',
      referencia: 'Si recibiste este mensaje, la conexión funciona',
      codigo,
    });
    await terminarEnvio(db, idFila, r);
    resultados.push({ phone: d.phone, ok: r.ok, error: r.error });
  }
  const ok = resultados.length > 0 && resultados.every((x) => x.ok);
  return { ok, mensaje: ok ? 'Mensaje de prueba enviado.' : 'Algunos mensajes no se pudieron enviar.', resultados };
}

// ---------- Plantilla de Meta ----------
export function definicionPlantilla(ajustes: Pick<Ajustes, 'admin_url' | 'template_name' | 'template_language'>) {
  const urlBoton = `${ajustes.admin_url}${ajustes.admin_url.includes('?') ? '&' : '?'}pedido={{1}}`;
  return {
    name: ajustes.template_name,
    language: ajustes.template_language,
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'IMAGE', example: { header_handle: [] as string[] } },
      {
        type: 'BODY',
        text: '🎂 *CAKE CHÁVEZ*\n\n⚠️ *RECORDATORIO: PEDIDO PARA {{1}}*\n\n🎂 Pastel: {{2}}\n👤 Cliente: {{3}}\n📅 Fecha de entrega: {{4}}\n🕒 Hora: {{5}}\n📦 Estado: {{6}}\n🧾 {{7}}\n\n🔗 Toca el botón para ver el pedido en el administrador.',
        example: { body_text: [['MAÑANA', 'Chocolate especial', 'María López', 'martes 10 de noviembre de 2026', '10:00 AM', 'Pendiente', 'Pedido CC-ABCDEF1234567890 · 1 de 2 para mañana']] },
      },
      { type: 'FOOTER', text: 'Recordatorio automático de entregas' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Ver pedido', url: urlBoton, example: [urlBoton.replace('{{1}}', 'CC-ABCDEF1234567890')] }] },
    ],
  };
}

// Meta exige una imagen de ejemplo subida con la "carga reanudable" para plantillas con encabezado de imagen.
async function subirImagenEjemplo(urlImagen: string, token: string) {
  const appId = env('WHATSAPP_APP_ID');
  if (!appId) throw new Error('Para crear la plantilla con este botón falta el secreto WHATSAPP_APP_ID (identificador de tu app de Meta). También puedes crearla a mano en WhatsApp Manager siguiendo las instrucciones.');
  const img = await fetch(urlImagen);
  if (!img.ok) throw new Error(`No se pudo descargar la imagen de ejemplo (${img.status}).`);
  const bytes = new Uint8Array(await img.arrayBuffer());
  const tipo = img.headers.get('content-type') || 'image/png';
  const s = await fetch(`${GRAPH}/${appId}/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(tipo)}`, {
    method: 'POST', headers: { Authorization: `OAuth ${token}` },
  });
  const sj = await s.json();
  if (!s.ok || !sj.id) throw new Error(`Meta no aceptó la carga de la imagen: ${JSON.stringify(sj).slice(0, 400)}`);
  const u = await fetch(`${GRAPH}/${sj.id}`, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_offset: '0' }, body: bytes });
  const uj = await u.json();
  if (!u.ok || !uj.h) throw new Error(`Meta no aceptó la imagen: ${JSON.stringify(uj).slice(0, 400)}`);
  return uj.h as string;
}

async function crearPlantilla(db: SupabaseClient) {
  const token = env('WHATSAPP_TOKEN');
  const waba = env('WHATSAPP_WABA_ID');
  if (!token || !waba) return { ok: false, mensaje: 'Faltan los secretos WHATSAPP_TOKEN o WHATSAPP_WABA_ID.' };
  const ajustes = await leerAjustes(db);
  const def = definicionPlantilla(ajustes);
  const handle = await subirImagenEjemplo(logoSitio(ajustes.admin_url), token);
  (def.components[0] as { example: { header_handle: string[] } }).example.header_handle = [handle];
  const r = await fetch(`${GRAPH}/${waba}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(def),
  });
  const texto = await r.text();
  if (!r.ok) return { ok: false, mensaje: `Meta respondió ${r.status}: ${texto.slice(0, 600)}` };
  return { ok: true, mensaje: 'Plantilla enviada a Meta. Normalmente se aprueba en minutos, pero puede tardar hasta 48 horas.' };
}

async function estadoConexion(db: SupabaseClient) {
  const ajustes = await leerAjustes(db);
  const token = env('WHATSAPP_TOKEN');
  const phoneId = env('WHATSAPP_PHONE_NUMBER_ID');
  const waba = env('WHATSAPP_WABA_ID');
  const info: Record<string, unknown> = {
    secretos: {
      WHATSAPP_TOKEN: !!token,
      WHATSAPP_PHONE_NUMBER_ID: !!phoneId,
      WHATSAPP_WABA_ID: !!waba,
      WHATSAPP_APP_ID: !!env('WHATSAPP_APP_ID'),
    },
    plantilla: { nombre: ajustes.template_name, estado: 'desconocido' },
    numero_envia: null,
    hora_guatemala: ahoraGuatemala(),
  };
  if (token && phoneId) {
    try {
      const r = await fetch(`${GRAPH}/${phoneId}?fields=display_phone_number,verified_name,quality_rating`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      info.numero_envia = r.ok ? j : { error: j?.error?.message || `Error ${r.status}` };
    } catch (e) { info.numero_envia = { error: (e as Error).message }; }
  }
  if (token && waba) {
    try {
      const r = await fetch(`${GRAPH}/${waba}/message_templates?name=${encodeURIComponent(ajustes.template_name)}&fields=name,status,language,rejected_reason`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) {
        const lista = (j.data || []) as { language: string; status: string; rejected_reason?: string }[];
        const t = lista.find((x) => x.language === ajustes.template_language) || lista[0];
        info.plantilla = { nombre: ajustes.template_name, estado: t ? t.status : 'NO_EXISTE', motivo: t?.rejected_reason || null };
      } else {
        info.plantilla = { nombre: ajustes.template_name, estado: 'error', motivo: j?.error?.message || `Error ${r.status}` };
      }
    } catch (e) { info.plantilla = { nombre: ajustes.template_name, estado: 'error', motivo: (e as Error).message }; }
  }
  return info;
}

// ---------- Autorización ----------
async function esCronValido(db: SupabaseClient, req: Request) {
  const clave = req.headers.get('x-cake-cron') || '';
  if (!clave) return false;
  const { data } = await db.from('cake_reminder_private').select('cron_secret').eq('id', 1).maybeSingle();
  return !!data?.cron_secret && data.cron_secret.length >= 32 && data.cron_secret === clave;
}
async function esAdministradora(db: SupabaseClient, req: Request) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt || jwt.split('.').length !== 3) return false;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) return false;
  const { data: fila } = await db.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return !!fila;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, mensaje: 'Método no permitido' }, 405);

  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ ok: false, mensaje: 'La función no tiene acceso a la base de datos.' }, 500);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let cuerpo: Record<string, unknown> = {};
  try { cuerpo = await req.json(); } catch { /* cuerpo vacío */ }
  const accion = String(cuerpo.accion || '');

  try {
    if (accion === 'cron') {
      if (!(await esCronValido(db, req))) return json({ ok: false, mensaje: 'No autorizado' }, 401);
      return json({ ok: true, ...(await procesarRecordatorios(db, { forzar: false })) });
    }

    if (!(await esAdministradora(db, req))) return json({ ok: false, mensaje: 'Inicia sesión como administradora.' }, 401);

    if (accion === 'estado') return json({ ok: true, ...(await estadoConexion(db)) });
    if (accion === 'prueba') {
      const tel = typeof cuerpo.telefono === 'string' && /^[1-9]\d{7,14}$/.test(cuerpo.telefono) ? cuerpo.telefono : undefined;
      return json(await enviarPrueba(db, tel));
    }
    if (accion === 'crear_plantilla') return json(await crearPlantilla(db));
    if (accion === 'revisar_ahora') return json({ ok: true, ...(await procesarRecordatorios(db, { forzar: true })) });
    return json({ ok: false, mensaje: 'Acción desconocida' }, 400);
  } catch (e) {
    console.error('cake-recordatorios', accion, e);
    return json({ ok: false, mensaje: (e as Error).message || 'Error inesperado' }, 500);
  }
});
