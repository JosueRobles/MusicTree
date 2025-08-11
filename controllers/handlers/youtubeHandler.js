const supabase = require('../../supabaseClient');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');
const { updateArtistPopularity } = require('../utils/supabaseHelpers');

// Debes tener un helper para llamar a la YouTube Data API v3
const { 
  fetchYoutubeChannelVideos, 
  fetchYoutubePlaylistVideos, 
  isoDurationToSeconds, 
  calcularPopularidadCruda,
  fetchYoutubeVideosDetails,
  calcularPopularidadAbsoluta,
  escalarA100Absoluto
} = require('../utils/youtubeApiHelpers'); // <-- Asegúrate de importar helpers

// Helper: Inserta o actualiza artista por nombre, retorna id_artista
async function insertOrUpdateArtistByName(nombre_artista) {
  let { data: artist, error } = await supabase
    .from('artistas')
    .select('id_artista')
    .eq('nombre_artista', nombre_artista)
    .maybeSingle();
  if (artist) return artist.id_artista;
  const { data: newArtist } = await supabase
    .from('artistas')
    .insert({ nombre_artista, es_principal: false })
    .select('id_artista')
    .single();
  return newArtist.id_artista;
}

async function buscarArtistaId(nombre) {
  const { data } = await supabase
    .from('artistas')
    .select('id_artista')
    .ilike('nombre_artista', nombre)
    .limit(1).single()
  return data?.id_artista || null;
}

// Helper: Inserta video en videos_musicales y retorna id_video (robusto, sin duplicados)
async function insertVideoMusical(video) {
  // 1. Verifica si ya existe por youtube_id
  const { data: existente } = await supabase
    .from('videos_musicales')
    .select('id_video')
    .eq('youtube_id', video.video_id)
    .maybeSingle();

  if (existente && existente.id_video) {
    return existente.id_video;
  }

  // 2. Inserta si no existe
  const { data, error } = await supabase
    .from('videos_musicales')
    .insert({
      titulo: video.titulo_limpio,
      url_video: `https://www.youtube.com/watch?v=${video.video_id}`,
      duracion: video.duracion_segundos,
      popularidad: video.popularidad,
      miniatura: video.miniatura,
      anio: video.anio,
      youtube_id: video.video_id,
    })
    .select('id_video')
    .single();

  if (error) {
    console.error('Error al insertar video musical:', error);
    throw new Error('Error al insertar video musical: ' + error.message);
  }
  if (!data || !data.id_video) {
    throw new Error('No se pudo insertar ni obtener el id_video para el video: ' + video.titulo_limpio);
  }
  return data.id_video;
}

// Helper: Relaciona video con artistas
async function relateVideoArtists(id_video, artistas_ids) {
  for (const artista_id of artistas_ids) {
    await supabase.from('video_artistas').upsert({
      video_id: id_video,
      artista_id
    }, { onConflict: ['video_id', 'artista_id'] });
  }
}

// Helper: Relaciona géneros (puedes expandir para usar Last.fm si quieres)
async function relateVideoGenres(id_video, titulo, artistas_ids) {
  // Busca géneros igual que para canciones
  await buscarGenerosDeAlbumOCancion('video', id_video, titulo);
}

// Helper: Verifica si un video ya existe en videos_musicales por youtube_id
async function videoExistsInDB(youtube_id) {
  const { data, error } = await supabase
    .from('videos_musicales')
    .select('id_video')
    .eq('youtube_id', youtube_id)
    .maybeSingle();
  return !!data;
}

// Helper: Verifica si un video ya está en una colección
async function videoInCollection(video_id, coleccion_id) {
  const { data, error } = await supabase
    .from('colecciones_elementos')
    .select('id_elemento')
    .eq('coleccion_id', coleccion_id)
    .eq('entidad_tipo', 'video')
    .eq('entidad_id', video_id)
    .maybeSingle();
  return !!data;
}

