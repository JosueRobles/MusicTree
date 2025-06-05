const { getAlbumPopularity, getArtistDetails, getArtistPopularity } = require('../utils/spotifyHelpers');
const supabase = require('../../supabaseClient'); // Importar Supabase
const {
  updateAlbumPopularity,
  updateArtistPopularity,
  getAllAlbumsFromDB,
  getAllArtistsFromDB,
} = require('../utils/supabaseHelpers');

// Función para esperar un tiempo específico (para evitar sobrecargar la API)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Reintentar una función en caso de error
const retry = async (fn, retries = 3, delayMs = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Error en el intento ${attempt}:`, error.message || error);
      if (attempt < retries) {
        console.log(`Reintentando en ${delayMs} ms...`);
        await delay(delayMs);
      } else {
        throw error; // Lanza el error si se agotaron los reintentos
      }
    }
  }
};

// Actualiza la popularidad de un álbum y sus canciones
const updateAlbumAndTrackPopularity = async (albumId) => {
  console.log(`📊 Actualizando popularidad del álbum: ${albumId}`);
  const albumPopularity = await getAlbumPopularity(albumId);

  await updateAlbumPopularity(albumId, albumPopularity);

  console.log(`✅ Popularidad actualizada para álbum: ${albumId}`);
};

// Actualiza la popularidad de todos los álbumes en la base de datos
const updateAllAlbumPopularity = async () => {
  console.log("📊 Actualizando popularidad de todos los álbumes...");
  const albums = await getAllAlbumsFromDB(); // Obtener todos los álbumes desde la base de datos

  for (const album of albums) {
    try {
      console.log(`📊 Actualizando popularidad del álbum: ${album.id_album}`);
      
      // Obtener popularidad con reintentos
      const albumPopularity = await retry(() => getAlbumPopularity(album.spotify_id));

      // Validar y actualizar popularidad del álbum
      if (albumPopularity !== null && albumPopularity !== undefined) {
        await updateAlbumPopularity(album.id_album, albumPopularity);
        console.log(`✅ Popularidad actualizada para álbum: ${album.id_album}`);
      } else {
        console.warn(`⚠️ Popularidad no disponible para álbum: ${album.id_album}`);
        await updateAlbumPopularity(album.id_album, 0); // Valor por defecto
      }
    } catch (error) {
      console.error(`❌ Error al actualizar popularidad del álbum ${album.id_album}:`, error.message || error);
    }
  }

  console.log("✅ Popularidad actualizada para todos los álbumes.");
};

// Actualiza la popularidad y foto de todos los artistas en la base de datos
const updateAllArtistPopularityAndPhotos = async () => {
  console.log("📊 Actualizando popularidad y fotos de todos los artistas...");
  const artists = await getAllArtistsFromDB();

  for (const artist of artists) {
    try {
      console.log(`📊 Actualizando popularidad y foto del artista: ${artist.id_artista}`);
      
      // Obtener detalles del artista con reintentos
      const details = await retry(() => getArtistDetails(artist.spotify_id));

      // Actualizar popularidad y foto
      if (details) {
        await updateArtistPopularity(artist.id_artista, details.popularity || 0);
        if (details.images.length > 0) {
          await supabase
            .from('artistas')
            .update({ foto_artista: details.images[0]?.url })
            .eq('id_artista', artist.id_artista);
        }
        console.log(`✅ Popularidad y foto actualizadas para artista: ${artist.id_artista}`);
      } else {
        console.warn(`⚠️ Detalles no disponibles para artista: ${artist.id_artista}`);
      }
    } catch (error) {
      console.error(`❌ Error al actualizar popularidad y foto del artista ${artist.id_artista}:`, error.message || error);
    }
  }

  console.log("✅ Popularidad y fotos actualizadas para todos los artistas.");
};

// Función para actualizar la popularidad de todos los artistas con manejo de rate limit
const updateAllArtistPopularity = async () => {
  console.log("📊 Actualizando popularidad de todos los artistas...");

  // Obtener todos los artistas desde la base de datos
  const artists = await getAllArtistsFromDB();
  
  for (const artist of artists) {
    let retries = 0; // Contador de reintentos

    while (retries < 3) {
      try {
        // Obtener la popularidad del artista desde la API de Spotify
        const popularity = await getArtistPopularity(artist.spotify_id);

        // Actualizar la popularidad del artista en la base de datos
        await updateArtistPopularity(artist.id_artista, popularity);

        console.log(`✅ Popularidad actualizada: Artista ${artist.id_artista} (${artist.spotify_id}) - Popularidad: ${popularity}`);
        break; // Salir del bucle si la solicitud fue exitosa

      } catch (error) {
        if (error.statusCode === 429) {
          // Manejar rate limit: esperar el tiempo indicado en el encabezado 'retry-after'
          const retryAfter = Number(error.headers['retry-after']) || 1; // Valor predeterminado de 1 segundo
          console.warn(`⏳ Rate limit alcanzado. Esperando ${retryAfter} segundos antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Pausa
        } else {
          // Manejar otros errores
          console.error(`❌ Error al obtener popularidad del artista ${artist.spotify_id}:`, error.message || error);
          retries++;
          if (retries >= 3) {
            console.error(`❌ Error al actualizar popularidad del artista ${artist.id_artista}: ${error.message || error}`);
          }
        }
      }
    }
  }

  console.log("🎉 Actualización de popularidad de artistas completada.");
};

module.exports = {
  updateAllArtistPopularityAndPhotos,
  updateAlbumAndTrackPopularity,
  updateAllAlbumPopularity,
  updateAllArtistPopularity,
};
