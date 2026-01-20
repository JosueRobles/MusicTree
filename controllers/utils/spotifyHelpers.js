const axios = require('axios');
const { getSpotifyApi, initializeToken } = require('../config/spotifyAuth'); // <-- AGREGA initializeToken
const supabase = require('../../supabaseClient');
const { insertOrUpdateAlbum, insertOrUpdateTrack, insertOrUpdateArtist, linkAlbumWithArtist } = require('./supabaseHelpers');
const { getCheckpoint, setCheckpoint, clearCheckpoint } = require('./checkpoint');
const {
  updateArtistsPopularityAndPhotosByIds,
  updateAlbumsPopularityByIds,
  updateTracksPopularityByIds,
  updateArtistGenresByIds,
  updateAlbumGenresByIds,
  updateSongGenresByIds,
} = require('../handlers/batchUpdateHandler');
const { getArtistDetails } = require('./spotifyApiHelpers');
const { safeSpotifyCall } = require('./spotifySafeCall');

async function getPlaylistTracks(spotifyApi, playlistId) {
  try {
    const data = await spotifyApi.getPlaylist(playlistId);
    const totalTracks = data.body.tracks.total;
    const tracks = [];

    let offset = 0;
    const limit = 100;

    while (offset < totalTracks) {
      const response = await safeSpotifyCall(() => spotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit
      }));
      tracks.push(...response.body.items);
      offset += limit;
    }

    return tracks;
  } catch (error) {
    console.error("Error al procesar playlist:", error);
    throw error;
  }
}

async function getArtistFromSpotify(name) {
  const data = await spotifyApi.searchArtists(name);
  return data.body.artists.items[0];
}

async function getAlbumsFromArtist(artistId) {
  const spotifyApi = getSpotifyApi();
  const albums = await safeSpotifyCall(() => spotifyApi.getArtistAlbums(artistId, { limit: 50 }));
  return albums.body.items;
}

async function getTracksFromAlbum(albumId) {
  const spotifyApi = getSpotifyApi();
  const albums = await safeSpotifyCall(() => spotifyApi.getAlbumTracks(albumId, { limit: 50 }));
  return albums.body.items;
}

async function importFullArtistCatalog(spotifyId, id_artista = null) {
  console.log(`📀 Importando catálogo para artista Spotify ID: ${spotifyId}`);

  // 1. Obtener el id_artista interno si no lo tienes
  if (!id_artista) {
    const { data, error } = await supabase
      .from('artistas')
      .select('id_artista')
      .eq('spotify_id', spotifyId)
      .single();
    if (error || !data) throw new Error(`No se encontró el artista con spotify_id: ${spotifyId}`);
    id_artista = data.id_artista;
  }

  // 2. Inicializar sets para acumulación
  const newArtistIds = new Set();
  const newAlbumIds = new Set();
  const newTrackIds = new Set();

  // 3. Obtener todos los álbumes del artista desde Spotify
  const spotifyApi = getSpotifyApi();
  await initializeToken();
  const albums = await safeSpotifyCall(() => spotifyApi.getArtistAlbums(spotifyId, { limit: 50 }));
  const albumItems = albums.body.items;

  for (const album of albumItems) {
    const albumData = await insertOrUpdateAlbum(album, 'catalogo');
    const albumId = albumData.id_album;
    newAlbumIds.add(albumId);

    const artistIds = [];

    // 4. Obtener todos los artistas del álbum y vincularlos
    for (const artist of album.artists) {
      const relatedArtistId = await insertOrUpdateArtist({
        id: artist.id,
        name: artist.name,
        images: [],
        popularity: 0
      });
      artistIds.push(relatedArtistId);
      newArtistIds.add(relatedArtistId);
      await linkAlbumWithArtist(albumId, relatedArtistId);
    }

    // 5. Obtener todas las canciones del álbum
    await initializeToken();
    const tracksData = await safeSpotifyCall(() => spotifyApi.getAlbumTracks(album.id));
    const tracks = tracksData.body.items;

    for (const track of tracks) {
      const trackId = await insertOrUpdateTrack(track, albumId);
      newTrackIds.add(trackId);

      for (const artist of track.artists) {
        const relatedArtistId = await insertOrUpdateArtist({
          id: artist.id,
          name: artist.name,
          images: [],
          popularity: 0
        });
        newArtistIds.add(relatedArtistId);

        await supabase.from('cancion_artistas').upsert({
          cancion_id: trackId,
          artista_id: relatedArtistId
        }, { onConflict: ['cancion_id', 'artista_id'] });
      }
    }
  }

  // 6. Actualizaciones por lote
  await updateArtistsPopularityAndPhotosByIds([...newArtistIds]);
  await updateAlbumsPopularityByIds([...newAlbumIds]);
  await updateTracksPopularityByIds([...newTrackIds]);
  await updateArtistGenresByIds([...newArtistIds]);
  await updateAlbumGenresByIds([...newAlbumIds]);
  await updateSongGenresByIds([...newTrackIds]);

  console.log(`✅ Catálogo completo importado y relaciones creadas para artista: ${spotifyId}`);

  // Al final, retorna los IDs modificados
  return {
    artistIds: [...newArtistIds],
    albumIds: [...newAlbumIds],
    trackIds: [...newTrackIds]
  };
}

