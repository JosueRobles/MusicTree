const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

// Rutas CRUD
router.post("/", videoController.crearVideoMusical);
router.get("/", videoController.obtenerVideosMusicales);
router.get("/:id", videoController.obtenerVideoMusicalPorId);
router.put("/:id", videoController.actualizarVideoMusical);
router.delete("/:id", videoController.eliminarVideoMusical);

module.exports = router;