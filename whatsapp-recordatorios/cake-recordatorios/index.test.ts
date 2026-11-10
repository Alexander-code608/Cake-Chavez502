// Pruebas de las reglas de los recordatorios. Ejecutar con:  deno test index.test.ts
import { ahoraGuatemala, sumarDias, tiposPendientes, pedidosParaAviso, estadoNormal, horaBonita, fotoPedido } from './reglas.ts';

function igual(a: unknown, b: unknown, msg = '') {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`${msg}\n  esperado: ${y}\n  obtenido: ${x}`);
}
const ajustes = { send_today_at: '07:00', send_tomorrow_at: '18:00' };
const pedido = (code: string, status: string | null, fecha: string, hora = '') =>
  ({ order_code: code, status, payload: { delivery_date: fecha, delivery_time: hora, name: 'María' } });

Deno.test('usa la hora de Guatemala (UTC-6): 05:30 UTC del 10 de nov es 23:30 del 9 de nov', () => {
  igual(ahoraGuatemala(new Date('2026-11-10T05:30:00Z')), { fecha: '2026-11-09', hora: '23:30' });
});
Deno.test('mañana cruza fin de mes y de año', () => {
  igual(sumarDias('2026-11-30', 1), '2026-12-01');
  igual(sumarDias('2026-12-31', 1), '2027-01-01');
});
Deno.test('antes de las 07:00 no toca ningún aviso', () => {
  igual(tiposPendientes('2026-11-10', '06:45', ajustes, false), []);
});
Deno.test('desde las 07:00 toca el aviso de HOY, y desde las 18:00 también el de MAÑANA', () => {
  igual(tiposPendientes('2026-11-10', '07:00', ajustes, false), [{ tipo: 'hoy', fecha: '2026-11-10' }]);
  igual(tiposPendientes('2026-11-10', '18:15', ajustes, false), [{ tipo: 'hoy', fecha: '2026-11-10' }, { tipo: 'manana', fecha: '2026-11-11' }]);
});
Deno.test('no se avisa de pedidos cancelados ni entregados', () => {
  const lista = [pedido('CC-A', 'recibido', '2026-11-11'), pedido('CC-B', 'cancelado', '2026-11-11'), pedido('CC-C', 'entregado', '2026-11-11'), pedido('CC-D', null, '2026-11-11')];
  igual(pedidosParaAviso(lista, '2026-11-11', 'manana', '18:00', false).map((p) => p.order_code), ['CC-A', 'CC-D']);
});
Deno.test('no se avisa de pedidos con fecha posterior a mañana', () => {
  const lista = [pedido('CC-A', 'recibido', '2026-11-11'), pedido('CC-B', 'recibido', '2026-11-12')];
  igual(pedidosParaAviso(lista, '2026-11-11', 'manana', '18:00', false).map((p) => p.order_code), ['CC-A']);
});
Deno.test('aviso de HOY: omite los que ya pasaron de su hora y ordena por hora', () => {
  const lista = [pedido('CC-T', 'recibido', '2026-11-10', '15:00'), pedido('CC-M', 'recibido', '2026-11-10', '08:00'), pedido('CC-S', 'recibido', '2026-11-10', '11:30'), pedido('CC-N', 'recibido', '2026-11-10')];
  igual(pedidosParaAviso(lista, '2026-11-10', 'hoy', '09:00', false).map((p) => p.order_code), ['CC-S', 'CC-T', 'CC-N']);
});
Deno.test('estados equivalentes a completado/cancelado', () => {
  igual(['completado', 'Entregado', 'anulado', '', 'recibido'].map(estadoNormal), ['entregado', 'entregado', 'cancelado', 'recibido', 'recibido']);
});
Deno.test('hora en formato de 12 horas', () => {
  igual([horaBonita('10:00'), horaBonita('15:30'), horaBonita('00:05'), horaBonita('')], ['10:00 AM', '3:30 PM', '12:05 AM', 'No registrada']);
});
Deno.test('foto del pastel: usa una JPG/PNG y salta las WEBP', () => {
  const base = 'https://ejemplo.github.io/Cake/';
  igual(fotoPedido({ items: [{ image: 'img/pasteles/a.webp' }, { image: 'img/pasteles/b.jpg' }] }, base), 'https://ejemplo.github.io/Cake/img/pasteles/b.jpg');
});
