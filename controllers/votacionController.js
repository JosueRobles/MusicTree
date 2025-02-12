const supabase = require("../db");

const votar = async (req, res) => {
  const { usuario, lista, voto } = req.body;
  try {
    const { error } = await supabase
      .from('votaciones_rankings')
      .insert([{ usuario, lista, voto }]);

    if (error) throw error;

    res.status(201).json({ mensaje: 'Voto registrado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el voto.' });
  }
};

const obtenerResultadosVotacion = async (req, res) => {
  const { listaId } = req.params;
  try {
    const { data, error } = await supabase
      .from('votaciones_rankings')
      .select('voto')
      .eq('lista', listaId);

    if (error) throw error;

    const resultados = {
      positivos: data.filter(v => v.voto === 1).length,
      negativos: data.filter(v => v.voto === -1).length,
    };

    res.status(200).json(resultados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resultados.' });
  }
};

module.exports = { votar, obtenerResultadosVotacion };