import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const AlbumPage = ({ usuario }) => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const response = await axios.get(`${API_URL}/albumes/${id}`);
        setAlbum(response.data.album);
        setSongs(response.data.canciones);
      } catch (error) {
        console.error('Error fetching album data:', error);
      }
    };

    fetchAlbumData();
  }, [id]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario_id: usuario.id,
          entidad_tipo: 'album',
          entidad_id: id,
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
      {album && (
        <>
          <h2 className="text-4xl font-bold my-4">{album.titulo}</h2>
          <img src={album.foto_album} alt={album.titulo} className="w-64 h-64 object-cover rounded" />
          <p>Año: {album.anio}</p>
          <p>Número de canciones: {album.numero_canciones}</p>
          <p>Popularidad: {album.popularidad_album}</p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
          ) : (
            <p>Inicia sesión para valorar</p>
          )}
          <h3 className="text-2xl font-bold mt-8">Canciones</h3>
          <ul>
            {songs.map(song => (
              <li key={song.ID_cancion}>
                {song.titulo}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

AlbumPage.propTypes = {
  usuario: PropTypes.object,
};

export default AlbumPage;