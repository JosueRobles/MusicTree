const express = require('express');
const router = express.Router();
const { filtrarEntidades } = require('../controllers/filtrarController');

// Endpoint para filtrar entidades
router.get('/filtrar', filtrarEntidades);

module.exports = router;