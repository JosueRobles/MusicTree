const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require("../db");
require("dotenv").config();

const register = async (req, res) => {
  const { nombre, email, username, password, tipo_usuario = "regular" } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([{ nombre, email, username, password_hash, tipo_usuario }])
      .select()
      .single();

    if (error) {
      console.error("⚠️ Error al registrar en Supabase:", error);
      return res.status(500).json({ error: "Error al registrar usuario" });
    }

    res.json({ usuario: data });
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: "Usuario o correo no encontrado" });
    }

    const isMatch = await bcrypt.compare(password, data.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: data.id_usuario, tipo_usuario: data.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );    

    res.json({ token });
  } catch (err) {
    console.error("Error en el login:", err);
    res.status(500).json({ message: "Error del servidor" });
  }
};

module.exports = { register, login };