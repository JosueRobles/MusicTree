const express = require('express');
const router = express.Router();
const { obtenerVista } = require('../controllers/vistasController');

// Ruta para obtener datos de una vista específica
router.get('/:vista', obtenerVista);

module.exports = router;