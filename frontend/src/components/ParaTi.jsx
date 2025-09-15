import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import ValoracionComentarioEntidad from './ValoracionComentarioEntidad';

const API_URL = import.meta.env.VITE_API_URL;

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
  const [pendientesAgrupados, setPendientesAgrupados] = useState({
    artista: [],
    album: [],
    cancion: [],
    video: [],
  });
  const [albumesPendientes, setAlbumesPendientes] = useState([]);
  const [albumOffset, setAlbumOffset] = useState(0);
  const [cancionesPendientes, setCancionesPendientes] = useState([]);
  const [cancionOffset, setCancionOffset] = useState(0);
  const [videosPendientes, setVideosPendientes] = useState([]);
  const [videoOffset, setVideoOffset] = useState(0);

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

    // Agrupa por grupo y prioriza popularidad
    function agruparPorCluster(pendientes, tipo, clustersMap, popularidadMap) {
      const porGrupo = {};
      pendientes.forEach(item => {
        const grupo = clustersMap[item.id] || item.id; // Si no hay cluster, usa id único
        if (!porGrupo[grupo] || (popularidadMap[item.id] > popularidadMap[porGrupo[grupo].id])) {
          porGrupo[grupo] = item;
        }
      });
      // Devuelve solo los más populares, máximo 10
      return Object.values(porGrupo).sort((a, b) => (popularidadMap[b.id] || 0) - (popularidadMap[a.id] || 0)).slice(0, 10);
    }

    const fetchPendientesValoracion = async () => {
      try {
        const response = await axios.get(`${API_URL}/catalogos/pendientes-valoracion/${usuario.id_usuario}`);
        const pendientes = response.data;

        // Trae clusters y popularidad para cada tipo
        const [cancionClusters, albumClusters, videoClusters] = await Promise.all([
          axios.get(`${API_URL}/canciones/cancion_clusters`),
          axios.get(`${API_URL}/albumes/album_clusters`),
          axios.get(`${API_URL}/videos/video_clusters`)
        ]);
        const cancionClusterMap = Object.fromEntries(cancionClusters.data.map(c => [c.id_cancion, c.grupo]));
        const albumClusterMap = Object.fromEntries(albumClusters.data.map(a => [a.id_album, a.grupo]));
        const videoClusterMap = Object.fromEntries(videoClusters.data.map(v => [v.id_video, v.grupo]));

        // Popularidad
        const cancionPopMap = Object.fromEntries(pendientes.filter(p => p.tipo === "cancion").map(c => [c.id, c.popularidad || 0]));
        const albumPopMap = Object.fromEntries(pendientes.filter(p => p.tipo === "album").map(a => [a.id, a.popularidad || 0]));
        const videoPopMap = Object.fromEntries(pendientes.filter(p => p.tipo === "video").map(v => [v.id, v.popularidad || 0]));

        // Agrupa y limita
        const pendientesAgrupados = {
          artista: pendientes.filter(p => p.tipo === "artista").slice(0, 10),
          album: agruparPorCluster(pendientes.filter(p => p.tipo === "album"), "album", albumClusterMap, albumPopMap),
          cancion: agruparPorCluster(pendientes.filter(p => p.tipo === "cancion"), "cancion", cancionClusterMap, cancionPopMap),
          video: agruparPorCluster(pendientes.filter(p => p.tipo === "video"), "video", videoClusterMap, videoPopMap),
        };
        setPendientesAgrupados(pendientesAgrupados);
      } catch (error) {
        console.error('Error fetching pendientes valoracion:', error);
      }
    };

    fetchFeedActividad();
    fetchPendientesValoracion();
    fetchMasAlbumes();
    fetchMasCanciones();
    fetchMasVideos();
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

  const fetchMasAlbumes = async () => {
    const res = await axios.get(`${API_URL}/catalogos/pendientes-valoracion/${usuario.id_usuario}?tipo=album&offset=${albumOffset}&limit=10`);
    setAlbumesPendientes(prev => [...prev, ...res.data]);
    setAlbumOffset(prev => prev + 10);
  };

  const fetchMasCanciones = async () => {
    const res = await axios.get(`${API_URL}/catalogos/pendientes-valoracion/${usuario.id_usuario}?tipo=cancion&offset=${cancionOffset}&limit=10`);
    setCancionesPendientes(prev => [...prev, ...res.data]);
    setCancionOffset(prev => prev + 10);
  };

  const fetchMasVideos = async () => {
    const res = await axios.get(`${API_URL}/catalogos/pendientes-valoracion/${usuario.id_usuario}?tipo=video&offset=${videoOffset}&limit=10`);
    setVideosPendientes(prev => [...prev, ...res.data]);
    setVideoOffset(prev => prev + 10);
  };

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

        {/* Artistas (solo agrupados) */}
        {pendientesAgrupados.artista.length > 0 && (
          <div className="pendientes-grupo">
            <div className="pendientes-titulo">Artistas</div>
            <div className="pendientes-lista">
              {pendientesAgrupados.artista.map(item => (
                <div key={`artista-${item.id}`} className="pendiente-card">
                  <Link to={`/artist/${item.id}`}>
                    <img src={item.foto || '/default.png'} alt={item.titulo} />
                    <div>{item.titulo}</div>
                    <div className="pendiente-tipo">Artista</div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Álbumes */}
        {(pendientesAgrupados.album.length > 0 || albumesPendientes.length > 0) && (
          <div className="pendientes-grupo">
            <div className="pendientes-titulo">Álbumes</div>
            {/* Álbumes */}
            <div className="pendientes-lista">
              {[...pendientesAgrupados.album, ...albumesPendientes].map(item => (
                <div key={`album-${item.referencia_id}`} className="pendiente-card">
                  <Link to={`/album/${item.referencia_id}`}>
                    <img src={item.referencia_info?.foto_album || '/default.png'} alt={item.referencia_info?.titulo} />
                    <div>{item.referencia_info?.titulo}</div>
                    <div className="pendiente-tipo">Álbum</div>
                  </Link>
                </div>
              ))}
            </div>
            <button onClick={fetchMasAlbumes} className="btn-ver-mas mt-2">
              Ver más álbumes pendientes
            </button>
          </div>
        )}

        {/* Canciones */}
        {(pendientesAgrupados.cancion.length > 0 || cancionesPendientes.length > 0) && (
          <div className="pendientes-grupo">
            <div className="pendientes-titulo">Canciones</div>
            <div className="pendientes-lista">
              {[...pendientesAgrupados.cancion, ...cancionesPendientes].map(item => (
                <div key={`cancion-${item.referencia_id}`} className="pendiente-card">
                  <Link to={`/song/${item.referencia_id}`}>
                    <img src={item.referencia_info?.foto || '/default-song.png'} alt={item.referencia_info?.titulo} />
                    <div>{item.referencia_info?.titulo}</div>
                    <div className="pendiente-tipo">Canción</div>
                  </Link>
                </div>
              ))}
            </div>
            <button onClick={fetchMasCanciones} className="btn-ver-mas mt-2">
              Ver más canciones pendientes
            </button>
          </div>
        )}

        {/* Videos */}
        {(pendientesAgrupados.video.length > 0 || videosPendientes.length > 0) && (
          <div className="pendientes-grupo">
            <div className="pendientes-titulo">Videos Musicales</div>
            <div className="pendientes-lista">
              {[...pendientesAgrupados.video, ...videosPendientes].map(item => (
                <div key={`video-${item.referencia_id}`} className="pendiente-card">
                  <Link to={`/video/${item.referencia_id}`}>
                    <img src={item.referencia_info?.miniatura || '/default.png'} alt={item.referencia_info?.titulo} />
                    <div>{item.referencia_info?.titulo}</div>
                    <div className="pendiente-tipo">Video Musical</div>
                  </Link>
                </div>
              ))}
            </div>
            <button onClick={fetchMasVideos} className="btn-ver-mas mt-2">
              Ver más videos pendientes
            </button>
          </div>
        )}
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