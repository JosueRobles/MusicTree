import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BarraDeBusqueda from './BarraDeBusqueda';

const BusquedaAvanzada = ({ 
  onSearch, 
  artistas = [], 
  albums = [], 
  canciones = [],
  videos = []
}) => {
  const [filtros, setFiltros] = useState({
    termino: '',
    anio: '',
    artista: '',
    genero: ''
  });
  
  const [generos, setGeneros] = useState([]);
  const [anios, setAnios] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);

  // Extraer años y géneros únicos de los datos
  useEffect(() => {
    // Extraer años únicos de álbumes
    const todosAnios = [...new Set(albums.map(album => 
      new Date(album.fecha_lanzamiento).getFullYear()
    ))].sort((a, b) => b - a); // Ordenar descendente
    
    // Extraer géneros únicos (asumiendo que artistas tienen géneros)
    const todosGeneros = [...new Set(artistas.map(artista => 
      artista.genero
    ))].filter(Boolean).sort();

    setAnios(todosAnios);
    setGeneros(todosGeneros);

    // Preparar sugerencias para la barra de búsqueda
    const nuevasSugerencias = [
      ...artistas.map(artist => ({
        id: artist.id_artista,
        texto: artist.nombre_artista,
        tipo: 'Artista',
        imagen: artist.foto_artista
      })),
      ...albums.map(album => ({
        id: album.id_album,
        texto: album.titulo,
        tipo: 'Álbum',
        imagen: album.foto_album
      })),
      ...canciones.map(song => ({
        id: song.id_cancion,
        texto: song.titulo,
        tipo: 'Canción',
        imagen: song.url_preview
      })),
      ...videos.map(video => ({
        id: video.id_video,
        texto: video.titulo,
        tipo: 'Video',
        imagen: video.url_preview
      }))
    ];
    
    setSugerencias(nuevasSugerencias);
  }, [artistas, albums, canciones, videos]);

  const handleFiltroChange = (campo, valor) => {
    const nuevosFiltros = { ...filtros, [campo]: valor };
    setFiltros(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  };

  const handleSearchInput = (termino) => {
    const nuevosFiltros = { ...filtros, termino };
    setFiltros(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  };

  const aplicarFiltros = (filtrosActuales) => {
    // Enviamos todos los filtros activos a la función de búsqueda del componente padre
    onSearch(filtrosActuales);
  };

  const resetearFiltros = () => {
    const filtrosReseteados = {
      termino: '',
      anio: '',
      artista: '',
      genero: ''
    };
    setFiltros(filtrosReseteados);
    aplicarFiltros(filtrosReseteados);
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-4">Búsqueda Avanzada</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Barra de búsqueda principal con autocompletado */}
        <div className="col-span-full">
          <BarraDeBusqueda 
            onSearch={handleSearchInput} 
            placeholder="Artistas, álbumes, canciones..." 
            sugerencias={sugerencias}
          />
        </div>
        
        {/* Filtro por año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año:</label>
          <select 
            className="w-full border rounded px-3 py-2"
            value={filtros.anio}
            onChange={(e) => handleFiltroChange('anio', e.target.value)}
          >
            <option value="">Todos los años</option>
            {anios.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>
        
        {/* Filtro por artista */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Artista:</label>
          <select 
            className="w-full border rounded px-3 py-2"
            value={filtros.artista}
            onChange={(e) => handleFiltroChange('artista', e.target.value)}
          >
            <option value="">Todos los artistas</option>
            {artistas.map((artista) => (
              <option key={artista.id_artista} value={artista.id_artista}>
                {artista.nombre_artista}
              </option>
            ))}
          </select>
        </div>
        
        {/* Filtro por género */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Género:</label>
          <select 
            className="w-full border rounded px-3 py-2"
            value={filtros.genero}
            onChange={(e) => handleFiltroChange('genero', e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {generos.map((genero) => (
              <option key={genero} value={genero}>{genero}</option>
            ))}
          </select>
        </div>
        
        {/* Botón para resetear filtros */}
        <div className="flex items-end">
          <button 
            onClick={resetearFiltros}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

BusquedaAvanzada.propTypes = {
  onSearch: PropTypes.func.isRequired,
  artistas: PropTypes.array,
  albums: PropTypes.array,
  canciones: PropTypes.array,
  videos: PropTypes.array
};

export default BusquedaAvanzada;