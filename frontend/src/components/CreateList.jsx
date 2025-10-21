import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
const API_URL = import.meta.env.VITE_API_URL;

const CreateList = ({ usuario, onCreated, defaultTipo = '', visible: propVisible = false, onClose }) => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(defaultTipo || '');
  const [descripcion, setDescripcion] = useState('');
  const [privacidad, setPrivacidad] = useState('publica');
  const [imagen, setImagen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(!!propVisible);

  // mantener visible sincronizado si se maneja desde fuera
  useEffect(() => { setVisible(!!propVisible); }, [propVisible]);

  const crearLista = async () => {
    if (!nombre || !tipo) return alert('Nombre y tipo son obligatorios');
    if (!usuario) return alert('Debes iniciar sesión');

    const formData = new FormData();
    formData.append('userId', usuario.id_usuario);
    formData.append('nombre_lista', nombre);
    formData.append('tipo_lista', tipo);
    formData.append('descripcion', descripcion);
    formData.append('privacidad', privacidad);
    if (imagen) formData.append('imagen', imagen);

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/listas-personalizadas`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onCreated) onCreated(res.data);
      // limpiar form
      setNombre(''); setTipo(defaultTipo || ''); setDescripcion(''); setPrivacidad('publica'); setImagen(null);
      setVisible(false);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error creating list', err);
      alert('Error al crear la lista');
    } finally { setLoading(false); }
  };

  if (!visible) {
    return (
      <div>
        <button className="encabezado-btn primary" onClick={() => setVisible(true)}>Crear lista</button>
      </div>
    );
  }

  return (
    // simple modal
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ width: 520, background: '#062E22', padding: 18, borderRadius: 10, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Crear nueva lista</h3>
          <button onClick={() => { setVisible(false); if (onClose) onClose(); }} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Selecciona el tipo</option>
            <option value="artista">Artista</option>
            <option value="album">Álbum</option>
            <option value="cancion">Canción</option>
            <option value="video">Video</option>
          </select>
          <textarea placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <div>
            <input type="file" accept="image/*" onChange={e => setImagen(e.target.files[0])} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="encabezado-btn secondary" onClick={() => { setVisible(false); if (onClose) onClose(); }}>Cancelar</button>
            <button className="encabezado-btn primary" onClick={crearLista} disabled={loading}>{loading ? 'Creando...' : 'Crear Lista'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

CreateList.propTypes = {
  usuario: PropTypes.object,
  onCreated: PropTypes.func,
  defaultTipo: PropTypes.string,
  visible: PropTypes.bool,
  onClose: PropTypes.func,
};

export default CreateList;