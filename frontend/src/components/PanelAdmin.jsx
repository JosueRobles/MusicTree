import { Link } from "react-router-dom";

const PanelAdmin = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>
      <div className="mt-4 space-y-4">
        <Link to="/usuarios">
          <button className="bg-blue-500 text-white px-4 py-2 rounded w-full">
            Gestionar Usuarios
          </button>
        </Link>
        <Link to="/moderacion">
          <button className="bg-red-500 text-white px-4 py-2 rounded w-full">
            Moderación de Contenido
          </button>
        </Link>
      </div>
    </div>
  );
};

export default PanelAdmin;