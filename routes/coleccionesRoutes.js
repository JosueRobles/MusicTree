const express = require('express');
const router = express.Router();
const { getProgresoColeccion, getAllColecciones, getColeccionById, getColeccionElementos, getColeccionesByUsuario } = require('../controllers/coleccionesController');

// Ruta para obtener todas las colecciones
router.get('/', getAllColecciones);

// Ruta para obtener una colección específica por ID
router.get('/:id', getColeccionById);

// Ruta para obtener colecciones relacionadas a un usuario
router.get('/usuario/:usuarioId', getColeccionesByUsuario);

// Ruta para obtener todos los elementos de una colección
router.get('/:id/elementos', getColeccionElementos);

// Ruta para obtener el progreso del usuario en una colección
router.get('/:coleccionId/progreso/:usuarioId', getProgresoColeccion);

module.exports = router;