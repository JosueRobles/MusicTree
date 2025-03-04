const express = require('express');
const router = express.Router();
const { obtenerArtistasDeAlbum, obtenerTodosLosArtistas } = require('../controllers/albumArtistasController');

router.get('/:id', obtenerArtistasDeAlbum);
router.get('/', obtenerTodosLosArtistas);

module.exports = router;
