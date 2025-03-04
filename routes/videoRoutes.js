const express = require("express");
const router = express.Router();
const videoController = require('../controllers/videoController');

router.post('/', videoController.crearVideoMusical);
router.get('/', videoController.obtenerVideosMusicales);
router.get('/:id', videoController.obtenerVideoMusicalPorId);
router.put('/:id', videoController.actualizarVideoMusical);
router.delete('/:id', videoController.eliminarVideoMusical);
router.get('/artista/:id', videoController.obtenerVideosDeArtista);

module.exports = router;