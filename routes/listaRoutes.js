const express = require("express");
const router = express.Router();
const listaController = require("../controllers/listaController");

// Rutas CRUD para Listas de Usuarios
router.post("/", listaController.crearLista);
router.get("/", listaController.obtenerListas);
router.get("/:id", listaController.obtenerListaPorId);
router.put("/:id", listaController.actualizarLista);
router.delete("/:id", listaController.eliminarLista);

module.exports = router;
