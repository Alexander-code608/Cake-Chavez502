// =====================================================================
// CAKE CHÁVEZ — REGLAS DE LOS RECORDATORIOS (sin conexión a nada)
// Fechas de Guatemala, qué pedidos se avisan y cómo se arma cada dato.
// Las usa index.ts y las prueba index.test.ts  (deno test index.test.ts).
// =====================================================================
const ZONA = 'America/Guatemala';
// Horario de silencio: no se envían recordatorios automáticos de noche (hora de Guatemala).
const SILENCIO_DESDE = '21:30';
const SILENCIO_HASTA = '06:00';

export type Ajustes = {
  enabled: boolean;
  send_tomorrow_at: string;
  send_today_at: string;
  admin_url: string;
  template_name: string;
  template_language: string;
};
export type Pedido = { order_code: string; status: string | null; payload: Record<string, unknown> | null };
export type Destinatario = { phone: string; label: string | null };
export type Tipo = 'hoy' | 'manana' | 'prueba';

// ---------- Fechas y horas de Guatemala ----------
export function ahoraGuatemala(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha);
  const p: Record<string, string> = {};
  for (const x of partes) p[x.type] = x.value;
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}
export function sumarDias(fechaISO: string, dias: number) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
export function hhmm(valor: string) {
  const m = String(valor || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}
export function enSilencio(hora: string) {
  return hora >= SILENCIO_DESDE || hora < SILENCIO_HASTA;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export function fechaBonita(iso: string) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso || 'Sin fecha';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${DIAS[d.getUTCDay()]} ${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}
export function horaBonita(valor: string) {
  const v = hhmm(valor);
  if (!v) return 'No registrada';
  const [h, mi] = v.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mi).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ---------- Datos del pedido ----------
export function estadoNormal(status: string | null) {
  const v = String(status || 'recibido').toLowerCase().trim();
  if (['entregado', 'completado', 'completo', 'finalizado'].includes(v)) return 'entregado';
  if (['cancelado', 'anulado'].includes(v)) return 'cancelado';
  return 'recibido';
}
export function estadoTexto(status: string | null) {
  const v = estadoNormal(status);
  return v === 'recibido' ? 'Pendiente' : v === 'entregado' ? 'Entregado' : 'Cancelado';
}
// Los parámetros de una plantilla no pueden tener saltos de línea, tabulaciones ni más de 4 espacios seguidos.
export function limpiarParam(v: unknown, max = 120, porDefecto = '—') {
  const t = String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return (t || porDefecto).slice(0, max);
}
export function nombrePastel(payload: Record<string, unknown>) {
  const items = Array.isArray(payload.items) ? payload.items as Record<string, unknown>[] : [];
  if (items.length) {
    return items.map((it) => {
      const n = String(it?.name ?? it?.nombre ?? 'Producto');
      const q = Number(it?.quantity) || 1;
      return q > 1 ? `${q} × ${n}` : n;
    }).join(', ');
  }
  if (payload.order_type === 'pastel_personalizado') {
    return ['Pastel personalizado', payload.flavor ? `sabor ${payload.flavor}` : '', payload.size ? `${payload.size}` : ''].filter(Boolean).join(' · ');
  }
  return String(payload.product_name ?? payload.cake_name ?? 'Pedido');
}
export function urlAbsoluta(url: string, base: string) {
  try { return new URL(url, base).toString(); } catch { return ''; }
}
// Meta solo acepta imágenes JPG o PNG en el encabezado de la plantilla.
export function esImagenAceptada(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (/\.(jpe?g|png)$/i.test(u.pathname)) return true;
    return /\/storage\/v1\/object\/public\//.test(u.pathname) && !/\.(webp|gif|svg|jfif|avif|heic|heif)$/i.test(u.pathname);
  } catch { return false; }
}
export function fotoPedido(payload: Record<string, unknown>, baseSitio: string) {
  const lista: string[] = [];
  const add = (v: unknown) => { const s = String(v ?? '').trim(); if (s) lista.push(urlAbsoluta(s, baseSitio)); };
  const items = Array.isArray(payload.items) ? payload.items as Record<string, unknown>[] : [];
  items.forEach((it) => add(it?.image ?? it?.imagen));
  add(payload.photo_reference_url);
  (Array.isArray(payload.photos) ? payload.photos : []).forEach(add);
  add(payload.reference_image_url);
  add(payload.inspiration_image_url);
  return lista.find(esImagenAceptada) || '';
}
export function baseDelSitio(adminUrl: string) {
  try { return new URL('.', adminUrl).toString(); } catch { return 'https://alexander-code608.github.io/Cake-Chavez502/'; }
}
export function logoSitio(adminUrl: string) {
  return urlAbsoluta('img/logo.png', baseDelSitio(adminUrl));
}

// ---------- Reglas de qué se envía (funciones puras, probadas en index.test.ts) ----------
// Qué avisos tocan ahora: "hoy" desde la hora de la mañana configurada y "mañana" desde la hora de la tarde.
export function tiposPendientes(hoy: string, hora: string, ajustes: Pick<Ajustes, 'send_today_at' | 'send_tomorrow_at'>, forzar: boolean) {
  const tipos: { tipo: Tipo; fecha: string }[] = [];
  if (forzar || hora >= ajustes.send_today_at) tipos.push({ tipo: 'hoy', fecha: hoy });
  if (forzar || hora >= ajustes.send_tomorrow_at) tipos.push({ tipo: 'manana', fecha: sumarDias(hoy, 1) });
  return tipos;
}
// Pedidos que merecen aviso: solo los de esa fecha exacta, ni cancelados ni entregados.
// En el aviso de "hoy" se omiten los que ya pasaron de su hora. Ordenados por hora de entrega.
export function pedidosParaAviso(pedidos: Pedido[], fecha: string, tipo: Tipo, hora: string, forzar: boolean) {
  return pedidos
    .filter((p) => p.order_code && estadoNormal(p.status) === 'recibido')
    .filter((p) => String(p.payload?.delivery_date ?? '').slice(0, 10) === fecha)
    .filter((p) => {
      if (tipo !== 'hoy' || forzar) return true;
      const h = hhmm(String(p.payload?.delivery_time ?? ''));
      return !h || h > hora;
    })
    .sort((a, b) => (hhmm(String(a.payload?.delivery_time ?? '')) || '99:99').localeCompare(hhmm(String(b.payload?.delivery_time ?? '')) || '99:99'));
}

