const { getArtistDetails, getAlbumPopularity, getTrackPopularity } = require('../utils/spotifyApiHelpers'); // AGREGA getTrackPopularity
const { getCheckpoint, setCheckpoint } = require('../utils/checkpoint');
const supabase = require('../../supabaseClient');
const { updateArtistPopularity, updateAlbumPopularity, updateTrackPopularity } = require('../utils/supabaseHelpers');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');

const STAGE_ORDER = ['artist-popularity', 'album-popularity', 'track-popularity', 'artist-genres', 'album-genres', 'song-genres', 'done'];

function getStageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

function shouldRunStage(checkpoint, stage) {
  if (!checkpoint || !checkpoint.stage) return true;
  const currentStage = checkpoint.stage;
  const currentIndex = getStageIndex(currentStage);
  const targetIndex = getStageIndex(stage);
  if (currentStage === stage) return true;
  return targetIndex > currentIndex;
}

async function updateCheckpointIfNeeded(checkpointKey, stage, currentIndex, currentId) {
  if (!checkpointKey) return;
  const checkpoint = await getCheckpoint(checkpointKey) || {};
  await setCheckpoint(checkpointKey, {
    ...checkpoint,
    stage,
    currentIndex,
    currentId,
    updated_at: Date.now(),
  });
}

// Popularidad y foto de artistas
async function updateArtistsPopularityAndPhotosByIds(artistIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'artist-popularity')) return;
  const startIndex = checkpoint && checkpoint.stage === 'artist-popularity' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < artistIds.length; i++) {
    const id = artistIds[i];
    try {
      const { data: artist } = await supabase
        .from('artistas')
        .select('spotify_id')
        .eq('id_artista', id)
        .single();
      if (!artist || !artist.spotify_id) {
        await updateCheckpointIfNeeded(checkpointKey, 'artist-popularity', i + 1, id);
        continue;
      }
      const details = await getArtistDetails(artist.spotify_id);
      if (details) {
        await updateArtistPopularity(id, details.popularity || 0);
        if (details.images.length > 0) {
          await supabase
            .from('artistas')
            .update({ foto_artista: details.images[0]?.url })
            .eq('id_artista', id);
        }
      }
      await updateCheckpointIfNeeded(checkpointKey, 'artist-popularity', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'artist-popularity', i, id);
        throw err;
      }
      console.error(`❌ Error en updateArtistsPopularityAndPhotosByIds para artista ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'artist-popularity', i + 1, id);
    }
  }
}

// Popularidad de álbumes
async function updateAlbumsPopularityByIds(albumIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'album-popularity')) return;
  const startIndex = checkpoint && checkpoint.stage === 'album-popularity' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < albumIds.length; i++) {
    const id = albumIds[i];
    try {
      const { data: album } = await supabase
        .from('albumes')
        .select('spotify_id')
        .eq('id_album', id)
        .single();
      if (!album || !album.spotify_id) {
        await updateCheckpointIfNeeded(checkpointKey, 'album-popularity', i + 1, id);
        continue;
      }
      const popularity = await getAlbumPopularity(album.spotify_id);
      await updateAlbumPopularity(id, popularity || 0);
      await updateCheckpointIfNeeded(checkpointKey, 'album-popularity', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'album-popularity', i, id);
        throw err;
      }
      console.error(`❌ Error en updateAlbumsPopularityByIds para álbum ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'album-popularity', i + 1, id);
    }
  }
}

// Popularidad de canciones (ahora sí la actualiza desde Spotify)
async function updateTracksPopularityByIds(trackIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'track-popularity')) return;
  const startIndex = checkpoint && checkpoint.stage === 'track-popularity' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < trackIds.length; i++) {
    const id = trackIds[i];
    try {
      const { data: song } = await supabase
        .from('canciones')
        .select('spotify_id')
        .eq('id_cancion', id)
        .single();
      if (!song || !song.spotify_id) {
        await updateCheckpointIfNeeded(checkpointKey, 'track-popularity', i + 1, id);
        continue;
      }
      const popularity = await getTrackPopularity(song.spotify_id);
      await updateTrackPopularity(id, popularity || 0);
      await updateCheckpointIfNeeded(checkpointKey, 'track-popularity', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'track-popularity', i, id);
        throw err;
      }
      console.error(`❌ Error en updateTracksPopularityByIds para canción ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'track-popularity', i + 1, id);
    }
  }
}

// Géneros de artistas
async function updateArtistGenresByIds(artistIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'artist-genres')) return;
  const startIndex = checkpoint && checkpoint.stage === 'artist-genres' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < artistIds.length; i++) {
    const id = artistIds[i];
    try {
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', id)
        .single();
      if (!artist) {
        await updateCheckpointIfNeeded(checkpointKey, 'artist-genres', i + 1, id);
        continue;
      }
      await buscarGenerosDeArtista(id, artist.nombre_artista);
      await updateCheckpointIfNeeded(checkpointKey, 'artist-genres', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'artist-genres', i, id);
        throw err;
      }
      console.error(`❌ Error en updateArtistGenresByIds para artista ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'artist-genres', i + 1, id);
    }
  }
}

// Géneros de álbumes
async function updateAlbumGenresByIds(albumIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'album-genres')) return;
  const startIndex = checkpoint && checkpoint.stage === 'album-genres' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < albumIds.length; i++) {
    const id = albumIds[i];
    try {
      const { data: album } = await supabase
        .from('albumes')
        .select('titulo')
        .eq('id_album', id)
        .single();
      const { data: relArtista } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();
      if (album && artist) {
        await buscarGenerosDeAlbumOCancion('album', id, album.titulo, artist.nombre_artista);
      }
      await updateCheckpointIfNeeded(checkpointKey, 'album-genres', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'album-genres', i, id);
        throw err;
      }
      console.error(`❌ Error en updateAlbumGenresByIds para álbum ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'album-genres', i + 1, id);
    }
  }
}

// Géneros de canciones
async function updateSongGenresByIds(songIds = [], checkpointKey) {
  const checkpoint = checkpointKey ? await getCheckpoint(checkpointKey) : null;
  if (!shouldRunStage(checkpoint, 'song-genres')) return;
  const startIndex = checkpoint && checkpoint.stage === 'song-genres' && typeof checkpoint.currentIndex === 'number'
    ? checkpoint.currentIndex
    : 0;

  for (let i = startIndex; i < songIds.length; i++) {
    const id = songIds[i];
    try {
      const { data: song } = await supabase
        .from('canciones')
        .select('titulo')
        .eq('id_cancion', id)
        .single();
      const { data: relArtista } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();
      if (song && artist) {
        await buscarGenerosDeAlbumOCancion('cancion', id, song.titulo, artist.nombre_artista);
      }
      await updateCheckpointIfNeeded(checkpointKey, 'song-genres', i + 1, id);
    } catch (err) {
      if (err && err.code === 'RATE_LIMIT_LONG') {
        await updateCheckpointIfNeeded(checkpointKey, 'song-genres', i, id);
        throw err;
      }
      console.error(`❌ Error en updateSongGenresByIds para canción ${id}:`, err.message || err);
      await updateCheckpointIfNeeded(checkpointKey, 'song-genres', i + 1, id);
    }
  }
}

module.exports = {
  updateArtistsPopularityAndPhotosByIds,
  updateAlbumsPopularityByIds,
  updateTracksPopularityByIds,
  updateArtistGenresByIds,
  updateAlbumGenresByIds,
  updateSongGenresByIds,
};