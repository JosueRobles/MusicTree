import pandas as pd
import os

# Ruta de los archivos
input_dir = "data/valoraciones/"
output_file = os.path.join(input_dir, "valoraciones_combinadas.csv")

# Cargar datos de valoraciones
valoraciones_albumes = pd.read_csv(os.path.join(input_dir, "valoraciones_albumes.csv"))
valoraciones_artistas = pd.read_csv(os.path.join(input_dir, "valoraciones_artistas.csv"))
valoraciones_canciones = pd.read_csv(os.path.join(input_dir, "valoraciones_canciones.csv"))
valoraciones_videos = pd.read_csv(os.path.join(input_dir, "valoraciones_videos.csv"))

# Añadir columna 'tipo'
valoraciones_albumes['tipo'] = 'album'
valoraciones_artistas['tipo'] = 'artista'
valoraciones_canciones['tipo'] = 'cancion'
valoraciones_videos['tipo'] = 'video'

# Renombrar las columnas para que sean consistentes
valoraciones_albumes.rename(columns={'album': 'entidad_id'}, inplace=True)
valoraciones_artistas.rename(columns={'artista': 'entidad_id'}, inplace=True)
valoraciones_canciones.rename(columns={'cancion': 'entidad_id'}, inplace=True)
valoraciones_videos.rename(columns={'video': 'entidad_id'}, inplace=True)

# Convertir usuario y entidad_id a str
for df in [valoraciones_albumes, valoraciones_artistas, valoraciones_canciones, valoraciones_videos]:
    df['usuario'] = df['usuario'].astype(str)
    df['entidad_id'] = df['entidad_id'].astype(str)

# Combinar todas las valoraciones en un solo DataFrame
valoraciones_combinadas = pd.concat([
    valoraciones_albumes[['usuario', 'entidad_id', 'calificacion', 'tipo']],
    valoraciones_artistas[['usuario', 'entidad_id', 'calificacion', 'tipo']],
    valoraciones_canciones[['usuario', 'entidad_id', 'calificacion', 'tipo']],
    valoraciones_videos[['usuario', 'entidad_id', 'calificacion', 'tipo']]
])

# Guardar el DataFrame combinado en un archivo CSV
valoraciones_combinadas.to_csv(output_file, index=False)

print(f"✅ Archivo combinado generado: {output_file}")
