const express = require('express');
const router = express.Router();
const { registrarActividad } = require('../controllers/utils/actividadUtils');

router.post('/', async (req, res) => {
  const { usuario, tipo_actividad, referencia_id, referencia_entidad } = req.body;
  if (!usuario || !tipo_actividad || !referencia_id || !referencia_entidad) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }
  try {
    await registrarActividad(usuario, tipo_actividad, referencia_entidad, referencia_id);
    res.status(201).json({ message: 'Actividad registrada.' });
  } catch (e) {
    res.status(500).json({ error: 'Error al registrar actividad.' });
  }
});

module.exports = router;