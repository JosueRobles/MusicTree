import { useState } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';

const API_URL = import.meta.env.VITE_API_URL;

const BarraDeBusqueda = ({ onSearch, placeholder = "" }) => {
  const [input, setInput] = useState('');

  const fetchResultados = debounce(async (valor) => {
    if (typeof valor !== 'string' || valor.length < 2) {
      onSearch([]); // Limpia sugerencias si es muy corto o no es string
      return;
    }
    // Llama a un endpoint de búsqueda global, o a cada entidad por separado
    const [artistas, albums, canciones, videos] = await Promise.all([
      fetch(`${API_URL}/artistas?termino=${encodeURIComponent(valor)}`).then(r => r.json()),
      fetch(`${API_URL}/albumes?termino=${encodeURIComponent(valor)}`).then(r => r.json()),
      fetch(`${API_URL}/canciones?termino=${encodeURIComponent(valor)}`).then(r => r.json()),
      fetch(`${API_URL}/videos?termino=${encodeURIComponent(valor)}`).then(r => r.json()),
    ]);
    // Junta y etiqueta resultados
    const resultados = [
      ...artistas.map(a => ({ ...a, tipo: 'Artista', texto: `Artista: ${a.nombre_artista}` })),
      ...albums.map(a => ({ ...a, tipo: 'Álbum', texto: `Álbum: ${a.titulo}` })),
      ...canciones.map(c => ({ ...c, tipo: 'Canción', texto: `Canción: ${c.titulo}` })),
      ...videos.map(v => ({ ...v, tipo: 'Video', texto: `Video: ${v.titulo}` })),
    ];
    onSearch(resultados);
  }, 300);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    fetchResultados(value);
  };

  return (
    <input
      type="text"
      className="border rounded px-4 py-2 w-full"
      placeholder={placeholder}
      value={input}
      onChange={handleInputChange}
      autoComplete="off"
    />
  );
};

BarraDeBusqueda.propTypes = {
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export default BarraDeBusqueda;