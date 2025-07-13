const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

// Ruta para obtener el ranking personal de un usuario
router.get('/personal', rankingController.obtenerRankingPersonal);

// Ruta para obtener el ranking global por tipo de entidad
router.get('/global', rankingController.obtenerRankingGlobal);

// Ruta para obtener la posicion global de un usuario
router.get('/posicion-global', rankingController.obtenerPosicionGlobal);

// Ruta para recalcular el ranking personal de un usuario
router.post('/recalcular', rankingController.recalcularRankingPersonal);

router.post('/personal/ordenar', rankingController.actualizarOrdenRankingPersonal);

module.exports = router;