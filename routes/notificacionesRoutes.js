const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificacionesController');

// Crear una notificación
router.post('/', notificacionesController.crearNotificacion);

// Obtener notificaciones de un usuario
router.get('/usuario/:usuarioId', notificacionesController.obtenerNotificaciones);

// Marcar notificación como vista
router.put('/:id/visto', notificacionesController.marcarNotificacionComoVista);

module.exports = router;