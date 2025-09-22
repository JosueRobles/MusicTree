import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';

const API_URL = import.meta.env.VITE_API_URL;

const BarraDeBusqueda = ({ onSearch, placeholder = "", sugerencias = [], reset = false }) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (reset) setInput('');
  }, [reset]);

  const fetchResultados = debounce(async (valor) => {
    if (typeof valor !== 'string' || valor.length < 2) {
      onSearch(''); // <-- pasa string vacío
      return;
    }
    onSearch(valor); // <-- pasa solo el string
  }, 300);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    fetchResultados(value);
  };

  const handleSearchInput = (termino) => {
    setFiltros(f => ({ ...f, termino }));
    onSearch({ ...filtros, termino });
    if (onBarraSearch) onBarraSearch(termino);
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