const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verificarToken, verificarAdmin } = require("../middleware/authMiddleware");

router.get("/perfil", verificarToken, userController.obtenerPerfil);
router.get("/admin", verificarToken, verificarAdmin, userController.panelAdmin);
router.get("/", userController.obtenerUsuarios);
router.get("/:id", verificarToken, userController.obtenerUsuarioPorId);
router.delete("/:id", verificarToken, verificarAdmin, userController.eliminarUsuario);

module.exports = router;