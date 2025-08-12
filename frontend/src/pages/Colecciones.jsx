import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const Colecciones = () => {
  const [colecciones, setColecciones] = useState([]);
  const [progresos, setProgresos] = useState({});
  const [error, setError] = useState(null);
  const { usuario } = useContext(UsuarioContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchColecciones = async () => {
      try {
        const response = await axios.get(`${API_URL}/colecciones`);
        setColecciones(response.data);
      } catch (error) {
        setError('No se pudieron cargar las colecciones.');
      }
    };
    fetchColecciones();
  }, []);

  useEffect(() => {
    const fetchProgresos = async () => {
      if (!usuario) return;
      try {
        const response = await axios.get(`${API_URL}/colecciones/usuario/${usuario.id_usuario}`);
        const progresosObj = {};
        response.data.forEach(item => {
          progresosObj[item.id_coleccion] = item.progreso;
        });
        setProgresos(progresosObj);
      } catch (error) {
        // No pasa nada si no hay progreso
      }
    };
    fetchProgresos();
  }, [usuario]);

  if (!usuario) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Colecciones</h1>
        <p>Debes iniciar sesión para ver las colecciones. Inicia sesión para descubrir y explorar las colecciones disponibles.</p>
      </div>
    );
  }

  // Dimensiones
  const rectWidth = 450;
  const rectHeight = 120;
  const imgSize = 120;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Colecciones</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {colecciones.length > 0 ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          justifyContent: 'flex-start'
        }}>
          {colecciones.map((coleccion) => {
            const progreso = progresos[coleccion.id_coleccion] || 0;
            const completada = progreso >= 100;
            return (
              <div
                key={coleccion.id_coleccion}
                onClick={() => navigate(`/collection/${coleccion.id_coleccion}`)}
                style={{
                  width: rectWidth,
                  height: rectHeight,
                  display: 'flex',
                  alignItems: 'center',
                  background: completada ? '#fffbe6' : '#fff',
                  border: completada ? '3px solid gold' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  boxShadow: completada
                    ? '0 0 16px 2px gold'
                    : '0 2px 8px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/collection/${coleccion.id_coleccion}`);
                  }
                }}
                aria-label={`Ver colección ${coleccion.nombre}`}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  width: imgSize,
                  height: imgSize,
                  flexShrink: 0,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <img
                      src={coleccion.icono || '/default_collection.png'}
                      alt={coleccion.nombre}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: completada ? '2px solid gold' : '1px solid #ccc',
                        boxShadow: completada ? '0 0 8px gold' : 'none'
                      }}
                    />
                  {completada && (
                    <span style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'gold',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 14,
                      boxShadow: '0 0 6px gold'
                    }}>
                      🏅
                    </span>
                  )}
                </div>
                <div style={{
                  width: rectWidth - imgSize,
                  height: rectHeight,
                  background: '#064E3B',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 16,
                  textAlign: 'center',
                  borderTopRightRadius: 12,
                  borderBottomRightRadius: 12
                }}>
                  {coleccion.nombre}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No hay colecciones disponibles.</p>
      )}
    </div>
  );
};

export default Colecciones;