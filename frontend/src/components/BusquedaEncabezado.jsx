import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import BarraDeBusqueda from './BarraDeBusqueda';
import axios from 'axios';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

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
        const [artistsRes, albumsRes, songsRes] = await Promise.all([
          axios.get(`${API_URL}/artistas`),
          axios.get(`${API_URL}/albumes`),
          axios.get(`${API_URL}/canciones`)
        ]);
        
        setArtists(artistsRes.data || []);
        setAlbums(albumsRes.data || []);
        setSongs(songsRes.data || []);
        
        // Aquí deberíamos cargar los videos si existiera el endpoint
        // Para este ejemplo, simulamos algunos videos
        setVideos([
          { id_video: 1, titulo: "Michael Jackson - Thriller", artista_id: 1, url_preview: "https://example.com/thriller.jpg" },
          { id_video: 2, titulo: "Queen - Bohemian Rhapsody", artista_id: 2, url_preview: "https://example.com/bohemian.jpg" }
        ]);
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
      />
    </div>
  );
};

export default BusquedaEncabezado;