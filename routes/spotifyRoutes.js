const express = require('express');
const router = express.Router();

// Importar controladores
const {
  searchFamousArtistsController,
  searchArtistsFromListController,
  updateAlbumsPopularityController,
  updateArtistsPopularityController,
  updateArtistPhotosController,
  searchArtistsFromAlbumsController, // Nuevo controlador
  processArtistListController,
  importFullArtistCatalogController,
  processPlaylistController,
  updateCollectionFromPlaylistController,
  updateValidatedArtistCatalogController
} = require('../controllers/spotifyController');

router.get('/import-catalog/:artistId', importFullArtistCatalogController);
router.get('/update-catalog/:artistId', updateValidatedArtistCatalogController);

// Rutas principales
router.get('/search/famous', searchFamousArtistsController);
router.get('/search/newlist', searchArtistsFromListController);

// Rutas para procesar las playlists
router.get('/process-playlist/:playlistId', processPlaylistController);
router.get('/update-collection-from-playlist/:coleccionId', updateCollectionFromPlaylistController);

// Rutas para actualizar popularidad y fotos
router.get('/search/update-album-popularity', updateAlbumsPopularityController);
router.get('/search/update-artist-popularity', updateArtistsPopularityController);
router.get('/search/update-artist-photos', updateArtistPhotosController);

// Nueva ruta para buscar artistas de los álbumes en la base de datos
router.get('/search/artists-from-albums', searchArtistsFromAlbumsController);

// Nueva ruta para procesar una lista de artistas
router.get('/process-artist-list', processArtistListController);

module.exports = router;