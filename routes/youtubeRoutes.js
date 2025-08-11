const express = require('express');
const router = express.Router();
const {
  importYoutubeCatalogController,
  updateYoutubeCatalogController,
  playlistToCollectionController,
  updateCollectionFromYoutubePlaylistController,
  finalizarImportacionYoutubeController,
} = require('../controllers/youtubeController');

router.get('/import-catalog/:artistId', importYoutubeCatalogController);
router.get('/update-catalog/:artistId', updateYoutubeCatalogController);
router.get('/playlist-to-collection/:playlistId', playlistToCollectionController);
router.get('/update-collection-from-playlist/:playlistId/:coleccionId', updateCollectionFromYoutubePlaylistController);
router.post('/finalizar-importacion/:batchId', finalizarImportacionYoutubeController);

module.exports = router;