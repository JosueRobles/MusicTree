import axios from "axios";

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

export const getUsuarios = async () => {
  try {
    const response = await axios.get(`${API_URL}/usuarios`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return [];
  }
};