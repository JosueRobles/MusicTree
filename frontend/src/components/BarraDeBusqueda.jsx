import { useState } from 'react';
import PropTypes from 'prop-types';

const BarraDeBusqueda = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleInputChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSearch = () => {
    onSearch(query);
  };

  return (
    <div className="flex items-center">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        className="border rounded-l px-4 py-2"
        placeholder="Buscar música, artistas, álbumes..."
      />
      <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded-r">
        Buscar
      </button>
    </div>
  );
};

BarraDeBusqueda.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default BarraDeBusqueda;