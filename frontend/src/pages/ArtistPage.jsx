import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const ArtistPage = ({ usuario }) => {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const artistResponse = await axios.get(`${API_URL}/artistas/${id}`);
        setArtist(artistResponse.data.artista);

        const albumsResponse = await axios.get(`${API_URL}/albumes`);
        const artistAlbums = albumsResponse.data.filter(album => album.artista_id === parseInt(id));
        setAlbums(artistAlbums);

        const songsResponse = await axios.get(`${API_URL}/canciones`);
        const artistSongs = songsResponse.data.filter(song => artistAlbums.some(album => album.ID_album === song.album));
        setSongs(artistSongs);
      } catch (error) {
        console.error('Error fetching artist data:', error);
      }
    };

    fetchArtistData();
  }, [id]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario_id: usuario.id,
          entidad_tipo: 'artista',
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
      {artist && (
        <>
          <h2 className="text-4xl font-bold my-4">{artist.nombre_artista}</h2>
          <img src={artist.foto_artista} alt={artist.nombre_artista} className="w-64 h-64 object-cover rounded-full" />
          <p className="mt-4">{artist.biografia}</p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
          ) : (
            <p>Inicia sesión para valorar</p>
          )}
          <h3 className="text-2xl font-bold mt-8">Álbumes</h3>
          <ul>
            {albums.map(album => (
              <li key={album.ID_album}>
                <Link to={`/album/${album.ID_album}`}>
                  <img src={album.foto_album} alt={album.titulo} className="w-32 h-32 object-cover" />
                  {album.titulo}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Canciones</h3>
          <ul>
            {songs.map(song => (
              <li key={song.ID_cancion}>
                <Link to={`/song/${song.ID_cancion}`}>{song.titulo}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

ArtistPage.propTypes = {
  usuario: PropTypes.object,
};

export default ArtistPage;