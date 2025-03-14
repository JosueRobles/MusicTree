import os
import pandas as pd
import supabase
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Conectar a Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_client = supabase.create_client(supabase_url, supabase_key)

# Carpeta donde guardaremos los CSV
output_dir = "data/valoraciones/"
os.makedirs(output_dir, exist_ok=True)

# Definir las tablas y sus nombres de archivo
tablas = {
    "valoraciones_canciones": "valoraciones_canciones.csv",
    "valoraciones_albumes": "valoraciones_albumes.csv",
    "valoraciones_artistas": "valoraciones_artistas.csv",
    "valoraciones_videos_musicales": "valoraciones_videos.csv"
}

# Columnas esperadas en cada tabla
columnas_por_tipo = {
    "valoraciones_canciones": ("usuario", "cancion", "calificacion"),
    "valoraciones_albumes": ("usuario", "album", "calificacion"),
    "valoraciones_artistas": ("usuario", "artista", "calificacion"),
    "valoraciones_videos_musicales": ("usuario", "video", "calificacion")
}

def extraer_valoraciones(tabla, filename):
    """Obtiene las valoraciones de la tabla y las guarda en CSV."""
    response = supabase_client.table(tabla).select("*").execute()
    
    if response.data:
        df = pd.DataFrame(response.data)
        columnas = columnas_por_tipo[tabla]

        # Filtrar solo las columnas necesarias
        df = df[list(columnas)]
        
        # Guardar CSV
        filepath = os.path.join(output_dir, filename)
        df.to_csv(filepath, index=False)
        print(f"✅ Archivo generado: {filepath}")
    else:
        print(f"⚠️ No hay datos en {tabla}. No se generó CSV.")

# Procesar cada tabla
for tabla, filename in tablas.items():
    extraer_valoraciones(tabla, filename)

print("✨ Extracción de datos completada.")
