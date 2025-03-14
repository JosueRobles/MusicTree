import { Link } from 'react-router-dom';
import TendenciasFeed from '../components/TendenciasFeed';

const Home = ({ usuario, onLogout }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="p-4 flex-grow mt-16">
        <h2 className="text-4xl font-bold my-4">Bienvenido a MusicTree</h2>
        <p>Explora artistas, álbumes, canciones y más.</p>
        <TendenciasFeed />
        {usuario ? (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-2">Gracias por ser parte de los miembros de MusicTree</h3>
            <p>Te invitamos a que también invites a tus amigos, para crecer no solo tus vínculos con ellos sino con el mundo entero a través de MusicTree.</p>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-2">Crea tu cuenta ahora</h3>
            <Link to="/register">
              <button className="bg-green-500 text-white py-2 px-4 rounded">Registrarse</button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;