const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ mensaje: "Acceso denegado. Token no proporcionado." });
  }

  try {
    const tokenSinBearer = token.startsWith("Bearer ") ? token.slice(7) : token;
    const decoded = jwt.verify(tokenSinBearer, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(400).json({ mensaje: "Token inválido." });
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.usuario.tipo_usuario !== "admin") {
    return res.status(403).json({ mensaje: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
};

const verificarModerador = (req, res, next) => {
  if (req.usuario.tipo_usuario !== "moderador" && req.usuario.tipo_usuario !== "admin") {
    return res.status(403).json({ mensaje: "Acceso denegado. Se requiere rol de moderador o administrador." });
  }
  next();
};

module.exports = { verificarToken, verificarAdmin, verificarModerador };