import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const SongPage = ({ usuario }) => {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const fetchSongData = async () => {
      try {
        const response = await axios.get(`${API_URL}/canciones/${id}`);
        setSong(response.data);
      } catch (error) {
        console.error('Error fetching song data:', error);
      }
    };

    fetchSongData();
  }, [id]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        // Asegurarse de enviar el token de autenticación
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario_id: usuario.id,
          entidad_tipo: "cancion",  // ✅ Asegurar que el controlador lo reconozca
          entidad_id: id,  // ✅ Esto es lo que el backend espera
          calificacion: newRating,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });        
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

  return (
    <div className="pt-16 p-4">
      {song && (
        <>
          <h2 className="text-4xl font-bold my-4">{song.titulo}</h2>
          <p>Duración: {Math.floor(song.duracion_ms / 60000)}:{((song.duracion_ms % 60000) / 1000).toFixed(0).padStart(2, '0')} minutos</p>
          <p>Popularidad: {song.popularidad}</p>
          <p>Preview: <a href={song.preview_url} target="_blank" rel="noopener noreferrer">{song.preview_url}</a></p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
          ) : (
            <p>Inicia sesión para valorar</p>
          )}
        </>
      )}
    </div>
  );
};

SongPage.propTypes = {
  usuario: PropTypes.object,
};

export default SongPage;