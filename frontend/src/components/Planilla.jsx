import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const Planilla = ({ items, onPaginar, hayMasPaginas, searchTerm, totalPaginas, pagina }) => {
  const [rows, setRows] = useState(10);
  const columns = 8;
  const LIMITE_SCROLL = 1000;

  const handleScroll = useCallback(() => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      if (rows * columns < LIMITE_SCROLL && rows * columns < items.length) {
        setRows((prevRows) => prevRows + 10);
      }
    }
  }, [rows, items.length]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const validItems = items.filter((item) => item.id && item.url && item.nombre);

  // Filtra por el término de búsqueda (case-insensitive)
  const filteredItems = searchTerm
    ? validItems.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : validItems;

  const uniqueItems = Array.from(new Map(filteredItems.map(item => [item.url, item])).values());
  const itemsToShow = uniqueItems; // Ya no hagas slice aquí
  const hayMas = items.length > LIMITE_SCROLL; // O mejor, pásalo como prop desde el padre
  const cells = itemsToShow.map((item, i) => (
    <div key={item.id || `fallback-${i}`} className="cell">
      <a href={item.url}>
        <img
          src={item.imagen || '/default-image.png'}
          alt={item.nombre || 'Sin nombre'}
        />
        <p title={item.nombre || 'Sin nombre'}>
          {item.nombre || 'Sin nombre'}
        </p>
      </a>
    </div>
  ));

  return (
    <div>
      <div className="grid-container">
        {cells}
        {/* Botones de paginación como celdas extra */}
        {(pagina < totalPaginas) && (
          <div className="cell">
            <button
              className="planilla-paginacion-btn"
              onClick={() => onPaginar(pagina + 1)}
            >
              Siguiente página
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

Planilla.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    nombre: PropTypes.string,
    imagen: PropTypes.string,
    url: PropTypes.string.isRequired,
  })).isRequired,
  onPaginar: PropTypes.func,
  hayMasPaginas: PropTypes.bool,
  searchTerm: PropTypes.string,
  totalPaginas: PropTypes.number.isRequired, // <-- Agrega esto
  pagina: PropTypes.number.isRequired,       // <-- Y esto
};

export default Planilla;