import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const API_URL = "http://localhost:5000";

const ParaTiFeed = ({ usuario }) => {
  const [actividad, setActividad] = useState([]);
  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    const fetchFeedActividad = async () => {
      try {
        const response = await axios.get(`${API_URL}/feed-actividad?usuarioId=${usuario.id_usuario}&limit=30`);
        const data = response.data;

        setActividad(data);
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

  if (!usuario) return null;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">Actividad de quienes sigues</h3>
      {actividad.length === 0 ? (
        <p>No hay actividad reciente de seguimientos.</p>
      ) : (
        <ul>
          {actividad.map((item, index) => (
            <li key={index} className="border p-2 rounded mb-2">
              <Link to={`/profile/${item.usuario_info?.id_usuario}`} className="font-bold">
                {item.usuario_info?.username || 'Usuario desconocido'}
              </Link>{' '}
              {item.tipo === 'seguimiento' ? (
                <>
                  comenzó a seguir{' '}
                  <Link to={`/profile/${item.referencia_info?.id_usuario}`} className="font-bold">
                    {item.referencia_info?.username || 'Usuario desconocido'}
                  </Link>
                </>
              ) : item.tipo === 'seguimiento_artista' ? (
                <>
                  comenzó a seguir al artista{' '}
                  <Link to={`/artist/${item.referencia_id}`} className="font-bold">
                    {item.referencia_info?.nombre_artista || 'Artista'}
                  </Link>
                </>
              ) : item.tipo === 'valoracion' ? (
                <>
                  valoró <strong>{item.tipo_entidad}</strong>{' '}
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
                    className="font-bold underline"
                  >
                    {item.nombre_entidad}
                  </Link>
                  {' '}con <span className="font-bold">{item.calificacion}★</span>
                </>
              ) : item.tipo === 'coleccion_completada' ? (
                <>
                  completó la colección <strong>{item.referencia_info?.nombre}</strong>
                </>
              ) : item.tipo === 'insignia_obtenida' ? (
                <>
                  obtuvo la insignia{' '}
                  <Link to={`/badge/${item.referencia_id}`} className="font-bold underline">
                    {item.referencia_info?.nombre || 'Insignia'}
                  </Link>
                </>
              ) : item.tipo === 'nuevo_seguidor' ? (
                <>
                  fue seguido por{' '}
                  <Link to={`/profile/${item.referencia_id}`} className="font-bold">
                    {item.referencia_info?.username || 'Usuario'}
                  </Link>
                </>
              ) : null}
              <p className="text-sm text-gray-500">
                Fecha: {new Date(item.fecha).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {pendientes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xl font-bold mb-2">Pendientes de valorar de tus artistas seguidos</h4>
          <ul className="flex flex-wrap gap-4">
            {pendientes.map(item => (
              <li key={`${item.tipo}-${item.id}`}>
                <Link to={`/${item.tipo === 'album' ? 'album' : item.tipo === 'cancion' ? 'song' : 'video'}/${item.id}`}>
                  <img src={item.foto || '/default.png'} alt={item.titulo} style={{ width: 48, borderRadius: 8 }} />
                  <div>{item.titulo}</div>
                  <span className="text-xs">{item.tipo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

ParaTiFeed.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number.isRequired,
  }).isRequired,
};

export default ParaTiFeed;
