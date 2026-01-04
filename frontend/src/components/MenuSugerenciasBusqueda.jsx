import { createPortal } from 'react-dom';

const MenuSugerenciasBusqueda = ({ anchorRef, sugerencias, onSelect, visible }) => {
  if (!visible || sugerencias.length === 0 || !anchorRef.current) return null;

  // Calcula la posición del input
  const rect = anchorRef.current.getBoundingClientRect();
  const style = {
    position: 'fixed',
    top: rect.bottom + 8,
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    background: '#18181b',
    border: '1px solid #333',
    borderRadius: 10,
    boxShadow: '0 8px 32px #000a',
    maxHeight: 420,
    overflowY: 'auto',
    padding: '6px 0'
  };

  // Evita que el menú se cierre al hacer click dentro (incluyendo scroll)
  const handleMenuMouseDown = (e) => {
    e.stopPropagation();
  };

  return createPortal(
    <div style={style} onMouseDown={handleMenuMouseDown}>
      {sugerencias.map(suggestion => (
        <div
          key={suggestion.tipo + suggestion.id}
          className="flex items-center hover:bg-[#222] cursor-pointer transition"
          style={{
            padding: '8px 14px',
            borderBottom: '1px solid #222',
            gap: 14
          }}
          onClick={() => onSelect(suggestion.ruta)}
        >
          <img
            src={suggestion.imagen}
            alt={suggestion.texto}
            className="rounded"
            style={{
              width: 54,
              height: 54,
              objectFit: 'cover',
              background: '#222',
              border: '2px solid #16a34a',
              borderRadius: 8,
              flexShrink: 0
            }}
          />
          <div style={{ marginLeft: 8, color: '#fff', fontSize: '1.05rem', fontWeight: 500 }}>
            {suggestion.texto.replace(/^(Artista:|Álbum:|Canción:|Video:)\s*/i, '')}
            <span style={{ color: '#a3a3a3', fontWeight: 400 }}>({suggestion.tipo})</span>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default MenuSugerenciasBusqueda;