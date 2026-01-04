const supabase = require('../../supabaseClient');
const { getSpotifyApi, initializeToken } = require('../config/spotifyAuth');
const {
  insertOrUpdateTrack,
  insertOrUpdateAlbum,
  insertOrUpdateArtist,
  addTrackToCollection,
  createOrGetCollection,
  trackExistsInDB, // <-- AGREGA ESTO
  linkAlbumWithArtist // <-- Útil para relaciones
} = require('../utils/supabaseHelpers');
const { getPlaylistTracks, } = require('../utils/spotifyHelpers');
const { getCheckpoint, setCheckpoint, clearCheckpoint } = require('../utils/checkpoint');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');
const { updateArtistPopularity, updateAlbumPopularity } = require('../utils/supabaseHelpers');
const {
  updateArtistsPopularityAndPhotosByIds,
  updateAlbumsPopularityByIds,
  updateTracksPopularityByIds,
  updateArtistGenresByIds,
  updateAlbumGenresByIds,
  updateSongGenresByIds,
} = require('./batchUpdateHandler');
const { safeSpotifyCall } = require('../utils/spotifySafeCall');

// Procesar playlist y crear/actualizar colección
const processSpotifyPlaylist = async (playlistId) => {
  await initializeToken();
  const spotifyApi = getSpotifyApi();
  // Obtener detalles de la playlist
  const playlistData = await safeSpotifyCall(() => spotifyApi.getPlaylist(playlistId));
  const nombre = playlistData.body.name;
  const descripcion = playlistData.body.description;
  const foto = playlistData.body.images?.[0]?.url || null;

  // Buscar colección existente
  let { data: collection } = await supabase
    .from('colecciones')
    .select('id_coleccion')
    .eq('playlist_id', playlistId)
    .maybeSingle();

  let collectionId;
  if (!collection) {
    const { data: newCollection } = await supabase
      .from('colecciones')
      .insert({
        nombre,
        descripcion,
        icono: foto,
        tipo_coleccion: 'canciones',
        playlist_id: playlistId,
      })
      .select('id_coleccion')
      .single();
    collectionId = newCollection.id_coleccion;
  } else {
    collectionId = collection.id_coleccion;
  }

  const newArtistIds = new Set();
  const newAlbumIds = new Set();
  const newTrackIds = new Set();

  const tracks = await safeSpotifyCall(() => getPlaylistTracks(spotifyApi, playlistId));

  for (const item of tracks) {
    const track = item.track;
    if (!track || !track.id) continue;

    // Inserta el álbum primero
    const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
    const albumId = albumData.id_album;
    newAlbumIds.add(albumId);

    // Inserta artistas y relaciones
    const artistIds = [];
    for (const artist of track.artists) {
      const artistId = await insertOrUpdateArtist(artist);
      artistIds.push(artistId);
      newArtistIds.add(artistId);
      await buscarGenerosDeArtista(artistId, artist.name);
      await updateArtistPopularity(artistId, artist.popularity || 0);
    }

    const albumArtists = track.album.artists || [];
    for (const artist of albumArtists) {
      const artistId = await insertOrUpdateArtist(artist);
      await linkAlbumWithArtist(albumId, artistId);
    }

    // Inserta la canción
    const trackId = await insertOrUpdateTrack(track, albumId, 'coleccion');
    newTrackIds.add(trackId);

    for (const artistId of artistIds) {
      await supabase.from('cancion_artistas').upsert({
        cancion_id: trackId,
        artista_id: artistId,
      }, { onConflict: ['cancion_id', 'artista_id'] });
    }

    await addTrackToCollection(trackId, collectionId);

    await updateAlbumPopularity(albumId, track.album.popularity || 0);
    await buscarGenerosDeAlbumOCancion('cancion', trackId, track.name);
    await buscarGenerosDeAlbumOCancion('album', albumId, track.album.name);
  }

  // Al final, actualiza solo los nuevos/modificados
  await updateArtistsPopularityAndPhotosByIds([...newArtistIds]);
  await updateAlbumsPopularityByIds([...newAlbumIds]);
  await updateTracksPopularityByIds([...newTrackIds]);
  await updateArtistGenresByIds([...newArtistIds]);
  await updateAlbumGenresByIds([...newAlbumIds]);
  await updateSongGenresByIds([...newTrackIds]);
  
  // Al final, retorna los IDs modificados
  return {
    artistIds: [...newArtistIds],
    albumIds: [...newAlbumIds],
    trackIds: [...newTrackIds]
  };
};

