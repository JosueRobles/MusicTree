const express = require('express');
const router = express.Router();
const {
  obtenerGenerosDeAlbum,
  obtenerGenerosDeCancion,
  obtenerGenerosDeArtista,
} = require('../controllers/generosRelacionesController');

// Álbum -> Géneros
router.get('/albumes/:id/generos', obtenerGenerosDeAlbum);

// Canción -> Géneros
router.get('/canciones/:id/generos', obtenerGenerosDeCancion);

// Artista -> Géneros
router.get('/artistas/:id/generos', obtenerGenerosDeArtista);

module.exports = router;