import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MenuSugerenciasBusqueda from './MenuSugerenciasBusqueda';
import debounce from 'lodash.debounce'; // npm install lodash.debounce

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

  // Cambia este useEffect por una función debounced:
  const fetchSugerencias = debounce(async (input) => {
    if (!input) {
      setSugerencias([]);
      return;
    }
    let tipo = null, termino = input;
    if (/^artista:/i.test(input)) { tipo = 'artista'; termino = input.replace(/^artista:/i, '').trim(); }
    else if (/^álbum:/i.test(input) || /^album:/i.test(input)) { tipo = 'album'; termino = input.replace(/^álbum:|^album:/i, '').trim(); }
    else if (/^canción:/i.test(input) || /^cancion:/i.test(input)) { tipo = 'cancion'; termino = input.replace(/^canción:|^cancion:/i, '').trim(); }
    else if (/^video:/i.test(input)) { tipo = 'video'; termino = input.replace(/^video:/i, '').trim(); }

    try {
      let artistsRes = { data: [] }, albumsRes = { data: [] }, songsRes = { data: [] }, videosRes = { data: [] };
      if (!tipo || tipo === 'artista') artistsRes = await axios.get(`${API_URL}/artistas?termino=${encodeURIComponent(termino)}`);
      if (!tipo || tipo === 'album') albumsRes = await axios.get(`${API_URL}/albumes?termino=${encodeURIComponent(termino)}`);
      if (!tipo || tipo === 'cancion') songsRes = await axios.get(`${API_URL}/canciones?termino=${encodeURIComponent(termino)}`);
      if (!tipo || tipo === 'video') videosRes = await axios.get(`${API_URL}/videos?termino=${encodeURIComponent(termino)}`);
      // ...arma sugerencias igual que antes...
      const albumesMap = new Map(albumsRes.data.map(a => [a.id_album, a.foto_album]));
      const todasSugerencias = [
        ...artistsRes.data.map(artist => ({
          id: artist.id_artista,
          texto: `Artista: ${artist.nombre_artista}`,
          tipo: 'Artista',
          imagen: artist.foto_artista,
          ruta: `/artist/${artist.id_artista}`
        })),
        ...albumsRes.data.map(album => ({
          id: album.id_album,
          texto: `Álbum: ${album.titulo}`,
          tipo: 'Álbum',
          imagen: album.foto_album,
          ruta: `/album/${album.id_album}`
        })),
        ...songsRes.data.map(song => ({
          id: song.id_cancion,
          texto: `Canción: ${song.titulo}`,
          tipo: 'Canción',
          imagen: albumesMap.get(song.album) || "/default-song.png",
          ruta: `/song/${song.id_cancion}`
        })),
        ...videosRes.data.map(video => ({
          id: video.id_video,
          texto: `Video: ${video.titulo}`,
          tipo: 'Video',
          imagen: video.miniatura || "https://example.com/default-video.jpg",
          ruta: `/video/${video.id_video}`
        }))
      ];
      setSugerencias(todasSugerencias.slice(0, 12)); // Limita visualmente, pero busca en toda la BD
    } catch (error) {
      setSugerencias([]);
    }
  }, 300);

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
    fetchSugerencias(e.target.value);
  };

  const handleSuggestionClick = (ruta) => {
    setInput('');
    setShowDropdown(false);
    navigate(ruta);
  };

  return (
    <>
      <div className="relative header-search-input" ref={inputRef}>
        <input
          type="text"
          className="border rounded px-4 py-2 w-full search-input"
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