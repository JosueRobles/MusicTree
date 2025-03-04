const express = require('express');
const router = express.Router();
const { obtenerArtistasDeCancion } = require('../controllers/artistasCancionController');

router.get('/:id', obtenerArtistasDeCancion);

module.exports = router;
