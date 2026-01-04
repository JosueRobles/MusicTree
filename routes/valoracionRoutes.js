const express = require('express');
const router = express.Router();
const valoracionController = require('../controllers/valoracionController');

router.post('/', valoracionController.crearValoracion);
router.get('/', valoracionController.obtenerValoracion);
router.delete('/', valoracionController.eliminarValoracion);
router.get('/unicos', valoracionController.filtrarUnicosPorGrupo)
router.post('/comentario', valoracionController.agregarComentario);
router.delete('/comentario', valoracionController.eliminarComentario);
router.get('/promedio', valoracionController.obtenerPromedio);
router.post('/emocion', valoracionController.agregarEmocion);
router.get('/emociones', valoracionController.contarEmociones);
router.get('/globales', valoracionController.obtenerValoracionesGlobales); // Nueva ruta
router.get('/segmentacion-personal', valoracionController.segmentacionPersonal); // NUEVO
router.get('/historial', valoracionController.obtenerHistorialValoraciones);
router.get('/personalizada', valoracionController.obtenerValoracionAgregada);

module.exports = router;