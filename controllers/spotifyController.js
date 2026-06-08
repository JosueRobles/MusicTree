const {
  searchFamousArtists,
  searchArtistsFromList,
} = require('./handlers/artistHandler');
const { searchArtistsFromAlbums } = require('./handlers/albumHandler'); // Nuevo método importado
const {
  updateAlbumAndTrackPopularity,
  updateAllAlbumPopularity,
  updateAllArtistPopularity,
  updateAllArtistPopularityAndPhotos,
} = require('./handlers/popularityHandler');
const {
  processSpotifyPlaylist,
  updateCollectionFromPlaylist,
} = require('./handlers/playlistHandler');
const { processArtistList, importFullArtistCatalog, updateMissingFromArtistCatalog } = require('./utils/spotifyHelpers');
const { getCheckpoint, setCheckpoint, clearCheckpoint } = require('./utils/checkpoint');
const supabase = require('../supabaseClient');
const { safeSpotifyCall } = require('./utils/spotifySafeCall');
const { notificarCatalogoExtraido } = require('./utils/notifyHelpers');


const importFullArtistCatalogController = async (req, res) => {
  const { artistId } = req.params;
  try {
    let spotifyId = artistId;
    let id_artista = null;

    if (/^[a-zA-Z0-9]{22}$/.test(artistId)) {
      const { data, error } = await supabase
        .from('artistas')
        .select('id_artista')
        .eq('spotify_id', artistId)
        .single();
      if (error || !data) throw new Error("Artista no encontrado en la base de datos.");
      id_artista = data.id_artista;
    } else {
      const { data, error } = await supabase
        .from('artistas')
        .select('spotify_id')
        .eq('id_artista', artistId)
        .single();
      if (error || !data) throw new Error("Artista no encontrado en la base de datos.");
      spotifyId = data.spotify_id;
      id_artista = artistId;
    }

    const checkpointKey = `artist_catalog_${id_artista}`;
    const { artistIds, albumIds, trackIds } = await importFullArtistCatalog(spotifyId, id_artista);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    await updateArtistsPopularityAndPhotosByIds(artistIds, checkpointKey);
    await updateAlbumsPopularityByIds(albumIds, checkpointKey);
    await updateTracksPopularityByIds(trackIds, checkpointKey);
    await updateArtistGenresByIds(artistIds, checkpointKey);
    await updateAlbumGenresByIds(albumIds, checkpointKey);
    await updateSongGenresByIds(trackIds, checkpointKey);

    if (id_artista) {
      await supabase
        .from('artistas')
        .update({ es_principal: true })
        .eq('id_artista', id_artista);
    }

    await clearCheckpoint(checkpointKey).catch(() => {});
    await notificarCatalogoExtraido(id_artista);

    res.status(200).send(`Catálogo importado y artista ${id_artista} marcado como principal.`);
  } catch (err) {
    console.error("Error al importar catálogo:", err);
    if (err && (err.code === 'RATE_LIMIT_LONG' || err.message === 'RATE_LIMIT_LONG')) {
      return res.status(202).json({ message: 'Proceso pausado por rate-limit', retry_after: err.retryAfter || null });
    }
    res.status(500).send("Error al importar catálogo.");
  }
};

// Controladores de artistas
const searchFamousArtistsController = async (req, res) => {
  try {
    await searchFamousArtists();
    res.status(200).send("Artistas famosos buscados correctamente.");
  } catch (err) {
    console.error("Error al buscar artistas famosos:", err);
    res.status(500).send("Error al buscar artistas famosos.");
  }
};

const searchArtistsFromListController = async (req, res) => {
  const { artistList } = req.body || [];
  try {
    await searchArtistsFromList(artistList);
    res.status(200).send("Artistas de la lista buscados correctamente.");
  } catch (err) {
    console.error("Error al buscar artistas desde la lista:", err);
    res.status(500).send("Error al buscar artistas desde la lista.");
  }
};

// Nuevo controlador para buscar artistas de los álbumes existentes
const searchArtistsFromAlbumsController = async (req, res) => {
  try {
    await searchArtistsFromAlbums();
    res.status(200).send("Artistas de los álbumes existentes buscados correctamente.");
  } catch (err) {
    console.error("Error al buscar artistas de los álbumes:", err);
    res.status(500).send("Error al buscar artistas de los álbumes.");
  }
};

// Controladores de popularidad
const updateAlbumsPopularityController = async (req, res) => {
  try {
    await updateAllAlbumPopularity();
    res.status(200).send("Popularidad de todos los álbumes actualizada.");
  } catch (err) {
    console.error("Error al actualizar popularidad de álbumes:", err);
    res.status(500).send("Error al actualizar popularidad de álbumes.");
  }
};

const updateArtistsPopularityController = async (req, res) => {
  try {
    await updateAllArtistPopularity();
    res.status(200).send("Popularidad de todos los artistas actualizada.");
  } catch (err) {
    console.error("Error al actualizar popularidad de artistas:", err);
    res.status(500).send("Error al actualizar popularidad de artistas.");
  }
};

const updateArtistPhotosController = async (req, res) => {
  try {
    await updateAllArtistPopularityAndPhotos();
    res.status(200).send("Popularidad y fotos de todos los artistas actualizadas.");
  } catch (err) {
    console.error("Error al actualizar popularidad y fotos de artistas:", err);
    res.status(500).send("Error al actualizar popularidad y fotos de artistas.");
  }
};

// Controlador removido - updateArtistRelated no existe

// Lista predefinida de artistas
const artistList = [
  "Queen"
];

