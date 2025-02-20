import { Link } from 'react-router-dom';
import TendenciasSemanal from '../components/TendenciasSemanal';

const Home = () => {
  return (
    <div className="pt-16">
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Bienvenido a MusicTree</h2>
        <p>Explora artistas, álbumes, canciones y más.</p>
        <TendenciasSemanal />
        <div className="mt-4">
          <h3 className="text-2xl font-bold mb-2">Crea tu cuenta ahora</h3>
          <Link to="/register">
            <button className="bg-green-500 text-white py-2 px-4 rounded">Registrarse</button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Home;