const supabase = require('../../supabaseClient');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');
const { updateArtistPopularity } = require('../utils/supabaseHelpers');

// Debes tener un helper para llamar a la YouTube Data API v3
const { 
  fetchYoutubeChannelVideos, 
  fetchYoutubePlaylistVideos, 
  isoDurationToSeconds, 
  calcularPopularidadCruda,
  fetchYoutubeVideosDetails
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
function limpiarTitulo(titulo) {
  return titulo.replace(/\(.*(official|video|lyric|audio|visualizer).*?\)/gi, '').replace(/\[.*?\]/g, '').trim();
}

// Helper: Procesa y normaliza un video crudo de la API
function procesarVideoCrudo(v, artista_principal) {
  // Ajusta según el formato real de la API
  const videoId = v.id?.videoId || v.contentDetails?.videoId || v.snippet?.resourceId?.videoId || v.videoId || v.id;
  const snippet = v.snippet || {};
  const publishedAt = snippet.publishedAt || v.publishedAt;
  const title = snippet.title || v.title;
  const channelTitle = snippet.channelTitle || v.channelTitle || artista_principal;
  const thumbnail = snippet.thumbnails?.high?.url || v.thumbnail;
  const duration = v.contentDetails?.duration || v.duration || 'PT0S';
  const viewCount = v.statistics?.viewCount || v.viewCount || 0;

  const duracion_segundos = isoDurationToSeconds(duration);
  const popularidad = calcularPopularidadCruda(Number(viewCount), publishedAt);
  const anio = publishedAt ? new Date(publishedAt).getFullYear() : null;

  return {
    video_id: videoId,
    artista_principal: channelTitle,
    titulo_original: title,
    titulo_limpio: limpiarTitulo(title),
    duracion_iso: duration,
    duracion_segundos,
    published_at: publishedAt,
    view_count: Number(viewCount),
    popularidad,
    miniatura: thumbnail,
    anio,
    artista_id: null, // Se asigna después
    extraccion_batch_id: null, // Se asigna después
    es_nueva_extraccion: true,
    // Colaboradores y otros campos se pueden extraer después
  };
}

// Helper: Escala la popularidad de los videos a un rango de 0 a 100
function escalarPopularidad(videos) {
  // Encuentra el mínimo y máximo de popularidad
  const popularidadMin = Math.min(...videos.map(v => v.popularidad));
  const popularidadMax = Math.max(...videos.map(v => v.popularidad));

  // Escala cada video
  return videos.map(v => {
    const popularidadEscalada = ((v.popularidad - popularidadMin) / (popularidadMax - popularidadMin)) * 100;
    return {
      ...v,
      popularidad: Math.round(popularidadEscalada),
    };
  });
}

module.exports = {
  // 1. Importar catálogo de un artista (nuevo)
  importYoutubeCatalog: async (artistId) => {
  const { data: artist } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista, channel_id_youtube')
    .eq('id_artista', artistId)
    .single();
  if (!artist || !artist.channel_id_youtube) throw new Error('Artista o channel_id_youtube no encontrado');

  const videosCrudos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);
  const videoIds = videosCrudos.map(v => v.id?.videoId).filter(id => !!id);

  const videosDetalles = await fetchYoutubeVideosDetails(videoIds);

  const batchId = Date.now().toString();
  let videosProcesados = videosDetalles.map(v => procesarVideoCrudo(v, artist.nombre_artista));
  videosProcesados.forEach(video => {
    video.artista_id = artist.id_artista;
    video.extraccion_batch_id = batchId;
    video.is_musical = null; // Solo manual
  });

  // Escala popularidad a 0-100
  videosProcesados = escalarPopularidad(videosProcesados);

  for (const video of videosProcesados) {
    await supabase.from('staging_videos_youtube').upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
  }
},

  // 2. Actualizar catálogo de un artista ya validado
  updateYoutubeCatalog: async (artistId) => {
    // 1. Obtener channelId
    const { data: artist } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista, channel_id_youtube')
      .eq('id_artista', artistId)
      .single();
    if (!artist || !artist.channel_id_youtube) throw new Error('Artista o channel_id_youtube no encontrado');

    // 2. Extraer videos nuevos
    const videos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);

    // 3. Insertar en staging con es_nueva_extraccion=TRUE y nuevo batch
    const batchId = Date.now().toString();
    for (const v of videos) {
      const video = procesarVideoCrudo(v, artist.nombre_artista);
      video.artista_id = artist.id_artista;
      video.extraccion_batch_id = batchId;
      if (!video.titulo_limpio || !video.video_id) {
        console.warn(`Video inválido, faltan campos requeridos:`, video);
        continue;
      }
      await supabase.from('staging_videos_youtube').upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
    }

    // 4. Comparar con registros previos (puedes hacer lógica de actualización aquí)
    // Ejemplo: actualizar popularidad/duración si cambió mucho
    // ... (tu lógica aquí)

    // 5. Insertar nuevos videos musicales validados
    const { data: musicales } = await supabase
      .from('staging_videos_youtube')
      .select('*')
      .eq('extraccion_batch_id', batchId)
      .eq('is_musical', true);

    for (const video of musicales) {
      if (!video.titulo_limpio || !video.video_id) {
        console.warn(`Video inválido, faltan campos requeridos:`, video);
        continue;
      }
      const id_video = await insertVideoMusical(video);
      await relateVideoArtists(id_video, [artist.id_artista]);
      for (let i = 1; i <= 5; i++) {
        const colab = video[`artista_colaborador${i}`];
        if (colab) {
          const colabId = await insertOrUpdateArtistByName(colab);
          await relateVideoArtists(id_video, [colabId]);
        }
      }
      await relateVideoGenres(id_video, video.titulo_limpio, [artist.id_artista]);
    }
    await updateArtistPopularity(artist.id_artista, null);
    // 6. Limpiar staging si quieres
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
  let videosProcesados = videosDetalles.map(v => procesarVideoCrudo(v, v.snippet?.channelTitle || 'Desconocido'));
  videosProcesados.forEach(video => {
    video.extraccion_batch_id = batchId;
    video.is_musical = null; // Solo manual
  });

  // Escala popularidad a 0-100
  videosProcesados = escalarPopularidad(videosProcesados);

  for (const video of videosProcesados) {
    await supabase.from('staging_videos_youtube').upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
  }
},

  // 4. Actualizar colección existente desde playlist de YouTube
  updateCollectionFromYoutubePlaylist: async (playlistId, coleccionId) => {
    // 1. Extraer videos de la playlist
    const videosCrudos = await fetchYoutubePlaylistVideos(playlistId);

    // 2. Obtener videos ya existentes en la colección
    const { data: elementos } = await supabase
      .from('colecciones_elementos')
      .select('entidad_id')
      .eq('coleccion_id', coleccionId)
      .eq('entidad_tipo', 'video');
    const existentes = new Set((elementos || []).map(e => e.entidad_id));

    // 3. Insertar solo los nuevos
    for (const v of videosCrudos) {
      // Procesa el video crudo
      const video = procesarVideoCrudo(v, v.snippet?.channelTitle || 'Desconocido');

      // Validación previa
      if (!video.titulo_limpio || !video.video_id) {
        console.warn(`Video inválido, faltan campos requeridos:`, video);
        continue;
      }

      // Si ya existe en videos_musicales, obtén su id_video
      let id_video;
      const { data: existente } = await supabase
        .from('videos_musicales')
        .select('id_video')
        .eq('youtube_id', video.video_id)
        .maybeSingle();

      if (existente && existente.id_video) {
        id_video = existente.id_video;
      } else {
        // Inserta en videos_musicales
        id_video = await insertVideoMusical(video);
      }

      // Solo agrega si no está en la colección
      if (!existentes.has(id_video)) {
        // Relacionar artista principal
        const artistaId = await insertOrUpdateArtistByName(video.artista_principal);
        await relateVideoArtists(id_video, [artistaId]);

        await supabase.from('colecciones_elementos').upsert({
          coleccion_id: coleccionId,
          entidad_tipo: 'video',
          entidad_id: id_video
        }, { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] });

        await relateVideoGenres(id_video, video.titulo_limpio, [artistaId]);
      }
    }
  }
};