// Controlador para procesar automáticamente una lista de artistas
const processArtistListController = async (req, res) => {
  try {
    await processArtistList(artistList); // Procesar la lista de artistas automáticamente
    res.status(200).send("Lista de artistas procesada correctamente.");
  } catch (err) {
    console.error("❌ Error al procesar la lista de artistas:", err);
    res.status(500).send("Error al procesar la lista de artistas.");
  }
};

// Controlador para procesar automáticamente una lista de artistas
/*const processArtistListController = async (req, res) => {
  try {
    const spotifyApi = getSpotifyApi(); // Esto valida y obtiene instancia con token configurado
    await spotifyApi.processArtistList(artistList);

    res.status(200).send("Lista de artistas procesada correctamente.");
  } catch (err) {
    console.error("❌ Error al procesar la lista de artistas:", err);
    res.status(500).send("Error al procesar la lista de artistas.");
  }
};*/

// Procesar playlist y crear/actualizar colección
const processPlaylistController = async (req, res) => {
  const { playlistId } = req.params;
  try {
    await processSpotifyPlaylist(playlistId);
    res.status(200).send("Colección creada/actualizada correctamente desde la playlist.");
  } catch (err) {
    console.error("Error al procesar la playlist:", err);
    if (err && (err.code === 'RATE_LIMIT_LONG' || err.message === 'RATE_LIMIT_LONG')) {
      return res.status(202).json({ message: 'Proceso pausado por rate-limit', retry_after: err.retryAfter || null });
    }
    res.status(500).send("Error al procesar la playlist.");
  }
};


// Actualizar colección existente desde playlist
const updateCollectionFromPlaylistController = async (req, res) => {
  const { coleccionId } = req.params;
  try {
    await updateCollectionFromPlaylist(coleccionId);
    res.status(200).send("Colección actualizada correctamente desde la playlist.");
  } catch (err) {
    console.error("Error al actualizar la colección:", err);
    if (err && (err.code === 'RATE_LIMIT_LONG' || err.message === 'RATE_LIMIT_LONG')) {
      // checkpoint should already exist; inform client that process is paused
      return res.status(202).json({ message: 'Proceso pausado por rate-limit', retry_after: err.retryAfter || null });
    }
    res.status(500).send("Error al actualizar la colección.");
  }
};

const updateValidatedArtistCatalogController = async (req, res) => {
  const { artistId } = req.params;
  try {
    const { data: artist, error } = await supabase
      .from('artistas')
      .select('es_principal, spotify_id')
      .eq('id_artista', artistId)
      .single();

    if (error) throw error;
    if (!artist || !artist.es_principal) return res.status(400).send("El artista no está validado como principal.");

    const checkpointKey = `artist_catalog_${artistId}`;
    const checkpoint = await getCheckpoint(checkpointKey);
    const startingStage = checkpoint?.stage === 'missing-update-complete' ? 'artist-popularity' : checkpoint?.stage || 'missing-update';

    const { artistIds, albumIds, trackIds } = await updateMissingFromArtistCatalog(artist.spotify_id, artistId);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    const stageOrder = [
      'missing-update',
      'artist-popularity',
      'album-popularity',
      'track-popularity',
      'artist-genres',
      'album-genres',
      'song-genres',
      'done',
    ];
    const currentStageIndex = stageOrder.indexOf(startingStage);

    if (currentStageIndex <= stageOrder.indexOf('artist-popularity')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'artist-popularity', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateArtistsPopularityAndPhotosByIds(artistIds, checkpointKey);
    }
    if (currentStageIndex <= stageOrder.indexOf('album-popularity')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'album-popularity', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateAlbumsPopularityByIds(albumIds, checkpointKey);
    }
    if (currentStageIndex <= stageOrder.indexOf('track-popularity')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'track-popularity', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateTracksPopularityByIds(trackIds, checkpointKey);
    }
    if (currentStageIndex <= stageOrder.indexOf('artist-genres')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'artist-genres', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateArtistGenresByIds(artistIds, checkpointKey);
    }
    if (currentStageIndex <= stageOrder.indexOf('album-genres')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'album-genres', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateAlbumGenresByIds(albumIds, checkpointKey);
    }
    if (currentStageIndex <= stageOrder.indexOf('song-genres')) {
      await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'song-genres', artistIds, albumIds, trackIds, updated_at: Date.now() });
      await updateSongGenresByIds(trackIds, checkpointKey);
    }

    await setCheckpoint(checkpointKey, { ...checkpoint, stage: 'done', artistIds, albumIds, trackIds, updated_at: Date.now() });
    await clearCheckpoint(checkpointKey).catch(() => {});

    res.status(200).send("Catálogo de artista validado actualizado correctamente.");
  } catch (err) {
    console.error("Error al actualizar catálogo de artista validado:", err.body?.error?.message || err.message || err);
    if (err && (err.code === 'RATE_LIMIT_LONG' || err.message === 'RATE_LIMIT_LONG')) {
      return res.status(202).json({ message: 'Proceso pausado por rate-limit', retry_after: err.retryAfter || null });
    }
    res.status(500).send("Error al actualizar catálogo de artista validado.");
  }
};

module.exports = {
  processArtistListController,
  searchFamousArtistsController,
  searchArtistsFromListController,
  updateAlbumsPopularityController,
  updateArtistsPopularityController,
  updateArtistPhotosController,
  searchArtistsFromAlbumsController,
  importFullArtistCatalogController,
  processPlaylistController,
  updateCollectionFromPlaylistController,
  updateValidatedArtistCatalogController,
};