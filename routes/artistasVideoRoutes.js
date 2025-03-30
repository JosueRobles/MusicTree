const express = require("express");
const router = express.Router();
const artistasVideoController = require('../controllers/artistasVideoController');

router.get('/:id', artistasVideoController.obtenerArtistasDeVideo);

module.exports = router;