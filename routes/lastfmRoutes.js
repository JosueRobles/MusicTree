const express = require('express');
const router = express.Router();
const lastfmController = require('../controllers/lastfmController');

router.get('/update-artist-info', lastfmController.updateArtistInfo);
router.get('/delete-genres', lastfmController.deleteLowMentionGenres);
router.get('/update-album-track-genres', lastfmController.updateAlbumAndTrackGenres);

module.exports = router;