import React, { useState } from 'react';
import StarRating from './StarRating';
import axios from 'axios';

const AlbumView = ({ album }) => {
    const [rating, setRating] = useState(0);

    const handleRating = async (newRating) => {
        setRating(newRating);
        try {
            await axios.post('http://localhost:5000/valoraciones/registrar', {
                entidad_tipo: 'album',
                entidad_id: album.id,
                puntuacion: newRating
            });
            console.log('Valoración guardada');
        } catch (error) {
            console.error('Error al guardar la valoración:', error);
        }
    };

    return (
        <div className="p-4 border rounded shadow-md">
            <h3 className="text-xl font-bold">{album.titulo}</h3>
            <StarRating rating={rating} onRate={handleRating} />
        </div>
    );
};

export default AlbumView;
