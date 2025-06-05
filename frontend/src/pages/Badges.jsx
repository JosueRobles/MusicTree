import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const Badges = ({ usuario }) => {
  const [insignias, setInsignias] = useState([]);
  const [insigniasUsuario, setInsigniasUsuario] = useState([]);
  const [newBadge, setNewBadge] = useState(null);

  useEffect(() => {
    const fetchInsignias = async () => {
      try {
        const response = await axios.get('/api/insignias');
        if (Array.isArray(response.data)) {
          setInsignias(response.data);
        } else {
          console.error('Error: La respuesta de insignias no es una matriz');
          setInsignias([]); // Asigna una matriz vacía en caso de error
        }
      } catch (error) {
        console.error('Error fetching insignias:', error);
        setInsignias([]); // Asigna una matriz vacía en caso de error
      }
    };

    const fetchInsigniasUsuario = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`/api/insignias/usuario/${usuario.id_usuario}`);
          setInsigniasUsuario(response.data);

          // Check for new badges
          response.data.forEach(insignia => {
            if (!insigniasUsuario.find(existingInsignia => existingInsignia.insignia_id === insignia.insignia_id)) {
              setNewBadge(insignia);
            }
          });
        } catch (error) {
          console.error('Error fetching user insignias:', error);
        }
      }
    };

    fetchInsignias();
    fetchInsigniasUsuario();
  }, [usuario]);

  useEffect(() => {
    if (newBadge) {
      const audio = new Audio('/path/to/sound.mp3');
      audio.play();
    }
  }, [newBadge]);

  const obtenerInsigniaUsuario = (insigniaId) => {
    return insigniasUsuario.find((insignia) => insignia.insignia_id === insigniaId);
  };

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Insignias</h2>
        {usuario ? (
          <div className="insignias-grid">
            {Array.isArray(insignias) && insignias.length > 0 ? (
              insignias.map((insignia) => (
                <div key={insignia.id_insignia} className="insignia">
                  <img src={insignia.icono} alt={insignia.nombre} />
                  <h3>{insignia.nombre}</h3>
                  <p>{insignia.descripcion}</p>
                  {obtenerInsigniaUsuario(insignia.id_insignia) ? (
                    <p className="text-green-500">Obtenida</p>
                  ) : (
                    <p className="text-red-500">No obtenida</p>
                  )}
                </div>
              ))
            ) : (
              <p>No hay insignias disponibles.</p>
            )}
          </div>
        ) : (
          <div>
            <p>¡Inicia sesión o crea una cuenta para comenzar a obtener insignias!</p>
            <p>Las insignias son una forma divertida de reconocer tus logros y participación en MusicTree. ¡Empieza hoy mismo!</p>
          </div>
        )}
      </main>
    </div>
  );
};

Badges.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number,
  }),
};

export default Badges;