const express = require('express');
const { getRecomendaciones } = require('../controllers/recommendController');
const router = express.Router();

router.get('/', getRecomendaciones);  // Esto cambiaría la ruta a /recommend

module.exports = router;
