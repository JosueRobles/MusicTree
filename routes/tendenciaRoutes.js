const express = require('express');
const router = express.Router();
const tendenciaController = require('../controllers/tendenciaController');

router.get('/recientes', tendenciaController.obtenerTendenciasRecientes);
router.get('/feed', tendenciaController.obtenerFeedTendencias);
router.post('/registrar', tendenciaController.registrarTendencia);
router.get('/listas-populares', tendenciaController.obtenerListasPopulares);

module.exports = router;