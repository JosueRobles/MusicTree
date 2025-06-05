const express = require('express');
const router = express.Router();
const {
  getGeneros,
  getArtistasPorGenero,
  getAlbumesPorGenero,
  getCancionesPorGenero,
  updateArtistGenres,
  updateAlbumGenres,
  updateSongGenres,
  deleteLowMentionGenres,
  loadMainGenres
} = require('../controllers/generosController');

// Ruta para obtener todos los géneros
router.get('/', getGeneros);

// Rutas para obtener entidades relacionadas con un género
router.get('/:id/artistas', getArtistasPorGenero);
router.get('/:id/albumes', getAlbumesPorGenero);
router.get('/:id/canciones', getCancionesPorGenero);

// Rutas adicionales para extracción y normalización
router.get('/update/artists', updateArtistGenres); // Actualizar géneros de artistas
router.get('/update/albums', updateAlbumGenres);   // Actualizar géneros de álbumes
router.get('/update/songs', updateSongGenres);     // Actualizar géneros de canciones
router.post('/delete-low-mentions', deleteLowMentionGenres); // Eliminar géneros irrelevantes

// Ruta para cargar géneros principales
router.get('/load-main-genres', loadMainGenres);

module.exports = router;