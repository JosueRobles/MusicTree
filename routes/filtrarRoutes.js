const express = require('express');
const router = express.Router();
const filtrarController = require('../controllers/filtrarController');
const rankingController = require('../controllers/rankingController');

// Endpoint para filtrar entidades
router.get('/filtrar', filtrarController.filtrarEntidades);
router.get('/filtrar/contar', filtrarController.contarEntidades);
router.get('/contar/artistas', filtrarController.contarArtistas);
router.get('/contar/albumes', filtrarController.contarAlbumes);
router.get('/contar/canciones', filtrarController.contarCanciones);
router.get('/contar/videos', filtrarController.contarVideos);
router.get('/ranking-comunitario', rankingController.obtenerRankingGlobal);

module.exports = router;