const express = require('express');
const router = express.Router();
const { obtenerCancionesDeAlbum } = require('../controllers/albumCancionesController');

router.get('/:id', obtenerCancionesDeAlbum);

module.exports = router;
