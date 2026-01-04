const supabase = require('../supabaseClient');

const getFeedPersonalizado = async (req, res) => {
    const id_usuario = parseInt(req.params.id_usuario);
    if (isNaN(id_usuario)) {
        return res.status(400).json({ error: 'ID de usuario no válido' });
    }

    try {
        // Paso 1: Obtener a quién sigue
        const { data: siguiendo, error: siguiendoError } = await supabase
            .from('seguidores')
            .select('usuario_seguido')
            .eq('usuario_seguidor', id_usuario);

        if (siguiendoError) throw siguiendoError;

        const idsSeguidos = siguiendo.map(s => s.usuario_seguido);

        // Paso 2: Incluir las valoraciones del propio usuario
        const idsUsuariosParaValoraciones = [...idsSeguidos, id_usuario]; // Agregar el propio usuario

        // Paso 3: Obtener valoraciones de las 4 tablas
        const fetchValoraciones = async (tabla, tipoEntidad) => {
            const { data, error } = await supabase
                .from(tabla)
                .select('*')
                .in('usuario', idsUsuariosParaValoraciones);

            if (error) throw error;

            return data.map(v => ({
                ...v,
                tipo_entidad: tipoEntidad
            }));
        };

        const [
            albumes,
            canciones,
            artistas,
            videos
        ] = await Promise.all([
            fetchValoraciones('valoraciones_albumes', 'album'),
            fetchValoraciones('valoraciones_canciones', 'cancion'),
            fetchValoraciones('valoraciones_artistas', 'artista'),
            fetchValoraciones('valoraciones_videos_musicales', 'video')
        ]);

        // Paso 4: Combinar todas las valoraciones y ordenarlas por fecha
        const todasValoraciones = [...albumes, ...canciones, ...artistas, ...videos];
        todasValoraciones.sort((a, b) => new Date(b.registrado) - new Date(a.registrado));

        // Paso 5: Obtener info de los usuarios que realizaron las valoraciones
        const uniqueUserIds = [...new Set(todasValoraciones.map(v => v.usuario))];
        const { data: usuarios, error: usuariosError } = await supabase
            .from('usuarios')
            .select('id_usuario, username, foto_perfil')
            .in('id_usuario', uniqueUserIds);

        if (usuariosError) throw usuariosError;

        const usuariosMap = Object.fromEntries(usuarios.map(u => [u.id_usuario, u]));

        const valoracionesConUsuario = todasValoraciones.map(v => ({
            ...v,
            usuario: usuariosMap[v.usuario] || null
        }));

        // Paso 6: Verificar actividad de los usuarios que sigues
        const { data: actividadSeguidos, error: actividadError } = await supabase
            .from('seguidores')
            .select('usuario_seguidor, usuario_seguido')
            .in('usuario_seguidor', idsSeguidos);

        if (actividadError) throw actividadError;

        const seguimientoActividad = actividadSeguidos.map(actividad => ({
            seguidor: actividad.usuario_seguidor,
            nuevoSeguido: actividad.usuario_seguido
        }));

        // Paso 7: Responder con las valoraciones y actividad
        res.json({
            valoraciones: valoracionesConUsuario.length > 0 ? valoracionesConUsuario : null, // Si no hay valoraciones, responder null
            seguimientoActividad
        });
    } catch (error) {
        console.error('Error en la obtención del feed personalizado:', error.message);
        res.status(500).json({ error: `Error en el feed: ${error.message}` });
    }
};

module.exports = { getFeedPersonalizado };
