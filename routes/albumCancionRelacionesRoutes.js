const express = require('express');
const router = express.Router();
const {
  obtenerCancionesDeAlbum,
  obtenerAlbumDeCancion,
} = require('../controllers/albumCancionRelacionesController');

// Álbum -> Canciones
router.get('/albumes/:id/canciones', obtenerCancionesDeAlbum);

// Canción -> Álbum
router.get('/canciones/:id/album', obtenerAlbumDeCancion);

module.exports = router;