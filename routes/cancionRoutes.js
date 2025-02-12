const express = require("express");
const router = express.Router();
const cancionController = require("../controllers/cancionController");

// Rutas CRUD
router.post("/", cancionController.crearCancion);
router.get("/", cancionController.obtenerCanciones);
router.get("/:id", cancionController.obtenerCancionPorId);
router.put("/:id", cancionController.actualizarCancion);
router.delete("/:id", cancionController.eliminarCancion);

module.exports = router;
