const express = require('express');
const router = express.Router();
const { getProgresoColeccion, getAllColecciones, getColeccionById, getColeccionElementos, getColeccionesByUsuario, getColeccionElementosCount } = require('../controllers/coleccionesController');

// 1. Ruta para obtener el progreso del usuario en una colección (¡debe ir antes!)
router.get('/:coleccionId/progreso/:usuarioId', getProgresoColeccion);

// 2. Ruta para obtener todos los elementos de una colección
router.get('/:id/elementos', getColeccionElementos);
router.get('/:id/elementos/count', getColeccionElementosCount);

// 3. Ruta para obtener una colección específica por ID
router.get('/:id', getColeccionById);

// 4. Ruta para obtener colecciones relacionadas a un usuario
router.get('/usuario/:usuarioId', getColeccionesByUsuario);

// 5. Ruta para obtener todas las colecciones
router.get('/', getAllColecciones);

module.exports = router;