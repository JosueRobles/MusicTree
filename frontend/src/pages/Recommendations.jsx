import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const Recommendations = ({ usuario }) => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`${API_URL}/recommend`, {
            params: { id_usuario: usuario.id_usuario }
          });
          setRecommendations(response.data || []);
        } catch (error) {
          console.error('Error fetching recommendations:', error);
        }
      }
    };

    fetchRecommendations();
  }, [usuario]);

  return (
    <div>
      <h2>Recomendaciones para Ti</h2>
      <ul>
        {recommendations.map(rec => (
          <li key={rec.entidad_id}>
            <Link to={`/${rec.tipo}/${rec.entidad_id}`}>
              {rec.nombre} ({rec.tipo}) - {Math.round(rec.estimacion * 100)}%
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Recommendations;