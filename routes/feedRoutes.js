const express = require('express');
const router = express.Router();
const { getFeedPersonalizado } = require('../controllers/feedController');

router.get('/personalizado/:id_usuario', getFeedPersonalizado);

module.exports = router;
