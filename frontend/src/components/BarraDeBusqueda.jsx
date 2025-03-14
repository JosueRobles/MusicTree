import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const BarraDeBusqueda = ({ onSearch, placeholder, sugerencias = [], className = "" }) => {
  const [query, setQuery] = useState('');
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const sugerenciasRef = useRef(null);

  // Función para calcular la similitud entre dos cadenas (algoritmo de Levenshtein simplificado)
  const calcularSimilitud = (str1, str2) => {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    // Para errores tipográficos simples, verificamos si una cadena contiene otra
    if (str1.includes(str2) || str2.includes(str1)) {
      return true;
    }

    // Para errores más complejos podríamos implementar Levenshtein u otros algoritmos
    // Para este ejemplo simplificado, consideramos casos como "mikael jaison" -> "michael jackson"
    const palabras1 = str1.split(' ');
    const palabras2 = str2.split(' ');
    
    if (palabras1.length !== palabras2.length) {
      return false;
    }
    
    // Verificar cada palabra con cierta tolerancia
    for (let i = 0; i < palabras1.length; i++) {
      // Si la primera letra coincide y la longitud es similar, consideramos que podría ser un error tipográfico
      if (palabras1[i][0] === palabras2[i][0] && 
          Math.abs(palabras1[i].length - palabras2[i].length) <= 2) {
        continue;
      }
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    // Filtrar sugerencias cada vez que cambia la consulta
    if (query.trim()) {
      const filtradas = sugerencias.filter(item => {
        // Comprobamos texto exacto
        if (item.texto.toLowerCase().includes(query.toLowerCase())) {
          return true;
        }
        // Comprobamos similitud para tolerancia a errores
        return calcularSimilitud(item.texto, query);
      });
      
      setSugerenciasFiltradas(filtradas.slice(0, 8)); // Limitamos a 8 sugerencias
      setMostrarSugerencias(true);
    } else {
      setSugerenciasFiltradas([]);
      setMostrarSugerencias(false);
    }
    
    // Ejecutar la búsqueda en tiempo real
    onSearch(query);
  }, [query, sugerencias, onSearch]);

  // Cerrar sugerencias al hacer clic fuera
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

  const handleInputChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSugerenciaClick = (sugerencia) => {
    setQuery(sugerencia.texto);
    setMostrarSugerencias(false);
    onSearch(sugerencia.texto);
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
      imagen: PropTypes.string
    })
  ),
  className: PropTypes.string
};

export default BarraDeBusqueda;