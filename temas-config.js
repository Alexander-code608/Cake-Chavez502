/* Cake Chávez — registro de temáticas instaladas.
   Solo Navidad viene incluida. Las demás se agregan desde el panel con un ZIP. */
(function () {
  'use strict';
  var NAVIDAD = {
    id: 'navidad', orden: 1, nombre: 'Navidad', nombreCorto: 'Navidad', nombreAdmin: 'Navidad',
    emoji: '🎄', anio2027: false, especialidades: 'Especialidades de Navidad', etiqueta: 'Temporada navideña',
    subtitulo: 'Sabores de temporada hechos con amor para compartir en familia. ¡Haz tu pedido con anticipación!',
    colorMeta: '#1d1216', raspa: 'Raspa y gana navideño', regalito: 'Descubre tu regalito navideño',
    cuenta: 'Faltan para Nochebuena', urgente: '¿Necesitas un pedido urgente?', files: {}, estilos: [],
    musica: { titulo: 'Happy Christmas Faces (2 min edit)', artista: 'kaazoom', fuente: 'Pixabay', archivo: 'musica/happy-christmas-faces-suave.mp3', enlace: '' },
    musicaVideos: { titulo: 'Christmas Stars', artista: 'Michael Ramir C.', enlace: 'https://mixkit.co/free-stock-music/tag/christmas/' }
  };
  var T = [NAVIDAD], porId = { navidad: NAVIDAD };
  function normalizar(p) {
    var cfg = p.config || {}, id = p.theme || cfg.id;
    if (!id || !/^[a-z][a-z0-9-]{1,60}$/.test(id)) return null;
    var files = {}, rawFiles = p.files || cfg.files || {};
    Object.keys(rawFiles).forEach(function (key) {
      var f = rawFiles[key] || {};
      files[key] = f.url || '';
    });
    var anterior = porId[id] || {};
    var t = Object.assign({}, anterior, cfg, {
      id: id, nombre: p.name || cfg.nombre || anterior.nombre || id,
      nombreCorto: cfg.nombreCorto || cfg.nombre || p.name || id,
      nombreAdmin: cfg.nombreAdmin || cfg.nombre || p.name || id,
      emoji: cfg.emoji || '✨', orden: Number(cfg.orden) || (T.length + 1),
      especialidades: cfg.especialidades || ('Especialidades de ' + (p.name || id)),
      etiqueta: cfg.etiqueta || p.name || id, subtitulo: cfg.subtitulo || '',
      anio2027: id !== 'navidad', files: files, estilos: cfg.estilosUrls || [],
      version: Number(p.version) || Number(cfg.version) || 1
    });
    if (id === 'navidad') t = Object.assign(t, { emoji: '🎄', anio2027: false });
    porId[id] = t;
    var i = T.findIndex(function (x) { return x.id === id; });
    if (i < 0) T.push(t); else T[i] = t;
    T.sort(function (a, b) { return (a.orden || 99) - (b.orden || 99) || a.nombre.localeCompare(b.nombre, 'es'); });
    return t;
  }
  function instalarPaquetes(rows) {
    (rows || []).forEach(function (p) { if (p && !p.deleted_at) normalizar(p); });
    return api;
  }
  var api = {
    lista: T,
    get ids() { return T.map(function (t) { return t.id; }); },
    valido: function (id) { return !!porId[id]; },
    buscar: function (id) { return porId[id] || null; },
    nombre: function (id) { return porId[id] ? porId[id].nombre : 'Sin temática registrada'; },
    etiqueta: function (id) { return porId[id] ? porId[id].emoji + ' ' + porId[id].nombre : 'Sin temática registrada'; },
    instalar: normalizar,
    retirar: function (id) {
      if (id === 'navidad') return;
      delete porId[id];
      for (var i = T.length - 1; i >= 0; i--) if (T[i].id === id) T.splice(i, 1);
    },
    instalarPaquetes: instalarPaquetes
  };
  window.CAKE_TEMAS = api;
})();