const updateMissingFromArtistCatalog = async (spotifyId, id_artista) => {
  console.log(`🔍 Iniciando actualización de catálogo del artista: ${spotifyId}`);

  const spotifyApi = getSpotifyApi();
  await initializeToken();

  // Obtener álbumes existentes en tu DB
  const { data: existingAlbums } = await supabase
    .from('albumes')
    .select('spotify_id')
    .eq('id_artista_principal', id_artista);

  const existingAlbumIds = new Set((existingAlbums || []).map(a => a.spotify_id));
  console.log(`📊 Álbumes existentes encontrados: ${existingAlbumIds.size}`);

  const newArtistIds = new Set();
  const newAlbumIds = new Set();
  const newTrackIds = new Set();

  const albums = await safeSpotifyCall(() =>
    spotifyApi.getArtistAlbums(spotifyId, { limit: 50 })
  );
  const albumItems = albums.body.items || [];
  console.log(`🎵 Total de álbumes en Spotify: ${albumItems.length}`);

  const checkpointKey = `artist_catalog_${id_artista}`;
  const checkpoint = await getCheckpoint(checkpointKey);
  const startAlbum = checkpoint && typeof checkpoint.albumIndex === 'number' ? checkpoint.albumIndex : 0;
  const startTrackForAlbum = checkpoint && typeof checkpoint.trackIndex === 'number' ? checkpoint.trackIndex : null;

  if (checkpoint) {
    console.log(`🔄 Reanudando desde álbum ${startAlbum}, track ${startTrackForAlbum || 0}`);
  }

  for (let a = startAlbum; a < albumItems.length; a++) {
    const album = albumItems[a];
    if (existingAlbumIds.has(album.id)) {
      console.log(`⏭️ Álbum existente, saltando: ${album.name}`);
      continue;
    }

    console.log(`\n📀 Procesando álbum [${a + 1}/${albumItems.length}]: ${album.name}`);

    const albumData = await insertOrUpdateAlbum(album, 'catalogo');
    const albumId = albumData.id_album;
    newAlbumIds.add(albumId);
    console.log(`  ✓ Álbum insertado/actualizado (ID: ${albumId})`);

    for (const artist of album.artists) {
      const relatedArtistId = await insertOrUpdateArtist({
        id: artist.id,
        name: artist.name,
        images: [],
        popularity: 0,
      });
      newArtistIds.add(relatedArtistId);
      await linkAlbumWithArtist(albumId, relatedArtistId);
      console.log(`    ✓ Artista: ${artist.name} (ID: ${relatedArtistId})`);
    }

    const tracksData = await safeSpotifyCall(() =>
      spotifyApi.getAlbumTracks(album.id)
    );
    const tracks = tracksData.body.items || [];
    console.log(`  🎶 Canciones en álbum: ${tracks.length}`);

    let tStart = 0;
    if (a === startAlbum && startTrackForAlbum !== null) {
      tStart = startTrackForAlbum + 1;
      console.log(`  🔄 Reanudando tracks desde índice ${tStart}`);
    }

    for (let t = tStart; t < tracks.length; t++) {
      const track = tracks[t];
      const trackId = await insertOrUpdateTrack(track, albumId);
      newTrackIds.add(trackId);

      for (const artist of track.artists) {
        const relatedArtistId = await insertOrUpdateArtist({
          id: artist.id,
          name: artist.name,
          images: [],
          popularity: 0,
        });
        newArtistIds.add(relatedArtistId);

        await supabase.from('cancion_artistas').upsert({
          cancion_id: trackId,
          artista_id: relatedArtistId,
        }, { onConflict: ['cancion_id', 'artista_id'] });
      }

      // checkpoint after processing this track
      try {
        await setCheckpoint(checkpointKey, { albumIndex: a, trackIndex: t, albumSpotifyId: album.id, spotifyTrackId: track.id, updated_at: Date.now() });
      } catch (e) {
        console.warn('⚠️ Error escribiendo checkpoint para artista', id_artista, e.message || e);
      }
    }
  }

  // 🎯 Batch updates con logs detallados
  console.log(`\n🎯 Iniciando actualizaciones por lotes...`);
  console.log(`   📊 Artistas a actualizar: ${newArtistIds.size}, Álbumes: ${newAlbumIds.size}, Canciones: ${newTrackIds.size}`);

  console.log(`🔄 Actualizando popularidad y fotos de artistas...`);
  await updateArtistsPopularityAndPhotosByIds([...newArtistIds]);
  console.log(`✅ Popularidad/fotos de artistas actualizada`);

  console.log(`🔄 Actualizando popularidad de álbumes...`);
  await updateAlbumsPopularityByIds([...newAlbumIds]);
  console.log(`✅ Popularidad de álbumes actualizada`);

  console.log(`🔄 Actualizando popularidad de canciones...`);
  await updateTracksPopularityByIds([...newTrackIds]);
  console.log(`✅ Popularidad de canciones actualizada`);

  console.log(`🔄 Buscando géneros de artistas...`);
  await updateArtistGenresByIds([...newArtistIds]);
  console.log(`✅ Géneros de artistas procesados`);

  console.log(`🔄 Buscando géneros de álbumes...`);
  await updateAlbumGenresByIds([...newAlbumIds]);
  console.log(`✅ Géneros de álbumes procesados`);

  console.log(`🔄 Buscando géneros de canciones...`);
  await updateSongGenresByIds([...newTrackIds]);
  console.log(`✅ Géneros de canciones procesados`);

  console.log(`\n✅ Catálogo del artista completado: ${spotifyId}`);
  
  // Cleanup checkpoint
  try { await clearCheckpoint(checkpointKey); } catch (e) {}

  // Al final, retorna los IDs modificados
  return {
    artistIds: [...newArtistIds],
    albumIds: [...newAlbumIds],
    trackIds: [...newTrackIds]
  };
};

