const obtenerRecomendacionesQuery = `
SELECT cancion_id, estimacion
FROM obtener_recomendaciones($1)
ORDER BY estimacion DESC
LIMIT 5;
`;

module.exports = {
    obtenerRecomendacionesQuery
};
