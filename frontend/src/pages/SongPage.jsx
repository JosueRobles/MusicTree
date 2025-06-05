import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const SongPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [artists, setArtists] = useState([]);
  const [album, setAlbum] = useState(null);
  const [genres, setGenres] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [valoracionesUsuarios, setValoracionesUsuarios] = useState([]); // Valoraciones globales
  const [emocion, setEmocion] = useState('');

  useEffect(() => {
    const fetchSongData = async () => {
      try {
        const songResponse = await axios.get(`${API_URL}/canciones/${id}`);
        setSong(songResponse.data);

        const artistsResponse = await axios.get(`${API_URL}/relaciones/canciones/${id}/artistas`);
        setArtists(Array.isArray(artistsResponse.data) ? artistsResponse.data : []);

        const albumResponse = await axios.get(`${API_URL}/relaciones/canciones/${id}/album`);
        setAlbum(albumResponse.data.album);

        const genresResponse = await axios.get(`${API_URL}/relaciones/canciones/${id}/generos`);
        setGenres(Array.isArray(genresResponse.data) ? genresResponse.data : []);

        if (usuario) {
          // Obtener valoración promedio
          const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'cancion',
              entidad_id: parseInt(id, 10),
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);

          // Obtener listas del usuario
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'cancion');
          setListas(listasFiltradas);

          // Verificar si la canción ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10),
            entidad_tipo: 'cancion',
          });
          setAlreadyInList(existsResponse.data.exists);

          // Obtener valoraciones globales
          const valoracionesResponse = await axios.get(`${API_URL}/valoraciones/globales`, {
            params: {
              entidad_tipo: 'cancion',
              entidad_id: parseInt(id, 10),
            },
          });
          setValoracionesUsuarios(valoracionesResponse.data || []);
        }
      } catch (error) {
        console.error('Error fetching song data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSongData();
  }, [id, usuario]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'cancion',
          entidad_id: parseInt(id, 10),
          calificacion: newRating,
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

  const handleAddToList = async () => {
    if (selectedLista) {
      try {
        await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
          userId: usuario.id_usuario,
          listaId: selectedLista,
          entidad_id: parseInt(id, 10),
          entidad_tipo: 'cancion',
        });
        alert('Canción añadida a la lista');
      } catch (error) {
        console.error('Error adding song to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  return (
    <div className="pt-16 p-4">
      {loading ? (
        <p>Cargando...</p>
      ) : song ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">{song.titulo}</h2>
          <p className="text-center">Duración: {Math.floor(song.duracion_ms / 60000)}:{((song.duracion_ms % 60000) / 1000).toFixed(0).padStart(2, '0')} minutos</p>
          <p className="text-center">Popularidad: {song.popularidad}</p>
          <div className="flex items-center justify-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
          </div>
          {usuario && (
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="cancion"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
          )}

          <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
          <ul>
            {valoracionesUsuarios.map((valoracion, index) => (
              <li key={index}>
                <p>
                  <strong>Usuario:</strong>{' '}
                  <Link to={valoracion.usuarios?.foto_perfil || '#'}>{valoracion.usuarios?.nombre || valoracion.usuario}</Link>
                </p>
                <p><strong>Calificación:</strong> {valoracion.calificacion} ⭐</p>
                <p><strong>Comentario:</strong> {valoracion.comentario || 'Sin comentario'}</p>
                <p><strong>Emoción:</strong> {valoracion.emocion || 'Sin emoción'}</p>
              </li>
            ))}
          </ul>

          {usuario && (
              <div className="mt-4">
                {listas.filter(lista => lista.entidades.some(entidad => entidad.id === id)).length > 0 ? (
                  <p>Esta entidad ya está en una de tus listas.</p>
                ) : listas.length > 0 ? (
                  <>
                    <select value={selectedLista} onChange={(e) => setSelectedLista(e.target.value)}>
                      <option value="">Selecciona una lista</option>
                      {listas.map(lista => (
                        <option key={lista.id_lista} value={lista.id_lista}>{lista.nombre_lista}</option>
                      ))}
                    </select>
                    <button onClick={handleAddToList}>Añadir a Lista</button>
                  </>
                ) : (
                  <button onClick={() => navigate('/lists')}>Crear una nueva lista</button>
                )}
              </div>
            )}

          <h3 className="text-2xl font-bold mt-8">Géneros</h3>
          <ul className="text-center">
            {genres.map((genre) => (
              <li key={genre.id_genero}>{genre.nombre}</li>
            ))}
          </ul>

          <h3 className="text-2xl font-bold mt-8">Artistas</h3>
          <ul className="grid grid-cols-3 gap-4">
            {artists.map((artist) => (
              <li key={artist.id_artista} className="flex flex-col items-center">
                <img
                  src={artist.foto_artista}
                  alt={artist.nombre_artista}
                  className="w-32 h-32 object-cover rounded-full"
                />
                <Link to={`/artist/${artist.id_artista}`} className="mt-2">{artist.nombre_artista}</Link>
              </li>
            ))}
          </ul>

          {album && (
            <>
              <h3 className="text-2xl font-bold mt-8">Álbum</h3>
              <p className="text-center">
                <Link to={`/album/${album.id_album}`}>
                  {album.titulo} ({album.anio})
                </Link>
              </p>
            </>
          )}
        </>
      ) : (
        <p>Canción no encontrada.</p>
      )}
    </div>
  );
};

SongPage.propTypes = {
  usuario: PropTypes.object,
};

export default SongPage;