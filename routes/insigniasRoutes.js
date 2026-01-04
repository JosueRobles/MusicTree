const express = require('express');
const router = express.Router();
const insigniasController = require('../controllers/insigniasController');
const { verificarAdmin } = require('../middleware/authMiddleware'); // Middleware para verificar si es admin

// Obtener todas las insignias
router.get('/', insigniasController.obtenerInsignias);

// Obtener insignias de un usuario
router.get('/usuario/:userId', insigniasController.obtenerInsigniasUsuario);

// Obtener una insignia específica por ID
router.get('/:id', insigniasController.obtenerInsigniaPorId);

// Crear nueva insignia (solo admin)
router.post('/', verificarAdmin, insigniasController.crearInsignia);

// Eliminar insignia (solo admin)
router.delete('/:id', verificarAdmin, insigniasController.eliminarInsignia);

// Obtener progreso dinámico desde la vista (sin efectos secundarios)
router.get('/progreso-dinamico/:userId', insigniasController.obtenerProgresoInsignias);

// Obtener progreso y realizar desbloqueo si es necesario (mantener para compatibilidad)
router.get('/progreso/:userId', insigniasController.obtenerProgresoYDesbloquear);

module.exports = router;