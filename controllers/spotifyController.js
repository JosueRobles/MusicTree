const {
  searchFamousArtists,
  searchArtistsFromList,
} = require('./handlers/artistHandler');
const { importFullArtistCatalog, searchArtistsFromAlbums } = require('./handlers/albumHandler'); // Nuevo método importado
const {
  updateAlbumAndTrackPopularity,
  updateAllAlbumPopularity,
  updateAllArtistPopularity,
  updateAllArtistPopularityAndPhotos,
} = require('./handlers/popularityHandler');
const { updateArtistRelated } = require('./handlers/relatedHandler');
const {
  extractSpotifyPlaylist,
  extractBillionPlaylist,
} = require('./handlers/playlistHandler');
const { processArtistList } = require('./utils/spotifyHelpers');

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

// Controlador para procesar la playlist
const extractBillionPlaylistController = async (req, res) => {
  try {
    await extractBillionPlaylist();
    res.status(200).send("Playlist procesada correctamente.");
  } catch (err) {
    console.error("Error al procesar la playlist:", err);
    res.status(500).send("Error al procesar la playlist.");
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
  "Disturbed","4ZPpGYjIb5caOhHhQANO8P","0Te1QGD9jtzrxPa8nie9OQ","3f7Qfkua3IcRpUFzUaUnrX","La Adictiva Banda San José de Mesillas","1Sqacm1VMROsVrDOUwxS5G","Claudia Leitte","B.o.B"
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

module.exports = {
  ...require('./spotifyController'), // Mantener los controladores existentes
  processArtistListController, // Nuevo controlador exportado
  searchFamousArtistsController,
  searchArtistsFromListController,
  updateArtistRelatedController,
  extractBillionPlaylistController,
  updateAlbumsPopularityController,
  updateArtistsPopularityController,
  updateArtistPhotosController,
  searchArtistsFromAlbumsController, // Nuevo controlador exportado
};