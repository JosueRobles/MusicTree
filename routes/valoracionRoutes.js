const express = require("express");
const router = express.Router();
const valoracionController = require("../controllers/valoracionController");
const { verificarToken } = require("../middleware/authMiddleware");

// Rutas CRUD para Valoraciones
router.post("/", verificarToken, valoracionController.crearValoracion);
router.get("/", valoracionController.obtenerValoraciones);
router.get("/:id", valoracionController.obtenerValoracionPorId);
router.put("/:id", valoracionController.actualizarValoracion);
router.delete("/:id", valoracionController.eliminarValoracion);

module.exports = router;
