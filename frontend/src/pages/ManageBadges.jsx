import { useEffect, useState } from 'react';
import axios from 'axios';

const ManageBadges = () => {
  const [insignias, setInsignias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [criterio, setCriterio] = useState('');
  const [icono, setIcono] = useState('');

  useEffect(() => {
    const fetchInsignias = async () => {
      try {
        const response = await axios.get('/api/insignias');
        setInsignias(response.data);
      } catch (error) {
        console.error('Error fetching insignias:', error);
      }
    };

    fetchInsignias();
  }, []);

  const handleCreateBadge = async () => {
    try {
      const response = await axios.post('/api/insignias', { nombre, descripcion, criterio, icono });
      setInsignias([...insignias, response.data]);
      setNombre('');
      setDescripcion('');
      setCriterio('');
      setIcono('');
    } catch (error) {
      console.error('Error creating badge:', error);
    }
  };

  const handleDeleteBadge = async (id) => {
    try {
      await axios.delete(`/api/insignias/${id}`);
      setInsignias(insignias.filter(insignia => insignia.id_insignia !== id));
    } catch (error) {
      console.error('Error deleting badge:', error);
    }
  };

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Gestión de Insignias</h2>
        <div>
          <h3 className="text-2xl font-bold my-2">Crear Nueva Insignia</h3>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" />
          <input type="text" value={criterio} onChange={(e) => setCriterio(e.target.value)} placeholder="Criterio" />
          <input type="text" value={icono} onChange={(e) => setIcono(e.target.value)} placeholder="URL del Icono" />
          <button onClick={handleCreateBadge}>Crear</button>
        </div>
        <div>
          <h3 className="text-2xl font-bold my-2">Insignias Existentes</h3>
          <div className="insignias-grid">
            {insignias.map((insignia) => (
              <div key={insignia.id_insignia} className="insignia">
                <img src={insignia.icono} alt={insignia.nombre} />
                <h3>{insignia.nombre}</h3>
                <p>{insignia.descripcion}</p>
                <button onClick={() => handleDeleteBadge(insignia.id_insignia)}>Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageBadges;