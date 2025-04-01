const express = require('express');
const router = express.Router();
const insigniasController = require('../controllers/insigniasController');
const { verificarAdmin } = require('../middleware/authMiddleware'); // Middleware para verificar si es admin

// Obtener todas las insignias
router.get('/', insigniasController.obtenerInsignias);

// Obtener insignias de un usuario
router.get('/usuario/:userId', insigniasController.obtenerInsigniasUsuario);

// Crear nueva insignia (solo admin)
router.post('/', verificarAdmin, insigniasController.crearInsignia);

// Eliminar insignia (solo admin)
router.delete('/:id', verificarAdmin, insigniasController.eliminarInsignia);

module.exports = router;