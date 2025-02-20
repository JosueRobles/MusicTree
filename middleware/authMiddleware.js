const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ mensaje: 'Token inválido.' });
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.user.tipo_usuario !== 'admin') return res.status(403).json({ mensaje: 'Acceso denegado. No eres administrador.' });
  next();
};

const verificarModerador = (req, res, next) => {
  if (req.user.tipo_usuario !== 'moderador' && req.user.tipo_usuario !== 'admin') return res.status(403).json({ mensaje: 'Acceso denegado. No eres moderador.' });
  next();
};

module.exports = { verificarToken, verificarAdmin, verificarModerador };