const supabase = require('../../supabaseClient');
const { getSpotifyApi, initializeToken } = require('../config/spotifyAuth');
const {
  insertOrUpdateTrack,
  insertOrUpdateAlbum,
  insertOrUpdateArtist,
  addTrackToCollection,
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

const STAGES = {
  TRACKS: 'track-processing',
  ARTIST_POPULARITY: 'artist-popularity',
  ALBUM_POPULARITY: 'album-popularity',
  TRACK_POPULARITY: 'track-popularity',
  ARTIST_GENRES: 'artist-genres',
  ALBUM_GENRES: 'album-genres',
  SONG_GENRES: 'song-genres',
};

async function getCollectionEntityIds(coleccionId) {
  const { data: coleccionTracks, error: coleccionTracksError } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'cancion');
  if (coleccionTracksError) throw coleccionTracksError;

  const trackIds = (coleccionTracks || []).map(item => item.entidad_id).filter(Boolean);
  if (trackIds.length === 0) {
    return { trackIds: [], albumIds: [], artistIds: [] };
  }

  const { data: songs, error: songsError } = await supabase
    .from('canciones')
    .select('id_cancion, album')
    .in('id_cancion', trackIds);
  if (songsError) throw songsError;

  const albumIds = [...new Set((songs || []).map(song => song.album).filter(Boolean))];

  const { data: relations, error: relationsError } = await supabase
    .from('cancion_artistas')
    .select('artista_id')
    .in('cancion_id', trackIds);
  if (relationsError) throw relationsError;

  const artistIds = [...new Set((relations || []).map(rel => rel.artista_id).filter(Boolean))];
  return { artistIds, albumIds, trackIds };
}

async function executeStage(checkpointKey, stage, ids) {
  await setCheckpoint(checkpointKey, {
    stage,
    status: 'in-progress',
    details: {
      artistCount: ids.artistIds?.length || 0,
      albumCount: ids.albumIds?.length || 0,
      trackCount: ids.trackIds?.length || 0,
    },
    updated_at: Date.now(),
  });

  switch (stage) {
    case STAGES.ARTIST_POPULARITY:
      await updateArtistsPopularityAndPhotosByIds(ids.artistIds);
      break;
    case STAGES.ALBUM_POPULARITY:
      await updateAlbumsPopularityByIds(ids.albumIds);
      break;
    case STAGES.TRACK_POPULARITY:
      await updateTracksPopularityByIds(ids.trackIds);
      break;
    case STAGES.ARTIST_GENRES:
      await updateArtistGenresByIds(ids.artistIds);
      break;
    case STAGES.ALBUM_GENRES:
      await updateAlbumGenresByIds(ids.albumIds);
      break;
    case STAGES.SONG_GENRES:
      await updateSongGenresByIds(ids.trackIds);
      break;
    default:
      throw new Error(`Etapa desconocida: ${stage}`);
  }

  await setCheckpoint(checkpointKey, {
    stage,
    status: 'done',
    details: {
      artistCount: ids.artistIds?.length || 0,
      albumCount: ids.albumIds?.length || 0,
      trackCount: ids.trackIds?.length || 0,
    },
    updated_at: Date.now(),
  });
}

// Procesar playlist y crear/actualizar colección
const processSpotifyPlaylist = async (playlistId) => {
  await initializeToken();
  const spotifyApi = getSpotifyApi();
  // Obtener detalles de la playlist
  const playlistData = await safeSpotifyCall(() => spotifyApi.getPlaylist(playlistId));
  const nombre = playlistData.body.name;
  const descripcion = playlistData.body.description;
  const foto = playlistData.body.images?.[0]?.url || null;

  // Buscar colección existente o crearla
  let { data: collection } = await supabase
    .from('colecciones')
    .select('id_coleccion')
    .eq('playlist_id', playlistId)
    .maybeSingle();

  let collectionId;
  if (!collection) {
    const { data: newCollection, error: newColeccionError } = await supabase
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
    if (newColeccionError) throw newColeccionError;
    collectionId = newCollection.id_coleccion;
  } else {
    collectionId = collection.id_coleccion;
  }

  return await updateCollectionFromPlaylist(collectionId);
};

