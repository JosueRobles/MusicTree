const supabase = require('../../supabaseClient');

async function notificarNuevosLanzamientos(artista_id, tipo, entidad_id, mensaje) {
  // Busca usuarios que siguen a este artista
  const { data: seguidores } = await supabase
    .from('seguimiento_artistas')
    .select('usuario_id')
    .eq('artista_id', artista_id);

  if (!seguidores || seguidores.length === 0) return;

  // Crea una notificación para cada seguidor
  for (const seguidor of seguidores) {
    await supabase.from('notificaciones').insert([{
      usuario_id: seguidor.usuario_id,
      tipo_notificacion: 'nuevo_lanzamiento',
      entidad_tipo: tipo,
      entidad_id,
      mensaje,
      visto: false
    }]);
  }
}

async function notificarCatalogoCompletado(usuario_id, artista_id) {
  // Trae info del artista y usuario
  const { data: artista } = await supabase
    .from('artistas')
    .select('nombre_artista')
    .eq('id_artista', artista_id)
    .single();

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('username')
    .eq('id_usuario', usuario_id)
    .single();

  // Notifica al usuario
  await supabase.from('notificaciones').insert([{
    usuario_id,
    tipo_notificacion: 'catalogo_completado',
    entidad_tipo: 'artista',
    entidad_id: artista_id,
    mensaje: `¡Felicidades! Has completado el catálogo de ${artista?.nombre_artista || 'un artista'}.`,
    visto: false
  }]);

  // Notifica a los seguidores del usuario
  const { data: seguidores } = await supabase
    .from('seguidores')
    .select('usuario_seguidor')
    .eq('usuario_seguido', usuario_id);

  for (const seg of seguidores || []) {
    await supabase.from('notificaciones').insert([{
      usuario_id: seg.usuario_seguidor,
      tipo_notificacion: 'catalogo_completado_seguidor',
      entidad_tipo: 'artista',
      entidad_id: artista_id,
      mensaje: `${usuario?.username || 'Un usuario'} completó el catálogo de ${artista?.nombre_artista || 'un artista'}.`,
      visto: false
    }]);
  }
}

async function notificarCatalogoExtraido(artista_id) {
  // 1. Traer usuarios que votaron
  const { data: votos } = await supabase
    .from('pedidos_catalogo')
    .select('usuario_id')
    .eq('artista_id', artista_id);

  if (!votos || votos.length === 0) return;

  // 2. Traer info del artista
  const { data: artista } = await supabase
    .from('artistas')
    .select('nombre_artista')
    .eq('id_artista', artista_id)
    .single();

  // 3. Notificar a cada usuario
  for (const voto of votos) {
    await supabase.from('notificaciones').insert([{
      usuario_id: voto.usuario_id,
      tipo_notificacion: 'catalogo_extraido',
      entidad_tipo: 'artista',
      entidad_id: artista_id,
      mensaje: `¡El catálogo de ${artista?.nombre_artista || 'un artista'} ya está disponible para valorar!`,
      visto: false
    }]);
  }

  // 4. Borrar los votos
  await supabase
    .from('pedidos_catalogo')
    .delete()
    .eq('artista_id', artista_id);
}

module.exports = {
  notificarNuevosLanzamientos,
  notificarCatalogoCompletado,
  notificarCatalogoExtraido
};