const express = require('express');
const router = express.Router();
const tendenciaController = require('../controllers/tendenciaController');

router.get('/recientes', tendenciaController.obtenerTendenciasRecientes);
router.get('/feed', tendenciaController.obtenerFeedTendencias);
router.post('/registrar', tendenciaController.registrarTendencia);

module.exports = router;