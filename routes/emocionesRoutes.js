const express = require('express');
const router = express.Router();
const emocionesController = require('../controllers/emocionesController');

router.get('/', emocionesController.obtenerEmociones); // Ruta GET para obtener emociones
router.post('/', emocionesController.agregarEmocion);
router.delete('/', emocionesController.eliminarEmocion);
router.put('/', emocionesController.modificarEmocion); // Añadimos la ruta para modificar emoción

module.exports = router;