import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const Planilla = ({ items }) => {
  const [rows, setRows] = useState(10);
  const columns = 8;

  const handleScroll = useCallback(() => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      setRows((prevRows) => prevRows + 10);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const validItems = items.filter((item) => item.id && item.url && item.nombre);

  const cells = validItems.slice(0, rows * columns).map((item, i) => (
    <div key={item.id || `fallback-${i}`} className="cell">
      <a href={item.url}>
        <img
          src={item.imagen || '/default-image.png'}
          alt={item.nombre || 'Sin nombre'}
          className="w-full h-full object-cover rounded"
        />
        <p className="text-center text-xs truncate">{item.nombre || 'Sin nombre'}</p>
      </a>
    </div>
  ));

  return (
    <div className="grid-container">
      {cells}
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
};

export default Planilla;