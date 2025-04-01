const express = require('express');
const router = express.Router();
const valoracionController = require('../controllers/valoracionController');

router.post('/', valoracionController.crearValoracion);
router.get('/', valoracionController.obtenerValoracion);
router.delete('/', valoracionController.eliminarValoracion); // Nueva ruta para eliminar valoraciones
router.post('/comentario', valoracionController.agregarComentario); // Nueva ruta para agregar comentarios
router.get('/promedio', valoracionController.obtenerPromedio); // Nueva ruta para obtener promedio
router.post('/emocion', valoracionController.agregarEmocion); // Nueva ruta para agregar emoción
router.get('/emociones', valoracionController.contarEmociones); // Nueva ruta para contar emociones

module.exports = router;