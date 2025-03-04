const express = require('express');
const router = express.Router();
const { obtenerArtistasDeCancion } = require('../controllers/cancionArtistasController');

router.get('/:id', obtenerArtistasDeCancion);

module.exports = router;
