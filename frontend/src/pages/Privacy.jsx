const Privacy = () => {
  return (
    <div className="pt-16 p-4">
      <h2 className="text-4xl font-bold my-4">Política de Privacidad</h2>
      <p>
        En MusicTree, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. Aquí te explicamos cómo manejamos tu información:
      </p>
      <section className="mt-4">
        <h3 className="text-2xl font-bold mb-2">Recopilación de Datos</h3>
        <p>
          Recopilamos información que nos proporcionas directamente, como tu nombre y correo electrónico, y datos sobre tu uso de la plataforma.
        </p>
      </section>
      <section className="mt-4">
        <h3 className="text-2xl font-bold mb-2">Uso de Datos</h3>
        <p>
          Utilizamos tus datos para mejorar nuestra plataforma, personalizar tu experiencia y comunicarnos contigo.
        </p>
      </section>
      <section className="mt-4">
        <h3 className="text-2xl font-bold mb-2">Compartir Datos</h3>
        <p>
          No compartimos tus datos personales con terceros, excepto cuando es necesario para proporcionar nuestros servicios o cuando la ley lo exige.
        </p>
      </section>
    </div>
  );
};

export default Privacy;