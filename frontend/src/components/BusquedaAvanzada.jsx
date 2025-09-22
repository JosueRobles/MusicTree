import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BarraDeBusqueda from './BarraDeBusqueda';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const BusquedaAvanzada = ({
  onSearch,
  artistas = [],
  albums = [],
  canciones = [],
  videos = [],
  onSortOrderChange,
  onReset,
  onBarraSearch, // NUEVO
}) => {
  const [filtros, setFiltros] = useState({
    termino: '',
    anio: '',
    artista: '',
    genero: '',
    entidad: '',
  });

  const [generos, setGeneros] = useState([]);
  const [anios, setAnios] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [entidadError, setEntidadError] = useState(false);
  const [resetBarra, setResetBarra] = useState(false);

  useEffect(() => {
    const fetchGeneros = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/generos`);
        setGeneros(data);
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };

    fetchGeneros();

    // Recopila todos los años únicos de álbumes y videos
    const todosAnios = [...new Set([...albums.map(album => album.anio), ...videos.map(video => video.anio)])].sort((a, b) => b - a);
    setAnios(todosAnios);

    // Prepara sugerencias para la BarraDeBusqueda
    const nuevasSugerencias = [
      ...artistas.map(artist => ({
        id: artist.id_artista,
        texto: artist.nombre_artista,
        tipo: 'Artista',
        imagen: artist.foto_artista,
      })),
      ...albums.map(album => ({
        id: album.id_album,
        texto: album.titulo,
        tipo: 'Álbum',
        imagen: album.foto_album,
      })),
      ...canciones.map(song => ({
        id: song.id_cancion,
        texto: song.titulo,
        tipo: 'Canción',
        imagen: song.album ? albums.find(album => album.id_album === song.album)?.foto_album : '',
      })),
      ...videos.map(video => ({
        id: video.id_video,
        texto: video.titulo,
        tipo: 'Video',
        imagen: video.miniatura,
      })),
    ];

    setSugerencias(nuevasSugerencias);
  }, [artistas, albums, canciones, videos]);

  useEffect(() => {
    if (filtros.artista) {
      const trabajosAnios = [
        ...albums.filter(a => {
          const artistasArr = Array.isArray(a.artistas)
            ? a.artistas
            : typeof a.artistas === 'string'
              ? a.artistas.split(',').map(Number)
              : [];
          return artistasArr.includes(Number(filtros.artista));
        }).map(a => a.anio),
        ...videos.filter(v => {
          const artistasArr = Array.isArray(v.artistas)
            ? v.artistas
            : typeof v.artistas === 'string'
              ? v.artistas.split(',').map(Number)
              : [];
          return artistasArr.includes(Number(filtros.artista));
        }).map(v => v.anio)
      ];
      let nuevosAnios = [...new Set(trabajosAnios)].sort((a, b) => b - a);
      // Si el año seleccionado no está, agrégalo temporalmente
      if (filtros.anio && !nuevosAnios.includes(Number(filtros.anio))) {
        nuevosAnios = [Number(filtros.anio), ...nuevosAnios];
      }
      setAnios(nuevosAnios);
    } else {
      const todosAnios = [...new Set([...albums.map(album => album.anio), ...videos.map(video => video.anio)])].sort((a, b) => b - a);
      setAnios(todosAnios);
    }
  }, [filtros.artista, albums, videos]);

  const handleFiltroChange = (campo, valor) => {
    const nuevosFiltros = { ...filtros, [campo]: valor, orden: filtros.orden || 'predeterminado' };
    setFiltros(nuevosFiltros);
    onSearch(nuevosFiltros);
  };

  const handleSearchInput = (termino) => {
    setFiltros(f => ({ ...f, termino }));
    // Actualiza todos los filtros, no solo el término
    onSearch({ ...filtros, termino });
    if (onBarraSearch) onBarraSearch(termino);
  };

  const handleResetFilters = () => {
    setFiltros({
      termino: '',
      anio: '',
      artista: '',
      genero: '',
      entidad: '',
      orden: 'predeterminado',
    });
    setResetBarra(true); // <-- activa el reset de la barra
    onSortOrderChange('predeterminado');
    onReset();
  };

  useEffect(() => {
    if (resetBarra) setResetBarra(false); // vuelve a false después de limpiar
  }, [resetBarra]);

  const handleSortChange = (e) => {
    const order = e.target.value;
    setFiltros(f => ({ ...f, orden: order }));
    onSearch({ ...filtros, orden: order });
  };
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-4">Búsqueda Avanzada</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full">
          <BarraDeBusqueda
            onSearch={handleSearchInput}
            placeholder="Artistas, álbumes, canciones, videos musicales..."
            sugerencias={sugerencias}
            reset={resetBarra} // <-- nueva prop
          />
        </div>
        
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Género:</label>
          <select 
            className="w-full border rounded px-3 py-2"
            value={filtros.genero}
            onChange={(e) => handleFiltroChange('genero', e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {generos.map((genero) => (
              <option key={genero.id_genero} value={genero.nombre}>{genero.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entidad:</label>
          <select
            className={`w-full border rounded px-3 py-2 ${entidadError ? 'border-red-500' : ''}`}
            value={filtros.entidad}
              onChange={(e) => {
                handleFiltroChange('entidad', e.target.value);
                setEntidadError(false);
                // Si el orden actual es ranking_comunitario, actualiza el filtro
                if (filtros.orden === 'ranking_comunitario' && e.target.value) {
                  onSearch({ ...filtros, entidad: e.target.value });
                }
              }}
            >
            <option value="">Todas las entidades</option>
            <option value="artist" disabled={!!filtros.anio}>Artistas</option>
            <option value="album">Álbumes</option>
            <option value="song">Canciones</option>
            <option value="video">Videos Musicales</option>
          </select>
          {entidadError && (
            <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>
              Debes seleccionar una entidad para usar el ranking.
            </div>
          )}
        </div>
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por:</label>
          <select
            className="w-full border rounded px-3 py-2"
            onChange={handleSortChange}
          >
            <option value="predeterminado">Predeterminado</option>
            <option value="popularidad">Popularidad</option>
            <option value="valoracion">Valoración promedio</option>
            <option value="ranking_comunitario">Ranking Comunitario</option>
          </select>
        </div>
        <div className="flex items-end">
          <button 
            onClick={handleResetFilters}
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
  videos: PropTypes.array,
  onSortOrderChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired, // Nueva prop para restablecer filtros
  onBarraSearch: PropTypes.func, // NUEVO
};

export default BusquedaAvanzada;