// Actualizar colección existente desde playlist (solo agrega nuevas canciones)
const updateCollectionFromPlaylist = async (coleccionId) => {
  await initializeToken();

  const { data: collection } = await supabase
    .from('colecciones')
    .select('playlist_id')
    .eq('id_coleccion', coleccionId)
    .single();

  if (!collection || !collection.playlist_id) {
    throw new Error('Colección no tiene playlist_id');
  }

  const spotifyApi = getSpotifyApi();
  const tracks = await safeSpotifyCall(() => getPlaylistTracks(spotifyApi, collection.playlist_id));

  const checkpointKey = `collection_playlist_${coleccionId}`;
  const checkpoint = await getCheckpoint(checkpointKey);
  let startIndex = 0;
  if (checkpoint && typeof checkpoint.index === 'number') startIndex = checkpoint.index + 1;

  const { data: elementos } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'cancion');

  // elementos.entidad_id almacena el id interno de la canción (id_cancion)
  const existentesEntidadIds = (elementos || []).map(e => e.entidad_id);
  const existentes = new Set(); // Spotify IDs ya presentes en la colección
  if (existentesEntidadIds.length > 0) {
    const { data: cancionesEnColeccion } = await supabase
      .from('canciones')
      .select('id_cancion, spotify_id')
      .in('id_cancion', existentesEntidadIds);
    if (cancionesEnColeccion) cancionesEnColeccion.forEach(c => existentes.add(c.spotify_id));
  }

  const existentesAlbums = new Set();
  const existentesArtists = new Set();

  // Obtener álbumes y artistas ya relacionados con la colección
  const { data: albumRel } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'album');
  if (albumRel) albumRel.forEach(a => existentesAlbums.add(a.entidad_id));

  const { data: artistRel } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'artista');
  if (artistRel) artistRel.forEach(a => existentesArtists.add(a.entidad_id));

  const newArtistIds = new Set();
  const newAlbumIds = new Set();
  const newTrackIds = new Set();

  // 1. Agregar nuevas canciones (resume desde checkpoint si existe)
  let count = startIndex + 1;
  for (let i = startIndex; i < tracks.length; i++) {
    const item = tracks[i];
    const track = item.track;
    if (!track || !track.id || existentes.has(track.id)) continue;

    console.log(`🎶 [${count}/${tracks.length}] Añadiendo nueva canción: ${track.name}`);

    // Solo procesa los nuevos
    const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
    const albumId = albumData.id_album;
    newAlbumIds.add(albumId);

    const artistIds = [];
    for (const artist of track.artists) {
      const artistId = await insertOrUpdateArtist(artist);
      artistIds.push(artistId);
      newArtistIds.add(artistId);
    }

    const trackId = await insertOrUpdateTrack(track, albumId, 'coleccion');
    newTrackIds.add(trackId);

    for (const artistId of artistIds) {
      await supabase.from('cancion_artistas').upsert({
        cancion_id: trackId,
        artista_id: artistId,
      }, { onConflict: ['cancion_id', 'artista_id'] });
    }

    // Añade SOLO la canción a la colección (no artistas/álbumes)
    await addTrackToCollection(trackId, coleccionId);

    // Actualiza checkpoint después de procesar esta canción
    try {
      await setCheckpoint(checkpointKey, { index: i, spotify_id: track.id, updated_at: Date.now() });
    } catch (e) {
      console.warn('No se pudo escribir checkpoint para coleccion', coleccionId, e.message || e);
    }
    count++;
  }

    // Procesar todas las canciones en un único bucle (resume-friendly)
    for (let i = startIndex; i < tracks.length; i++) {
      const item = tracks[i];
      const track = item.track;
      if (!track || !track.id) continue;

      try {
        if (!existentes.has(track.id)) {
          console.log(`🎶 [${count}/${tracks.length}] Añadiendo nueva canción: ${track.name}`);

          const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
          const albumId = albumData.id_album;
          newAlbumIds.add(albumId);

          const artistIds = [];
          for (const artist of track.artists) {
            const artistId = await insertOrUpdateArtist(artist);
            artistIds.push(artistId);
            newArtistIds.add(artistId);
          }

          const trackId = await insertOrUpdateTrack(track, albumId, 'coleccion');
          newTrackIds.add(trackId);

          for (const artistId of artistIds) {
            await supabase.from('cancion_artistas').upsert({
              cancion_id: trackId,
              artista_id: artistId,
            }, { onConflict: ['cancion_id', 'artista_id'] });
          }

          // Añade SOLO la canción a la colección (no artistas/álbumes)
          await addTrackToCollection(trackId, coleccionId);
        } else {
          console.log(`🔁 Actualizando canción existente: ${track.name}`);

          // Obtener id interno de la canción por spotify_id
          const { data: existingSong } = await supabase
            .from('canciones')
            .select('id_cancion')
            .eq('spotify_id', track.id)
            .maybeSingle();
          if (!existingSong || !existingSong.id_cancion) {
            // nothing to update
          } else {
            const trackId = existingSong.id_cancion;
            newTrackIds.add(trackId);

            const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
            const albumId = albumData.id_album;
            newAlbumIds.add(albumId);

            const artistIds = [];
            for (const artist of track.artists) {
              const artistId = await insertOrUpdateArtist(artist);
              artistIds.push(artistId);
              newArtistIds.add(artistId);
            }

            for (const artistId of artistIds) {
              await supabase.from('cancion_artistas').upsert({
                cancion_id: trackId,
                artista_id: artistId,
              }, { onConflict: ['cancion_id', 'artista_id'] });
            }
          }
        }

        // Actualiza checkpoint después de procesar esta canción
        try {
          await setCheckpoint(checkpointKey, { index: i, spotify_id: track.id, updated_at: Date.now() });
        } catch (e) {
          console.warn('No se pudo escribir checkpoint para coleccion', coleccionId, e.message || e);
        }
      } catch (err) {
        console.error('Error procesando track en index', i, 'spotify_id', track.id, err.message || err);
        // en caso de error, escribir checkpoint y re-throw para que el caller note el problema
        try { await setCheckpoint(checkpointKey, { index: i, spotify_id: track.id, error: String(err), updated_at: Date.now() }); } catch (e) {}
        throw err;
      }

      count++;
    }

  // 3. Llamar a los updates por lotes solo para los nuevos o modificados
  await updateArtistsPopularityAndPhotosByIds([...newArtistIds]);
  await updateAlbumsPopularityByIds([...newAlbumIds]);
  await updateTracksPopularityByIds([...newTrackIds]);
  await updateArtistGenresByIds([...newArtistIds]);
  await updateAlbumGenresByIds([...newAlbumIds]);
  await updateSongGenresByIds([...newTrackIds]);
  
  // Al final, retorna los IDs modificados
  // Limpia checkpoint si terminó correctamente
  try { await clearCheckpoint(checkpointKey); } catch (e) {}
  return {
    artistIds: [...newArtistIds],
    albumIds: [...newAlbumIds],
    trackIds: [...newTrackIds]
  };
};

module.exports = {
  processSpotifyPlaylist,
  updateCollectionFromPlaylist,
};