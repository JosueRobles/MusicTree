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
    // Trae todas las emociones para la entidad
    const { data, error } = await supabase
      .from('emociones')
      .select('emocion')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    // Agrupa y cuenta en JS
    const counts = {};
    (data || []).forEach(item => {
      if (item.emocion) {
        counts[item.emocion] = (counts[item.emocion] || 0) + 1;
      }
    });

    // Devuelve como array [{emocion: ..., count: ...}]
    const result = Object.entries(counts).map(([emocion, count]) => ({ emocion, count }));

    res.status(200).json(result);
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