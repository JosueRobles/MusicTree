const express = require("express");
const router = express.Router();
const albumController = require("../controllers/albumController");

// Rutas CRUD
router.post("/", albumController.crearAlbum);
router.get('/clusters', albumController.obtenerAlbumClusters);
router.get('/sugerencias-similar', albumController.sugerirAlbumSimilar);
router.get('/sugerencias-nuevas', albumController.sugerirCancionesNuevasAlbum);
router.get("/", albumController.obtenerAlbumes);
router.get("/:id", albumController.obtenerAlbumPorId);
router.put("/:id", albumController.actualizarAlbum);
router.delete("/:id", albumController.eliminarAlbum);

module.exports = router;