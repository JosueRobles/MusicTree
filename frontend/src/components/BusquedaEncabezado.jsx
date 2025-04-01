import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarraDeBusqueda from './BarraDeBusqueda';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const BusquedaEncabezado = () => {
  const [sugerencias, setSugerencias] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [artistsRes, albumsRes, songsRes, videosRes] = await Promise.all([
          axios.get(`${API_URL}/artistas`),
          axios.get(`${API_URL}/albumes`),
          axios.get(`${API_URL}/canciones`),
          axios.get(`${API_URL}/videos`)
        ]);
        
        setArtists(artistsRes.data || []);
        setAlbums(albumsRes.data || []);
        setSongs(songsRes.data || []);
        setVideos(videosRes.data || []);
      } catch (error) {
        console.error('Error fetching search data:', error);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    // Preparar las sugerencias en el formato adecuado para el componente de búsqueda
    const todasSugerencias = [
      ...artists.map(artist => ({
        id: artist.id_artista,
        texto: artist.nombre_artista,
        tipo: 'Artista',
        imagen: artist.foto_artista,
        ruta: `/artist/${artist.id_artista}`
      })),
      ...albums.map(album => ({
        id: album.id_album,
        texto: album.titulo,
        tipo: 'Álbum',
        imagen: album.foto_album,
        ruta: `/album/${album.id_album}`
      })),
      ...songs.map(song => ({
        id: song.id_cancion,
        texto: song.titulo,
        tipo: 'Canción',
        imagen: song.url_preview || "https://example.com/default-song.jpg",
        ruta: `/song/${song.id_cancion}`
      })),
      ...videos.map(video => ({
        id: video.id_video,
        texto: video.titulo,
        tipo: 'Video',
        imagen: video.url_preview,
        ruta: `/video/${video.id_video}`
      }))
    ];
    
    setSugerencias(todasSugerencias);
  }, [artists, albums, songs, videos]);

  const handleSearch = (query) => {
    if (!query) return;
    
    // Encontrar la mejor coincidencia
    const sugerenciasFiltradas = sugerencias.filter(item => 
      item.texto.toLowerCase().includes(query.toLowerCase())
    );
    
    // Si hay una coincidencia exacta, navegamos a ella
    if (sugerenciasFiltradas.length === 1) {
      navigate(sugerenciasFiltradas[0].ruta);
    } else if (sugerenciasFiltradas.length > 0) {
      // Si hay varias coincidencias, podemos navegar a una página de resultados
      // navigate(`/search?q=${encodeURIComponent(query)}`);
      
      // O podemos simplemente no hacer nada y dejar que el usuario seleccione de las sugerencias
    }
  };

  return (
    <div className="w-64">
      <BarraDeBusqueda 
        onSearch={handleSearch} 
        placeholder="Buscar..." 
        sugerencias={sugerencias}
        className="w-full"
        renderSuggestion={(suggestion) => (
          <div className="flex items-center space-x-2">
            <a href={suggestion.ruta}>
              <img src={suggestion.imagen} alt={suggestion.texto} className="w-8 h-8 rounded-full" />
            </a>
            <a href={suggestion.ruta} className="text-sm">{suggestion.texto}</a>
          </div>
        )}
      />
    </div>
  );
};

export default BusquedaEncabezado;