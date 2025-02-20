const express = require('express');
const router = express.Router();
const supabase = require('../db');

router.get('/', async (req, res) => {
  try {
    const { data: album_artistas, error } = await supabase
      .from('album_artistas')
      .select('*');

    if (error) {
      throw error;
    }

    res.json(album_artistas);
  } catch (error) {
    console.error('Error al obtener album_artistas:', error);
    res.status(500).json({ error: 'Error al obtener album_artistas' });
  }
});

module.exports = router;