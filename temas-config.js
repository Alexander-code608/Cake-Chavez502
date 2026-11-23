/* =========================================================
   CAKE CHÁVEZ — REGISTRO CENTRAL DE LAS 10 TEMÁTICAS
   Un solo lugar con el identificador permanente, el nombre, el icono,
   los textos y la música de cada temática.

   - El identificador (id) NUNCA debe cambiarse: se guarda en Supabase
     (cake_site_theme.theme, products.store_theme, orders.store_theme…).
   - Los nombres visibles sí se pueden cambiar aquí con toda tranquilidad.
   - Se carga en el <head>, antes de tema.js.
   ========================================================= */
(function () {
  'use strict';
  var T = [
    {
      id: 'navidad', orden: 1, nombre: 'Navidad', emoji: '🎄', anio2027: false,
      especialidades: 'Especialidades de Navidad', etiqueta: 'Temporada navideña',
      subtitulo: 'Sabores de temporada hechos con amor para compartir en familia. ¡Haz tu pedido con anticipación!',
      colorMeta: '#1d1216', raspa: 'Raspa y gana navideño', regalito: 'Descubre tu regalito navideño',
      cuenta: 'Faltan para Nochebuena', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Happy Christmas Faces (2 min edit)', artista: 'kaazoom', fuente: 'Pixabay', archivo: 'musica/happy-christmas-faces-suave.mp3', enlace: '' },
      musicaVideos: { titulo: 'Christmas Stars', artista: 'Michael Ramir C.', enlace: 'https://mixkit.co/free-stock-music/tag/christmas/' }
    },
    {
      id: 'anio-nuevo', orden: 2, nombre: 'Año Nuevo', emoji: '🎆', anio2027: true,
      especialidades: 'Especialidades de Año Nuevo', etiqueta: 'Celebra el Año Nuevo',
      subtitulo: 'Pasteles, galletas y detalles dorados para brindar por un nuevo comienzo.',
      colorMeta: '#24150f', raspa: 'Raspa y gana de Año Nuevo', regalito: 'Descubre tu regalito de Año Nuevo',
      cuenta: 'Faltan para Año Nuevo', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Dreaming Big', artista: 'Ahjay Stelino', fuente: 'Mixkit', archivo: 'musica/temas/anio-nuevo__dreaming-big.mp3', enlace: 'https://mixkit.co/free-stock-music/mood/uplifting/' }
    },
    {
      id: 'carino-amistad', orden: 3, nombre: 'Día del Cariño y la Amistad', nombreCorto: 'Cariño y Amistad', emoji: '💗', anio2027: true,
      especialidades: 'Especialidades del Día del Cariño', etiqueta: 'Cariño y Amistad',
      subtitulo: 'Corazones, rosas y dulces detalles para decir «te quiero» a quien más aprecias.',
      colorMeta: '#c7848f', raspa: 'Raspa y gana del Cariño', regalito: 'Descubre tu regalito del Cariño',
      cuenta: 'Faltan para el Día del Cariño', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Latin Lovers', artista: 'Ahjay Stelino', fuente: 'Mixkit', archivo: 'musica/temas/carino-amistad__latin-lovers.mp3', enlace: 'https://mixkit.co/free-stock-music/jazz/' }
    },
    {
      id: 'semana-santa', orden: 4, nombre: 'Semana Santa', emoji: '🌿', anio2027: true,
      especialidades: 'Especialidades de Semana Santa', etiqueta: 'Temporada de Semana Santa',
      subtitulo: 'Delicias de primavera con flores, huevitos pastel y sabores para compartir en familia.',
      colorMeta: '#9fb08a', raspa: 'Raspa y gana de Semana Santa', regalito: 'Descubre tu regalito de Semana Santa',
      cuenta: 'Faltan para Semana Santa', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Classical vibes 4', artista: 'Grigoriy Nuzhny', fuente: 'Mixkit', archivo: 'musica/temas/semana-santa__classical-vibes-4.mp3', enlace: 'https://mixkit.co/free-stock-music/mood/uplifting/' }
    },
    {
      id: 'dia-madre', orden: 5, nombre: 'Día de la Madre', emoji: '🌷', anio2027: true,
      especialidades: 'Especialidades del Día de la Madre', etiqueta: 'Para mamá, con amor',
      subtitulo: 'Porque cada mamá también merece un dulce momento: flores, rosas y detalles hechos a mano.',
      colorMeta: '#a8707c', raspa: 'Raspa y gana para Mamá', regalito: 'Descubre tu regalito para Mamá',
      cuenta: 'Faltan para el Día de la Madre', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'I Love You Mommy', artista: 'Michael Ramir C.', fuente: 'Mixkit', archivo: 'musica/temas/dia-madre__i-love-you-mommy.mp3', enlace: 'https://mixkit.co/free-stock-music/mood/contented/' }
    },
    {
      id: 'dia-padre', orden: 6, nombre: 'Día del Padre', emoji: '👔', anio2027: true,
      especialidades: 'Especialidades del Día del Padre', etiqueta: 'Para papá, con cariño',
      subtitulo: 'Celebra con un pastel tan especial como él: chocolate, corbatas y detalles elegantes.',
      colorMeta: '#1f4a4f', raspa: 'Raspa y gana para Papá', regalito: 'Descubre tu regalito para Papá',
      cuenta: 'Faltan para el Día del Padre', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Upbeat Jazz', artista: 'Francisco Alvear', fuente: 'Mixkit', archivo: 'musica/temas/dia-padre__upbeat-jazz.mp3', enlace: 'https://mixkit.co/free-stock-music/jazz/' }
    },
    {
      id: 'dia-nino', orden: 7, nombre: 'Día del Niño', emoji: '🎈', anio2027: true,
      especialidades: 'Especialidades del Día del Niño', etiqueta: '¡A celebrar, peques!',
      subtitulo: 'Globos, ositos y colores alegres para endulzar la fiesta de los más pequeños.',
      colorMeta: '#7a9fc8', raspa: 'Raspa y gana del Día del Niño', regalito: 'Descubre tu regalito del Día del Niño',
      cuenta: 'Faltan para el Día del Niño', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Dance with Me', artista: 'Ahjay Stelino', fuente: 'Mixkit', archivo: 'musica/temas/dia-nino__dance-with-me.mp3', enlace: 'https://mixkit.co/free-stock-music/children/' }
    },
    {
      id: 'halloween', orden: 8, nombre: 'Halloween', emoji: '🎃', anio2027: true,
      especialidades: 'Especialidades de Halloween', etiqueta: 'Dulce o truco',
      subtitulo: 'Calabazas, fantasmitas y velas encendidas en postres deliciosamente encantados.',
      colorMeta: '#3a2230', raspa: 'Raspa y gana de Halloween', regalito: 'Descubre tu dulce de Halloween',
      cuenta: 'Faltan para Halloween', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'Secret Garden', artista: 'Eugenio Mininni', fuente: 'Mixkit', archivo: 'musica/temas/halloween__secret-garden.mp3', enlace: 'https://mixkit.co/free-stock-music/mood/mischievous/' }
    },
    {
      id: 'tema-oficial', orden: 9, nombre: 'Tema Oficial', emoji: '🎀', anio2027: true,
      especialidades: 'Especialidades de Cake Chavez', etiqueta: 'La repostería de Cake Chavez',
      subtitulo: 'Nuestras creaciones de todo el año, horneadas con amor y presentadas con elegancia.',
      colorMeta: '#000000', raspa: 'Raspa y gana de Cake Chavez', regalito: 'Descubre tu regalito de Cake Chavez',
      cuenta: 'Faltan para tu próxima celebración', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'You Got Jazz', artista: 'Diego Nava', fuente: 'Mixkit', archivo: 'musica/temas/tema-oficial__you-got-jazz.mp3', enlace: 'https://mixkit.co/free-stock-music/jazz/' }
    },
    {
      id: 'tematica-adicional', orden: 10, nombre: 'Jardín Encantado', nombreAdmin: 'Temática Adicional · Jardín Encantado', emoji: '🦋', anio2027: true,
      especialidades: 'Especialidades del Jardín Encantado', etiqueta: 'Celebraciones en el jardín',
      subtitulo: 'Magnolias, mariposas y tonos de jardín para cumpleaños y fiestas inolvidables.',
      colorMeta: '#8fb3a3', raspa: 'Raspa y gana del Jardín', regalito: 'Descubre tu regalito del Jardín',
      cuenta: 'Faltan para tu celebración', urgente: '¿Necesitas un pedido urgente?',
      musica: { titulo: 'One More Dance', artista: 'Arulo', fuente: 'Mixkit', archivo: 'musica/temas/tematica-adicional__one-more-dance.mp3', enlace: 'https://mixkit.co/free-stock-music/dance-pop/' }
    }
  ];
  var porId = {};
  T.forEach(function (t) { if (!t.nombreCorto) t.nombreCorto = t.nombre; if (!t.nombreAdmin) t.nombreAdmin = t.nombre; porId[t.id] = t; });
  window.CAKE_TEMAS = {
    lista: T,
    ids: T.map(function (t) { return t.id; }),
    valido: function (id) { return !!porId[id]; },
    buscar: function (id) { return porId[id] || null; },
    nombre: function (id) { return porId[id] ? porId[id].nombre : 'Sin temática registrada'; },
    etiqueta: function (id) { return porId[id] ? porId[id].emoji + ' ' + porId[id].nombre : 'Sin temática registrada'; }
  };
})();
