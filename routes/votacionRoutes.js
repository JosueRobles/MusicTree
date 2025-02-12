const express = require("express");
const router = express.Router();
const votacionController = require('../controllers/votacionController');

router.post('/votar', votacionController.votar);
router.get('/resultados/:listaId', votacionController.obtenerResultadosVotacion);

module.exports = router;
