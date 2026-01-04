const express = require('express');
const router = express.Router();
const {
  obtenerCancionesDeArtista,
  obtenerArtistasDeCancion,
  obtenerAlbumesDeArtista,
  obtenerArtistasDeAlbum,
  obtenerVideosDeArtista,
  obtenerArtistasDeVideo,
} = require('../controllers/artistasRelacionesController');

// Artista -> Canciones
router.get('/artistas/:id/canciones', obtenerCancionesDeArtista);

// Canción -> Artistas
router.get('/canciones/:id/artistas', obtenerArtistasDeCancion);

// Artista -> Álbumes
router.get('/artistas/:id/albumes', obtenerAlbumesDeArtista);

// Álbum -> Artistas
router.get('/albumes/:id/artistas', obtenerArtistasDeAlbum);

// Artista -> Videos
router.get('/artistas/:id/videos', obtenerVideosDeArtista);

// Video -> Artistas
router.get('/videos/:id/artistas', obtenerArtistasDeVideo);

module.exports = router;