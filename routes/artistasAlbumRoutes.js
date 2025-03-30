const express = require('express');
const router = express.Router();
const { obtenerArtistasDeAlbum } = require('../controllers/artistasAlbumController');

router.get('/:id', obtenerArtistasDeAlbum);

module.exports = router;
