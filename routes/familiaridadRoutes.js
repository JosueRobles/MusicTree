const express = require('express');
const router = express.Router();
const familiaridadController = require('../controllers/familiaridadController');

router.post('/', familiaridadController.agregarFamiliaridad);
router.get('/', familiaridadController.obtenerFamiliaridad);
router.get('/contar', familiaridadController.contarFamiliaridad);

module.exports = router;