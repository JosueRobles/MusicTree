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

  const cells = [];
  for (let i = 0; i < rows * columns; i++) {
    const item = items[i % items.length];
    if (item) {
      cells.push(
        <div key={i} className="cell">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
          <p className="text-center text-xs truncate">{item.name}</p>
        </div>
      );
    } else {
      cells.push(<div key={i} className="cell"></div>);
    }
  }

  return (
    <div className="grid-container">
      {cells}
    </div>
  );
};

Planilla.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
  })).isRequired,
};

export default Planilla;