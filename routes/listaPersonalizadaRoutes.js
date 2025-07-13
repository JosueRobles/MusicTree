const express = require('express');
const router = express.Router();
const listaPersonalizadaController = require('../controllers/listaPersonalizadaController');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.get('/destacadas-por-entidad', listaPersonalizadaController.obtenerListasDestacadasPorEntidad);
router.post('/',upload.single('imagen'),listaPersonalizadaController.crearListaPersonalizada);
//router.post('/', listaPersonalizadaController.crearListaPersonalizada);
router.get('/buscar-usuarios', listaPersonalizadaController.buscarUsuarios);
router.get('/colaborativas-o-propias/:userId', listaPersonalizadaController.obtenerListasPropiasYColaborativas);
router.get('/:userId', listaPersonalizadaController.obtenerListasPersonalizadas);
router.post('/anadir', listaPersonalizadaController.anadirAListaPersonalizada);
router.post('/verificar', listaPersonalizadaController.verificarEntidadEnListas);
router.get('/detalle/:listaId', listaPersonalizadaController.obtenerListaPersonalizadaPorId);
router.get('/elementos/:listaId', listaPersonalizadaController.obtenerElementosDeLista);
router.delete('/:listaId', listaPersonalizadaController.eliminarListaPersonalizada);
router.delete('/elemento/:elementoId', listaPersonalizadaController.eliminarElementoDeLista);
router.post('/guardar', listaPersonalizadaController.guardarLista);
router.post('/verificar-guardada', listaPersonalizadaController.verificarListaGuardada);
router.delete('/eliminar', listaPersonalizadaController.eliminarListaGuardada); // Nueva ruta para eliminar lista guardada
router.put('/:listaId', listaPersonalizadaController.cambiarPrivacidad); // Nueva ruta para cambiar privacidad
router.get('/guardadas/:userId', listaPersonalizadaController.obtenerListasGuardadas);
router.get('/progreso/:listaId/:userId', listaPersonalizadaController.getProgresoListaPersonalizada);
router.get('/colaborativas/:userId', listaPersonalizadaController.obtenerListasColaborativas);
router.get('/colaboradores/:listaId', listaPersonalizadaController.obtenerColaboradores);
router.post('/colaboradores/:listaId', listaPersonalizadaController.agregarColaborador);
router.put('/colaboradores/:listaId/:usuarioId', listaPersonalizadaController.cambiarRolColaborador);
router.delete('/colaboradores/:listaId/:usuarioId', listaPersonalizadaController.eliminarColaborador);
router.put('/imagen/:listaId', upload.single('imagen'), listaPersonalizadaController.actualizarImagenLista);

module.exports = router;