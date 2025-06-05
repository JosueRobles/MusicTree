const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

// Ruta para obtener el ranking personal de un usuario
router.get('/personal', rankingController.obtenerRankingPersonal);

// Ruta para obtener el ranking global por tipo de entidad
router.get('/global', rankingController.obtenerRankingGlobal);

// Ruta para recalcular el ranking personal de un usuario
router.post('/recalcular', rankingController.recalcularRankingPersonal);

module.exports = router;