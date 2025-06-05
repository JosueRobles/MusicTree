const express = require('express');
const router = express.Router();

// Importar controladores
const {
  searchFamousArtistsController,
  searchArtistsFromListController,
  updateArtistRelatedController,
  extractBillionPlaylistController,
  updateAlbumsPopularityController,
  updateArtistsPopularityController,
  updateArtistPhotosController,
  searchArtistsFromAlbumsController, // Nuevo controlador
  processArtistListController
} = require('../controllers/spotifyController');

// Rutas principales
router.get('/search/famous', searchFamousArtistsController);
router.get('/search/newlist', searchArtistsFromListController);
router.get('/search/related', updateArtistRelatedController);

// Rutas para procesar la playlist "Billion Club"
router.get('/process-billion-playlist', extractBillionPlaylistController);

// Rutas para actualizar popularidad y fotos
router.get('/search/popularity', updateAlbumsPopularityController);
router.get('/search/update-album-popularity', updateAlbumsPopularityController);
router.get('/search/update-artist-popularity', updateArtistsPopularityController);
router.get('/search/update-artist-photos', updateArtistPhotosController);

// Nueva ruta para buscar artistas de los álbumes en la base de datos
router.get('/search/artists-from-albums', searchArtistsFromAlbumsController);

// Nueva ruta para procesar una lista de artistas
router.get('/process-artist-list', processArtistListController);

module.exports = router;