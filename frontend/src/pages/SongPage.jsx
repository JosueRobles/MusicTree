import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';
import ValoracionComentario from '../components/ValoracionComentario';
import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'; // Instala react-icons si no lo tienes

const API_URL = import.meta.env.VITE_API_URL;

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
  const [valoradas, setValoradas] = useState([]);
  const [posicionRanking, setPosicionRanking] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [listasDestacadas, setListasDestacadas] = useState([]);
  const [grupoUniversal, setGrupoUniversal] = useState(null);
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [infoCanciones, setInfoCanciones] = useState({});
  const [showHistorial, setShowHistorial] = useState(false);
  const [albumSongs, setAlbumSongs] = useState([]);

  const valoradasEnGrupo = useMemo(() => {
  return miembrosGrupo.filter(mid => valoradas.includes(`cancion-${mid}`));
}, [miembrosGrupo, valoradas]);

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

        // Obtener valoración promedio
          const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'cancion',
              entidad_id: parseInt(id, 10),
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);
          
        if (usuario) {
          // Obtener listas del usuario
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/colaborativas-o-propias/${usuario.id_usuario}`);
                    const listasFiltradas = listasResponse.data.filter(
                      lista =>
                        lista.tipo_lista === 'cancion' &&
                        (
                          lista.usuario_id === usuario.id_usuario ||
                          (lista.privacidad === 'colaborativa' && ['agregar', 'admin', 'eliminar'].includes(lista.rol_colaborador))
                        )
                    );
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
          setValoracionesUsuarios(Array.isArray(valoracionesResponse.data) ? valoracionesResponse.data : []);
        }
      } catch (error) {
        console.error('Error fetching song data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSongData();
  }, [id, usuario]);

  useEffect(() => {
  axios.get(`${API_URL}/listas-personalizadas/destacadas-por-entidad`, {
    params: { entidad_id: id, entidad_tipo: 'cancion' }
  }).then(res => setListasDestacadas(res.data));
}, [id]);

const handleAddToList = async () => {
  if (selectedLista) {
    try {
      await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
        userId: usuario.id_usuario,
        listaId: selectedLista,
        entidad_id: parseInt(id, 10),
        entidad_tipo: 'cancion',
      });
      alert('Cancion añadida a la lista');
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data &&
        error.response.data.error &&
        error.response.data.error.includes('ya existe')
      ) {
        alert('Esta cancion ya está en la lista seleccionada.');
      } else {
        alert('Error al añadir la cancion a la lista.');
      }
      console.error('Error adding song to list:', error);
    }
  } else {
    alert('Seleccione una lista o cree una nueva');
  }
};

  useEffect(() => {
  if (usuario) {
    axios.get(`${API_URL}/valoraciones/historial`, {
      params: { usuario: usuario.id_usuario, entidad_tipo: 'cancion', entidad_id: id }
    }).then(res => setHistorial(res.data));
  }
}, [usuario, id]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.post(`${API_URL}/valoraciones`, {
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
        // Si el backend devuelve sugerencias, actualízalas
        if (resp.data.sugerencias) setSugerencias(resp.data.sugerencias);
        else await fetchSugerencias();
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

useEffect(() => {
  axios.get(`${API_URL}/rankings/posicion-global`, {
    params: { tipo_entidad: 'cancion', entidad_id: id }
  }).then(res => setPosicionRanking(res.data.posicion));
}, [id, usuario]);

  useEffect(() => {
    // ...existing fetchSongData...
    // Al final de fetchSongData, si tienes el álbum:
    if (album && album.id_album) {
      axios.get(`${API_URL}/relaciones/albumes/${album.id_album}/canciones`)
        .then(res => {
          setAlbumSongs(Array.isArray(res.data.canciones) ? res.data.canciones : []);
        });
    }
  }, [album]);

  // Encuentra la posición de la canción actual en el álbum
  const currentIdx = albumSongs.findIndex(c => String(c.id_cancion) === String(id));
  const prevSong = currentIdx > 0 ? albumSongs[currentIdx - 1] : null;
  const nextSong = currentIdx >= 0 && currentIdx < albumSongs.length - 1 ? albumSongs[currentIdx + 1] : null;

  return (
    <div className="pt-16 p-4">
      {loading ? (
        <p>Cargando...</p>
      ) : song ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">
            {song.titulo}
          </h2>
          <div className="flex justify-between items-center mb-2">
  <div style={{ flex: 1, textAlign: "left" }}>
    {prevSong ? (
      <Link to={`/song/${prevSong.id_cancion}`} className="text-blue-600 flex items-center">
        <FaArrowLeft /> <span className="ml-1">{prevSong.titulo}</span>
      </Link>
    ) : <span />}
  </div>
  <div style={{ flex: 1, textAlign: "right" }}>
    {nextSong ? (
      <Link to={`/song/${nextSong.id_cancion}`} className="text-blue-600 flex items-center justify-end">
        <span className="mr-1">{nextSong.titulo}</span> <FaArrowRight />
      </Link>
    ) : <span />}
  </div>
</div>
          {song.categoria && (
            <div className="text-center mb-2">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                Contenida en las categorias:&nbsp;
                {song.categoria.toLowerCase().includes('coleccion') && (
                  <>
                    <Link to="/collections" style={{ color: '#2563eb', textDecoration: 'underline' }}>colección</Link>
                    {song.categoria.toLowerCase().includes('catalogo') && ' y '}
                  </>
                )}
                {song.categoria.toLowerCase().includes('catalogo') && (
                  <Link to="/catalogs" style={{ color: '#2563eb', textDecoration: 'underline' }}>catálogo</Link>
                )}
              </span>
            </div>
          )}
          {posicionRanking && (
            <div className="text-center mt-2">
              <span className="ranking-global">
                #{posicionRanking} en Ranking Global de Canciones
              </span>
            </div>
          )}
          <p className="text-center">Duración: {Math.floor(song.duracion_ms / 60000)}:{((song.duracion_ms % 60000) / 1000).toFixed(0).padStart(2, '0')} minutos</p>
          <p className="text-center">Popularidad: {song.popularidad}</p>
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
          </div>
          {usuario && (
            <>
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="cancion"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
{historial.length > 0 && (
      <div className="my-2">
        <button
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm"
          onClick={() => setShowHistorial(v => !v)}
        >
          {showHistorial ? 'Ocultar historial de valoraciones' : 'Ver historial de valoraciones'}
        </button>
        {showHistorial && (
          <div className="mt-2 historial-valoraciones-box">
            <h4 className="font-bold mb-2">Historial de valoraciones previas</h4>
            <ul className="space-y-2">
              {historial.map(h => (
                <li key={h.id_historial} className="flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-xs text-gray-700">{new Date(h.fecha).toLocaleString()}</span>
                  <span className="font-semibold">{h.calificacion} ⭐</span>
                  {h.comentario && (
                    <span className="italic text-gray-800">“{h.comentario}”</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}
  </>
)}
          <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
          {valoracionesUsuarios.length === 0 ? (
            <div>No hay valoraciones aún.</div>
          ) : (
            valoracionesUsuarios.map((valoracion, idx) => (
              <ValoracionComentario key={idx} valoracion={valoracion} />
            ))
          )}
          {usuario && (
            <div className="mt-4">
              {listas.filter(
                lista => Array.isArray(lista.entidades) && lista.entidades.some(entidad => String(entidad.id) === String(id))
              ).length > 0 ? (
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
            <li key={genre.id_genero}>
              <Link to={`/genre/${genre.id_genero}`}>{genre.nombre}</Link>
                              {genre.subgeneros && (
                  <span className="block text-xs text-gray-600 mt-1">
                    {Array.isArray(genre.subgeneros)
                      ? genre.subgeneros.join(', ')
                      : (typeof genre.subgeneros === 'string' && genre.subgeneros.startsWith('[')
                          ? JSON.parse(genre.subgeneros).join(', ')
                          : genre.subgeneros)}
                  </span>
                )}
            </li>
          ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Artistas</h3>
<ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
  {artists.map((artist) => (
    <li key={artist.id_artista}>
      <Link to={`/artist/${artist.id_artista}`}>
        <img
          src={artist.foto_artista}
          alt={artist.nombre_artista}
          style={{ width: '255px', height: '255px', objectFit: 'cover' }}
          className={`rounded-md ${valoradas.includes(`artista-${artist.id_artista}`) ? 'valorada-img' : ''}`}
        />
        <p className={`text-center mt-2 text-xs font-semibold ${valoradas.includes(`artista-${artist.id_artista}`) ? 'valorada' : ''}`}>
          {artist.nombre_artista}
          {valoradas.includes(`artista-${artist.id_artista}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
        </p>
      </Link>
    </li>
  ))}
</ul>
 {album && (
  <div className="mt-8">
    <h3 className="text-2xl font-bold mb-4 text-center">Álbum</h3>
    <div className="flex justify-center">
      <div className="album-container flex flex-col items-center text-center">
        <Link to={`/album/${album.id_album}`}>
          <img
            src={album.foto_album}
            alt={album.titulo}
            style={{ width: '255px', height: '255px', objectFit: 'cover' }}
            className={`rounded-md ${valoradas.includes(`album-${album.id_album}`) ? 'valorada-img' : ''}`}
          />
        </Link>

      {/* Título y año */}
      <Link
        to={`/album/${album.id_album}`}
        className={`mt-2 text-xs font-semibold hover:underline block ${valoradas.includes(`album-${album.id_album}`) ? 'valorada' : ''}`}
      >
          {album.titulo} ({album.anio})
          {valoradas.includes(`album-${album.id_album}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
        </Link>

      {/* Indicador de valoración */}
      {valoradas.includes(`album-${album.id_album}`) && (
        <span className="mt-1 px-2 py-1 bg-green-200 text-green-800 rounded text-sm">
          ⭐ Ya valorado
        </span>
      )}
      </div>
    </div>
  </div>
)}

{/* Listas destacadas que incluyen esta canción */}
{listasDestacadas.length > 0 && (
  <div className="mt-6">
    <h4 className="font-bold">Listas destacadas con esta canción</h4>
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {listasDestacadas.map(lista => (
        <div key={lista.id_lista} className="tendencia-card">
          <img
            src={lista.imagen || '/default_playlist.png'}
            alt={lista.nombre_lista}
            className="tendencia-imagen"
          />
          <Link
            to={`/list/${lista.id_lista}`}
            className="font-bold hover:underline"
          >
            {lista.nombre_lista}
          </Link>
        </div>
      ))}
    </div>
  </div>
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