// src/services/api.js

import axios from "axios";

// Función para obtener las tendencias ordenadas desde el backend
export const obtenerTopTendencias = async (limit = 15) => {
  try {
    const response = await axios.get(`/tendencias/orden?limit=${limit}`);
    return response.data;  // Retorna los datos de tendencias
  } catch (error) {
    console.error("Error al obtener las tendencias:", error);
    return [];  // Retorna un arreglo vacío en caso de error
  }
};
