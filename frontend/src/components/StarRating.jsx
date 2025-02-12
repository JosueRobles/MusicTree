import { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ valoracionInicial = 0, onRatingChange }) => {
  const [rating, setRating] = useState(valoracionInicial);
  const [hovered, setHovered] = useState(null);

  const handleRating = (newRating) => {
    if (newRating >= 0 && newRating <= 5) {
      setRating(newRating);
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (value) => {
    setHovered(value);
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const handleClick = (event, value) => {
    const rect = event.target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const isHalfStar = clickPosition < rect.width / 2;

    if (value === 0) {
      handleRating(0);
    } else {
      const newRating = isHalfStar ? value - 0.5 : value;
      handleRating(newRating);
    }
  };

  const renderStar = (value) => {
    const currentRating = hovered !== null ? hovered : rating;
    const isFilled = value <= currentRating;
    const isHalf = value - 0.5 === currentRating;
    const isEmpty = value > currentRating;

    if (value === 0) {
      return (
        <div
          key={value}
          onClick={(e) => handleClick(e, value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'pointer' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={currentRating === 0 ? 'green' : 'none'}
            stroke={currentRating === 0 ? 'green' : 'skyblue'}
            viewBox="0 0 24 24"
            style={{
              width: '54px',
              height: '54px',
              transition: 'fill 0.3s ease, stroke 0.3s ease',
            }}
          >
            <path d="M12 2C10.8954 2 10 2.89543 10 4C10 4.53043 10.2107 5.03914 10.5858 5.41421C10.9609 5.78929 11.4696 6 12 6C12.5304 6 13.0391 5.78929 13.4142 5.41421C13.7893 5.03914 14 4.53043 14 4C14 2.89543 13.1046 2 12 2ZM12 8C10.8954 8 10 8.89543 10 10C10 10.5304 10.2107 11.0391 10.5858 11.4142C10.9609 11.7893 11.4696 12 12 12C12.5304 12 13.0391 11.7893 13.4142 11.4142C13.7893 11.0391 14 10.5304 14 10C14 8.89543 13.1046 8 12 8ZM12 14C10.8954 14 10 14.8954 10 16C10 16.5304 10.2107 17.0391 10.5858 17.4142C10.9609 17.7893 11.4696 18 12 18C12.5304 18 13.0391 17.7893 13.4142 17.4142C13.7893 17.0391 14 16.5304 14 16C14 14.8954 13.1046 14 12 14Z"/>
          </svg>
        </div>
      );
    }

    return (
      <div
        key={value}
        onClick={(e) => handleClick(e, value)}
        onMouseEnter={() => handleMouseEnter(value)}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        {isFilled && (
          <Star
            fill="green"
            stroke="green"
            style={{
              width: '54px',
              height: '54px',
              transition: 'fill 0.3s ease',
            }}
          />
        )}
        {isHalf && (
          <Star
            fill="none"
            stroke="green"
            style={{
              width: '54px',
              height: '54px',
              position: 'absolute',
              top: '0',
              left: '0',
              clipPath: 'inset(0 50% 0 0)',
              animation: 'pulse 1s infinite ease-in-out',
            }}
          />
        )}
        {isEmpty && (
          <Star
            fill="none"
            stroke="skyblue"
            style={{
              width: '54px',
              height: '54px',
              transition: 'stroke 0.3s ease',
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[0, 1, 2, 3, 4, 5].map(renderStar)}
      <div style={{ marginLeft: '8px', color: '#4CAF50', fontWeight: 'bold' }}>
        {rating} ⭐
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default StarRating;