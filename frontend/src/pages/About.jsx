import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const About = () => {
  const [fotoJosue, setFotoJosue] = useState(null);
  const [fotoDulce, setFotoDulce] = useState(null);

  useEffect(() => {
    // Carga la foto de perfil de Josue (id_usuario = 1) y Dulce (id_usuario = 2)
    fetch(`${API_URL}/usuarios/usuarios/1`)
      .then(res => res.json())
      .then(data => setFotoJosue(data.foto_perfil || "/default-profile.png"))
      .catch(() => setFotoJosue("/default-profile.png"));
    fetch(`${API_URL}/usuarios/usuarios/2`)
      .then(res => res.json())
      .then(data => setFotoDulce(data.foto_perfil || "/default-profile.png"))
      .catch(() => setFotoDulce("/default-profile.png"));
  }, []);

  return (
    <div className="pt-16 p-4" style={{ background: "#111", color: "#fff", minHeight: "100vh" }}>
      <h2 className="text-4xl font-bold my-4 flex items-center gap-4">
        Acerca de MusicTree
        <img src="/src/assets/logo.png" alt="MusicTree logo" style={{ width: 48, height: 48, borderRadius: 12 }} />
      </h2>
      <p className="mb-4" style={{ fontSize: "1.2rem" }}>
        <b>MusicTree</b> nació de una simple idea: <br />
        valorar la música no solo por un número, sino por lo que nos hace sentir.
      </p>
      <p className="mb-4">
        En 2024, mientras explorábamos diferentes formas de calificar películas, series y videojuegos, descubrí que en el mundo de la música faltaba algo. Plataformas como <b>RateYourMusic</b> o <b>Musicboard</b> ofrecían opciones interesantes, pero ninguna reunía todo lo que realmente buscaba: una experiencia completa que combinara valoración, emociones, completitud y descubrimiento.
      </p>
      <p className="mb-4">
        En MusicTree creemos que cada canción cuenta una historia y que esa historia puede ser distinta para cada oyente.<br />
        Por eso, aquí no solo podrás calificar con estrellas, sino también registrar:
      </p>
      <ul className="mb-4" style={{ marginLeft: 24 }}>
        <li>- Emociones y sensaciones que la canción te provoca.</li>
        <li>- Contexto: si es la primera vez que la escuchas o si ya es parte de tu vida.</li>
        <li>- Completitud: saber qué canciones, versiones o ediciones ya has valorado, y cuáles te faltan para completar un catálogo.</li>
      </ul>
      <p className="mb-4">
        Además, MusicTree no se limita a discografías de artistas. También podrás explorar y valorar colecciones temáticas, como bandas sonoras de videojuegos, One-Hit Wonders, etc.
      </p>
      <p className="mb-4">
        Nuestro sistema incluye rankings personalizados y compartibles, para que puedas mostrar tu top de canciones, álbumes, videos musicales o artistas como realmente los sientes, incluso si tienen la misma puntuación pero un significado distinto para ti.
      </p>
      <p className="mb-4">
        Integramos inteligencia artificial para ayudarte a reconocer canciones ya valoradas, incluso si son versiones distintas, y en el futuro para descubrir música que encaje con tus gustos más profundos.
      </p>

      <h3 className="text-2xl font-bold mb-2 mt-8 flex items-center gap-2">
        Nuestro Equipo
        <span role="img" aria-label="equipo">🌳</span>
      </h3>
      <div className="flex gap-8 flex-wrap mb-8">
        <div className="flex flex-col items-center">
          <img
            src={fotoJosue}
            alt="Josue Robles"
            className="w-32 h-32 rounded-full object-cover mb-2"
            style={{ border: "3px solid #eab308", background: "#222" }}
          />
          <span className="font-bold">Josue Robles</span>
        </div>
        <div className="flex flex-col items-center">
          <img
            src={fotoDulce}
            alt="Dulce Chavarin"
            className="w-32 h-32 rounded-full object-cover mb-2"
            style={{ border: "3px solid #eab308", background: "#222" }}
          />
          <span className="font-bold">Dulce Chavarin</span>
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-2 mt-8">Comentarios de nuestros usuarios</h3>
      <div className="bg-gray-900 p-4 rounded-md" style={{ color: "#eab308" }}>
        <p>
          <strong>Karlita:</strong> MusicTree es la mejor plataforma que he visto y la uso diario.
        </p>
      </div>
    </div>
  );
};

export default About;