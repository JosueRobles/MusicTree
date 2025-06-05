const express = require('express');
const router = express.Router();
const supabase = require("../db");

const modificarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, emocion } = req.body;

  try {
    // Primero eliminamos la emoción existente
    const { error: deleteError } = await supabase
      .from('emociones')
      .delete()
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (deleteError) throw deleteError;

    // Luego agregamos la nueva emoción
    const { data, error: insertError } = await supabase
      .from('emociones')
      .insert([{ usuario, entidad_tipo, entidad_id, emocion }], { upsert: true });

    if (insertError) throw insertError;

    res.status(200).json({ mensaje: "Emoción modificada correctamente", data });
  } catch (error) {
    console.error("❌ Error al modificar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Controlador para obtener emociones
const obtenerEmociones = async (req, res) => {
  const { entidad_tipo, entidad_id } = req.query;

  try {
    // Consulta para agrupar emociones y contarlas
    const { data, error } = await supabase
      .from('emociones')
      .select('emocion, count:emocion')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    // Devuelve las emociones agrupadas con sus conteos
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener las emociones:", error);
    res.status(500).json({ error: "Error al obtener las emociones" });
  }
};

const agregarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, emocion } = req.body;

  try {
    const { data, error } = await supabase
      .from('emociones')
      .insert([{ usuario, entidad_tipo, entidad_id, emocion }], { upsert: true }); // Usamos upsert para evitar duplicados

    if (error) throw error;

    res.status(200).json({ mensaje: "Emoción agregada correctamente", data });
  } catch (error) {
    console.error("❌ Error al agregar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.body;

  try {
    const { error } = await supabase
      .from('emociones')
      .delete()
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    res.status(200).json({ mensaje: "Emoción eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerEmociones, agregarEmocion, eliminarEmocion, modificarEmocion };