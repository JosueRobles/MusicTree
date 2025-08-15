import { Link, useNavigate } from "react-router-dom";
import TendenciasFeed from "../components/TendenciasFeed";
import PropTypes from "prop-types";
import { useState } from "react";
import ParaTiFeed from "../components/ParaTi";
import explorarImg from "../assets/explorar.png"; // Usa tus imágenes reales
import valorarImg from "../assets/valorar.png";
import coleccionarImg from "../assets/coleccionar.png";
import compartirImg from "../assets/compartir.png";

const Home = ({ usuario }) => {
  const [activeTab, setActiveTab] = useState(usuario ? "paraTi" : "tendencias");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#111" }}>
      <main className="p-4 flex-grow mt-16">
        {/* Banner principal */}
        <div
          className="welcome-banner"
          style={{
            background: "#111",
            color: "#fff",
            borderRadius: "18px",
            padding: "32px 18px",
            margin: "0 auto 32px auto",
            maxWidth: 700,
            textAlign: "center",
            boxShadow: "0 2px 16px #0002",
          }}
        >
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: "bold",
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            <b>
              Bienvenido a{" "}
              <span style={{ color: "#eab308" }}>
                🎧MusicTree🌳
              </span>
            </b>
          </h1>
          <p style={{ fontSize: "1.2rem", marginBottom: 0, color: "#fff" }}>
            <span style={{ color: "#22c55e", fontWeight: "bold", cursor: "pointer" }} onClick={() => navigate("/about")}>
              MusicTree
            </span>{" "}
            es una plataforma que te permite{" "}
            <span
              style={{
                color: "#b45309",
                fontWeight: "bold",
                cursor: "pointer",
                margin: "0 2px",
              }}
              onClick={() => window.scrollTo({ top: document.getElementById("explorar-card")?.offsetTop - 80, behavior: "smooth" })}
            >
              explorar
            </span>
            ,{" "}
            <span
              style={{
                color: "#b45309",
                fontWeight: "bold",
                cursor: "pointer",
                margin: "0 2px",
              }}
              onClick={() => window.scrollTo({ top: document.getElementById("valorar-card")?.offsetTop - 80, behavior: "smooth" })}
            >
              valorar
            </span>
            ,{" "}
            <span
              style={{
                color: "#b45309",
                fontWeight: "bold",
                cursor: "pointer",
                margin: "0 2px",
              }}
              onClick={() => window.scrollTo({ top: document.getElementById("coleccionar-card")?.offsetTop - 80, behavior: "smooth" })}
            >
              coleccionar
            </span>
            {" y "}
            <span
              style={{
                color: "#b45309",
                fontWeight: "bold",
                cursor: "pointer",
                margin: "0 2px",
              }}
              onClick={() => window.scrollTo({ top: document.getElementById("compartir-card")?.offsetTop - 80, behavior: "smooth" })}
            >
              compartir
            </span>{" "}
            música.
            <br />
            Descubre artistas, álbumes, canciones y videos musicales de todo el mundo.
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs my-4">
          <button
            className={`tab ${activeTab === "tendencias" ? "active" : ""}`}
            onClick={() => setActiveTab("tendencias")}
          >
            Para todo el mundo
          </button>
          <button
            className={`tab ${activeTab === "paraTi" ? "active" : ""}`}
            onClick={() => {
              if (usuario) {
                setActiveTab("paraTi");
              } else {
                window.location.href = "/login";
              }
            }}
          >
            Para Ti
          </button>
        </div>

        {/* Tendencias */}
        {activeTab === "tendencias" && (<TendenciasFeed />)}
        {activeTab === "paraTi" && (
          <div>
            <h3 className="text-2xl font-bold text-white">Para Ti</h3>
            {usuario && activeTab === "paraTi" && <ParaTiFeed usuario={usuario} />}
            {!usuario && (
              <div className="mt-4">
                <h3 className="text-2xl font-bold mb-2 text-white">Crea tu cuenta ahora</h3>
                <Link to="/register">
                  <button className="bg-green-500 text-white py-2 px-4 rounded">Registrarse</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tarjetas de funcionalidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 mb-10 max-w-4xl mx-auto">
          <div
            id="explorar-card"
            className="rounded-xl p-6 flex flex-col items-center"
            style={{ background: "#064e3b", color: "#fff" }}
          >
            <img src={explorarImg} alt="Explorar" style={{ width: 80, marginBottom: 12 }} />
            <span style={{ color: "#b45309", fontWeight: "bold", fontSize: "1.2rem" }}>
              EXPLORAR
            </span>
            <p className="mt-2 text-center">
              Sumérgete en artistas, álbumes, canciones y videos musicales. Aquí exploras catálogos de artistas, colecciones y listas personalizadas de los usuarios.
            </p>
          </div>
          <div
            id="valorar-card"
            className="rounded-xl p-6 flex flex-col items-center"
            style={{ background: "#064e3b", color: "#fff" }}
          >
            <img src={valorarImg} alt="Valorar" style={{ width: 80, marginBottom: 12 }} />
            <span style={{ color: "#b45309", fontWeight: "bold", fontSize: "1.2rem" }}>
              VALORAR
            </span>
            <p className="mt-2 text-center">
              Puntúa de 0 a 5 estrellas, añade tus comentarios, emociones sentidas y la familiaridad con la que la conoces. ¡Tu valoración nos importa!
            </p>
          </div>
          <div
            id="coleccionar-card"
            className="rounded-xl p-6 flex flex-col items-center"
            style={{ background: "#064e3b", color: "#fff" }}
          >
            <img src={coleccionarImg} alt="Coleccionar" style={{ width: 80, marginBottom: 12 }} />
            <span style={{ color: "#b45309", fontWeight: "bold", fontSize: "1.2rem" }}>
              COLECCIONAR
            </span>
            <p className="mt-2 text-center">
              Gana insignias por cumplir logros, obtén medallas por completar catálogos de artistas y por completar colecciones interesantes.
            </p>
          </div>
          <div
            id="compartir-card"
            className="rounded-xl p-6 flex flex-col items-center"
            style={{ background: "#064e3b", color: "#fff" }}
          >
            <img src={compartirImg} alt="Compartir" style={{ width: 80, marginBottom: 12 }} />
            <span style={{ color: "#b45309", fontWeight: "bold", fontSize: "1.2rem" }}>
              COMPARTIR
            </span>
            <p className="mt-2 text-center">
              Crea tu ranking personal, conecta con otros miembros y comparte tu historial musical.
            </p>
          </div>
        </div>

        {/* Tarjeta final: registro o agradecimiento */}
        <div
          className="rounded-xl p-6 mt-6 max-w-xl mx-auto text-center"
          style={{ background: "#064e3b", color: "#fff" }}
        >
          {!usuario ? (
            <>
              <h3 className="text-2xl font-bold mb-2 text-white">
                Crea tu cuenta ahora y aprovecha todas las funcionalidades que tenemos en MusicTree para ti!
              </h3>
              <Link to="/register">
                <button className="bg-green-500 text-white py-2 px-4 rounded mt-2">Registrarse</button>
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold mb-2 text-white">
                ¡Gracias por ser parte de los miembros de MusicTree!
              </h3>
              <p>
                Te recomendamos que también invites a tus amigos, para hacer crecer este árbol musical llamado MusicTree.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

Home.propTypes = {
  usuario: PropTypes.object,
};

export default Home;