const express = require("express");
const router = express.Router();
const artistaController = require("../controllers/artistaController");

// Rutas CRUD
router.post("/", artistaController.crearArtista);
router.get("/", artistaController.obtenerArtistas);
router.get("/:id", artistaController.obtenerArtistaPorId);
router.put("/:id", artistaController.actualizarArtista);
router.delete("/:id", artistaController.eliminarArtista);

module.exports = router;