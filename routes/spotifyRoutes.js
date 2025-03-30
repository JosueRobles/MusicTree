const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

router.get('/search/famous', spotifyController.searchFamousArtists);
router.get('/search/newlist', spotifyController.searchArtistsFromList);

module.exports = router;
