// routes/feedActivityRoutes.js
const express = require('express');
const router = express.Router();
const { getFeedActivity } = require('../controllers/feedActivityController');

router.get('/feed-actividad', getFeedActivity);

module.exports = router;
