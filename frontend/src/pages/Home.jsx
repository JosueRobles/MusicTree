import { Link } from "react-router-dom";
import TendenciasFeed from "../components/TendenciasFeed";
import PropTypes from "prop-types";
import { useState } from "react";
import ParaTiFeed from "../components/ParaTi";

const Home = ({ usuario }) => {
  const [activeTab, setActiveTab] = useState(usuario ? "paraTi" : "tendencias");

  return (
    <div className="flex flex-col min-h-screen">
      <main className="p-4 flex-grow mt-16">
        <div className="welcome-banner" style={{
  background: 'linear-gradient(90deg, #065F46 0%, #16a34a 100%)',
  color: 'white',
  borderRadius: '18px',
  padding: '32px 18px',
  margin: '0 auto 32px auto',
  maxWidth: 700,
  textAlign: 'center',
  boxShadow: '0 2px 16px #0002'
}}>
  <h1 style={{ fontSize: '2.8rem', fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>
    🎵 Bienvenido a <span style={{ color: '#eab308' }}>MusicTree</span>
  </h1>
  <p style={{ fontSize: '1.3rem', marginBottom: 0 }}>
    Explora, conecta y comparte tu pasión por la música.<br />
    Descubre artistas, álbumes, canciones y videos de todo el mundo.
  </p>
</div>

        <div className="tabs my-4">
          <button
            className={`tab ${activeTab === "tendencias" ? "active" : ""}`}
            onClick={() => setActiveTab("tendencias")}
          >
            Tendencias Semanales
          </button>
          <button
            className={`tab ${activeTab === "paraTi" ? "active" : ""}`}
            onClick={() => {
              if (usuario) {
                setActiveTab("paraTi");
              } else {
                window.location.href = '/login';
              }
            }}
          >
            Para Ti
          </button>
        </div>

        {activeTab === "tendencias" && <TendenciasFeed />}
        {activeTab === "paraTi" && (
          <div>
            <h3 className="text-2xl font-bold">Para Ti</h3>
            {usuario && activeTab === "paraTi" && <ParaTiFeed usuario={usuario} />}
            {!usuario && (
              <div className="mt-4">
                <h3 className="text-2xl font-bold mb-2">Crea tu cuenta ahora</h3>
                <Link to="/register">
                  <button className="bg-green-500 text-white py-2 px-4 rounded">Registrarse</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {usuario && activeTab === "tendencias" && (
          <div className="mt-4">
            <h3 className="text-2xl font-bold mb-2">Gracias por ser parte de los miembros de MusicTree</h3>
            <p>
              Te invitamos a que también invites a tus amigos, para crecer no solo tus vínculos con ellos sino con el mundo entero a través de MusicTree.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

Home.propTypes = {
  usuario: PropTypes.object,
};

export default Home;