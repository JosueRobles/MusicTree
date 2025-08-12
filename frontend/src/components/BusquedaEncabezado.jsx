import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MenuSugerenciasBusqueda from './MenuSugerenciasBusqueda';

const API_URL = import.meta.env.VITE_API_URL;

const BusquedaEncabezado = () => {
  const [sugerencias, setSugerencias] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef();

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
      ...songs.map(song => {
        const album = albums.find(a => a.id_album === song.album);
        return {
          id: song.id_cancion,
          texto: song.titulo,
          tipo: 'Canción',
          imagen: album?.foto_album || "https://example.com/default-song.jpg",
          ruta: `/song/${song.id_cancion}`
        };
      }),
      ...videos.map(video => ({
        id: video.id_video,
        texto: video.titulo,
        tipo: 'Video',
        imagen: video.miniatura || "https://example.com/default-video.jpg",
        ruta: `/video/${video.id_video}`
      }))
    ];
    setSugerencias(todasSugerencias);
  }, [artists, albums, songs, videos]);

  const sugerenciasFiltradas = input
    ? sugerencias.filter(item =>
        item.texto.toLowerCase().includes(input.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setShowDropdown(true);
  };

  const handleSuggestionClick = (ruta) => {
    setInput('');
    setShowDropdown(false);
    navigate(ruta);
  };

  return (
    <>
      <div className="relative w-64" ref={inputRef}>
        <input
          type="text"
          className="border rounded px-4 py-2 w-full"
          placeholder="Buscar..."
          value={input}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          autoComplete="off"
        />
      </div>
      <MenuSugerenciasBusqueda
        anchorRef={inputRef}
        sugerencias={sugerenciasFiltradas}
        onSelect={handleSuggestionClick}
        visible={showDropdown}
      />
    </>
  );
};

export default BusquedaEncabezado;