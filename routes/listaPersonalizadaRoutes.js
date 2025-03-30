const express = require('express');
const router = express.Router();
const listaPersonalizadaController = require('../controllers/listaPersonalizadaController');

router.get('/:userId', listaPersonalizadaController.obtenerListasPersonalizadas);
router.post('/', listaPersonalizadaController.crearListaPersonalizada);
router.post('/anadir', listaPersonalizadaController.anadirAListaPersonalizada);
router.post('/verificar', listaPersonalizadaController.verificarEntidadEnListas);
router.get('/detalle/:listaId', listaPersonalizadaController.obtenerListaPersonalizadaPorId);
router.get('/elementos/:listaId', listaPersonalizadaController.obtenerElementosDeLista);
router.delete('/:listaId', listaPersonalizadaController.eliminarListaPersonalizada);
router.delete('/elemento/:elementoId', listaPersonalizadaController.eliminarElementoDeLista);

module.exports = router;