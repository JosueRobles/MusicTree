const express = require("express");
const router = express.Router();
const tendenciaController = require('../controllers/tendenciaController');
const { obtenerTendenciasRecientes } = require("../controllers/tendenciaController");
const { verificarToken, verificarAdmin, verificarModerador } = require("../middleware/authMiddleware");

router.post('/registrar', verificarToken, verificarAdmin, verificarModerador, tendenciaController.registrarTendencia);
router.get('/recientes', tendenciaController.obtenerTendenciasRecientes);
//router.get('/feed', tendenciaController.obtenerTendenciasRecientes);
router.get("/feed", obtenerTendenciasRecientes); // Ruta correcta

module.exports = router;
