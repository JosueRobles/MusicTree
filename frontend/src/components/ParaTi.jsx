import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const API_URL = "http://localhost:5000";

const ParaTiFeed = ({ usuario }) => {
  const [actividad, setActividad] = useState([]);

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

    fetchFeedActividad();
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
              ) : item.tipo === 'valoracion' ? (
                <>
                  valoró <strong>{item.tipo_entidad}</strong> {item.nombre_entidad} con {item.calificacion}★
                </>
              ) : item.tipo === 'coleccion_completada' ? (
                <>
                  completó la colección <strong>{item.referencia_info?.nombre}</strong>
                </>
              ) : item.tipo === 'insignia_obtenida' ? (
                <>
                  obtuvo la insignia <strong>{item.referencia_info?.nombre}</strong>
                </>
              ) : null}
              <p className="text-sm text-gray-500">
                Fecha: {new Date(item.fecha).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
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
