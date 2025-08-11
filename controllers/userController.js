const supabase = require("../db");

const obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

const obtenerPerfil = async (req, res) => {
  const userId = req.user.id; // Obtén el ID del usuario autenticado desde el token

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario") // Asegúrate de incluir todos los campos necesarios
      .eq("id_usuario", userId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, metodologia_valoracion, configuracion")
      .eq("id_usuario", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerUsuarioActual = async (req, res) => {
  // Permitir visitantes sin token
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || !auth.split(' ')[1]) {
    // Visitante: no hay token, responde 200 y null
    return res.status(200).json(null);
  }

  // Si hay token, sigue con la lógica actual
  const token = auth.split(' ')[1];
  let userId;
  try {
    // Decodifica el token para obtener el id (ajusta según tu JWT)
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    return res.status(200).json(null); // Token inválido, tratar como visitante
  }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario")
      .eq("id_usuario", userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(data);
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const panelAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error en el panel de administración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id_usuario", id);

    if (error) throw error;

    res.status(200).json({ mensaje: "Usuario eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar usuario." });
  }
};

// NUEVO: Guardar/actualizar preferencias de usuario
const actualizarPreferencias = async (req, res) => {
  const { id } = req.params;
  const { metodologia_valoracion, configuracion } = req.body;
  console.log("Preferencias recibidas:", req.body); // <-- Para depuración
  try {
    const { error } = await supabase
      .from("usuarios")
      .update({
        metodologia_valoracion: metodologia_valoracion || null,
        configuracion: configuracion || null,
      })
      .eq("id_usuario", id);
    if (error) throw error;
    res.status(200).json({ message: "Preferencias actualizadas" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar preferencias" });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerPerfil,
  obtenerUsuarioActual,
  panelAdmin,
  obtenerUsuarioPorId,
  eliminarUsuario,
  actualizarPreferencias,
};