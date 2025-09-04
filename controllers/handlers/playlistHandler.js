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

  const { data: elementos } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'cancion');

  const existentes = new Set((elementos || []).map(e => e.entidad_id));
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

  // 1. Agregar nuevas canciones
  let count = 1;
  for (const item of tracks) {
    const track = item.track;
    if (!track || !track.id || existentes.has(track.id)) continue;

    console.log(`🎶 [${count++}/${tracks.length}] Añadiendo nueva canción: ${track.name}`);

    // Solo procesa los nuevos
    const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
    const albumId = albumData.id_album;
    if (!existentesAlbums.has(albumId)) {
      // Relaciona el álbum con la colección si es nuevo
      await supabase.from('colecciones_elementos').upsert({
        coleccion_id: coleccionId,
        entidad_tipo: 'album',
        entidad_id: albumId
      }, { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] });
      existentesAlbums.add(albumId);
    }
    newAlbumIds.add(albumId);

    const artistIds = [];
    for (const artist of track.artists) {
      const artistId = await insertOrUpdateArtist(artist);
      artistIds.push(artistId);
      if (!existentesArtists.has(artistId)) {
        await supabase.from('colecciones_elementos').upsert({
          coleccion_id: coleccionId,
          entidad_tipo: 'artista',
          entidad_id: artistId
        }, { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] });
        existentesArtists.add(artistId);
      }
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

    await addTrackToCollection(trackId, coleccionId);
  }

  // 2. Actualizar existentes
  for (const item of tracks) {
    const track = item.track;
    if (!track || !track.id || !existentes.has(track.id)) continue;

    console.log(`🔁 Actualizando canción existente: ${track.name}`);

    const trackId = track.id;
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

  // 3. Llamar a los updates por lotes solo para los nuevos o modificados
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

module.exports = {
  processSpotifyPlaylist,
  updateCollectionFromPlaylist,
};