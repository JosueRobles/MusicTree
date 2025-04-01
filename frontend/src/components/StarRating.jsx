import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import treeEmpty from '../assets/tree_empty.png';
import treeFilled from '../assets/tree_filled.png';
import starEmpty from '../assets/star_empty.png';
import starHalf from '../assets/star_half.png';
import starFilled from '../assets/star_filled.png';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const StarRating = ({ valoracionInicial = 0, onRatingChange, entidadTipo, entidadId, usuario }) => {
  const [rating, setRating] = useState(valoracionInicial);
  const [hovered, setHovered] = useState(null);
  const [comentario, setComentario] = useState('');
  const [emocion, setEmocion] = useState('');
  const [emocionesCount, setEmocionesCount] = useState({});

  useEffect(() => {
    setRating(valoracionInicial);
  }, [valoracionInicial]);

  useEffect(() => {
    const fetchData = async () => {
      if (usuario) {
        try {
          const { data } = await axios.get(`${API_URL}/valoraciones`, {
            params: {
              usuario: usuario.id_usuario,
              entidad_tipo: entidadTipo,
              entidad_id: entidadId
            }
          });
          setComentario(data.comentario || '');
          setEmocion(data.emocion || '');

          const emocionesResponse = await axios.get(`${API_URL}/emociones`, {
            params: {
              entidad_tipo: entidadTipo,
              entidad_id: entidadId
            }
          });
          const emocionesData = emocionesResponse.data.emociones.reduce((acc, item) => {
            acc[item.emocion] = item.count;
            return acc;
          }, {});
          setEmocionesCount(emocionesData);
        } catch (error) {
          console.error('Error fetching rating data:', error);
        }
      }
    };
    fetchData();
  }, [usuario, entidadTipo, entidadId]);

  const handleRating = (newRating) => {
    if (newRating >= 0 && newRating <= 5) {
      setRating(newRating);
      onRatingChange(newRating);
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

  const handleAgregarComentario = async () => {
    if (!usuario || !comentario) return;

    try {
      await axios.post(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        comentario
      });
      alert('Comentario agregado correctamente');
    } catch (error) {
      console.error('Error al agregar el comentario:', error);
    }
  };

  const handleEliminarComentario = async () => {
    if (!usuario) return;

    try {
      await axios.post(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        comentario: ''  // Eliminar comentario
      });
      setComentario('');
      alert('Comentario eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar el comentario:', error);
    }
  };

  const handleAgregarEmocion = async (newEmocion) => {
    if (!usuario || !newEmocion) return;

    try {
      await axios.put(`${API_URL}/emociones`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        emocion: newEmocion
      });
      setEmocion(newEmocion);
      setEmocionesCount(prev => ({ ...prev, [newEmocion]: (prev[newEmocion] || 0) + 1 }));
      alert('Emoción agregada/modificada correctamente');
    } catch (error) {
      console.error('Error al agregar la emoción:', error);
    }
  };

  const handleEliminarEmocion = async () => {
    if (!usuario) return;

    try {
      await axios.delete(`${API_URL}/emociones`, {
        data: {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId
        }
      });
      setEmocion('');
      alert('Emoción eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la emoción:', error);
    }
  };

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
        {renderIcon(0)}
        {[1, 2, 3, 4, 5].map(renderIcon)}
        <div className="ml-2 text-green-500 font-bold">
          {rating} ⭐
        </div>
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Agregar comentario..."
            className="border p-2 mt-4 w-full"
          />
          {!comentario ? (
            <button onClick={handleAgregarComentario} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
              Agregar Comentario
            </button>
          ) : (
            <button onClick={handleEliminarComentario} className="bg-red-500 text-white px-4 py-2 rounded mt-2">
              Eliminar Comentario
            </button>
          )}
          <div className="flex mt-4">
            {['alegria', 'tristeza', 'energia', 'relajacion', 'romance', 'enojo', 'inspiracion', 'nostalgia'].map((em) => (
              <div key={em} className="flex items-center">
                <img
                  src={`/emojis/${em}.png`}
                  alt={em}
                  className={`w-8 h-8 cursor-pointer mx-1 ${em === emocion ? 'border border-blue-500' : ''}`}
                  onClick={() => handleAgregarEmocion(em)}
                />
                <span className="ml-1 text-sm">{emocionesCount[em] || 0}</span>
              </div>
            ))}
          </div>
          {emocion && (
            <button onClick={handleEliminarEmocion} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
              Eliminar Emoción
            </button>
          )}
          <button onClick={handleEliminarValoracion} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
            Eliminar Valoración
          </button>
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
  handleEliminarValoracion: PropTypes.func.isRequired,
  handleAgregarComentario: PropTypes.func.isRequired,
  handleEliminarComentario: PropTypes.func.isRequired,
  handleAgregarEmocion: PropTypes.func.isRequired,
  handleEliminarEmocion: PropTypes.func.isRequired,
};

export default StarRating;