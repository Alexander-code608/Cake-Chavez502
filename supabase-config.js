/* =========================================================
   CONFIGURACIÓN SEGURA DEL FRONT-END DE CAKE CHAVEZ
   Pega únicamente el Project URL y la publishable/anon key de Supabase.
   NUNCA pegues la service_role key en este archivo.
   ========================================================= */
window.CAKE_SUPABASE_CONFIG = {
    url: "https://nlsmjrlwbzloehfvdczy.supabase.co",
    anonKey: "sb_publishable_pwBQKxIYQnPAr9sKt4msjw_nT68E-wt"
};
(function () {
    let client = null;
    window.getCakeSupabaseClient = function () {
        const cfg = window.CAKE_SUPABASE_CONFIG || {};
        if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
        if (!cfg.url || !cfg.anonKey || cfg.url.includes('PEGA_AQUI') || cfg.anonKey.includes('PEGA_AQUI')) return null;
        if (!client) {
            client = window.supabase.createClient(cfg.url, cfg.anonKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
        }
        return client;
    };
})();
