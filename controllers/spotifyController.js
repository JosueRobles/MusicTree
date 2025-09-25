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
const { processArtistList, importFullArtistCatalog,  } = require('./utils/spotifyHelpers');
const supabase = require('../supabaseClient');
const { safeSpotifyCall } = require('./utils/spotifySafeCall');
const { notificarCatalogoExtraido } = require('./utils/notifyHelpers');


const importFullArtistCatalogController = async (req, res) => {
  const { artistId } = req.params;
  try {
    // Buscar el id_artista interno si solo tienes el spotify_id
    let id_artista = artistId;
    if (/^[a-zA-Z0-9]{22}$/.test(artistId)) {
      const { data, error } = await supabase
        .from('artistas')
        .select('id_artista')
        .eq('spotify_id', artistId)
        .single();
      if (error || !data) throw new Error("Artista no encontrado en la base de datos.");
      id_artista = data.id_artista;
    }

    const { artistIds, albumIds, trackIds } = await importFullArtistCatalog(artistId);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    await updateArtistsPopularityAndPhotosByIds(artistIds);
    await updateAlbumsPopularityByIds(albumIds);
    await updateTracksPopularityByIds(trackIds);
    await updateArtistGenresByIds(artistIds);
    await updateAlbumGenresByIds(albumIds);
    await updateSongGenresByIds(trackIds);

    // Marca como principal al final SOLO si existe el id_artista
    if (id_artista) {
      await supabase
        .from('artistas')
        .update({ es_principal: true })
        .eq('id_artista', id_artista);
    }

    await notificarCatalogoExtraido(id_artista);

    res.status(200).send(`Catálogo importado y artista ${id_artista} marcado como principal.`);
  } catch (err) {
    console.error("Error al importar catálogo:", err);
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

const updateArtistRelatedController = async (req, res) => {
  try {
    await updateArtistRelated();
    res.status(200).send("Artistas relacionados actualizados correctamente.");
  } catch (err) {
    console.error("Error al actualizar artistas relacionados:", err);
    res.status(500).send("Error al actualizar artistas relacionados.");
  }
};

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
    const { artistIds, albumIds, trackIds } = await processSpotifyPlaylist(playlistId);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    await updateArtistsPopularityAndPhotosByIds(artistIds);
    await updateAlbumsPopularityByIds(albumIds);
    await updateTracksPopularityByIds(trackIds);
    await updateArtistGenresByIds(artistIds);
    await updateAlbumGenresByIds(albumIds);
    await updateSongGenresByIds(trackIds);

    res.status(200).send("Colección creada/actualizada correctamente desde la playlist.");
  } catch (err) {
    console.error("Error al procesar la playlist:", err);
    res.status(500).send("Error al procesar la playlist.");
  }
};


// Actualizar colección existente desde playlist
const updateCollectionFromPlaylistController = async (req, res) => {
  const { coleccionId } = req.params;
  try {
    const { artistIds, albumIds, trackIds } = await updateCollectionFromPlaylist(coleccionId);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    await updateArtistsPopularityAndPhotosByIds(artistIds);
    await updateAlbumsPopularityByIds(albumIds);
    await updateTracksPopularityByIds(trackIds);
    await updateArtistGenresByIds(artistIds);
    await updateAlbumGenresByIds(albumIds);
    await updateSongGenresByIds(trackIds);

    res.status(200).send("Colección actualizada correctamente desde la playlist.");
  } catch (err) {
    console.error("Error al actualizar la colección:", err);
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

    // Solo agrega lo nuevo y actualiza lo faltante
    const { artistIds, albumIds, trackIds } = await updateMissingFromArtistCatalog(artist.spotify_id, artistId);

    const {
      updateArtistsPopularityAndPhotosByIds,
      updateAlbumsPopularityByIds,
      updateTracksPopularityByIds,
      updateArtistGenresByIds,
      updateAlbumGenresByIds,
      updateSongGenresByIds,
    } = require('./handlers/batchUpdateHandler');

    await updateArtistsPopularityAndPhotosByIds(artistIds);
    await updateAlbumsPopularityByIds(albumIds);
    await updateTracksPopularityByIds(trackIds);
    await updateArtistGenresByIds(artistIds);
    await updateAlbumGenresByIds(albumIds);
    await updateSongGenresByIds(trackIds);

    res.status(200).send("Catálogo de artista validado actualizado correctamente.");
  } catch (err) {
    console.error("Error al actualizar catálogo de artista validado:", err.body?.error?.message || err.message || err);
    res.status(500).send("Error al actualizar catálogo de artista validado.");
  }
};

module.exports = {
  ...require('./spotifyController'), // Mantener los controladores existentes
  processArtistListController, // Nuevo controlador exportado
  searchFamousArtistsController,
  searchArtistsFromListController,
  updateArtistRelatedController,
  updateAlbumsPopularityController,
  updateArtistsPopularityController,
  updateArtistPhotosController,
  searchArtistsFromAlbumsController, // Nuevo controlador exportado
  importFullArtistCatalogController,
  processPlaylistController,
  updateCollectionFromPlaylistController,
  updateValidatedArtistCatalogController, // Nuevo controlador exportado
};