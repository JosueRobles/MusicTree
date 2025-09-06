import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UsuarioContext } from "../context/UsuarioContext";

const API_URL = import.meta.env.VITE_API_URL;

const defaultState = {
  modo_valoracion: "manual",
  metodo_album: null,
  metodo_album_avanzado: null,
  album_por_entidad: false,
  album_por_conjunto: false,
  metodo_artista: null,
  metodo_artista_avanzado: null,
  artista_por_entidad: false,
  artista_por_conjunto: false,
  artista_promedio_de_medianas: false,
  artista_moda_de_modas: false,
  ponderado: { albumes: 40, canciones: 30, videos: 30 },
  nivel_rigor: null,
  generos: [],
  subgeneros: [],
  artistas_seguir: [],
  redondeo: "arriba",
  moda_avanzado: null,
  promedio_avanzado: null,
  mediana_avanzado: null,
};

const Personalizacion = () => {
  const { usuario, setUsuario, cargandoUsuario } = useContext(UsuarioContext);
  const [step, setStep] = useState(1);
  const [state, setState] = useState(defaultState);
  const [generosDisponibles, setGenerosDisponibles] = useState([]);
  const [artistasSugeridos, setArtistasSugeridos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ponderadoError, setPonderadoError] = useState(false);
  const [showOpcionesAvanzadas, setShowOpcionesAvanzadas] = useState(false);
  const [busquedaArtista, setBusquedaArtista] = useState("");
  const [subgenerosDisponibles, setSubgenerosDisponibles] = useState({}); // {id_genero: [{subgenero, count}]}
  const navigate = useNavigate();

  // Si no hay usuario logueado, redirige a login
  useEffect(() => {
    if (cargandoUsuario) return; // Espera a que termine de cargar
    if (!usuario) navigate("/login");
  }, [usuario, cargandoUsuario, navigate]);

  useEffect(() => {
    axios.get(`${API_URL}/generos`).then(res => setGenerosDisponibles(res.data || []));
  }, []);

  useEffect(() => {
    if (state.generos.length > 0 && state.generos[0]) {
      axios.get(`${API_URL}/generos/${state.generos[0]}/artistas`)
        .then(res => setArtistasSugeridos(res.data || []));
    } else {
      setArtistasSugeridos([]);
    }
  }, [state.generos]);

  useEffect(() => {
    if (usuario) {
      axios.get(`${API_URL}/usuarios/usuarios/${usuario.id_usuario}`)
        .then(res => {
          const { metodologia_valoracion, configuracion } = res.data;
          if (metodologia_valoracion) setState(s => ({
            ...s,
            ...metodologia_valoracion,
            ...configuracion
          }));
        });
    }
  }, [usuario]);

  useEffect(() => {
    // Carga subgéneros presentes para cada género seleccionado
    const cargarSubgeneros = async () => {
      let nuevos = {};
      for (const idGenero of state.generos) {
        const { data } = await axios.get(`${API_URL}/generos/${idGenero}/subgeneros`);
        nuevos[idGenero] = data || [];
      }
      setSubgenerosDisponibles(nuevos);
    };
    if (state.generos.length > 0) cargarSubgeneros();
    else setSubgenerosDisponibles({});
  }, [state.generos]);

  const handleSubmit = async () => {
    if (!usuario) {
      alert("No hay usuario logueado");
      return;
    }
    setLoading(true);
    try {
      // 1. Guarda preferencias y configuración
      await axios.put(`${API_URL}/usuarios/${usuario.id_usuario}/preferencias`, {
        metodologia_valoracion: {
          // ...todos los campos menos generos, subgeneros, artistas_seguir...
          modo_valoracion: state.modo_valoracion,
          metodo_album: state.metodo_album,
          metodo_album_avanzado: state.metodo_album_avanzado,
          album_por_entidad: state.album_por_entidad,
          album_por_conjunto: state.album_por_conjunto,
          metodo_artista: state.metodo_artista,
          metodo_artista_avanzado: state.metodo_artista_avanzado,
          artista_por_entidad: state.artista_por_entidad,
          artista_por_conjunto: state.artista_por_conjunto,
          artista_promedio_de_medianas: state.artista_promedio_de_medianas,
          artista_moda_de_modas: state.artista_moda_de_modas,
          ponderado: state.ponderado,
          nivel_rigor: state.nivel_rigor,
          redondeo: state.redondeo,
          moda_avanzado: state.moda_avanzado,
          promedio_avanzado: state.promedio_avanzado,
          mediana_avanzado: state.mediana_avanzado,
          modo_ranking: state.modo_ranking,
        },
        configuracion: {
          generos: state.generos,
          subgeneros: state.subgeneros,
        }
      });

      // 2. Guarda seguimiento de artistas (en un solo POST)
      if (state.artistas_seguir.length > 0) {
        await axios.post(`${API_URL}/catalogos/seguir`, {
          usuario_id: usuario.id_usuario,
          artista_id: state.artistas_seguir,
        });
      }

      setLoading(false);
      navigate(`/profile/${usuario.id_usuario}`);
    } catch (e) {
      setLoading(false);
      alert("Error al guardar preferencias");
    }
  };

  const artistasFiltrados = artistasSugeridos.filter(a =>
    a.nombre_artista.toLowerCase().includes(busquedaArtista.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto p-4 border rounded shadow bg-white mt-10">
      <h2 className="text-xl font-bold mb-2">Personaliza tu experiencia</h2>
      {step === 1 && (
        <div>
          <h2 className="font-bold mb-2">Bienvenido a MusicTree, gracias por registrarte en nuestra plataforma.</h2>
          <p>
            Nos gustaría que contestaras las siguientes preguntas para conocer tu estilo en la valoración de música.<br />
            <span className="block mt-1">No es obligatoria pero nos ayudaría a que nos muestres a nosotros y toda la comunidad dentro de MusicTree tu perfil de valoración.</span>
          </p>
          <div className="flex justify-between mt-4">
            <button onClick={async () => {
  setLoading(true);
  try {
    await axios.put(`${API_URL}/usuarios/${usuario.id_usuario}/preferencias`, {
      metodologia_valoracion: defaultState,
      configuracion: { generos: [], subgeneros: [] }
    });
    setLoading(false);
    navigate(`/profile/${usuario.id_usuario}`);
  } catch (e) {
    setLoading(false);
    alert("Error al guardar preferencias");
  }
}}>Omitir</button>
            <button onClick={() => setStep(2)}>Continuar</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h3 className="font-bold mb-2">Nivel de crítico en valoraciones</h3>
          <div className="flex flex-col gap-2">
            <label>
              <input
                type="radio"
                name="nivel_rigor"
                checked={state.nivel_rigor === "estricto"}
                onChange={() => setState(s => ({ ...s, nivel_rigor: "estricto" }))}
              />
              <span className="ml-2">Estricto</span>
              <div className="text-xs text-gray-500 ml-6">
                valorarás críticamente cada una de las entidades, con mucho cuidado, con lo que tu crees es la verdad universal.
              </div>
            </label>
            <label>
              <input
                type="radio"
                name="nivel_rigor"
                checked={state.nivel_rigor === "moderado"}
                onChange={() => setState(s => ({ ...s, nivel_rigor: "moderado" }))}
              />
              <span className="ml-2">Moderado</span>
              <div className="text-xs text-gray-500 ml-6">
                valorarás críticamente pero influenciado por tus gustos y preferencias personales.
              </div>
            </label>
            <label>
              <input
                type="radio"
                name="nivel_rigor"
                checked={state.nivel_rigor === "fan"}
                onChange={() => setState(s => ({ ...s, nivel_rigor: "fan" }))}
              />
              <span className="ml-2">Fan</span>
              <div className="text-xs text-gray-500 ml-6">
                valorarás en base a tus gustos y preferencias personales.
              </div>
            </label>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Nota: solo como dato adicional en tu perfil y para conocer tu estilo, no afecta en tu peso como valorador en la plataforma.
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(1)}>Atrás</button>
            <button disabled={!state.nivel_rigor} onClick={() => setStep(3)}>Continuar</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3 className="font-bold mb-2">¿Cómo prefieres valorar?</h3>
          <div className="flex flex-col gap-2">
            <label>
              <input
                type="radio"
                name="modo_valoracion"
                checked={state.modo_valoracion === "manual"}
                onChange={() => setState(s => ({ ...s, modo_valoracion: "manual" }))}
              />
              <span className="ml-2">Manual</span>
              <div className="text-xs text-gray-500 ml-6">
                valorarás directamente artistas, álbumes, canciones y videos musicales; Ninguna valoración automática.
              </div>
            </label>
            <label>
              <input
                type="radio"
                name="modo_valoracion"
                checked={state.modo_valoracion === "semiautomatico"}
                onChange={() => setState(s => ({ ...s, modo_valoracion: "semiautomatico" }))}
              />
              <span className="ml-2">Semi-automático</span>
              <div className="text-xs text-gray-500 ml-6">
                valorarás manualmente las canciones y los videos musicales; MusicTree calculará la valoración de álbumes y artistas según método seleccionado.
              </div>
            </label>
          </div>
          <div className="mt-6">
            <h4 className="font-bold mb-2">¿Cómo prefieres que se actualice tu ranking personal?</h4>
            <label>
              <input
                type="radio"
                name="modo_ranking"
                checked={state.modo_ranking === "manual"}
                onChange={() => setState(s => ({ ...s, modo_ranking: "manual" }))}
              />
              <span className="ml-2">Manual (tú decides el orden de tus favoritos)</span>
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="modo_ranking"
                checked={state.modo_ranking === "semiautomatico"}
                onChange={() => setState(s => ({ ...s, modo_ranking: "semiautomatico" }))}
              />
              <span className="ml-2">Semiautomático (el sistema ajusta el ranking según tus valoraciones y estadísticas)</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">
              Puedes cambiar esto en cualquier momento desde tu perfil.
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(2)}>Atrás</button>
            <button disabled={!state.modo_valoracion} onClick={() => setStep(state.modo_valoracion === "semiautomatico" ? 4 : 6)}>Continuar</button>
          </div>
        </div>
      )}
      {step === 4 && state.modo_valoracion === "semiautomatico" && (
        <div>
          <h3 className="font-bold mb-2">Elige método de cálculo para álbumes:</h3>
          <div className="text-xs text-gray-500 mb-2">
            Nota: Si el álbum no tiene al menos 2 canciones, no se calculará su valoración semiautomática.
          </div>
          <div className="flex flex-col gap-2">
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_album"
                  checked={state.metodo_album === "promedio"}
                  onChange={() => setState(s => ({ ...s, metodo_album: "promedio" }))}
                />
                <span className="ml-2 font-semibold">Promedio (media aritmética)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: En un álbum de 10 canciones, calificaste con 5* 4 canciones, con 4.5* 3 canciones, con 4* 2 canciones, y con 3.5* 1 canción;
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  Cálculo: (4*(5)+3*(4.5)+2*(4)+1*(3.5))/10=4.5
                </div>
              </label>
            </div>
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_album"
                  checked={state.metodo_album === "mediana"}
                  onChange={() => setState(s => ({ ...s, metodo_album: "mediana" }))}
                />
                <span className="ml-2 font-semibold">Mediana (valor central)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: Son 10 valores ordenados así: (5,5,5,5,4.5,4.5,4.5,4,4,3.5);
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  La mediana está en (5,6): (4.5+4.5)/2=4.5
                </div>
              </label>
            </div>
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_album"
                  checked={state.metodo_album === "moda"}
                  onChange={() => setState(s => ({ ...s, metodo_album: "moda" }))}
                />
                <span className="ml-2 font-semibold">Moda (valor más frecuente)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: (5,5,5,5,4.5,4.5,4.5,4,4,3.5);
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  El valor que más se repite es el 5, así que = 5
                </div>
              </label>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(3)}>Atrás</button>
            <button
              className="underline text-blue-600"
              disabled={!state.metodo_album}
              onClick={() => setShowOpcionesAvanzadas(true)}
            >
              Opciones avanzadas
            </button>
            <button disabled={!state.metodo_album} onClick={() => setStep(5)}>Continuar</button>
          </div>
          {showOpcionesAvanzadas && (
            <div className="mt-4 border-t pt-2">
              <div className="mb-2 font-semibold">En caso de que el resultado de la operación sea un número intervalo (por ejemplo 4.25, 4.75, 3.2, etc), ¿quieres redondear al punto más cercano?</div>
              <label>
                <input
                  type="radio"
                  name="redondeo"
                  checked={state.redondeo === "arriba"}
                  onChange={() => setState(s => ({ ...s, redondeo: "arriba" }))}
                />
                <span className="ml-2">Hacia arriba (Ejemplo: 4.75* daría 5*)</span>
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  name="redondeo"
                  checked={state.redondeo === "abajo"}
                  onChange={() => setState(s => ({ ...s, redondeo: "abajo" }))}
                />
                <span className="ml-2">Hacia abajo (Ejemplo: 4.75* daría 4.5*)</span>
              </label>
              <div className="flex justify-end mt-2">
                <button className="text-blue-600 underline" onClick={() => setShowOpcionesAvanzadas(false)}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      )}
      {step === 5 && state.modo_valoracion === "semiautomatico" && (
        <div>
          <h3 className="font-bold mb-2">Elige método de cálculo para artistas:</h3>
          <div className="text-xs text-gray-500 mb-2">
            Nota: Si el artista no tiene al menos 10 entidades combinadas (álbumes + canciones + videos), no se calculará su valoración semiautomatica.
          </div>
          <div className="flex flex-col gap-2">
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_artista"
                  checked={state.metodo_artista === "promedio"}
                  onChange={() => setState(s => ({
  ...s,
  metodo_artista: "promedio",
  promedio_avanzado: "por_entidad", // predeterminada
  mediana_avanzado: null,
  moda_avanzado: null
}))}
                />
                <span className="ml-2 font-semibold">Promedio (media aritmética)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: Para un artista con 5 álbumes, 30 canciones y 15 videos musicales, obtienes el promedio de cada entidad;
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  Cálculo: (suma_albumes/5 + suma_canciones/30 + suma_videos_musicales/15) / 3
                </div>
              </label>
            </div>
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_artista"
                  checked={state.metodo_artista === "mediana"}
                  onChange={() => setState(s => ({
  ...s,
  metodo_artista: "mediana",
  promedio_avanzado: null,
  mediana_avanzado: "por_entidad", // predeterminada
  moda_avanzado: null
}))}
                />
                <span className="ml-2 font-semibold">Mediana (valor central)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: Mediana de cada entidad y luego la mediana entre esos 3 datos.
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  (ordenamiento_albumes[de 5, agarras el valor 3], ordenamiento_canciones[de 30, agarras los valores 15 y 16 y los divides entre 2], ordenamiento_videos_musicales[de 15, agarras el valor 8])
                </div>
              </label>
            </div>
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_artista"
                  checked={state.metodo_artista === "moda"}
                  onChange={() => setState(s => ({
  ...s,
  metodo_artista: "moda",
  promedio_avanzado: null,
  mediana_avanzado: null,
  moda_avanzado: "por_entidad" // predeterminada
}))}
                />
                <span className="ml-2 font-semibold">Moda (valor más frecuente)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: Moda de cada entidad y luego moda entre esos 3 datos.
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  (ordenamiento_albumes[de 5, agarras el valor que más se repite], ordenamiento_canciones[de 30, agarras el valor que más se repite], ordenamiento_videos_musicales[de 15, agarras el valor que más se repite])
                </div>
              </label>
            </div>
            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: 8, border: '1px solid #eee' }}>
              <label>
                <input
                  type="radio"
                  name="metodo_artista"
                  checked={state.metodo_artista === "ponderado"}
                  onChange={() => setState(s => ({ ...s, metodo_artista: "ponderado" }))}
                />
                <span className="ml-2 font-semibold">Ponderado (más peso a)</span>
                <div style={{ color: '#888', fontSize: '0.95em', marginTop: 4 }}>
                  Ejemplo: Asigna un porcentaje a cada entidad (álbumes, canciones, videos).
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.92em', marginTop: 2 }}>
                  Cálculo: (calculo_total_albumes*0.40 + calculo_total_canciones*0.30 + calculo_total_videos_musicales*0.30)
                </div>
              </label>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(4)}>Atrás</button>
            <button
              className="underline text-blue-600"
              disabled={!state.metodo_artista}
              onClick={() => setShowOpcionesAvanzadas(true)}
            >
              Opciones avanzadas
            </button>
            <button disabled={!state.metodo_artista} onClick={() => setStep(6)}>Continuar</button>
          </div>
          {showOpcionesAvanzadas && (
            <div className="mt-4 border-t pt-2">
              {/* Opciones avanzadas según método seleccionado */}
              {state.metodo_artista === "promedio" && (
                <div>
                  <div className="mb-2 font-semibold">¿Cómo quieres calcular el promedio?</div>
                  <label>
                    <input
                      type="radio"
                      name="promedio_avanzado"
                      checked={state.promedio_avanzado === "por_entidad"}
                      onChange={() => setState(s => ({ ...s, promedio_avanzado: "por_entidad" }))}
                    />
                    <span className="ml-2">Promediando cada tipo de entidad y después promedio entre esos 3 datos (predeterminada)</span>
                  </label>
                  <br />
                  <label>
                    <input
                      type="radio"
                      name="promedio_avanzado"
                      checked={state.promedio_avanzado === "conjunto"}
                      onChange={() => setState(s => ({ ...s, promedio_avanzado: "conjunto" }))}
                    />
                    <span className="ml-2">Todos los elementos juntos (álbumes+canciones+videos musicales)/(total de elementos)</span>
                  </label>
                </div>
              )}
              {state.metodo_artista === "mediana" && (
                <div>
                  <div className="mb-2 font-semibold">¿Cómo quieres calcular la mediana?</div>
                  <label>
                    <input
                      type="radio"
                      name="mediana_avanzado"
                      checked={state.mediana_avanzado === "por_entidad"}
                      onChange={() => setState(s => ({ ...s, mediana_avanzado: "por_entidad" }))}
                    />
                    <span className="ml-2">Mediana de cada tipo de entidad y después mediana entre esos 3 datos (predeterminada)</span>
                  </label>
                  <br />
                  <label>
                    <input
                      type="radio"
                      name="mediana_avanzado"
                      checked={state.mediana_avanzado === "promedio"}
                      onChange={() => setState(s => ({ ...s, mediana_avanzado: "promedio" }))}
                    />
                    <span className="ml-2">Promedio de las medianas de cada tipo de entidad</span>
                  </label>
                  <br />
                  <label>
                    <input
                      type="radio"
                      name="mediana_avanzado"
                      checked={state.mediana_avanzado === "conjunto"}
                      onChange={() => setState(s => ({ ...s, mediana_avanzado: "conjunto" }))}
                    />
                    <span className="ml-2">Mediana de todos los elementos juntos</span>
                  </label>
                </div>
              )}
              {state.metodo_artista === "moda" && (
                <div>
                  <div className="mb-2 font-semibold">¿Cómo quieres calcular la moda?</div>
                  <label>
                    <input
                      type="radio"
                      name="moda_avanzado"
                      checked={state.moda_avanzado === "por_entidad"}
                      onChange={() => setState(s => ({ ...s, moda_avanzado: "por_entidad" }))}
                    />
                    <span className="ml-2">Moda de cada tipo de entidad y después moda entre esos 3 datos (predeterminada)</span>
                  </label>
                  <br />
                  <label>
                    <input
                      type="radio"
                      name="moda_avanzado"
                      checked={state.moda_avanzado === "promedio"}
                      onChange={() => setState(s => ({ ...s, moda_avanzado: "promedio" }))}
                    />
                    <span className="ml-2">Promedio de las modas de cada tipo de entidad</span>
                  </label>
                  <br />
                  <label>
                    <input
                      type="radio"
                      name="moda_avanzado"
                      checked={state.moda_avanzado === "conjunto"}
                      onChange={() => setState(s => ({ ...s, moda_avanzado: "conjunto" }))}
                    />
                    <span className="ml-2">Moda de todos los elementos juntos</span>
                  </label>
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    Nota: En caso de empate de moda, se elige el valor más alto.
                  </div>
                </div>
              )}
              {state.metodo_artista === "ponderado" && (
                <div>
                  <div className="mb-2 font-semibold">Asigna tu propio porcentaje:</div>
                  <label>
                    <span className="mr-2">Álbumes %:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.ponderado.albumes}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setState(s => ({
                          ...s,
                          ponderado: { ...s.ponderado, albumes: val }
                        }));
                      }}
                      className="w-16"
                    />
                  </label>
                  <br />
                  <label>
                    <span className="mr-2">Canciones %:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.ponderado.canciones}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setState(s => ({
                          ...s,
                          ponderado: { ...s.ponderado, canciones: val }
                        }));
                      }}
                      className="w-16"
                    />
                  </label>
                  <br />
                  <label>
                    <span className="mr-2">Videos %:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.ponderado.videos}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setState(s => ({
                          ...s,
                          ponderado: { ...s.ponderado, videos: val }
                        }));
                      }}
                      className="w-16"
                    />
                  </label>
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    Nota: el total de % debe de ser 100 (si no, no se podrá proseguir a la siguiente página)
                  </div>
                  {state.ponderado.albumes + state.ponderado.canciones + state.ponderado.videos !== 100 && (
                    <div className="text-red-500 font-semibold mt-2">
                      La suma de los porcentajes actual es de {state.ponderado.albumes + state.ponderado.canciones + state.ponderado.videos}, debe ser 100.
                    </div>
                  )}
                  {(state.ponderado.albumes < 10 || state.ponderado.canciones < 10 || state.ponderado.videos < 10) && (
                    <div className="text-red-500 font-semibold mt-2">
                      Ningún porcentaje puede ser menor a 10%.
                    </div>
                  )}
                </div>
              )}
              {/* Redondeo para cualquier método */}
              <div className="mt-4 font-semibold">En caso de que el resultado de la operación sea un número intervalo, ¿quieres redondear al punto más cercano?</div>
              <label>
                <input
                  type="radio"
                  name="redondeo"
                  checked={state.redondeo === "arriba"}
                  onChange={() => setState(s => ({ ...s, redondeo: "arriba" }))}
                />
                <span className="ml-2">Hacia arriba (Ejemplo: 4.75* daría 5*)</span>
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  name="redondeo"
                  checked={state.redondeo === "abajo"}
                  onChange={() => setState(s => ({ ...s, redondeo: "abajo" }))}
                />
                <span className="ml-2">Hacia abajo (Ejemplo: 4.75* daría 4.5*)</span>
              </label>
              <div className="flex justify-end mt-2">
                <button className="text-blue-600 underline" onClick={() => setShowOpcionesAvanzadas(false)}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      )}
      {step === 6 && (
        <div>
          <h3 className="font-bold mb-2">Elige tus géneros musicales favoritos</h3>
          <div className="flex flex-col gap-2 mb-2">
            {generosDisponibles.map(genero => (
              <label key={genero.id_genero} style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={state.generos.includes(genero.id_genero)}
                  onChange={e => {
                    if (e.target.checked) {
                      setState(s => ({ ...s, generos: [...s.generos, genero.id_genero] }));
                    } else {
                      setState(s => ({ ...s, generos: s.generos.filter(id => id !== genero.id_genero) }));
                    }
                  }}
                />
                <span className="ml-2">{genero.nombre}</span>
              </label>
            ))}
          </div>
          {state.generos.length > 0 && (
  <div className="mt-4">
    <h4 className="font-bold mb-2">Selecciona subgéneros (opcional)</h4>
    {state.generos.map(idGenero => {
      const genero = generosDisponibles.find(g => g.id_genero === idGenero);
      const subs = subgenerosDisponibles[idGenero] || [];
      if (!genero || subs.length === 0) return null;
      return (
        <div key={idGenero} className="mb-2">
          <div className="font-semibold">{genero.nombre}</div>
          <div className="flex flex-wrap gap-2">
            {subs.map(({ subgenero }) => (
              <label key={subgenero} className="mr-2">
                <input
                  type="checkbox"
                  checked={state.subgeneros.includes(subgenero)}
                  onChange={e => {
                    if (e.target.checked) {
                      setState(s => ({ ...s, subgeneros: [...s.subgeneros, subgenero] }));
                    } else {
                      setState(s => ({ ...s, subgeneros: s.subgeneros.filter(sg => sg !== subgenero) }));
                    }
                  }}
                />
                <span className="ml-1">{subgenero}</span>
              </label>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(5)}>Atrás</button>
            <button onClick={() => setStep(7)}>Omitir</button>
            <button
              disabled={state.generos.length === 0}
              onClick={() => setStep(7)}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
      {step === 7 && (
        <div>
          <h3 className="font-bold mb-2">Elige tus artistas musicales favoritos</h3>
          <input
  type="text"
  placeholder="Buscar artista..."
  value={busquedaArtista}
  onChange={e => setBusquedaArtista(e.target.value)}
  className="mb-4 w-full border px-2 py-1 rounded"
/>
<div className="grid grid-cols-5 gap-4" style={{ maxHeight: 400, overflowY: 'auto' }}>
  {artistasFiltrados.map(artista => (
    <label key={artista.id_artista} className="flex flex-col items-center border rounded p-2">
      <img src={artista.foto_artista || '/default-artist.png'} alt={artista.nombre_artista} style={{ width: 64, height: 64, borderRadius: '50%' }} />
      <input
        type="checkbox"
        checked={state.artistas_seguir.includes(artista.id_artista)}
        onChange={e => {
          if (e.target.checked) {
            setState(s => ({ ...s, artistas_seguir: [...s.artistas_seguir, artista.id_artista] }));
          } else {
            setState(s => ({
              ...s,
              artistas_seguir: s.artistas_seguir.filter(id => id !== artista.id_artista)
            }));
          }
        }}
      />
      <span className="mt-2">{artista.nombre_artista}</span>
    </label>
  ))}
</div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(6)}>Atrás</button>
            <button onClick={() => setStep(8)}>Omitir</button>
            <button
              disabled={state.artistas_seguir.length === 0}
              onClick={() => setStep(8)}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
      {step === 8 && (
        <div>
          <h3>¡Gracias por tu tiempo!</h3>
          <pre>{JSON.stringify(state, null, 2)}</pre>
          <button onClick={() => navigate('/profile/' + usuario.id_usuario)}>Continuar</button>
        </div>
      )}
    </div>
  );
};

export default Personalizacion;