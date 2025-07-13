import { useEffect, useState, useContext } from 'react';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = "http://localhost:5000";

const Notificaciones = () => {
  const { usuario } = useContext(UsuarioContext);
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    if (usuario) {
      fetch(`${API_URL}/notificaciones/usuario/${usuario.id_usuario}`)
        .then(res => res.json())
        .then(data => setNotificaciones(data));
    }
  }, [usuario]);

  const marcarComoVista = async (id) => {
    await fetch(`${API_URL}/notificaciones/${id}/visto`, { method: 'PUT' });
    setNotificaciones(notificaciones.map(n => n.id_notificacion === id ? { ...n, visto: true } : n));
  };

  const marcarTodasComoVistas = async () => {
    await fetch(`${API_URL}/notificaciones/usuario/${usuario.id_usuario}/visto`, { method: 'PUT' });
    setNotificaciones(notificaciones.map(n => ({ ...n, visto: true })));
  };

  if (!usuario) return <div>Inicia sesión para ver tus notificaciones.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Tus Notificaciones</h2>
      {notificaciones.length > 0 && notificaciones.some(n => !n.visto) && (
        <button
          onClick={marcarTodasComoVistas}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          Mostrar todo como visto
        </button>
      )}
      {notificaciones.length === 0 ? (
        <p>No tienes notificaciones.</p>
      ) : (
        <ul>
          {notificaciones.map(n => (
            <li key={n.id_notificacion} style={{
              background: n.visto ? '#f3f3f3' : '#fffbe6',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{n.mensaje}</span>
              {!n.visto && (
                <button onClick={() => marcarComoVista(n.id_notificacion)} className="bg-blue-500 text-white px-2 py-1 rounded">
                  Marcar como vista
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notificaciones;