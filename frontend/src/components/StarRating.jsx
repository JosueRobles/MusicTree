import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import treeEmpty from '../assets/tree_empty.png';
import treeFilled from '../assets/tree_filled.png';
import starEmpty from '../assets/star_empty.png';
import starHalf from '../assets/star_half.png';
import starFilled from '../assets/star_filled.png';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const StarRating = ({
  valoracionInicial = 0,
  onRatingChange,
  entidadTipo,
  entidadId,
  usuario,
  elementoNombre,
  elementoFoto,
  rankingContextoTipo,
  rankingContextoId,
}) => {
  const [rating, setRating] = useState(valoracionInicial ?? null);
  const [hovered, setHovered] = useState(null);
  const [comentario, setComentario] = useState('');
  const [comentarioGuardado, setComentarioGuardado] = useState(false);
  const [emocion, setEmocion] = useState('');
  const [emocionesCount, setEmocionesCount] = useState({});
  const [elementoValorando, setElementoValorando] = useState({ nombre: elementoNombre, foto: elementoFoto });
  const [familiaridad, setFamiliaridad] = useState("");
  const [familiaridadCounts, setFamiliaridadCounts] = useState({});
  const [usarRankingContexto, setUsarRankingContexto] = useState(false);
  const [modoValoracion, setModoValoracion] = useState("manual");
  const [editable, setEditable] = useState(true);
  const [mostrarGuardarAuto, setMostrarGuardarAuto] = useState(false);
  const [valoracionSimilar, setValoracionSimilar] = useState(null);
  const [esNoMusical, setEsNoMusical] = useState(false);
  const [motivoNoMusical, setMotivoNoMusical] = useState("");
  const [similarInfo, setSimilarInfo] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [hasLists, setHasLists] = useState(true);
  const [showPositioningModal, setShowPositioningModal] = useState(false);
  const [rankingInfo, setRankingInfo] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [previewElements, setPreviewElements] = useState(null);
  const [pendingReposition, setPendingReposition] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [detalleStats, setDetalleStats] = useState(null);
  const [isRevaluation, setIsRevaluation] = useState(false);
  const [currentRankingPosition, setCurrentRankingPosition] = useState(null);

  const familiaridadNiveles = [
    { key: "primera_vez", label: "Primera vez que escucho", img: "/familiaridad/primera_vez.png" },
    { key: "algunas_veces", label: "La he escuchado algunas veces", img: "/familiaridad/algunas_veces.png" },
    { key: "muchas_veces", label: "La he escuchado mucho", img: "/familiaridad/muchas_veces.png" },
  ];

  useEffect(() => {
    setRating(valoracionInicial);
  }, [valoracionInicial]);

  useEffect(() => {
    setElementoValorando({ nombre: elementoNombre, foto: elementoFoto });
  }, [elementoNombre, elementoFoto]);

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

  useEffect(() => {
    // Verificar si existe una valoración previa y mostrar banner de revaluación
    const checkExistingRating = async () => {
      if (!usuario || !entidadTipo || !entidadId) return;
      if (entidadTipo !== "album" && entidadTipo !== "artista" && entidadTipo !== "cancion") return;

      try {
        const token = localStorage.getItem('token');
        const { data: ranking } = await axios.get(`${API_URL}/rankings/personal`, {
          params: {
            usuario: usuario.id_usuario,
            tipo_entidad: entidadTipo,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const existingItem = Array.isArray(ranking) && ranking.find(item => item.entidad_id === entidadId);
        
        if (existingItem) {
          setIsRevaluation(false);
          setCurrentRankingPosition(null);
          setRankingInfo({ ranking }); // Guardar ranking para usarlo después
        } else {
          setIsRevaluation(false);
          setCurrentRankingPosition(null);
        }
      } catch (error) {
        console.error('Error checking existing rating:', error);
      }
    };

    checkExistingRating();
  }, [usuario, entidadTipo, entidadId]);

  useEffect(() => {
    // Inicializar preview cuando se abre el modal
    if (showPositioningModal && rankingInfo && selectedPosition) {
      handleUpdatePosition(selectedPosition);
    }
  }, [showPositioningModal, rankingInfo, selectedPosition]);

  useEffect(() => {
    // Busca si hay una valoración en el mismo grupo (pero diferente id)
    const fetchValoracionSimilar = async () => {
      if (!usuario || !entidadTipo || !entidadId) return;
      // Solo aplica para álbumes
      if (entidadTipo !== "album") return;
      try {
        // Consulta el grupo del actual
        const { data: clusterActual } = await axios.get(`${API_URL}/ml/cluster/${entidadTipo}/${entidadId}`);
        const grupoActual = clusterActual?.grupo;
        if (!grupoActual) return;
        // Busca valoraciones del usuario en ese grupo (excepto el actual)
        const { data: grupoEntidades } = await axios.get(`${API_URL}/ml/cluster/${entidadTipo}/grupo/${grupoActual}`);
        const idsGrupo = grupoEntidades.filter(id => id !== entidadId);
        if (idsGrupo.length === 0) return;
        const { data: valoraciones } = await axios.get(`${API_URL}/valoraciones`, {
          params: { usuario: usuario.id_usuario, entidad_tipo: entidadTipo }
        });
        // Busca la versión valorada
        const similar = valoraciones.find(v => idsGrupo.includes(v[entidadTipo]));
        if (similar) {
          setValoracionSimilar(similar.calificacion);
          // Trae info de la versión valorada
          let info = { id: similar[entidadTipo], titulo: '', album: null, similitud: null };
          // Trae info de la entidad valorada
          const endpoint = 'albumes';
          const { data: infoEntidad } = await axios.get(`${API_URL}/${endpoint}/${similar[entidadTipo]}`);
          info.titulo = infoEntidad.titulo || '';
          info.anio = infoEntidad.anio || infoEntidad.album?.anio || null;
          // No hay similitud para álbumes por ahora
          setSimilarInfo(info);
          setEditable(false); // Bloquea valoración hasta que el usuario confirme
        }
      } catch (err) { /* ignore */ }
    };
    fetchValoracionSimilar();
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

      const shouldShowPrompt = (entidadTipo === "album" || entidadTipo === "artista" || entidadTipo === "cancion") && usuario;
      if (shouldShowPrompt) {
        setIsRevaluation(false);
        setCurrentRankingPosition(null);
        setPendingReposition(true);
        setPendingRating(newRating);
        setRankingInfo(null);
        setSelectedPosition(null);
        setPreviewElements(null);
      }

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
        if (shouldShowPrompt) {
          setPendingReposition(false);
          setPendingRating(null);
        }
      }
    }
  };

  const handleOpenPendingPositioning = async () => {
    const ratingToUse = pendingRating ?? rating;
    setPendingReposition(false);
    setPendingRating(null);
    setShowPositioningModal(true);
    setRankingInfo({
      loading: true,
      totalElements: 0,
      posicionMin: 1,
      posicionMax: 1,
      ranking: [],
      itemsWithSameRating: [],
      newRating: ratingToUse,
    });
    setSelectedPosition(1);
    setPreviewElements(null);

    await fetchRankingPositionInfo(ratingToUse, usarRankingContexto, true);
  };

  const getRankingParams = (useContextOverride) => {
    const useContext = typeof useContextOverride === 'boolean' ? useContextOverride : usarRankingContexto;
    const params = {
      usuario: usuario.id_usuario,
      tipo_entidad: entidadTipo,
    };
    if (useContext && rankingContextoTipo && rankingContextoId) {
      params.contexto_tipo = rankingContextoTipo;
      params.contexto_id = rankingContextoId;
    }
    return params;
  };

  const openPositioningModal = async (ranking, ratingValue) => {
    if (!ranking) {
      console.log('Ranking is null, showing modal anyway');
      setRankingInfo({
        totalElements: 0,
        posicionMin: 1,
        posicionMax: 1,
        ranking: [],
        itemsWithSameRating: [],
      });
      setSelectedPosition(1);
      setShowPositioningModal(true);
      setPreviewElements(buildPositionPreview([], ratingValue, 1));
      return;
    }

    // Si es un array vacío (primer elemento)
    if (Array.isArray(ranking) && ranking.length === 0) {
      console.log('Empty ranking, this is the first item');
      setRankingInfo({
        totalElements: 0,
        posicionMin: 1,
        posicionMax: 1,
        ranking: [],
        itemsWithSameRating: [],
      });
      setSelectedPosition(1);
      setShowPositioningModal(true);
      setPreviewElements(buildPositionPreview([], ratingValue, 1));
      return;
    }

    // Encontrar cuántos elementos tienen la MISMA valoración que la nueva
    const itemsWithSameRating = ranking.filter(item => item.valoracion === ratingValue);
    const countWithSameRating = itemsWithSameRating.length;
    
    // El nuevo elemento de esta valoración puede ir de posición 1 a (countWithSameRating + 1)
    // porque también se va a agregar uno nuevo
    const posicionMin = 1;
    const posicionMax = countWithSameRating + 1;

    console.log('Ranking info calculated:', { 
      totalElements: ranking.length,
      countWithSameRating,
      posicionMin,
      posicionMax,
      newRating: ratingValue,
      itemsWithSameRating: itemsWithSameRating.map(i => ({ id: i.id, nombre: i.nombre, valoracion: i.valoracion }))
    });

    setRankingInfo({
      loading: false,
      totalElements: ranking.length,
      countWithSameRating,
      posicionMin,
      posicionMax,
      ranking,
      itemsWithSameRating,
      newRating: ratingValue,
    });
    
    setSelectedPosition(posicionMax); // Por defecto al final del grupo
    setShowPositioningModal(true);
    setPreviewElements(buildPositionPreview(ranking, ratingValue, posicionMax));
  };

  const buildPositionPreview = (ranking, ratingValue, targetPosition) => {
    const itemsWithSameRating = Array.isArray(ranking) ? ranking.filter(item => item.valoracion === ratingValue) : [];
    const rankingParaVista = itemsWithSameRating;
    const rangeStart = Math.max(0, targetPosition - 3);
    const rangeEnd = Math.min(rankingParaVista.length, targetPosition + 2);

    const elementsInRange = rankingParaVista
      .slice(rangeStart, rangeEnd)
      .filter(item => item.entidad_id !== entidadId);

    const preview = [];
    let previewPos = rangeStart + 1;
    let newItemInserted = false;

    elementsInRange.forEach((item) => {
      if (previewPos === targetPosition && !newItemInserted) {
        preview.push({
          id: `new-${entidadId}`,
          entidad_id: entidadId,
          nombre: elementoValorando.nombre || 'Nueva valoración',
          foto: elementoValorando.foto,
          valoracion: ratingValue,
          previewPosition: previewPos,
          isNewItem: true,
        });
        previewPos++;
        newItemInserted = true;
      }

      preview.push({
        ...item,
        previewPosition: previewPos,
        isNewItem: false,
      });
      previewPos++;
    });

    if (!newItemInserted && previewPos === targetPosition) {
      preview.push({
        id: `new-${entidadId}`,
        entidad_id: entidadId,
        nombre: elementoValorando.nombre || 'Nueva valoración',
        foto: elementoValorando.foto,
        valoracion: ratingValue,
        previewPosition: targetPosition,
        isNewItem: true,
      });
    }

    return preview;
  };

  const fetchRankingPositionInfo = async (rating, useContextOverride, openOnFetch = false) => {
    try {
      const token = localStorage.getItem('token');
      const params = getRankingParams(useContextOverride);
      console.log('Fetching ranking for:', params);
      
      // Obtener ranking personal del usuario
      const { data: ranking } = await axios.get(`${API_URL}/rankings/personal`, {
        params: {
          ...params,
          minimal: true,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Ranking data:', ranking);

      // Verificar si el elemento ya estaba valorado (revaluación)
      const existingItem = Array.isArray(ranking) && ranking.find(item => item.entidad_id === entidadId);
      
      if (existingItem) {
        // Es una revaluación - mostrar banner de pregunta
        setIsRevaluation(true);
        setCurrentRankingPosition(existingItem.posicion);
        setRankingInfo({ ranking, loading: false }); // Guardar ranking para usarlo después
        if (openOnFetch || showPositioningModal) {
          await openPositioningModal(ranking, rating);
        }
        return;
      }

      // Es una nueva valoración - guardar ranking sin abrir el modal inmediatamente
      setIsRevaluation(false);
      setPendingReposition(true);
      setPendingRating(rating);
      setRankingInfo({
        loading: false,
        totalElements: Array.isArray(ranking) ? ranking.length : 0,
        posicionMin: 1,
        posicionMax: 1,
        ranking,
        itemsWithSameRating: [],
        newRating: rating,
      });

      if (openOnFetch || showPositioningModal) {
        setPendingReposition(false);
        setShowPositioningModal(true);
        await openPositioningModal(ranking, rating);
      }
    } catch (error) {
      console.error('Error fetching ranking info:', error);
      // Mostrar modal de todas formas para permitir posicionamiento
      setRankingInfo({
        totalElements: 0,
        posicionMin: 1,
        posicionMax: 1,
        ranking: [],
        itemsWithSameRating: [],
      });
      setSelectedPosition(1);
      if (openOnFetch) {
        setShowPositioningModal(true);
      }
    }
  };

  const handleUpdatePosition = async (newPosition) => {
    setSelectedPosition(newPosition);
    if (!rankingInfo) return;

    const preview = buildPositionPreview(rankingInfo.ranking || [], rating, newPosition);
    console.log('Preview elements:', preview);
    setPreviewElements(preview);
  };

  const confirmPositioning = async () => {
    if (!rankingInfo || !selectedPosition) return;

    try {
      const token = localStorage.getItem('token');
      console.log('confirmPositioning called with selectedPosition:', selectedPosition, 'isRevaluation:', isRevaluation);
      
      // Si es el primer elemento, simplemente cerrar el modal
      if (rankingInfo.totalElements === 0) {
        console.log('First element, just closing modal');
        alert('✅ Elemento agregado al ranking en posición 1');
        setShowPositioningModal(false);
        setRankingInfo(null);
        setSelectedPosition(null);
        setPreviewElements(null);
        return;
      }

      // Usar el ranking ya cargado siempre que sea posible para ahorrar tiempo
      let rankingActual = rankingInfo?.ranking;
      if (!Array.isArray(rankingActual) || rankingActual.length === 0) {
        const { data } = await axios.get(`${API_URL}/rankings/personal`, {
          params: getRankingParams(),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        rankingActual = data;
      }

      if (!rankingActual) {
        alert('❌ Error al obtener el ranking actual');
        return;
      }

      // Buscar si el elemento YA está en el ranking (revaluación)
      const elementoExistente = rankingActual.find(item => item.entidad_id === entidadId);
      const ratingValue = rankingInfo.newRating || rating;
      
      console.log('Elemento existente:', elementoExistente);
      console.log('Is revaluation:', !!elementoExistente);

      const itemsWithoutCurrent = rankingActual.filter(item => item.entidad_id !== entidadId);
      const higherRatingCount = itemsWithoutCurrent.filter(item => item.valoracion > ratingValue).length;
      const targetAbsolutePosition = higherRatingCount + selectedPosition;

      console.log('Target absolute position within ranking:', targetAbsolutePosition, { higherRatingCount, selectedPosition, ratingValue });

      const nuevoOrden = [];
      let contador = 1;
      let inserted = false;
      const newItemId = elementoExistente ? elementoExistente.id : `new-${entidadId}`;

      itemsWithoutCurrent.forEach(item => {
        if (!inserted && contador === targetAbsolutePosition) {
          nuevoOrden.push({
            id: newItemId,
            posicion: contador,
          });
          inserted = true;
          contador++;
        }

        nuevoOrden.push({
          id: item.id,
          posicion: contador,
        });
        contador++;
      });

      if (!inserted) {
        nuevoOrden.push({
          id: newItemId,
          posicion: targetAbsolutePosition,
        });
      }

      console.log('Final nuevoOrden:', nuevoOrden);

      // Actualizar el ranking
      const response = await axios.post(`${API_URL}/rankings/personal/ordenar`, {
        usuario: usuario.id_usuario,
        tipo_entidad: entidadTipo,
        nuevoOrden,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Positioning confirmed response:', response);
      alert(`✅ Posición actualizada a #${targetAbsolutePosition} en tu ranking personal`);
      
      setShowPositioningModal(false);
      setRankingInfo(null);
      setSelectedPosition(null);
      setPreviewElements(null);
      setIsRevaluation(false);
    } catch (error) {
      console.error('Error updating position:', error);
      alert(`❌ Error al actualizar la posición: ${error.response?.data?.message || error.message}`);
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

  useEffect(() => {
    // Consulta si la pista es no musical y el motivo
    const fetchNoMusical = async () => {
      if (!entidadTipo || !entidadId) return;
      try {
          const pluralMap = {
          cancion: 'canciones',
          album: 'albumes',
          video: 'videos',
          artista: 'artistas'
        };
        const endpoint = pluralMap[entidadTipo] || `${entidadTipo}s`;
        if (data && data.es_no_musical) {
          setEsNoMusical(true);
          // Motivo: por duración o por palabra clave
          let motivo = "";
          if (data.duracion_ms && data.duracion_ms < 60000) motivo += "Duración menor a 1 minuto. ";
          const palabras = ['intro', 'interlude', 'voice-over', 'commentary', 'outro', 'skit'];
          if (palabras.some(p => data.titulo.toLowerCase().includes(p))) motivo += "Contiene palabra clave: " + palabras.filter(p => data.titulo.toLowerCase().includes(p)).join(", ");
          setMotivoNoMusical(motivo || "Marcada como no musical por el sistema.");
        } else {
          setEsNoMusical(false);
          setMotivoNoMusical("");
        }
      } catch (err) {
        setEsNoMusical(false);
        setMotivoNoMusical("");
      }
    };
    fetchNoMusical();
  }, [entidadTipo, entidadId]);

  const sendFeedback = async () => {
    setFeedbackLoading(true);
    try {
      await axios.post(`${API_URL}/ml/feedback`, {
        usuario_id: usuario.id_usuario,
        entidad_tipo: entidadTipo,
        entidad_id_1: entidadId,
        entidad_id_2: similarInfo?.id, // Asegúrate de tener el id de la versión similar
        es_duplicado: false,
        confianza_modelo: similarInfo?.similitud ?? null,
        comentario: feedbackComentario
      });
      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackComentario("");
        setFeedbackSuccess(false);
      }, 1500);
    } catch (err) {
      alert("Error al enviar feedback");
    }
    setFeedbackLoading(false);
  };

  const entityPath = similarInfo
  ? entidadTipo === "cancion"
    ? `/song/${similarInfo.id}`
    : entidadTipo === "album"
      ? `/album/${similarInfo.id}`
      : entidadTipo === "video"
        ? `/video/${similarInfo.id}`
        : `/${entidadTipo}/${similarInfo.id}`
  : null;

  const getEntityName = (item) => {
    if (item.isNewItem) return item.nombre || elementoValorando.nombre || 'Tu nueva valoración';
    // Los datos del ranking incluyen 'nombre' que es el nombre enriquecido de la entidad
    return item.nombre || item.titulo || `ID ${item.entidad_id}`;
  };

  const getEntityFoto = (item) => {
    if (item.isNewItem) return item.foto || elementoValorando.foto || null;
    // Según el tipo de entidad, busca el campo de foto correcto
    if (entidadTipo === 'artista') {
      return item.foto_artista || item.foto;
    } else if (entidadTipo === 'album') {
      return item.foto_album || item.foto;
    } else if (entidadTipo === 'cancion') {
      return item.foto_album || item.foto;
    } else if (entidadTipo === 'video') {
      return item.miniatura || item.foto;
    }
    return item.foto;
  };

  const handleVerDetalle = async (item) => {
    if (item.isNewItem) return;
    setDetalleAbierto(item);
    setDetalleStats(null);
    try {
      const token = localStorage.getItem('token');
      const segRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: usuario.id_usuario,
          entidad_tipo: entidadTipo,
          entidad_id: item.entidad_id
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDetalleStats(segRes.data);
    } catch (error) {
      console.error('Error fetching detail stats:', error);
    }
  };
        
  return (
    <div className="flex flex-col items-center">
      {esNoMusical && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-2 rounded text-sm text-yellow-800 w-full max-w-md">
          <strong>⚠️ Esta pista está marcada como NO MUSICAL.</strong>
          <div className="mt-1">{motivoNoMusical}</div>
          <button
            className="mt-2 px-3 py-1 bg-blue-200 text-blue-800 rounded text-xs"
            onClick={() => window.open('https://forms.gle/tu-form-de-feedback', '_blank')}
          >
            ¿Crees que sí es musical? Reportar
          </button>
        </div>
      )}
      {/* ...resto del render... */}
      {/* Deshabilita valoración si es no musical */}
      <div className="flex items-center">
        {[0, 1, 2, 3, 4, 5].map(value =>
          <div
            key={value}
            onClick={editable && !esNoMusical ? (e) => handleClick(e, value) : undefined}
            onMouseMove={editable && !esNoMusical ? (e) => handleMouseMove(e, value) : undefined}
            onMouseLeave={editable && !esNoMusical ? handleMouseLeave : undefined}
            className={editable && !esNoMusical ? "cursor-pointer" : "opacity-50"}
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
          
          {pendingReposition && !isRevaluation && (
            <div style={{
              background: '#1f2937',
              borderLeft: '4px solid #3b82f6',
              padding: '16px',
              borderRadius: 8,
              marginTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {elementoValorando.foto && (
                  <img
                    src={elementoValorando.foto}
                    alt={elementoValorando.nombre}
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                  />
                )}
                <div>
                  <p style={{ margin: 0, color: '#d1d5db', fontWeight: 'bold' }}>
                    Valoración de {rating}⭐ guardada.
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                    ¿Quieres reposicionar esta {entidadTipo === 'cancion' ? 'canción' : entidadTipo === 'album' ? 'álbum' : entidadTipo === 'video' ? 'video' : entidadTipo} dentro de tu ranking personal en el grupo de {rating} estrellas?
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setPendingReposition(false);
                    setPendingRating(null);
                    setRankingInfo(null);
                    setSelectedPosition(null);
                    setPreviewElements(null);
                  }}
                  style={{
                    background: '#374151',
                    color: '#fff',
                    border: '1px solid #4b5563',
                    padding: '10px 16px',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  No, gracias
                </button>
                <button
                  onClick={handleOpenPendingPositioning}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Sí, reposicionar
                </button>
              </div>
            </div>
          )}
        </>
      )}
        
      {valoracionSimilar && similarInfo && (
        <div className="mt-2 bg-red-100 border-l-4 border-red-500 p-3 rounded text-sm text-red-800 w-full max-w-md">
          <div>
            <strong>
              Valoración en otra versión similar: {valoracionSimilar} ⭐
            </strong>
          </div>
          <div className="mt-2">
            <strong>
              {`Esta ${entidadTipo === "cancion" ? "canción" : entidadTipo === "album" ? "álbum" : "video"} parece una versión duplicada de otra que ya valoraste:`}
            </strong>
            <div>
              {similarInfo && (
                <Link to={entityPath} className="text-blue-700 underline font-semibold">
                  {similarInfo.titulo}
                  {similarInfo.anio && ` (${similarInfo.anio})`}
                </Link>
              )}
              {/* Muestra % de similitud si existe */}
              {similarInfo.similitud && (
                <span className="ml-2 text-gray-700">
                  (similitud: {(similarInfo.similitud * 100).toFixed(1)}%)
                </span>
              )}
              <button
                className="ml-2 text-xs text-blue-700 underline"
                onClick={() => setShowFeedbackModal(true)}
              >
                Reportar diferencia
              </button>
            </div>
            <div className="mt-2">
              ¿Quieres aun así valorarla como nueva?
              <button
                className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
                onClick={() => setEditable(true)}
              >
                Sí, valorar como nueva
              </button>
            </div>
          </div>
          {/* Modal feedback */}
          {showFeedbackModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-2">Reportar diferencia</h3>
                <p className="mb-2">¿Por qué consideras que <strong>no</strong> son versiones similares?</p>
                <textarea
                  className="w-full border rounded p-2 mb-2"
                  rows={3}
                  value={feedbackComentario}
                  onChange={e => setFeedbackComentario(e.target.value)}
                  placeholder="Explica la diferencia (ej: letra distinta, duración, demo, etc.)"
                />
                <div className="flex gap-2">
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={sendFeedback}
                    disabled={feedbackLoading || !feedbackComentario}
                  >
                    {feedbackLoading ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button
                    className="bg-gray-300 px-4 py-2 rounded"
                    onClick={() => setShowFeedbackModal(false)}
                  >Cancelar</button>
                </div>
                {feedbackSuccess && (
                  <p className="mt-2 text-green-600 font-bold">¡Gracias por tu feedback!</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {!hasLists && usuario && (
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <p style={{ color: '#fbbf24' }}>¿No tienes listas? <a href="/lists" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Crea una nueva lista</a> para organizar tus valoraciones.</p>
        </div>
      )}

      {/* MODAL DE POSICIONAMIENTO EN RANKING */}
      {showPositioningModal && rankingInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          padding: '16px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: 12,
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            color: '#fff'
          }}>
            {/* Botón cerrar */}
            <button
              onClick={() => {
                setShowPositioningModal(false);
                setRankingInfo(null);
                setSelectedPosition(null);
                setPreviewElements(null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#888',
                zIndex: 50
              }}
            >
              ✕
            </button>

            {/* Título y descripción */}
            <h2 style={{ color: "#16a34a", fontWeight: "bold", marginBottom: 12, fontSize: "1.4rem" }}>
              Reposicionar en tu ranking de {rating}⭐
            </h2>
            <p style={{ color: "#ccc", marginBottom: 4, fontSize: "0.95rem" }}>
              Posiciona esta {entidadTipo === 'cancion' ? 'canción' : entidadTipo === 'album' ? 'álbum' : entidadTipo === 'video' ? 'video' : entidadTipo} dentro de tu ranking personal en el grupo de {rating} estrellas.
            </p>
            {currentRankingPosition && (
              <p style={{ color: "#ccc", marginBottom: 4, fontSize: "0.95rem" }}>
                Posición actual: <span style={{ color: "#3b82f6", fontWeight: "bold" }}>#{currentRankingPosition}</span>
              </p>
            )}
            {rankingInfo.totalElements > 0 && (
              <p style={{ color: "#888", marginBottom: 12, fontSize: "0.9rem" }}>
                <span style={{ color: "#16a34a" }}>
                  {rankingInfo.countWithSameRating} elemento(s) con esta calificación
                </span>
                {" | "}
                <span style={{ color: "#3b82f6" }}>
                  Posiciones disponibles: {rankingInfo.posicionMin}-{rankingInfo.posicionMax}
                </span>
              </p>
            )}

            {rankingContextoTipo && rankingContextoId && (
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <label style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={usarRankingContexto}
                    onChange={async (e) => {
                      const nextValue = e.target.checked;
                      setUsarRankingContexto(nextValue);
                      await fetchRankingPositionInfo(rating, nextValue);
                    }}
                    style={{ marginRight: 8 }}
                  />
                  Ordenar solo por contexto ({rankingContextoTipo} #{rankingContextoId})
                </label>
                <span style={{ color: '#888', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {usarRankingContexto ? 'Mostrando solo este contexto.' : 'Mostrando ranking completo.'}
                </span>
              </div>
            )}
            {/* Selector de posición */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "bold", marginBottom: 10, color: "#ccc" }}>
                Selecciona la posición:
              </label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input
                  type="range"
                  min={rankingInfo.posicionMin}
                  max={rankingInfo.posicionMax}
                  value={selectedPosition || rankingInfo.posicionMax}
                  onChange={(e) => handleUpdatePosition(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    height: "6px",
                    borderRadius: "4px",
                    background: "#444",
                    outline: "none",
                    cursor: "pointer"
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleUpdatePosition(Math.max(rankingInfo.posicionMin, (selectedPosition || rankingInfo.posicionMax) - 1))}
                    style={{
                      background: '#333',
                      border: '1px solid #444',
                      color: '#fff',
                      borderRadius: 6,
                      width: 36,
                      height: 36,
                      fontSize: 20,
                      cursor: 'pointer'
                    }}
                    title="Mejor posición"
                  >
                    ↑
                  </button>
                  <input
                    type="number"
                    min={rankingInfo.posicionMin}
                    max={rankingInfo.posicionMax}
                    value={selectedPosition || rankingInfo.posicionMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= rankingInfo.posicionMin && val <= rankingInfo.posicionMax) {
                        handleUpdatePosition(val);
                      }
                    }}
                    style={{
                      width: 60,
                      padding: "6px",
                      background: "#222",
                      border: "2px solid #444",
                      borderRadius: 6,
                      color: "#fff",
                      fontWeight: "bold",
                      textAlign: "center",
                      fontSize: "1rem",
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield',
                      appearance: 'textfield'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdatePosition(Math.min(rankingInfo.posicionMax, (selectedPosition || rankingInfo.posicionMax) + 1))}
                    style={{
                      background: '#333',
                      border: '1px solid #444',
                      color: '#fff',
                      borderRadius: 6,
                      width: 36,
                      height: 36,
                      fontSize: 20,
                      cursor: 'pointer'
                    }}
                    title="Peor posición"
                  >
                    ↓
                  </button>
                </div>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>/ {rankingInfo.posicionMax}</span>
              </div>
            </div>

            {rankingInfo?.loading && (
              <div style={{
                background: '#111',
                borderRadius: 8,
                padding: '12px',
                marginBottom: 16,
                color: '#fff'
              }}>
                <p style={{ margin: 0, color: '#a0e0a0' }}>Calculando posiciones... por favor espera.</p>
              </div>
            )}

            {(!rankingInfo?.loading && rankingInfo?.countWithSameRating === 0 && rankingInfo?.totalElements > 0) && (
              <div style={{
                background: '#1d2630',
                borderLeft: '4px solid #3b82f6',
                padding: '12px',
                borderRadius: 6,
                fontSize: '0.9rem',
                color: '#cbd5e1',
                marginBottom: 16
              }}>
                <strong>No hay otros elementos con esta misma valoración en este ranking.</strong>
                <div style={{ marginTop: 6 }}>Selecciona la posición dentro de tu grupo de {rating}⭐ sin mostrar el ranking completo.</div>
              </div>
            )}

            {/* Vista previa mejorada - estilo ModifyPersonalRanking */}
            {previewElements && previewElements.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", marginBottom: 12, color: "#ccc" }}>
                  Vista previa:
                </h3>
                <div style={{
                  background: "#111",
                  borderRadius: 8,
                  padding: "8px",
                  maxHeight: "350px",
                  overflowY: "auto"
                }}>
                  {previewElements.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#222",
                        marginBottom: 8,
                        padding: 12,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: item.isNewItem ? "2px solid #16a34a" : "1px solid #444",
                        position: "relative"
                      }}
                    >
                      {/* Posición - Círculo */}
                      <span style={{
                        fontWeight: "bold",
                        minWidth: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: item.isNewItem ? "#16a34a" : "#3b82f6",
                        color: "#fff",
                        fontSize: "0.9rem",
                        flexShrink: 0
                      }}>
                        {item.previewPosition}
                      </span>

                      {/* Foto - pequeña */}
                      {getEntityFoto(item) ? (
                        <img
                          src={getEntityFoto(item)}
                          alt={getEntityName(item)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            objectFit: "cover",
                            marginRight: 4,
                            border: "2px solid #444",
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          background: "#333",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          color: "#888",
                          flexShrink: 0,
                          border: "2px solid #444"
                        }}>
                          Sin foto
                        </div>
                      )}

                      {/* Contenido - Nombre y Valoración */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontWeight: "bold",
                          marginBottom: 2,
                          color: item.isNewItem ? "#16a34a" : "#fff",
                          fontSize: "0.95rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {getEntityName(item)}
                        </p>
                        <p style={{ fontSize: "0.85rem", color: "#ffd700", margin: 0 }}>
                          {item.valoracion} ⭐
                        </p>
                      </div>

                      {/* Badge NUEVO */}
                      {item.isNewItem && (
                        <span style={{
                          background: "#16a34a",
                          color: "#fff",
                          padding: "4px 12px",
                          borderRadius: 4,
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          marginLeft: "auto",
                          flexShrink: 0
                        }}>
                          NUEVO
                        </span>
                      )}

                      {/* Botón Ver detalles */}
                      <button
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          marginLeft: 8,
                          flexShrink: 0
                        }}
                        onClick={() => handleVerDetalle(item)}
                        onMouseOver={(e) => e.target.style.background = "#1e40af"}
                        onMouseOut={(e) => e.target.style.background = "#2563eb"}
                      >
                        Ver detalles
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje si no hay elementos para mostrar */}
            {(!previewElements || previewElements.length === 0) && rankingInfo.totalElements === 0 && (
              <div style={{
                background: "#1e3a1f",
                borderLeft: "4px solid #16a34a",
                padding: "12px",
                borderRadius: 6,
                fontSize: "0.9rem",
                color: "#16a34a",
                marginBottom: 16
              }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>🎉 Este es el primer elemento en tu ranking personal</p>
              </div>
            )}

            {/* Información */}
            <div style={{
              background: "#1e3a1f",
              borderLeft: "4px solid #16a34a",
              padding: "12px",
              borderRadius: 6,
              fontSize: "0.85rem",
              color: "#a0e0a0",
              marginBottom: 16
            }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>
                💡 Posiciona este elemento dentro de tu grupo de {rating}⭐ (posiciones {rankingInfo.posicionMin}-{rankingInfo.posicionMax})
              </p>
            </div>

            {/* Botones de acción */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowPositioningModal(false);
                  setRankingInfo(null);
                  setSelectedPosition(null);
                  setPreviewElements(null);
                }}
                style={{
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
                onMouseOver={(e) => e.target.style.background = "#444"}
                onMouseOut={(e) => e.target.style.background = "#333"}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPositioning}
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
                onMouseOver={(e) => e.target.style.background = "#15803d"}
                onMouseOut={(e) => e.target.style.background = "#16a34a"}
              >
                Confirmar posición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DEL ELEMENTO */}
      {detalleAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: 12,
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            color: '#fff'
          }}>
            <button
              onClick={() => setDetalleAbierto(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#888',
                zIndex: 50
              }}
            >
              ✕
            </button>

            <h3 style={{ color: "#16a34a", fontWeight: "bold", marginBottom: 12, fontSize: "1.4rem" }}>
              {detalleAbierto.nombre || detalleAbierto.titulo}
            </h3>
            
            {getEntityFoto(detalleAbierto) && (
              <img
                src={getEntityFoto(detalleAbierto)}
                alt={detalleAbierto.nombre}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  objectFit: "cover",
                  border: "3px solid #16a34a",
                  background: "#222",
                  marginBottom: 16
                }}
              />
            )}

            <div style={{ fontSize: "1.05rem", marginTop: 12, lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#ccc" }}>Valoración:</span>{" "}
                <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "1.1rem" }}>
                  {detalleAbierto.valoracion} ⭐
                </span>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#ccc" }}>Posición:</span>{" "}
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                  Top {detalleAbierto.posicion}
                </span>
              </div>

              {entidadTipo === "cancion" && (
                <>
                  {detalleAbierto.artistas && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Artista(s):</span>{" "}
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {Array.isArray(detalleAbierto.artistas)
                          ? detalleAbierto.artistas.join(", ")
                          : detalleAbierto.artistas}
                      </span>
                    </div>
                  )}
                  {detalleAbierto.duracion_ms && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Duración:</span>{" "}
                      <span style={{ color: "#fff" }}>
                        {Math.floor(detalleAbierto.duracion_ms / 60000)}:
                        {String(Math.floor((detalleAbierto.duracion_ms % 60000) / 1000)).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </>
              )}

              {entidadTipo === "album" && (
                <>
                  {detalleAbierto.artistas && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Artista(s):</span>{" "}
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {Array.isArray(detalleAbierto.artistas)
                          ? detalleAbierto.artistas.join(", ")
                          : detalleAbierto.artistas}
                      </span>
                    </div>
                  )}
                  {detalleAbierto.numero_canciones && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Canciones:</span>{" "}
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {detalleAbierto.numero_canciones}
                      </span>
                    </div>
                  )}
                  {detalleAbierto.anio && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Año:</span>{" "}
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {detalleAbierto.anio}
                      </span>
                    </div>
                  )}
                </>
              )}

              {entidadTipo === "video" && (
                <>
                  {detalleAbierto.artistas && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Artista(s):</span>{" "}
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {Array.isArray(detalleAbierto.artistas)
                          ? detalleAbierto.artistas.join(", ")
                          : detalleAbierto.artistas}
                      </span>
                    </div>
                  )}
                  {detalleAbierto.duracion && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "#ccc" }}>Duración:</span>{" "}
                      <span style={{ color: "#fff" }}>
                        {Math.floor(detalleAbierto.duracion / 60)}:
                        {String(detalleAbierto.duracion % 60).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </>
              )}

              {detalleStats && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #444" }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ color: "#ccc" }}>% Elementos valorados:</span>{" "}
                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                      {detalleStats.porcentaje}%
                    </span>
                  </div>
                  {Object.entries(detalleStats.segmentacion || {}).length > 0 && (
                    <div>
                      <span style={{ color: "#ccc", fontSize: "0.95rem" }}>Segmentación:</span>
                      {Object.entries(detalleStats.segmentacion || {}).map(([cal, count]) => (
                        <div key={cal} style={{ color: "#aaa", fontSize: "0.9rem", marginTop: 4 }}>
                          {cal}★: {count} ({((count / detalleStats.valorados) * 100).toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setDetalleAbierto(null)}
                style={{
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
                onMouseOver={(e) => e.target.style.background = "#444"}
                onMouseOut={(e) => e.target.style.background = "#333"}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

StarRating.propTypes = {
  valoracionInicial: PropTypes.number,
  onRatingChange: PropTypes.func.isRequired,
  entidadTipo: PropTypes.string.isRequired,
  entidadId: PropTypes.number.isRequired,
  usuario: PropTypes.object.isRequired,
  elementoNombre: PropTypes.string,
  elementoFoto: PropTypes.string,
  rankingContextoTipo: PropTypes.string,
  rankingContextoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default StarRating;