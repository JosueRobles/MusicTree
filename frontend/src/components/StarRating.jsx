import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import treeEmpty from '../assets/tree_empty.png';
import treeFilled from '../assets/tree_filled.png';
import starEmpty from '../assets/star_empty.png';
import starHalf from '../assets/star_half.png';
import starFilled from '../assets/star_filled.png';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const StarRating = ({
  valoracionInicial = 0,
  onRatingChange,
  entidadTipo,
  entidadId,
  usuario,
}) => {
  const [rating, setRating] = useState(valoracionInicial ?? null);
  const [hovered, setHovered] = useState(null);
  const [comentario, setComentario] = useState('');
  const [comentarioGuardado, setComentarioGuardado] = useState(false);
  const [emocion, setEmocion] = useState('');
  const [emocionesCount, setEmocionesCount] = useState({});
  const [familiaridad, setFamiliaridad] = useState("");
  const [familiaridadCounts, setFamiliaridadCounts] = useState({});
  const [modoValoracion, setModoValoracion] = useState("manual");
  const [editable, setEditable] = useState(true);
  const [mostrarGuardarAuto, setMostrarGuardarAuto] = useState(false);

  const familiaridadNiveles = [
    { key: "primera_vez", label: "Primera vez que escucho", img: "/familiaridad/primera_vez.png" },
    { key: "algunas_veces", label: "La he escuchado algunas veces", img: "/familiaridad/algunas_veces.png" },
    { key: "muchas_veces", label: "La he escuchado mucho", img: "/familiaridad/muchas_veces.png" },
  ];

  useEffect(() => {
    setRating(valoracionInicial);
  }, [valoracionInicial]);

  useEffect(() => {
    const fetchEmociones = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/emociones`, {
          params: { entidad_tipo: entidadTipo, entidad_id: entidadId },
        });

        const emocionesData = data.reduce((acc, item) => {
          acc[item.emocion] = item.count || 0;
          return acc;
        }, {});
        setEmocionesCount(emocionesData);
      } catch (error) {
        console.error('Error fetching emotions data:', error);
      }
    };

    fetchEmociones();
  }, [entidadTipo, entidadId]);

  useEffect(() => {
    const fetchData = async () => {
      if (usuario) {
        try {
          const { data } = await axios.get(`${API_URL}/valoraciones`, {
            params: {
              usuario: usuario.id_usuario,
              entidad_tipo: entidadTipo,
              entidad_id: entidadId,
            },
          });
          setComentario(data.comentario || '');
          setComentarioGuardado(!!data.comentario);
          setEmocion(data.emocion || '');
          setRating(data.calificacion || 0);

          const emocionesResponse = await axios.get(`${API_URL}/emociones`, {
            params: {
              entidad_tipo: entidadTipo,
              entidad_id: entidadId,
            },
          });

          if (Array.isArray(emocionesResponse.data)) {
            const emocionesData = emocionesResponse.data.reduce((acc, item) => {
              acc[item.emocion] = item.count;
              return acc;
            }, {});
            setEmocionesCount(emocionesData);
          } else {
            setEmocionesCount({});
          }
        } catch (error) {
          console.error('Error fetching rating data:', error);
        }
      }
    };
    fetchData();
  }, [usuario, entidadTipo, entidadId]);

  useEffect(() => {
    // Obtener familiaridad del usuario
    if (usuario) {
      axios.get(`${API_URL}/familiaridad`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: entidadTipo, entidad_id: entidadId }
      }).then(res => setFamiliaridad(res.data?.nivel || ""));
    }
    // Obtener conteo global
    axios.get(`${API_URL}/familiaridad/contar`, {
      params: { entidad_tipo: entidadTipo, entidad_id: entidadId }
    }).then(res => {
      const obj = {};
      (res.data || []).forEach(item => { obj[item.nivel] = Number(item.count) || 0; });
      setFamiliaridadCounts(obj);
    });
  }, [usuario, entidadTipo, entidadId]);

  useEffect(() => {
    if (usuario) {
      axios.get(`${API_URL}/emociones`, {
        params: { entidad_tipo: entidadTipo, entidad_id: entidadId }
      }).then(res => {
        // Actualiza los contadores
        const emocionesData = (res.data || []).reduce((acc, item) => {
          acc[item.emocion] = Number(item.count) || 0;
          return acc;
        }, {});
        setEmocionesCount(emocionesData);
      });

      // Trae la emoción del usuario actual
      axios.get(`${API_URL}/emociones`, {
        params: {
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          usuario: usuario.id_usuario
        }
      }).then(res => {
        // Si el backend soporta filtrar por usuario, usa esto:
        if (Array.isArray(res.data) && res.data.length > 0) {
          setEmocion(res.data[0].emocion);
        }
      });
    }
  }, [usuario, entidadTipo, entidadId]);

  useEffect(() => {
    // Trae la preferencia del usuario
    if (usuario && (entidadTipo === "album" || entidadTipo === "artista")) {
      axios.get(`${API_URL}/usuarios/usuarios/${usuario.id_usuario}`)
        .then(res => {
          const prefs = res.data?.metodologia_valoracion || {};
          // OJO: usa modo_valoracion, no modo
          setModoValoracion(prefs.modo_valoracion || "manual");
          if (prefs.modo_valoracion === "semiautomatico") setEditable(false);
          else setEditable(true);
        });
      // Si semiautomático, trae la calificación calculada
      axios.get(`${API_URL}/valoraciones/personalizada`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: entidadTipo, entidad_id: entidadId }
      }).then(res => {
        setRating(res.data.calificacion || 0);
        // Si hay calificación automática, pregunta si desea guardarla
        if (res.data.calificacion && res.data.calificacion > 0) {
          setMostrarGuardarAuto(true);
        }
      });
    }
  }, [usuario, entidadTipo, entidadId]);

  const handleGuardarValoracionAuto = async () => {
    try {
      await axios.post(`${API_URL}/valoraciones`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        calificacion: rating,
        comentario: "Valoración automática basada en tus valoraciones previas",
        automatica: true // Si quieres distinguir en la BD, agrega la columna
      });
      setMostrarGuardarAuto(false);
      alert("Valoración automática guardada.");
    } catch (e) {
      alert("Error al guardar valoración automática");
    }
  };

  const handleRating = async (newRating) => {
    if (newRating >= 0 && newRating <= 5) {
      setRating(newRating);
      onRatingChange(newRating);

      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          calificacion: newRating,
          comentario,
          emocion,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

  const handleComentario = async () => {
    if (!comentario.trim()) {
      alert('El comentario no puede estar vacío.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        comentario,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setComentarioGuardado(true);
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  };

  const handleEliminarEmocion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/emociones`, {
        data: {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          emocion,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      // Actualizar el estado para reflejar la eliminación
      setEmocion('');
      setEmocionesCount((prevState) => ({
        ...prevState,
        [emocion]: Math.max((prevState[emocion] || 1) - 1, 0),
      }));

    } catch (error) {
      console.error('Error al eliminar emoción:', error);
    }
  };

  const handleAgregarOReemplazarEmocion = async (emocionSeleccionada) => {
    try {
      const token = localStorage.getItem('token');
  
      await axios.put(
        `${API_URL}/emociones`,
        {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          emocion: emocionSeleccionada,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      // Actualizar el estado con la nueva emoción
      setEmocion(emocionSeleccionada);
  
      // Incrementar el contador de la nueva emoción y decrementar la anterior
      setEmocionesCount((prevState) => ({
        ...prevState,
        [emocionSeleccionada]: (prevState[emocionSeleccionada] || 0) + 1,
        [emocion]: Math.max((prevState[emocion] || 1) - 1, 0),
      }));

    } catch (error) {
      console.error('Error al modificar emoción:', error);
    }
  };

  const handleEliminarComentario = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/valoraciones/comentario`, {
        usuario: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setComentario('');
      setComentarioGuardado(false);
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
    }
  };

  const handleFamiliaridad = async (nivelSeleccionado) => {
    if (!usuario) return;
    setFamiliaridad(nivelSeleccionado);
    await axios.post(`${API_URL}/familiaridad`, {
      usuario: usuario.id_usuario,
      entidad_tipo: entidadTipo,
      entidad_id: entidadId,
      nivel: nivelSeleccionado,
    });
    // Actualiza conteo global
    const res = await axios.get(`${API_URL}/familiaridad/contar`, {
      params: { entidad_tipo: entidadTipo, entidad_id: entidadId }
    });
    const obj = {};
    (res.data || []).forEach(item => { obj[item.nivel] = item.count; });
    setFamiliaridadCounts(obj);
  };

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

  const handleMouseLeave = () => setHovered(null);

  const renderIconSrc = (value) => {
    // Si rating es null, todo vacío
    if (rating === null) {
      return value === 0 ? treeEmpty : starEmpty;
    }
    const currentRating = hovered !== null ? hovered : rating;
    if (value === 0) {
      return currentRating === 0 ? treeFilled : treeEmpty;
    } else {
      if (value <= currentRating) {
        return starFilled;
      } else if (currentRating > value - 1 && currentRating < value) {
        return starHalf;
      } else {
        return starEmpty;
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4, 5].map(value =>
          <div
            key={value}
            onClick={editable ? (e) => handleClick(e, value) : undefined}
            onMouseMove={editable ? (e) => handleMouseMove(e, value) : undefined}
            onMouseLeave={editable ? handleMouseLeave : undefined}
            className={editable ? "cursor-pointer" : "opacity-50"}
            style={{ width: '24px', height: '24px', display: 'inline-block' }}
          >
            <img src={renderIconSrc(value)} alt={value === 0 ? 'Tree' : 'Star'} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
        <div className="ml-2 text-green-500 font-bold">{rating} ⭐</div>
      </div>
      {!editable && (
        <div className="text-xs text-gray-500 mt-1">
          Valoración calculada automáticamente según tus preferencias
        </div>
      )}
      {rating > 0 && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Agregar comentario..."
            className="border p-2 mt-4 w-full"
          />
          {comentarioGuardado ? (
            <button onClick={handleEliminarComentario} className="bg-red-500 text-white px-4 py-2 rounded mt-2">
              Eliminar Comentario
            </button>
          ) : (
            <button onClick={handleComentario} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
              Agregar Comentario
            </button>
          )}

          {/* EMOCIONES */}
          <div className="flex flex-col items-center mt-4">
            <div style={{ fontWeight: "bold", color: "#3b82f6", marginBottom: 4 }}>
              <span style={{ fontSize: 18, marginRight: 4 }}></span>¿Qué emoción me produce?
            </div>
            <div className="emocion-container">
              {['alegria', 'tristeza', 'energia', 'relajacion', 'romance', 'enojo', 'inspiracion', 'nostalgia'].map((em) => (
                <div key={em} className="emocion-item">
                  <img
                    src={`/emojis/${em}.png`}
                    alt={em}
                    className={em === emocion ? 'selected' : ''}
                    onClick={() => handleAgregarOReemplazarEmocion(em)}
                  />
                  <span className="emocion-count">{Number(emocionesCount[em]) || 0}</span>
                  <span className="emocion-label" style={{ fontSize: 12, color: "#bbb" }}>{em.charAt(0).toUpperCase() + em.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
          {emocion && (
            <button onClick={handleEliminarEmocion} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
              Eliminar Emoción
            </button>
          )}

          {/* FAMILIARIDAD */}
          <div className="familiaridad-container mt-4">
            {familiaridadNiveles.map((nivel) => (
              <div
                key={nivel.key}
                className="familiaridad-item"
                style={{ textAlign: "center", margin: "0 16px", cursor: "pointer" }}
                onClick={() => handleFamiliaridad(nivel.key)}
              >
                <img
                  src={nivel.img}
                  alt={nivel.label}
                  className={`familiaridad-icon${familiaridad === nivel.key ? " selected" : ""}`}
                  style={{
                    width: 56,
                    height: 56,
                    border: familiaridad === nivel.key ? "3px solid #3b82f6" : "2px solid #ccc",
                    borderRadius: 12,
                    marginBottom: 4,
                    transition: "border 0.2s",
                    cursor: "pointer"
                  }}
                />
                <span className="familiaridad-count" style={{ fontSize: 13, color: "#16a34a", fontWeight: "bold" }}>
                  {Number(familiaridadCounts[nivel.key]) || 0}
                </span>
                <div className="familiaridad-label" style={{ fontSize: 12, color: "#bbb", marginTop: 2 }}>
                  {nivel.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {mostrarGuardarAuto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <p className="mb-4 font-semibold">
              ¿Deseas guardar esta calificación automática en base a tus valoraciones previas?
            </p>
            <button
              onClick={handleGuardarValoracionAuto}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Sí, guardar
            </button>
            <button
              onClick={() => setMostrarGuardarAuto(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

StarRating.propTypes = {
  valoracionInicial: PropTypes.number,
  onRatingChange: PropTypes.func.isRequired,
  entidadTipo: PropTypes.string.isRequired,
  entidadId: PropTypes.number.isRequired,
  usuario: PropTypes.object.isRequired,
};

export default StarRating;