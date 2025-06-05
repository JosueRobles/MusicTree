import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import treeEmpty from '../assets/tree_empty.png';
import treeFilled from '../assets/tree_filled.png';
import starEmpty from '../assets/star_empty.png';
import starHalf from '../assets/star_half.png';
import starFilled from '../assets/star_filled.png';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const StarRating = ({
  valoracionInicial = 0,
  onRatingChange,
  entidadTipo,
  entidadId,
  usuario,
}) => {
  const [rating, setRating] = useState(valoracionInicial);
  const [hovered, setHovered] = useState(null);
  const [comentario, setComentario] = useState('');
  const [comentarioGuardado, setComentarioGuardado] = useState(false);
  const [emocion, setEmocion] = useState('');
  const [emocionesCount, setEmocionesCount] = useState({});

  useEffect(() => {
    setRating(valoracionInicial);
  }, [valoracionInicial]);

  useEffect(() => {
    const fetchEmociones = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/emociones`, {
          params: { entidad_tipo: entidadTipo, entidad_id: entidadId },
        });

        const emocionesData = data.reduce((acc, item) => {
          acc[item.emocion] = item.count || 0;
          return acc;
        }, {});
        setEmocionesCount(emocionesData);
      } catch (error) {
        console.error('Error fetching emotions data:', error);
      }
    };

    fetchEmociones();
  }, [entidadTipo, entidadId]);

  useEffect(() => {
    const fetchData = async () => {
      if (usuario) {
        try {
          const { data } = await axios.get(`${API_URL}/valoraciones`, {
            params: {
              usuario: usuario.id_usuario,
              entidad_tipo: entidadTipo,
              entidad_id: entidadId,
            },
          });
          setComentario(data.comentario || '');
          setComentarioGuardado(!!data.comentario);
          setEmocion(data.emocion || '');

          const emocionesResponse = await axios.get(`${API_URL}/emociones`, {
            params: {
              entidad_tipo: entidadTipo,
              entidad_id: entidadId,
            },
          });

          if (Array.isArray(emocionesResponse.data)) {
            const emocionesData = emocionesResponse.data.reduce((acc, item) => {
              acc[item.emocion] = item.count;
              return acc;
            }, {});
            setEmocionesCount(emocionesData);
          } else {
            setEmocionesCount({});
          }
        } catch (error) {
          console.error('Error fetching rating data:', error);
        }
      }
    };
    fetchData();
  }, [usuario, entidadTipo, entidadId]);

  const handleRating = async (newRating) => {
    if (newRating >= 0 && newRating <= 5) {
      setRating(newRating);
      onRatingChange(newRating);

      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          calificacion: newRating,
          comentario,
          emocion,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

  const handleComentario = async () => {
    if (!comentario.trim()) {
      alert('El comentario no puede estar vacío.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        comentario,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setComentarioGuardado(true);
      alert('Comentario agregado correctamente.');
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  };

  const handleEliminarEmocion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/emociones`, {
        data: {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          emocion,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      // Actualizar el estado para reflejar la eliminación
      setEmocion('');
      setEmocionesCount((prevState) => ({
        ...prevState,
        [emocion]: Math.max((prevState[emocion] || 1) - 1, 0),
      }));
  
      alert('Emoción eliminada correctamente.');
    } catch (error) {
      console.error('Error al eliminar emoción:', error);
    }
  };

  const handleAgregarOReemplazarEmocion = async (emocionSeleccionada) => {
    try {
      const token = localStorage.getItem('token');
  
      if (emocion === emocionSeleccionada) {
        alert('Ya has seleccionado esta emoción.');
        return;
      }
  
      await axios.put(
        `${API_URL}/emociones`,
        {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          emocion: emocionSeleccionada,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      // Actualizar el estado con la nueva emoción
      setEmocion(emocionSeleccionada);
  
      // Incrementar el contador de la nueva emoción y decrementar la anterior
      setEmocionesCount((prevState) => ({
        ...prevState,
        [emocionSeleccionada]: (prevState[emocionSeleccionada] || 0) + 1,
        [emocion]: Math.max((prevState[emocion] || 1) - 1, 0),
      }));
  
      alert('Emoción modificada correctamente.');
    } catch (error) {
      console.error('Error al modificar emoción:', error);
    }
  };

  const handleEliminarComentario = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setComentario('');
      setComentarioGuardado(false);
      alert('Comentario eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
    }
  };

  const handleClick = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const isHalfStar = clickPosition < rect.width / 2;
    const newRating = isHalfStar ? value - 0.5 : value;
    handleRating(newRating);
  };

  const handleMouseMove = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const hoverPosition = event.clientX - rect.left;
    const isHalfStar = hoverPosition < rect.width / 2;
    setHovered(isHalfStar ? value - 0.5 : value);
  };

  const handleMouseLeave = () => setHovered(null);

  const renderIcon = (value) => {
    const currentRating = hovered !== null ? hovered : rating;
    let iconSrc;

    if (value === 0) {
      iconSrc = currentRating === 0 ? treeFilled : treeEmpty;
    } else {
      if (value <= currentRating) {
        iconSrc = starFilled;
      } else if (currentRating > value - 1 && currentRating < value) {
        iconSrc = starHalf;
      } else {
        iconSrc = starEmpty;
      }
    }

    return (
      <div
        key={value}
        onClick={(e) => handleClick(e, value)}
        onMouseMove={(e) => handleMouseMove(e, value)}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
        style={{ width: '24px', height: '24px', display: 'inline-block' }}
      >
        <img src={iconSrc} alt={value === 0 ? 'Tree' : 'Star'} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4, 5].map(renderIcon)}
        <div className="ml-2 text-green-500 font-bold">{rating} ⭐</div>
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Agregar comentario..."
            className="border p-2 mt-4 w-full"
          />
          {comentarioGuardado ? (
            <button onClick={handleEliminarComentario} className="bg-red-500 text-white px-4 py-2 rounded mt-2">
              Eliminar Comentario
            </button>
          ) : (
            <button onClick={handleComentario} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
              Agregar Comentario
            </button>
          )}
          <div className="flex mt-4">
          <div className="emocion-container">
          {['alegria', 'tristeza', 'energia', 'relajacion', 'romance', 'enojo', 'inspiracion', 'nostalgia'].map((em) => (
            <div key={em} className="emocion-item">
              <img
                src={`/emojis/${em}.png`}
                alt={em}
                className={em === emocion ? 'selected' : ''}
                onClick={() => handleAgregarOReemplazarEmocion(em)}
              />
              <span className="emocion-count">{emocionesCount[em] || 0}</span>
            </div>
          ))}
        </div>
          </div>
          {emocion && (
            <button onClick={handleEliminarEmocion} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
              Eliminar Emoción
            </button>
          )}
        </>
      )}
    </div>
  );
};

StarRating.propTypes = {
  valoracionInicial: PropTypes.number,
  onRatingChange: PropTypes.func.isRequired,
  entidadTipo: PropTypes.string.isRequired,
  entidadId: PropTypes.number.isRequired,
  usuario: PropTypes.object.isRequired,
};

export default StarRating;