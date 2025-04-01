import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const Planilla = ({ items }) => {
  const [rows, setRows] = useState(10);
  const columns = 8;

  const handleScroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      setRows(rows + 10);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [rows]);

  const uniqueItems = [...new Map(items.map(item => [item.id, item])).values()];

  const cells = uniqueItems.slice(0, rows * columns).map((item, i) => (
    <div key={i} className="cell">
      <a href={`/${item.type}/${item.id}`}>
        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
        <p className="text-center text-xs truncate">{item.name}</p>
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
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  })).isRequired,
};

export default Planilla;