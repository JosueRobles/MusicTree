const express = require('express');
const router = express.Router();
const { obtenerAlbumDeCancion } = require('../controllers/cancionAlbumController');

router.get('/:id', obtenerAlbumDeCancion);

module.exports = router;