async function getArtistsFromPlaylist(playlistId) {
  const data = await safeSpotifyCall(() => spotifyApi.getPlaylistTracks(playlistId));
  const tracks = data.body.items;
  const artists = [];

  for (const item of tracks) {
    if (item.track && item.track.artists.length > 0) {
      artists.push(...item.track.artists);
    }
  }

  return [...new Map(artists.map(a => [a.id, a])).values()];
}

async function syncAlbumArtists(albumSpotifyId) {
  try {
    const spotifyApi = getSpotifyApi();
    await safeSpotifyCall(() => spotifyApi.getAlbum(albumSpotifyId));

    // Validar si album.artists es un array
    if (!Array.isArray(album.artists) || album.artists.length === 0) {
      console.warn(`⚠️ El álbum ${album.name} no tiene artistas asociados.`);
      return;
    }

    // Procesar los artistas del álbum
    const artistIds = [];
    for (const artist of album.artists) {
      const artistId = await insertOrUpdateArtist(artist);
      artistIds.push(artistId);
    }

    // Actualizar las relaciones álbum-artista en la base de datos
    await supabase.from('album_artistas').upsert(
      artistIds.map(artistId => ({
        album_id: album.id_album, // ID interno del álbum (relación interna)
        artista_id: artistId,
      })),
      { onConflict: ['album_id', 'artista_id'] } // Evitar duplicados
    );

    console.log(`✅ Relaciones álbum-artistas sincronizadas para el álbum: ${album.name}`);
  } catch (error) {
    console.error(`❌ Error al sincronizar álbum-artistas para el álbum ${albumSpotifyId}:`, error.message || error);
  }
}

