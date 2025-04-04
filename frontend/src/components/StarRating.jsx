import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import treeEmpty from '../assets/tree_empty.png';
import treeFilled from '../assets/tree_filled.png';
import starEmpty from '../assets/star_empty.png';
import starHalf from '../assets/star_half.png';
import starFilled from '../assets/star_filled.png';

const StarRating = ({ valoracionInicial = 0, onRatingChange }) => {
  const [rating, setRating] = useState(valoracionInicial);
  const [hovered, setHovered] = useState(null);

  // ✅ Sincroniza el estado cuando valoracionInicial cambie
  useEffect(() => {
    setRating(valoracionInicial);
  }, [valoracionInicial]);

  const handleRating = (newRating) => {
    if (newRating >= 0 && newRating <= 5) {
      setRating(newRating);
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const hoverPosition = event.clientX - rect.left;
    const isHalfStar = hoverPosition < rect.width / 2;
    setHovered(isHalfStar ? value - 0.5 : value);
  };  
  const handleMouseLeave = () => setHovered(null);

  const handleClick = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const isHalfStar = clickPosition < rect.width / 2;
    const newRating = isHalfStar ? value - 0.5 : value;
    handleRating(newRating);
  };

  const handleMouseMove = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const hoverPosition = event.clientX - rect.left;
    const isHalfStar = hoverPosition < rect.width / 2;
    setHovered(isHalfStar ? value - 0.5 : value);
  };  

  const renderIcon = (value) => {
    const currentRating = hovered !== null ? hovered : rating;
    let iconSrc;

    if (value === 0) {
      iconSrc = currentRating === 0 ? treeFilled : treeEmpty;
    } else {
      if (value <= currentRating) {
        iconSrc = starFilled;
      } else if (currentRating > value - 1 && currentRating < value) {
        iconSrc = starHalf;      
      } else {
        iconSrc = starEmpty;
      }
    }

    return (
      <div
        key={value}
        onClick={(e) => handleClick(e, value)}
        onMouseMove={(e) => handleMouseMove(e, value)} // 👈 Evento dinámico
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
        style={{ width: '24px', height: '24px', display: 'inline-block' }}
      >
        <img src={iconSrc} alt={value === 0 ? 'Tree' : 'Star'} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  };

  return (
    <div className="flex items-center">
      {renderIcon(0)}
      {[1, 2, 3, 4, 5].map(renderIcon)}
      <div className="ml-2 text-green-500 font-bold">
        {rating} ⭐
      </div>
    </div>
  );
};

StarRating.propTypes = {
  valoracionInicial: PropTypes.number,
  onRatingChange: PropTypes.func.isRequired,
};

export default StarRating;