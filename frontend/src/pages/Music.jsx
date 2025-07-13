import { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import BusquedaAvanzada from '../components/BusquedaAvanzada';
import Planilla from '../components/Planilla';
import MusicTendencias from '../components/MusicTendencias';
import Generos from '../components/Generos';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = "http://localhost:5000";

const Music = () => {
  const { usuario } = useContext(UsuarioContext);

  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [canciones, setCanciones] = useState([]);
  const [videos, setVideos] = useState([]);
  const [items, setItems] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [hayMasPaginas, setHayMasPaginas] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [resumen, setResumen] = useState({
    artistas: 0,
    albums: 0,
    canciones: 0,
    videos: 0,
  });

  // Guarda los filtros actuales en un estado
  const [filtros, setFiltros] = useState({
    termino: '',
    anio: '',
    artista: '',
    genero: '',
    entidad: '',
    orden: 'predeterminado',
  });

  const [totalResultados, setTotalResultados] = useState(0);
  const LIMITE_SCROLL = 1000;

  const fetchItemsByView = useCallback(async (viewName) => {
    try {
      const { data } = await axios.get(`${API_URL}/vistas/${viewName}`);
      let itemsWithUrls = data.map(item => ({
        ...item,
        id: `${item.tipo}-${item.id}`,
        url: generateEntityUrl(item.tipo, item.id),
      }));

      // Solo ordenar por id cuando es la vista predeterminada
      /*if (viewName === 'vista_orden_intercalada') {
        itemsWithUrls = itemsWithUrls.sort((a, b) => {
          const idA = parseInt(a.id.split('-')[1]);
          const idB = parseInt(b.id.split('-')[1]);
          return idA - idB;
        });
      }*/

      setItems(itemsWithUrls);
    } catch (error) {
      console.error(`Error fetching data from ${viewName}:`, error);
      setItems([]);
    }
  }, []);

  const generateEntityUrl = (type, id) => {
    // Traduce los tipos de la base de datos a los de la ruta
    const typeMap = {
      artista: 'artist',
      album: 'album',
      cancion: 'song',
      video: 'video',
      artist: 'artist',
      song: 'song'
    };
    const routeType = typeMap[type] || 'undefined';
    return `/${routeType}/${id}`;
  };

  const fetchTotalResultados = async (filtros) => {
    const { termino, ...restFiltros } = filtros;
    const params = new URLSearchParams();
    Object.entries(restFiltros).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const { data } = await axios.get(`${API_URL}/filtrar/contar?${params.toString()}`);
    setTotalResultados(data.count || 0);
  };

  useEffect(() => {
    fetchItemsByView('vista_orden_intercalada');

    const fetchData = async () => {
      try {
        const [artistsRes, albumsRes, cancionesRes, videosRes] = await Promise.all([
          axios.get(`${API_URL}/artistas`),
          axios.get(`${API_URL}/albumes`),
          axios.get(`${API_URL}/canciones`),
          axios.get(`${API_URL}/videos`),
        ]);

        setArtists(artistsRes.data);
        setAlbums(albumsRes.data);
        setCanciones(cancionesRes.data);
        setVideos(videosRes.data);

        setResumen({
          artistas: artistsRes.data.length,
          albums: albumsRes.data.length,
          canciones: cancionesRes.data.length,
          videos: videosRes.data.length,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [fetchItemsByView]);

  useEffect(() => {
    const fetchResumen = async () => {
      const [artistas, albums, canciones, videos] = await Promise.all([
        axios.get(`${API_URL}/contar/artistas`),
        axios.get(`${API_URL}/contar/albumes`),
        axios.get(`${API_URL}/contar/canciones`),
        axios.get(`${API_URL}/contar/videos`)
      ]);
      setResumen({
        artistas: artistas.data.count,
        albums: albums.data.count,
        canciones: canciones.data.count,
        videos: videos.data.count,
      });
    };
    fetchResumen();
  }, []);

  useEffect(() => {
    fetchTotalResultados(filtros);
  }, [filtros]);

  // Modifica handleAdvancedSearch para NO incluir el término de búsqueda
  const handleAdvancedSearch = async (newFiltros) => {
    try {
      setFiltros(newFiltros);
      // NO incluyas 'termino' en la petición al backend
      const { termino, ...restFiltros } = newFiltros;
      const params = new URLSearchParams();
      Object.entries(restFiltros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const { data } = await axios.get(`${API_URL}/filtrar?${params.toString()}`);
      if (!Array.isArray(data)) throw new Error('La respuesta del servidor no es un array.');
      const filteredItems = data.map((item) => ({
        id: `${item.tipo || newFiltros.entidad}-${item.id}`,
        nombre: item.nombre,
        imagen: item.imagen || '/default-image.png',
        url: generateEntityUrl(item.tipo || newFiltros.entidad, item.id),
      }));
      setItems(filteredItems);
    } catch (error) {
      console.error('Error al aplicar filtros avanzados:', error);
    }
  };

  // Nueva función para manejar el término de búsqueda
  const handleSearchInput = (termino) => {
    setSearchTerm(termino);
  };

  // Traducción SOLO para ranking
  const entityMap = {
    artist: 'artist',
    album: 'album',
    song: 'cancion',
    video: 'video',
  };

  // Cuando prepares el filtro para ranking:
  const tipoEntidadRanking = entityMap[filtros.entidad] || filtros.entidad;

  const fetchRankingComunitario = async () => {
    const params = new URLSearchParams({
      entidad: tipoEntidadRanking,
      // ...otros filtros...
    });
    const res = await fetch(`${API_URL}/ranking-comunitario?${params.toString()}`);
    // ...resto del código...
  };

  const handleSortOrderChange = (order, entidad) => {
    const tipo_entidad = entityMap[entidad || filtros.entidad] || entidad || filtros.entidad;

    // Rankings: aplica filtros
    if (order === 'ranking_personal') {
      if (!usuario) {
        window.location.href = '/login';
        return;
      }
      if (!tipo_entidad) return;

      const params = new URLSearchParams();
      params.append('usuario', usuario.id_usuario);
      params.append('tipo_entidad', tipo_entidad);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.artista) params.append('artista', filtros.artista);
      if (filtros.genero) params.append('genero', filtros.genero);

      axios.get(`${API_URL}/rankings/personal?${params.toString()}`)
        .then(({ data }) => {
          const itemsWithUrls = data.map(item => {
            let id = item.entidad_id || item.id;
            let nombre = item.nombre;
            let imagen = '/default-image.png';
            if (tipo_entidad === 'cancion') {
              const cancion = canciones.find(c => c.id_cancion == id);
              nombre = cancion?.titulo || nombre;
              const album = albums.find(a => a.id_album == cancion?.album);
              imagen = album?.foto_album || imagen;
            } else if (tipo_entidad === 'album') {
              const album = albums.find(a => a.id_album == id);
              nombre = album?.titulo || nombre;
              imagen = album?.foto_album || imagen;
            } else if (tipo_entidad === 'artista') {
              const artista = artists.find(a => a.id_artista == id);
              nombre = artista?.nombre_artista || nombre;
              imagen = artista?.foto_artista || imagen;
            } else if (tipo_entidad === 'video') {
              const video = videos.find(v => v.id_video == id);
              nombre = video?.titulo || nombre;
              imagen = video?.miniatura || imagen;
            }
            return {
              id: `${tipo_entidad}-${id}`,
              nombre,
              imagen,
              url: generateEntityUrl(tipo_entidad, id),
            };
          });
          setItems(itemsWithUrls);
        });
    } else if (order === 'ranking_comunitario') {
      let tipo_entidad = entityMap[entidad || filtros.entidad] || entidad || filtros.entidad;
      // Traducción manual SOLO para ranking comunitario
      if (tipo_entidad === 'artist') tipo_entidad = 'artista';

      const params = new URLSearchParams();
      params.append('tipo_entidad', tipo_entidad);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.artista) params.append('artista', filtros.artista);
      if (filtros.genero) params.append('genero', filtros.genero);

      axios.get(`${API_URL}/rankings/global?${params.toString()}`)
        .then(({ data }) => {
          const itemsWithUrls = data.map(item => {
            let id, nombre, imagen = '/default-image.png';
            if (tipo_entidad === 'cancion') {
              id = item.cancion_id || item.entidad_id || item.id;
              nombre = item.cancion_nombre || item.nombre;
              const cancion = canciones.find(c => c.id_cancion == id);
              if (cancion) {
                const album = albums.find(a => a.id_album == cancion.album);
                imagen = album?.foto_album || imagen;
              }
            } else if (tipo_entidad === 'album') {
              id = item.album_id || item.entidad_id || item.id;
              nombre = item.album_nombre || item.nombre;
              const album = albums.find(a => a.id_album == id);
              imagen = album?.foto_album || imagen;
            } else if (tipo_entidad === 'artista') {
              id = item.artista_id || item.entidad_id || item.id;
              nombre = item.nombre_artista || item.nombre;
              const artista = artists.find(a => a.id_artista == id);
              imagen = artista?.foto_artista || imagen;
            } else if (tipo_entidad === 'video') {
              id = item.video_id || item.entidad_id || item.id;
              nombre = item.video_nombre || item.nombre || item.titulo;
              const video = videos.find(v => v.id_video == id);
              imagen = video?.miniatura || imagen;
            }
            return {
              id: `${tipo_entidad}-${id}`,
              nombre,
              imagen,
              url: generateEntityUrl(tipo_entidad, id),
            };
          });
          setItems(itemsWithUrls);
        });
    } else {
      // Para popularidad, valoración y predeterminado, usa filtros avanzados
      handleAdvancedSearch({
        ...filtros,
        orden: order,
        entidad: tipo_entidad,
      });
    }
  };

  const resetFilters = () => {
    const defaultFiltros = {
      termino: '',
      anio: '',
      artista: '',
      genero: '',
      entidad: '',
      orden: 'predeterminado',
    };
    setFiltros(defaultFiltros);
    handleAdvancedSearch(defaultFiltros);
  };

  const handlePaginar = async () => {
    const nuevaPagina = pagina + 1;
    setPagina(nuevaPagina);
    const params = new URLSearchParams({ ...filtros, pagina: nuevaPagina });
    const { data } = await axios.get(`${API_URL}/filtrar?${params.toString()}`);
    // Si hay 1001 resultados, hay más páginas
    if (data.length === 1001) setHayMasPaginas(true);
    else setHayMasPaginas(false);
    setItems(prev => [
      ...prev,
      ...data.slice(0, 1000).map(item => ({
        id: `${item.tipo || filtros.entidad}-${item.id}`,
        nombre: item.nombre,
        imagen: item.imagen || '/default-image.png',
        url: generateEntityUrl(item.tipo || filtros.entidad, item.id),
      }))
    ]);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-4xl font-bold my-4">Música en MusicTree</h2>

      <Generos />
      <MusicTendencias limit={50} itemsPerPage={10} />

      <div className="entidad-contadores mb-8">
        <h3 className="text-2xl font-bold mb-4">Resumen de Contenido</h3>
        <div className="flex flex-wrap gap-4 justify-center items-center text-center text-lg font-semibold">
          <span>Artistas <span className="text-green-600">{resumen.artistas}</span></span>
          <span className="mx-2 text-green-600">|</span>
          <span>Álbumes <span className="text-green-600">{resumen.albums}</span></span>
          <span className="mx-2 text-green-600">|</span>
          <span>Canciones <span className="text-green-600">{resumen.canciones}</span></span>
          <span className="mx-2 text-green-600">|</span>
          <span>Videos <span className="text-green-600">{resumen.videos}</span></span>
        </div>
      </div>

      <BusquedaAvanzada
        onSearch={handleAdvancedSearch}
        artistas={artists}
        albums={albums}
        canciones={canciones}
        videos={videos}
        onSortOrderChange={handleSortOrderChange}
        onReset={resetFilters}
        onBarraSearch={handleSearchInput} // NUEVO
      />

      <Planilla
        items={items}
        onPaginar={handlePaginar}
        pagina={pagina}
        totalPaginas={Math.ceil(totalResultados / LIMITE_SCROLL)}
        searchTerm={searchTerm}
      />
    </div>
  );
};

export default Music;