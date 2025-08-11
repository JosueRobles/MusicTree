import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import ValoracionComentarioEntidad from './ValoracionComentarioEntidad';

const API_URL = "http://localhost:5000";

const getEntityImage = (item) => {
  if (item.tipo_entidad === 'album') return item.referencia_info?.foto_album || '/default.png';
  if (item.tipo_entidad === 'artista') return item.referencia_info?.foto_artista || '/default-user.png';
  if (item.tipo_entidad === 'video') return item.referencia_info?.miniatura || '/default.png';
  if (item.tipo_entidad === 'cancion') return '/default-song.png';
  if (item.tipo === 'insignia_obtenida') return item.referencia_info?.icono || '/default-badge.png';
  return '/default.png';
};

const ParaTiFeed = ({ usuario }) => {
  const [actividad, setActividad] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [actividadEnriquecida, setActividadEnriquecida] = useState([]);

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    const fetchFeedActividad = async () => {
      try {
        const response = await axios.get(`${API_URL}/feed-actividad?usuarioId=${usuario.id_usuario}&limit=30`);
        setActividad(response.data);
      } catch (error) {
        console.error('Error fetching feed actividad:', error);
      }
    };

    const fetchPendientesValoracion = async () => {
      try {
        const response = await axios.get(`${API_URL}/catalogos/pendientes-valoracion/${usuario.id_usuario}`);
        setPendientes(response.data);
      } catch (error) {
        console.error('Error fetching pendientes valoracion:', error);
      }
    };

    fetchFeedActividad();
    fetchPendientesValoracion();
  }, [usuario]);

  // Enriquecer valoraciones con emoción y familiaridad
  useEffect(() => {
  async function enrichFeed() {
    const enriched = await Promise.all(actividad.map(async item => {
      if (item.tipo === 'valoracion') {
        let emocion = null;
        let familiaridad = null;
        try {
          const emoRes = await axios.get(`${API_URL}/emociones`, {
            params: { entidad_tipo: item.tipo_entidad, entidad_id: item.referencia_id, usuario: item.usuario }
          });
          if (Array.isArray(emoRes.data) && emoRes.data.length > 0) {
            emocion = emoRes.data[0].emocion || null;
          }
        } catch {}
        try {
          const famRes = await axios.get(`${API_URL}/familiaridad`, {
            params: { entidad_tipo: item.tipo_entidad, entidad_id: item.referencia_id, usuario: item.usuario }
          });
          if (famRes.data && famRes.data.nivel) {
            familiaridad = famRes.data.nivel;
          }
        } catch {}

        // Aquí la magia para traer nombre y username si no están
        let nombre = item.usuario_info?.nombre;
        let username = item.usuario_info?.username;
        let foto_perfil = item.usuario_info?.foto_perfil || '/default-profile.png';

        if (!nombre || !username) {
          try {
            const userRes = await axios.get(`${API_URL}/ranking/${item.usuario}`);
            nombre = userRes.data.nombre || `user-${item.usuario}`;
            username = userRes.data.username || `user-${item.usuario}`;
            foto_perfil = userRes.data.foto_perfil || foto_perfil;
          } catch {
            nombre = `user-${item.usuario}`;
            username = `user-${item.usuario}`;
          }
        }

        return {
          ...item,
          usuarios: {
            nombre,
            username,
            foto_perfil
          },
          usuario: item.usuario_info?.id_usuario || item.usuario,
          entidad: {
            tipo: item.tipo_entidad,
            id: item.referencia_id,
            nombre: item.nombre_entidad
          },
          fecha: item.fecha,
          calificacion: item.calificacion,
          comentario: item.comentario,
          emocion,
          familiaridad
        };
      }
      return item;
    }));
    setActividadEnriquecida(enriched);
  }

  if (actividad.length > 0) enrichFeed();
  else setActividadEnriquecida([]);
}, [actividad]);

  // Agrupa pendientes por tipo
  const pendientesAgrupados = {
    artista: [],
    album: [],
    cancion: [],
    video: [],
  };
  pendientes.forEach(item => {
    pendientesAgrupados[item.tipo]?.push(item);
  });

  if (!usuario) return null;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">Actividad de quienes sigues</h3>
      {actividadEnriquecida.length === 0 ? (
        <p>No hay actividad reciente de seguimientos.</p>
      ) : (
        <div>
          {actividadEnriquecida.map((item, index) => (
            item.tipo === 'valoracion' ? (
              <ValoracionComentarioEntidad key={index} valoracion={item} />
            ) : (
              <div key={index} className="feed-card">
                <img
                  className={item.tipo === 'insignia_obtenida' ? "feed-card-insignia" : "feed-card-img"}
                  src={getEntityImage(item)}
                  alt={item.nombre_entidad || item.referencia_info?.nombre || 'Entidad'}
                />
                <div className="feed-card-content">
                  <div className="feed-card-username">
                    <Link to={`/profile/${item.usuario_info?.id_usuario}`}>
                      {item.usuario_info?.username || 'Usuario desconocido'}
                    </Link>
                  </div>
                  <div className="feed-card-action">
                    {item.tipo === 'seguimiento' ? (
                      <>
                        comenzó a seguir{' '}
                        <Link to={`/profile/${item.referencia_info?.id_usuario}`} className="feed-card-entity">
                          {item.referencia_info?.username || 'Usuario desconocido'}
                        </Link>
                      </>
                    ) : item.tipo === 'seguimiento_artista' ? (
                      <>
                        comenzó a seguir al artista{' '}
                        <Link to={`/artist/${item.referencia_id}`} className="feed-card-entity">
                          {item.referencia_info?.nombre_artista || 'Artista'}
                        </Link>
                      </>
                    ) : item.tipo === 'valoracion' ? (
                      <>
                        valoró <span className="feed-card-entity">{item.tipo_entidad}</span>{' '}
                        <Link
                          to={
                            item.tipo_entidad === 'album'
                              ? `/album/${item.referencia_id}`
                              : item.tipo_entidad === 'cancion'
                              ? `/song/${item.referencia_id}`
                              : item.tipo_entidad === 'video'
                              ? `/video/${item.referencia_id}`
                              : item.tipo_entidad === 'artista'
                              ? `/artist/${item.referencia_id}`
                              : '#'
                          }
                          className="feed-card-entity"
                        >
                          {item.nombre_entidad}
                        </Link>
                        {' '}con <span className="font-bold">{item.calificacion}★</span>
                      </>
                    ) : item.tipo === 'coleccion_completada' ? (
                      <>
                        completó la colección <span className="feed-card-entity">{item.referencia_info?.nombre}</span>
                      </>
                    ) : item.tipo === 'insignia_obtenida' ? (
                      <>
                        obtuvo la insignia{' '}
                        <Link to={`/badge/${item.referencia_id}`} className="feed-card-entity">
                          {item.referencia_info?.nombre || 'Insignia'}
                        </Link>
                      </>
                    ) : item.tipo === 'nuevo_seguidor' ? (
                      <>
                        fue seguido por{' '}
                        <Link to={`/profile/${item.referencia_id}`} className="feed-card-entity">
                          {item.referencia_info?.username || 'Usuario'}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  <div className="feed-card-date">
                    {new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
}).format(new Date(item.fecha))
}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <div className="mt-8">
        <h4 className="text-xl font-bold mb-2">Pendientes de valorar de tus artistas seguidos</h4>
        {['artista', 'album', 'cancion', 'video'].map(tipo => (
          pendientesAgrupados[tipo].length > 0 && (
            <div key={tipo} className="pendientes-grupo">
              <div className="pendientes-titulo">
                {tipo === 'artista' ? 'Artistas' : tipo === 'album' ? 'Álbumes' : tipo === 'cancion' ? 'Canciones' : 'Videos Musicales'}
              </div>
              <div className="pendientes-lista">
                {pendientesAgrupados[tipo].map(item => (
                  <div key={`${item.tipo}-${item.id}`} className="pendiente-card">
                    <Link to={`/${item.tipo === 'album' ? 'album' : item.tipo === 'cancion' ? 'song' : item.tipo === 'video' ? 'video' : 'artist'}/${item.id}`}>
                      <img src={
                          item.foto || '/default.png'
                        } alt={item.titulo} />
                      <div>{item.titulo}</div>
                      <div className="pendiente-tipo">{tipo === 'artista' ? 'Artista' : tipo === 'album' ? 'Álbum' : tipo === 'cancion' ? 'Canción' : 'Video Musical'}</div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

ParaTiFeed.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number.isRequired,
  }).isRequired,
};

export default ParaTiFeed;
