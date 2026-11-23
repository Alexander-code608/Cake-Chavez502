(function () {
  'use strict';
  window.CakeAvisoPedido = { enviar: function (orderCode) {
    try {
      const c = window.CAKE_SUPABASE_CONFIG || {};
      if (!c.url || !c.anonKey || !orderCode) throw new Error('Falta configuración del aviso de pedido.');
      void fetch(c.url.replace(/\/$/, '') + '/functions/v1/cake-aviso-pedido', {
        method: 'POST', keepalive: true,
        headers: { apikey: c.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_code: orderCode })
      }).then(function (r) { if (!r.ok) throw new Error('El aviso interno no pudo procesarse.'); })
        .catch(function (e) { console.warn('Aviso interno:', e); });
    } catch (e) { console.warn('Aviso interno:', e); }
  } };
})();