// Actualizar colección existente desde playlist (solo agrega nuevas canciones)
const updateCollectionFromPlaylist = async (coleccionId) => {
  await initializeToken();

  const { data: collection, error: collectionError } = await supabase
    .from('colecciones')
    .select('playlist_id')
    .eq('id_coleccion', coleccionId)
    .single();

  if (collectionError) throw collectionError;
  if (!collection || !collection.playlist_id) {
    throw new Error('Colección no tiene playlist_id');
  }

  const spotifyApi = getSpotifyApi();
  const tracks = await safeSpotifyCall(() => getPlaylistTracks(spotifyApi, collection.playlist_id));
  console.log(`✅ Playlist ${collection.playlist_id} descargada: ${tracks.length} tracks.`);

  const checkpointKey = `collection_playlist_${coleccionId}`;
  const checkpoint = await getCheckpoint(checkpointKey);
  let stage = checkpoint?.stage || STAGES.TRACKS;
  let startIndex = 0;
  if (stage === STAGES.TRACKS && checkpoint && typeof checkpoint.index === 'number') {
    startIndex = checkpoint.index + 1;
  }
  if (stage !== STAGES.TRACKS) {
    startIndex = tracks.length;
  }

  const existingTrackEntities = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'cancion');

  const existentesEntidadIds = (existingTrackEntities.data || []).map(e => e.entidad_id);
  const existentes = new Set();
  if (existentesEntidadIds.length > 0) {
    const { data: cancionesEnColeccion } = await supabase
      .from('canciones')
      .select('id_cancion, spotify_id')
      .in('id_cancion', existentesEntidadIds);
    if (cancionesEnColeccion) cancionesEnColeccion.forEach(c => existentes.add(c.spotify_id));
  }

  let processed = 0;
  if (stage === STAGES.TRACKS) {
    console.log(`📍 Iniciando procesamiento de colección ${coleccionId}: ${tracks.length} canciones total. Resumiendo desde índice ${startIndex}.`);
    for (let i = startIndex; i < tracks.length; i++) {
      const item = tracks[i];
      const track = item.track;
      if (!track || !track.id) continue;

      try {
        await setCheckpoint(checkpointKey, {
          stage: STAGES.TRACKS,
          index: i,
          spotify_id: track.id,
          status: 'in-progress',
          started_at: Date.now(),
        });
      } catch (e) {
        console.warn('⚠️ No se pudo escribir checkpoint (inicio) para coleccion', coleccionId, e.message || e);
      }

      try {
        if (!existentes.has(track.id)) {
          const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
          const albumId = albumData.id_album;
          const artistIds = [];
          for (const artist of track.artists) {
            const artistId = await insertOrUpdateArtist(artist);
            artistIds.push(artistId);
          }

          const trackId = await insertOrUpdateTrack(track, albumId, 'coleccion');
          for (const artistId of artistIds) {
            await supabase.from('cancion_artistas').upsert({
              cancion_id: trackId,
              artista_id: artistId,
            }, { onConflict: ['cancion_id', 'artista_id'] });
          }

          await addTrackToCollection(trackId, coleccionId);
        } else {
          const { data: existingSong } = await supabase
            .from('canciones')
            .select('id_cancion')
            .eq('spotify_id', track.id)
            .maybeSingle();
          if (existingSong && existingSong.id_cancion) {
            const trackId = existingSong.id_cancion;
            const albumData = await insertOrUpdateAlbum(track.album, 'coleccion');
            const artistIds = [];
            for (const artist of track.artists) {
              const artistId = await insertOrUpdateArtist(artist);
              artistIds.push(artistId);
            }
            for (const artistId of artistIds) {
              await supabase.from('cancion_artistas').upsert({
                cancion_id: trackId,
                artista_id: artistId,
              }, { onConflict: ['cancion_id', 'artista_id'] });
            }
          }
        }

        await setCheckpoint(checkpointKey, {
          stage: STAGES.TRACKS,
          index: i,
          spotify_id: track.id,
          status: 'done',
          updated_at: Date.now(),
        });
        processed++;
      } catch (err) {
        console.error(`❌ Error procesando track en index ${i}, spotify_id ${track.id}:`, err.message || err);
        try {
          await setCheckpoint(checkpointKey, {
            stage: STAGES.TRACKS,
            index: i,
            spotify_id: track.id,
            error: String(err),
            updated_at: Date.now(),
          });
        } catch (e) {}
        throw err;
      }
    }

    await setCheckpoint(checkpointKey, {
      stage: STAGES.ARTIST_POPULARITY,
      status: 'pending',
      processedTracks: processed,
      totalTracks: tracks.length,
      updated_at: Date.now(),
    });
    stage = STAGES.ARTIST_POPULARITY;
  }

  const ids = await getCollectionEntityIds(coleccionId);

  const orderedStages = [
    STAGES.ARTIST_POPULARITY,
    STAGES.ALBUM_POPULARITY,
    STAGES.TRACK_POPULARITY,
    STAGES.ARTIST_GENRES,
    STAGES.ALBUM_GENRES,
    STAGES.SONG_GENRES,
  ];

  let currentStageIndex = orderedStages.indexOf(stage);
  if (currentStageIndex === -1) currentStageIndex = 0;

  for (let stageIndex = currentStageIndex; stageIndex < orderedStages.length; stageIndex++) {
    const currentStage = orderedStages[stageIndex];
    await executeStage(checkpointKey, currentStage, ids);
  }

  console.log(`\n🎉 Procesamiento completo de colección ${coleccionId}. Limpiando checkpoint...`);
  try { await clearCheckpoint(checkpointKey); } catch (e) {}
  return ids;
};

module.exports = {
  processSpotifyPlaylist,
  updateCollectionFromPlaylist,
};