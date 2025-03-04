const express = require('express');
const router = express.Router();
const valoracionController = require('../controllers/valoracionController');

router.post('/', valoracionController.crearValoracion);
router.get('/', valoracionController.obtenerValoracion);

module.exports = router;