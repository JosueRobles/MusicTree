const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

router.get('/search', spotifyController.searchArtists);
router.get('/search/famous', spotifyController.searchFamousArtists);

module.exports = router;