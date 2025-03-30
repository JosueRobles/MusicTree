const express = require('express');
const router = express.Router();
const { obtenerUsuarios, obtenerPerfil, obtenerUsuarioActual, panelAdmin, obtenerUsuarioPorId, eliminarUsuario } = require('../controllers/userController');
const { verificarToken } = require('../middleware/authMiddleware'); // Asegúrate de tener un middleware de autenticación

router.get('/usuarios', obtenerUsuarios);
router.get('/perfil', verificarToken, obtenerPerfil);
router.get('/current-user', verificarToken, obtenerUsuarioActual);
router.get('/usuarios/:id', obtenerUsuarioPorId);
router.get('/admin', verificarToken, panelAdmin);
router.delete('/usuarios/:id', verificarToken, eliminarUsuario);

module.exports = router;