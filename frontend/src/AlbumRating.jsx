import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import StarRating from './StarRating';

const AlbumRating = ({ album }) => {
  const [rating, setRating] = useState(0);

  useEffect(() => {
    // Fetch rating from the server or calculate it
    setRating(album.rating || 0);
  }, [album]);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
    // Send the new rating to the server
  };

  return (
    <div>
      <h2>{album.titulo}</h2>
      <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
    </div>
  );
};

AlbumRating.propTypes = {
  album: PropTypes.shape({
    id: PropTypes.number.isRequired,
    titulo: PropTypes.string.isRequired,
    rating: PropTypes.number,
  }).isRequired,
};

export default AlbumRating;