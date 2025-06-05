import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const BarraDeBusqueda = ({ onSearch, placeholder, sugerencias = [], className = "", resetQuery }) => {
  const [query, setQuery] = useState('');
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const sugerenciasRef = useRef(null);

  const calcularSimilitud = (str1, str2) => {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    if (str1.includes(str2) || str2.includes(str1)) {
      return true;
    }

    const palabras1 = str1.split(' ');
    const palabras2 = str2.split(' ');
    
    if (palabras1.length !== palabras2.length) {
      return false;
    }
    
    for (let i = 0; i < palabras1.length; i++) {
      if (palabras1[i][0] === palabras2[i][0] && 
          Math.abs(palabras1[i].length - palabras2[i].length) <= 2) {
        continue;
      }
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (resetQuery) {
      setQuery('');
      setSugerenciasFiltradas([]);
      setMostrarSugerencias(false);
    }
  }, [resetQuery]);

  useEffect(() => {
    if (query.trim()) {
      const filtradas = sugerencias.filter(item => {
        if (item.texto.toLowerCase().includes(query.toLowerCase())) {
          return true;
        }
        return calcularSimilitud(item.texto, query);
      });
      
      setSugerenciasFiltradas(filtradas.slice(0, 8));
      setMostrarSugerencias(true);
    } else {
      setSugerenciasFiltradas([]);
      setMostrarSugerencias(false);
    }
  }, [query, sugerencias]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        const filtradas = sugerencias.filter(item =>
          item.texto.toLowerCase().includes(query.toLowerCase())
        );
        setSugerenciasFiltradas(filtradas.slice(0, 8));
        setMostrarSugerencias(true);
      } else {
        setSugerenciasFiltradas([]);
        setMostrarSugerencias(false);
      }
    }, 300);
  
    return () => clearTimeout(delayDebounceFn);
  }, [query, sugerencias]);

  const handleInputChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSugerenciaClick = (sugerencia) => {
    setQuery(sugerencia.texto);
    setMostrarSugerencias(false);
    onSearch(sugerencia);
  };

  return (
    <div className={`relative ${className}`} ref={sugerenciasRef}>
      <div className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          className="border rounded-l px-4 py-2 w-full"
          placeholder={placeholder || "Buscar música, artistas, álbumes..."}
        />
      </div>
      
      {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
        <div className="absolute z-50 bg-white border border-gray-300 w-full mt-1 shadow-lg rounded">
          <ul>
            {sugerenciasFiltradas.map((sugerencia, index) => (
              <li 
                key={`${sugerencia.tipo}-${sugerencia.id || index}`}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleSugerenciaClick(sugerencia)}
              >
                {sugerencia.imagen && (
                  <img 
                    src={sugerencia.imagen} 
                    alt={sugerencia.texto} 
                    className="w-8 h-8 mr-2 object-cover rounded"
                  />
                )}
                <div>
                  <div className="font-medium">{sugerencia.texto}</div>
                  {sugerencia.tipo && (
                    <div className="text-xs text-gray-500">{sugerencia.tipo}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

BarraDeBusqueda.propTypes = {
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  sugerencias: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      texto: PropTypes.string.isRequired,
      tipo: PropTypes.string,
    })
  ),
  className: PropTypes.string,
  resetQuery: PropTypes.bool, // Prop para resetear la barra
};

export default BarraDeBusqueda;