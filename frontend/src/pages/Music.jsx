import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BusquedaAvanzada from '../components/BusquedaAvanzada';
import Planilla from '../components/Planilla';
import MusicTendencias from '../components/MusicTendencias';

const API_URL = "http://localhost:5000";

const Music = () => {
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [canciones, setCanciones] = useState([]);
  const [videos, setVideos] = useState([]);
  const [items, setItems] = useState([]);

  const [resumen, setResumen] = useState({
    artistas: 0,
    albums: 0,
    canciones: 0,
    videos: 0,
  });

  const fetchItemsByView = useCallback(async (viewName) => {
    try {
      const { data } = await axios.get(`${API_URL}/vistas/${viewName}`);
      const itemsWithUrls = data.map(item => ({
        ...item,
        id: `${item.tipo}-${item.id}`, // Clave única
        url: generateEntityUrl(item.tipo, item.id),
      }));
      setItems(itemsWithUrls);
    } catch (error) {
      console.error(`Error fetching data from ${viewName}:`, error);
      setItems([]);
    }
  }, []);

  const generateEntityUrl = (type, id) => {
    switch (type) {
      case 'artist': return `/artist/${id}`;
      case 'album': return `/album/${id}`;
      case 'song': return `/song/${id}`;
      case 'video': return `/video/${id}`;
      default: return `/undefined/${id}`;
    }
  };

  useEffect(() => {
    fetchItemsByView('vista_orden_predeterminado');

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

  const handleAdvancedSearch = async (filtros) => {
    try {
      const { termino, anio, artista, genero, entidad, orden } = filtros;
  
      // Construir los parámetros de consulta
      const params = new URLSearchParams();
      if (termino) params.append('termino', termino);
      if (anio) params.append('anio', anio);
      if (artista) params.append('artista', artista);
      if (genero) params.append('genero', genero);
      if (entidad) params.append('entidad', entidad);
      if (orden) params.append('orden', orden);
  
      // Llamar al backend con los filtros
      const { data } = await axios.get(`${API_URL}/filtrar?${params.toString()}`);
  
      // Validar que `data` es un array
      if (!Array.isArray(data)) {
        throw new Error('La respuesta del servidor no es un array.');
      }
  
      // Mapear los datos para la Planilla
      const filteredItems = data.map((item) => ({
        id: `${item.tipo || entidad}-${item.id}`,
        nombre: item.nombre,
        imagen: item.imagen || '/default-image.png',
        url: generateEntityUrl(item.tipo || entidad, item.id),
      }));
  
      setItems(filteredItems);
    } catch (error) {
      console.error('Error al aplicar filtros avanzados:', error);
    }
  };

  const handleSortOrderChange = (order) => {
    if (order === 'popularidad') {
      fetchItemsByView('vista_popularidad');
    } else if (order === 'valoracion') {
      fetchItemsByView('vista_valoracion_promedio');
    } else {
      fetchItemsByView('vista_orden_predeterminado');
    }
  };

  const resetFilters = () => {
    fetchItemsByView('vista_orden_predeterminado');
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-4xl font-bold my-4">Música en MusicTree</h2>

      <MusicTendencias limit={50} itemsPerPage={10} />

      <div className="entidad-contadores mb-8">
        <h3 className="text-2xl font-bold mb-4">Resumen de Contenido</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { nombre: 'Artistas', cantidad: resumen.artistas > 999 ? '1000+' : resumen.artistas },
            { nombre: 'Álbumes', cantidad: resumen.albums > 999 ? '1000+' : resumen.albums },
            { nombre: 'Canciones', cantidad: resumen.canciones > 999 ? '1000+' : resumen.canciones },
            { nombre: 'Videos', cantidad: resumen.videos > 999 ? '1000+' : resumen.videos },
          ].map(({ nombre, cantidad }) => (
            <div key={nombre} className="bg-gray-100 p-4 rounded">
              <h4 className="text-lg font-semibold">{nombre}</h4>
              <p className="text-2xl font-bold">{cantidad}</p>
            </div>
          ))}
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
      />

      <Planilla items={items} />
    </div>
  );
};

export default Music;