const express = require('express');
const router = express.Router();
const supabase = require('../db');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Obtener la extensión del archivo
    const filename = `${Date.now()}${ext}`; // Generar un nombre único con la extensión
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id_usuario, username, nombre, foto_perfil');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener ranking combinado de miembros por seguidores y actividad
router.get('/ranking-combinado', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id_usuario, 
        username, 
        nombre, 
        foto_perfil, 
        seguidores:seguidores!seguidores_usuario_seguido_fkey(id), 
        actividad:actividad_usuario!inner(id_actividad)
      `);

    if (error) throw error;

    const result = data.map(user => ({
      id_usuario: user.id_usuario,
      username: user.username,
      nombre: user.nombre,
      foto_perfil: user.foto_perfil,
      seguidores: user.seguidores.length,
      actividad: user.actividad.length,
      ranking: user.seguidores.length + user.actividad.length
    })).sort((a, b) => b.ranking - a.ranking);

    res.json(result);
  } catch (error) {
    console.error('Error fetching combined ranking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para seguir a un usuario
router.post('/seguir', async (req, res) => {
  const { usuario_seguidor, usuario_seguido } = req.body;

  if (usuario_seguidor === usuario_seguido) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
  }

  try {
    // Verificar si ya existe la relación de seguimiento
    const { data: existingFollow, error: fetchError } = await supabase
      .from('seguidores')
      .select('*')
      .eq('usuario_seguidor', usuario_seguidor)
      .eq('usuario_seguido', usuario_seguido)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingFollow) {
      return res.status(400).json({ error: 'Ya sigues a este usuario.' });
    }

    // Insertar la relación de seguimiento
    const { error: followError } = await supabase
      .from('seguidores')
      .insert([{ usuario_seguidor, usuario_seguido }]);

    if (followError) throw followError;

    // Registrar la actividad de seguimiento
    const { error: activityError } = await supabase
      .from('actividad_usuario')
      .insert([{ usuario: usuario_seguidor, tipo_actividad: 'seguimiento', referencia_id: usuario_seguido }]);

    if (activityError) throw activityError;

    res.status(201).json({ message: 'Usuario seguido exitosamente' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unfollow', async (req, res) => {
  const { usuario_seguidor, usuario_seguido } = req.body;

  try {
    const { error } = await supabase
      .from('seguidores')
      .delete()
      .eq('usuario_seguidor', usuario_seguidor)
      .eq('usuario_seguido', usuario_seguido);

    if (error) throw error;

    res.status(200).json({ message: 'Usuario dejado de seguir exitosamente' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener seguidores de un usuario
router.get('/:id/seguidores', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('seguidores')
      .select('id')
      .eq('usuario_seguido', id);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener actividad de un usuario
router.get('/:id/actividad', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('actividad_usuario')
      .select('id_actividad')
      .eq('usuario', id);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener usuarios/artistas seguidos
router.get('/:id/siguiendo', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('seguidores')
      .select('usuario_seguido(id_usuario, nombre, username)')
      .eq('usuario_seguidor', id);

    if (error) throw error;

    res.json(data.map((item) => item.usuario_seguido));
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener información de un usuario por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id_usuario, username, nombre, foto_perfil')
      .eq('id_usuario', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Actualizar perfil de usuario
router.put('/:id', upload.single('foto_perfil'), async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  const foto_perfil = req.file ? req.file.filename : null;

  try {
    // Obtener el usuario actual para mantener los valores existentes
    const { data: currentUser, error: fetchError } = await supabase
      .from('usuarios')
      .select('nombre, foto_perfil')
      .eq('id_usuario', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar solo los campos modificados
    const updates = {
      nombre: nombre || currentUser.nombre, // Mantener el nombre actual si no se envió uno nuevo
      foto_perfil: foto_perfil || currentUser.foto_perfil, // Mantener la foto actual si no se subió una nueva
    };

    const { error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id_usuario', id);

    if (error) throw error;

    res.status(200).json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;