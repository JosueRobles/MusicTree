const supabase = require("../db");

const obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
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
      .select("id_usuario, nombre, email, username")
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

module.exports = {
  obtenerUsuarios,
  obtenerPerfil,
  panelAdmin,
  obtenerUsuarioPorId,
  eliminarUsuario,
};