// Helper: Limpia el título (puedes mejorar la lógica)
function limpiarTitulo(titulo, artistaPrincipal, colaboradores = []) {
  let limpio = titulo;

  // Quita la parte izquierda si hay guion (ej: "Bruno Mars - 24K Magic")
  if (limpio.includes(' - ')) {
    limpio = limpio.split(' - ')[1];
  }

  if (artistaPrincipal) {
    limpio = limpio.replace(new RegExp(artistaPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }

  for (const colab of colaboradores) {
    limpio = limpio.replace(new RegExp(colab, 'gi'), '');
  }

  limpio = limpio
    .replace(/\(.*?(official|video|lyric|audio|visualizer|remix).*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\.|feat\.|featuring/gi, '')
    .replace(/VEVO|T[- ]Series|Official Music Video|Audio Oficial/gi, '')
    .replace(/[^\p{L}\p{N}\s\-:,'".!?()¿¡]/gu, '') // quita emojis
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-:|]\s*/, '')
    .trim();

  return limpio;
}

// Helper para extraer posibles nombres de artistas del título usando patrones comunes
function extraerNombresArtistasTitulo(titulo) {
  let posibles = [];

  // 1. Si hay guion, toma todo lo de la izquierda y sepáralo por , & y x
  if (titulo.includes(' - ')) {
    const ladoIzquierdo = titulo.split(' - ')[0];
    posibles.push(...ladoIzquierdo.split(/,|&| y | x /i));
  } else {
    // Si no hay guion, toma lo antes de "ft." o "feat." o la primera coma
    const match = titulo.match(/^(.*?)(?:\s*(ft\.|feat\.|featuring|,|&| y | x )|$)/i);
    if (match && match[1]) {
      posibles.push(...match[1].split(/,|&| y | x /i));
    }
  }

  // 2. Busca dentro de paréntesis (feat/ft)
  const paren = titulo.match(/\(([^)]*?(ft\.|feat\.|featuring)[^)]*)\)/i);
  if (paren) {
    posibles.push(...paren[1].split(/,|&| y | x /i));
  }

  // 3. ft. fuera de paréntesis
  const feat = titulo.match(/(ft\.|feat\.|featuring)\s+([^\[\]()\-]+)/i);
  if (feat) {
    posibles.push(...feat[2].split(/,|&| y | x /i));
  }

  // 4. Si hay "with" o "con" (ej: "with Justin Bieber")
  const withMatch = titulo.match(/with ([^\[\]()\-]+)/i);
  if (withMatch) {
    posibles.push(...withMatch[1].split(/,|&| y | x /i));
  }

  // 5. Limpia y elimina duplicados
  return [...new Set(posibles.map(n => n.trim()).filter(n => n.length > 1))];
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const ARTIST_ALIASES = {
  'Ke$ha': 'Kesha',
  'Anne Marie': 'Anne-Marie',
  'JHAY CORTEZ': 'JHAYCO',
  'Gigi D’Agostino': "Gigi D'Agostino",
  'Arcangel': 'Arcángel',
  'Sky': 'Sky Rompiendo',
  'Mike WiLL Made It': 'Mike WiLL Made-It',
  'Lenny Tavarez': 'Lenny Tavárez',
  'Casper': 'Casper Magico',
  'Nio García': 'Nio Garcia',
  'Tanishk B': 'Tanishk Bagchi',
  'Dhvani': 'Dhvani Bhanushali',
  'Kumar S': 'Kumar Sanu',
  'Chino y Nacho': 'Chino & Nacho',
  'Juan Magan': 'Juan Magán',
  'Sebastián Yatra': 'Sebastian Yatra',
  'J. Balvin': 'J Balvin',
  'Gummy Bear': 'Gummibär',
  'Israel "IZ" Kamakawiwoʻole': "Israel Kamakawiwo'ole",
  'Osito Gominola': 'Gummibär',
  'Zé Neto e Cristiano': 'Zé Neto & Cristiano',
  // ...agrega más alias según tu lista...
};

function aplicarAliasArtistas(titulo) {
  for (const [alias, real] of Object.entries(ARTIST_ALIASES)) {
    const regex = new RegExp(alias, 'gi');
    if (Array.isArray(real)) {
      for (const r of real) {
        titulo += ` ${r}`; // los añade como si fueran mencionados
      }
    } else {
      titulo = titulo.replace(regex, real);
    }
  }
  return titulo;
}

// Lista blanca de artistas cortos válidos
const ARTISTAS_CORTOS_VALIDOS = ['L.V.', 'T.I.'];

// Helper: Detección estricta de artistas especiales antes de normalizar
function detectarArtistasEspeciales(titulo, artistasBD) {
  const encontrados = [];
  for (const especial of ARTISTAS_CORTOS_VALIDOS) {
    const regex = new RegExp(`\\b${especial.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(titulo)) {
      const artista = artistasBD.find(a => a.nombre_artista.toLowerCase() === especial.toLowerCase());
      if (artista) {
        encontrados.push({ id: artista.id_artista, nombre: artista.nombre_artista });
      }
    }
  }
  return encontrados;
}

async function procesarVideoCrudo(v, artista_principal, artista_id, nombre_artista_principal) {
  // Soporta estructura de playlist y de catálogo (id directo o id.videoId)
  const videoId = v.id?.videoId || v.id || v.contentDetails?.videoId || v.snippet?.resourceId?.videoId || v.videoId;
  const snippet = v.snippet || {};
  const publishedAt = snippet.publishedAt || v.publishedAt;
  let title = snippet.title || v.title;
  title = aplicarAliasArtistas(title);

  const thumbnail = snippet.thumbnails?.high?.url || v.thumbnail;
  const duration = v.contentDetails?.duration || v.duration || 'PT0S';
  const viewCount = v.statistics?.viewCount || v.viewCount || 0;
  const duracion_segundos = isoDurationToSeconds(duration);
  const anio = publishedAt ? new Date(publishedAt).getFullYear() : null;

  // 1. Extraer artistas reales de la BD y ordenar por longitud de nombre descendente
  const artistasBD = (await supabase.from('artistas').select('id_artista, nombre_artista')).data || [];
  const artistasOrdenados = artistasBD
    .map(a => ({
      id: a.id_artista,
      nombre: a.nombre_artista,
      norm: removeAccents(a.nombre_artista.toLowerCase().replace(/[-.]/g, ' '))
    }))
    .sort((a, b) => b.nombre.length - a.nombre.length);

  // 2. Extraer posibles nombres de artistas del título usando patrones
  const posiblesNombres = extraerNombresArtistasTitulo(title);

  // 3. Buscar artistas especiales (L.V., T.I.) solo si aparecen exactamente así
  let artistasDetectados = detectarArtistasEspeciales(title, artistasBD);

  // 4. Buscar artistas en el título (sin normalizar primero)
  let tituloRestante = title;
  for (const artista of artistasOrdenados) {
    if (artista.nombre.length < 3 && !ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) continue;
    if (artistasDetectados.some(a => a.id === artista.id)) continue;
    // Solo detecta T.I. y L.V. si aparecen exactamente
    if (ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) {
      const regex = new RegExp(`\\b${artista.nombre.replace('.', '\\.')}\\b`, 'i');
      if (!regex.test(title)) continue;
    }
    // Si el nombre está en los posibles extraídos, lo acepta
    if (posiblesNombres.some(n => n.toLowerCase() === artista.nombre.toLowerCase())) {
      artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
      continue;
    }
    // Si el nombre aparece en el título, lo acepta
    const regex = new RegExp(`(^|[\\s,\\-x&])${artista.nombre}([\\s,\\-x&]|$)`, 'i');
    if (regex.test(tituloRestante)) {
      artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
      tituloRestante = tituloRestante.replace(new RegExp(artista.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }
  }

  // 5. Si no se detecta ninguno, buscar en el título normalizado (sin puntos)
  if (artistasDetectados.length === 0) {
    let tituloNorm = removeAccents(title.toLowerCase().replace(/[-.]/g, ' '));
    for (const artista of artistasOrdenados) {
      if (artista.nombre.length < 3 && !ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) continue;
      const regex = new RegExp(`(^|[\\s,\\-x&])${artista.norm}([\\s,\\-x&]|$)`, 'i');
      if (regex.test(tituloNorm)) {
        artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
        tituloNorm = tituloNorm.replace(new RegExp(artista.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      }
    }
  }

  // 6. Si hay ambigüedad (más de un artista con el mismo nombre), elige el que más compatibilidad tenga
  // (por ahora, el que más largo sea, puedes mejorar con más heurística)
  let artistaPrincipalDetectado = null;
  let artistaPrincipalId = null;
  if (artista_id && nombre_artista_principal) {
  artistaPrincipalDetectado = nombre_artista_principal;
  artistaPrincipalId = artista_id;

  // Agrega a artistasDetectados si no está aún
  if (!artistasDetectados.some(a => a.id === artistaPrincipalId)) {
    artistasDetectados.push({ id: artistaPrincipalId, nombre: artistaPrincipalDetectado });
  }
} else if (artistasDetectados.length > 0) {
    // Elige el artista cuyo nombre aparece primero en el título
    let mejor = artistasDetectados[0];
    let mejorIdx = title.indexOf(mejor.nombre);
    for (const a of artistasDetectados) {
      const idx = title.indexOf(a.nombre);
      if (idx !== -1 && (mejorIdx === -1 || idx < mejorIdx)) {
        mejor = a;
        mejorIdx = idx;
      }
    }
    artistaPrincipalDetectado = mejor.nombre;
    artistaPrincipalId = mejor.id;
  }

  // 7. Colaboradores: todos los demás artistas detectados en el título, que no sean el principal
  const colaboradores = artistasDetectados
    .filter(a => a.id !== artistaPrincipalId && a.id !== undefined)
    .slice(0, 5);

  // 8. Limpiar el título eliminando artistas detectados
  let limpio = title;
  // Asegura que se elimine el nombre del artista principal incluso si no fue detectado automáticamente
  if (nombre_artista_principal) {
    limpio = limpio.replace(new RegExp(nombre_artista_principal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  if (artistaPrincipalDetectado) {
    limpio = limpio.replace(new RegExp(artistaPrincipalDetectado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  for (const colab of colaboradores) {
    limpio = limpio.replace(new RegExp(colab.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  limpio = limpio.replace(/[-–—]/g, ' ')
    .replace(/\(.*?(official|video|lyric|audio|visualizer).*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\.|feat\.|featuring/gi, '')
    .replace(/^\s*,/, '') // Elimina coma al inicio
    .replace(/\s+/g, ' ')
    .trim();

  if (!limpio) limpio = title;

  // 9. Popularidad ajustada
  const popularidad = calcularPopularidadAbsoluta(viewCount, publishedAt);

  // 10. Solo asigna artista principal y colaboradores si existen en la BD
  let videoObj = {
    video_id: videoId,
    artista_id: artistaPrincipalId || null,
    artista_principal: artistaPrincipalDetectado || null,
    titulo_original: title,
    titulo_limpio: limpio,
    duracion_iso: duration,
    duracion_segundos,
    published_at: publishedAt,
    view_count: Number(viewCount),
    popularidad,
    miniatura: thumbnail,
    anio,
    extraccion_batch_id: null,
    es_nueva_extraccion: true,
    artista_colaborador1: colaboradores[0]?.nombre || null,
    artista_colaborador1_id: colaboradores[0]?.id || null,
    artista_colaborador2: colaboradores[1]?.nombre || null,
    artista_colaborador2_id: colaboradores[1]?.id || null,
    artista_colaborador3: colaboradores[2]?.nombre || null,
    artista_colaborador3_id: colaboradores[2]?.id || null,
    artista_colaborador4: colaboradores[3]?.nombre || null,
    artista_colaborador4_id: colaboradores[3]?.id || null,
    artista_colaborador5: colaboradores[4]?.nombre || null,
    artista_colaborador5_id: colaboradores[4]?.id || null,
  };

  return videoObj;
}

module.exports = {
  // 1. Importar catálogo de un artista (nuevo)
  importYoutubeCatalog: async (artistId) => {
  const { data: artist } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista, channel_id_youtube')
    .eq('id_artista', artistId)
    .single();

  if (!artist || !artist.channel_id_youtube) {
    throw new Error('Artista o channel_id_youtube no encontrado');
  }

  const videosCrudos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);
  console.log('Videos crudos:', videosCrudos); // <-- Agrega este log
  const videoIds = videosCrudos.map(v =>
    v.id?.videoId || v.id || v.snippet?.resourceId?.videoId || v.contentDetails?.videoId
  ).filter(id => !!id);
  console.log('Video IDs extraídos:', videoIds); // <-- Agrega este log
  if (videoIds.length === 0) {
    console.warn('No se encontraron videos válidos en el canal');
    return;
  }
  const videosDetalles = await fetchYoutubeVideosDetails(videoIds);
  console.log('Detalles de videos:', videosDetalles); // <-- Agrega este log

  const batchId = Date.now().toString();

  let videosProcesados = await Promise.all(
    videosDetalles.map(async v => {
      const video = await procesarVideoCrudo(v, artist.nombre_artista, artist.id_artista, artist.nombre_artista);

      // Solo si artista_id válido
      //if (!video.artista_id) return null;

      video.extraccion_batch_id = batchId;
      video.is_musical = null;
      video.popularidad = calcularPopularidadAbsoluta(video.view_count, video.published_at);

      return video;
    })
  );

  videosProcesados = videosProcesados.filter(v => v); // Elimina nulos

  for (const video of videosProcesados) {
    await supabase
      .from('staging_videos_youtube')
      .upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
  }
},

  // 2. Actualizar catálogo de un artista ya validado
  updateYoutubeCatalog: async (artistId) => {
  const { data: artist } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista, channel_id_youtube')
    .eq('id_artista', artistId)
    .single();
  if (!artist || !artist.channel_id_youtube) throw new Error('Artista o channel_id_youtube no encontrado');

  const videos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);
  const batchId = Date.now().toString();

  let videosProcesados = await Promise.all(
    videos.map(async v => {
      const video = await procesarVideoCrudo(v, artist.nombre_artista, artist.id_artista, artist.nombre_artista);

      // Solo si artista_id válido
      if (!video.artista_id || !video.titulo_limpio || !video.video_id) return null;

      video.extraccion_batch_id = batchId;
      video.is_musical = null;
      video.popularidad = calcularPopularidadAbsoluta(video.view_count, video.published_at);

      return video;
    })
  );

  videosProcesados = videosProcesados.filter(v => v); // elimina nulos

  for (const video of videosProcesados) {
    await supabase.from('staging_videos_youtube').upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
  }

  const { data: musicales } = await supabase
    .from('staging_videos_youtube')
    .select('*')
    .eq('extraccion_batch_id', batchId)
    .eq('is_musical', true);

  for (const video of musicales) {
    if (!video.titulo_limpio || !video.video_id) continue;

    const id_video = await insertVideoMusical(video);
    await relateVideoArtists(id_video, [artist.id_artista]);

    for (let i = 1; i <= 5; i++) {
      const colab = video[`artista_colaborador${i}`];
      if (colab) {
        const colabId = await buscarArtistaId(colab); // aquí sí puede crear colaborador si no existe
        await relateVideoArtists(id_video, [colabId]);
      }
    }

    await relateVideoGenres(id_video, video.titulo_limpio, [artist.id_artista]);
  }

  await updateArtistPopularity(artist.id_artista, null);
},

  // 3. Crear/actualizar colección desde playlist de YouTube
  playlistToCollection: async (playlistId) => {
  const videosCrudos = await fetchYoutubePlaylistVideos(playlistId);
  const videoIds = videosCrudos.map(v => v.snippet?.resourceId?.videoId).filter(id => !!id);

  if (videoIds.length === 0) {
    console.warn('No se encontraron videos válidos en la playlist');
    return;
  }

  const videosDetalles = await fetchYoutubeVideosDetails(videoIds);
  const batchId = Date.now().toString();

  let videosProcesados = await Promise.all(
    videosDetalles.map(async v => {
      const videoTemp = await procesarVideoCrudo(v, null, null, null);

      // Buscar el id del artista principal detectado
      let artistaId = null;
      if (videoTemp.artista_principal) {
        const { data: existingArtist, error } = await supabase
          .from('artistas')
          .select('id_artista')
          .ilike('nombre_artista', videoTemp.artista_principal)
          .limit(1).single()
        if (error) {
          console.error('Error buscando artista principal:', error, videoTemp.artista_principal);
        }
        artistaId = existingArtist?.id_artista || null;
      }
      videoTemp.artista_id = artistaId;

      // Si no hay artista_id, descarta el video
      if (!videoTemp.artista_id) {
        console.warn('Video sin artista detectado:', videoTemp.video_id, videoTemp.titulo_original);
      }

      videoTemp.extraccion_batch_id = batchId;
      videoTemp.is_musical = null;
      videoTemp.popularidad = calcularPopularidadAbsoluta(videoTemp.view_count, videoTemp.published_at);
      return videoTemp;
    })
  );

  videosProcesados = videosProcesados.filter(v => v);

  for (const video of videosProcesados) {
    try {
      const { error } = await supabase
        .from('staging_videos_youtube')
        .upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
      if (error) {
        console.error('Error al insertar en staging_videos_youtube:', error, video);
      }
    } catch (err) {
      console.error('Excepción al insertar en staging_videos_youtube:', err, video);
    }
  }
},

  // 4. Actualizar colección existente desde playlist de YouTube
  updateCollectionFromYoutubePlaylist: async (playlistId, coleccionId) => {
    const videosCrudos = await fetchYoutubePlaylistVideos(playlistId);

    const { data: elementos } = await supabase
      .from('colecciones_elementos')
      .select('entidad_id')
      .eq('coleccion_id', coleccionId)
      .eq('entidad_tipo', 'video');
    const existentes = new Set((elementos || []).map(e => e.entidad_id));

    for (const v of videosCrudos) {
      const videoTemp = await procesarVideoCrudo(v, null, null, null);

    // Buscar el id del artista principal detectado
    let artistaId = null;
    if (videoTemp.artista_principal) {
      const { data: existingArtist } = await supabase
        .from('artistas')
        .select('id_artista')
        .ilike('nombre_artista', videoTemp.artista_principal)
        .maybeSingle();
      artistaId = existingArtist?.id_artista || null;
    }
    videoTemp.artista_id = artistaId;

    // Si no hay artista_id, descarta el video
    if (!videoTemp.artista_id) continue;

    videoTemp.popularidad = calcularPopularidadAbsoluta(videoTemp.view_count, videoTemp.published_at);

    let id_video;
    const { data: existente } = await supabase
      .from('videos_musicales')
      .select('id_video')
      .eq('youtube_id', videoTemp.video_id)
      .maybeSingle();

    if (existente && existente.id_video) {
      id_video = existente.id_video;
    } else {
      id_video = await insertVideoMusical(videoTemp);
    }

    if (!existentes.has(id_video)) {
      await relateVideoArtists(id_video, [artistaId]);

      await supabase.from('colecciones_elementos').upsert({
        coleccion_id: coleccionId,
        entidad_tipo: 'video',
        entidad_id: id_video
      }, { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] });

      await relateVideoGenres(id_video, videoTemp.titulo_limpio, [artistaId]);
    }
  }
},

  // 5. Finalizar importación de videos desde YouTube (nuevo)
  finalizarImportacionYoutube: async (batchId) => {
    const { data: musicales } = await supabase
      .from('staging_videos_youtube')
      .select('*')
      .eq('extraccion_batch_id', batchId)
      .eq('is_musical', true);

    for (const video of musicales) {
      if (!video.titulo_limpio || !video.video_id) continue;
      const id_video = await insertVideoMusical(video);

      // Relacionar artista principal
      if (video.artista_id) {
        await relateVideoArtists(id_video, [video.artista_id]);
      }

      // Relacionar colaboradores
      for (let i = 1; i <= 5; i++) {
        /*const colab = video[`artista_colaborador${i}`];
        if (colab) {
          const colabId = await insertOrUpdateArtistByName(colab);
          await relateVideoArtists(id_video, [colabId]);
        }*/
      }

      // Relacionar géneros
      await relateVideoGenres(id_video, video.titulo_limpio, [video.artista_id]);
      // Opcional: añadir a colección si aplica
    }
  },
};