// Obtener los artistas de un álbum desde la API de Spotify
async function getAlbumArtistsFromAPI(albumSpotifyId) {
  try {
    // Obtener detalles del álbum desde la API de Spotify
    const spotifyApi = getSpotifyApi();
    const albumData = await safeSpotifyCall(() => spotifyApi.getAlbum(albumSpotifyId));

    // Validar si albumData.artists es un array
    if (!Array.isArray(albumData.body.artists) || albumData.body.artists.length === 0) {
      console.warn(`⚠️ El álbum ${albumData.body.name} no tiene artistas asociados.`);
      return [];
    }

    return albumData.body.artists; // Devuelve la lista de artistas
  } catch (error) {
    console.error(`❌ Error al obtener artistas del álbum ${albumSpotifyId}:`, error.message || error);
    throw error;
  }
}

/*(async () => {
  const artistEntries = [
  ];

  const failedArtists = await processArtistList(artistEntries);

  if (failedArtists.length > 0) {
    console.log("🔄 Reprocesando artistas fallidos...");
    await processArtistList(failedArtists);
  }
})();*/

async function processArtistList(artistEntries) {
  const spotifyApi = getSpotifyApi(); // ← ESTA LÍNEA FUNCIONA GRACIAS A LA IMPORTACIÓN
  const failedArtists = [];

  for (const entry of artistEntries) {
    try {
      const isSpotifyId = /^[a-zA-Z0-9]{22}$/.test(entry);
      let artist;

      if (isSpotifyId) {
        console.log(`🔍 Buscando detalles para Spotify ID: ${entry}`);
        artist = await getArtistDetails(entry, spotifyApi); // Pásalo como argumento
        if (!artist) {
          throw new Error(`No se encontró un nombre válido para el ID: ${entry}`);
        }
      } else {
        console.log(`🔍 Buscando artista por nombre: ${entry}`);
        const result = await spotifyApi.searchArtists(entry);
        artist = result.body.artists.items[0];
        if (!artist || !artist.name) {
          throw new Error(`No se encontró un artista válido para el nombre: ${entry}`);
        }
      }

      console.log(`🎤 Artista encontrado: ${artist.name} (${entry})`);
      const artistId = await insertOrUpdateArtist({
        id: entry,
        name: artist.name,
        popularity: artist.popularity,
        images: artist.images,
      });

      if (!artistId) {
        throw new Error(`Fallo al insertar o actualizar el artista ${entry}`);
      }

      console.log(`✅ Artista procesado: ${artist.name} - ID en BD: ${artistId}`);
    } catch (err) {
      console.error(`❌ Error al procesar al artista ${entry}:`, err.message || err);
      failedArtists.push(entry);
    }
  }

  console.log(`📋 Lista de IDs fallidos: ${failedArtists.join(', ')}`);
  return failedArtists;
}

module.exports = {
  processArtistList,
  getAlbumArtistsFromAPI, // Nuevo helper exportado
  getArtistFromSpotify,
  getAlbumsFromArtist,
  getTracksFromAlbum,
  getArtistsFromPlaylist,
  getPlaylistTracks,
  syncAlbumArtists,
  importFullArtistCatalog,
  updateMissingFromArtistCatalog,
};
