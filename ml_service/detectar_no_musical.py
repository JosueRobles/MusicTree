import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import supabase
import os
from dotenv import load_dotenv
import pickle

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================
# 1. Entrenamiento del modelo
# ============================
df_train = pd.read_csv('ejemplos_no_musical.csv')  # Archivo etiquetado

# Prepara features
df_train['duracion'] = df_train['duracion_ms'] / 1000
df_train['posicion'] = df_train['orden'].fillna(0)
df_train['categoria'] = df_train['categoria'].fillna('desconocida')
df_train = pd.get_dummies(df_train, columns=['categoria'])

# X = features, y = etiquetas
X_train = df_train.drop(
    columns=['id_cancion', 'titulo', 'album', 'spotify_id', 'es_no_musical_label'],
    errors="ignore"  # evita errores si alguna no está
)
y_train = df_train['es_no_musical_label']

# Entrena modelo
modelo = RandomForestClassifier(n_estimators=100, random_state=42)
modelo.fit(X_train, y_train)

# Guarda modelo
with open('modelo_no_musical.pkl', 'wb') as f:
    pickle.dump(modelo, f)

# Carga modelo (para producción)
with open('modelo_no_musical.pkl', 'rb') as f:
    modelo = pickle.load(f)

# ============================
# 2. Predicción en canciones
# ============================
canciones = sb.table('canciones').select(
    'id_cancion, titulo, album, spotify_id, duracion_ms, orden, categoria'
).execute().data

df = pd.DataFrame(canciones)

# Preprocesa igual que en entrenamiento
df['duracion'] = df['duracion_ms'] / 1000
df['posicion'] = df['orden'].fillna(0)
df['categoria'] = df['categoria'].fillna('desconocida')
df = pd.get_dummies(df, columns=['categoria'])

# Copia para features (modelo)
df_features = df.copy()

# Asegúrate de tener mismas columnas que entrenamiento
for col in X_train.columns:
    if col not in df_features.columns:
        df_features[col] = 0
df_features = df_features[X_train.columns]

# ============================
# 3. Reglas manuales
# ============================
def es_no_musical_regla(row):
    t = str(row['titulo']).lower()
    if row['duracion_ms'] < 60000:  # menos de 1 min
        return True
    palabras = ['intro', 'interlude', 'voice-over', 'commentary', 'outro', 'skit']
    if any(p in t for p in palabras):
        return True
    return False

# ============================
# 4. Clasificación
# ============================
for idx, row in df.iterrows():
    if es_no_musical_regla(row):
        es_no_musical = True
    else:
        # Mantener como DataFrame para no perder nombres de columnas
        features = df_features.iloc[[idx]]
        es_no_musical = bool(modelo.predict(features)[0])

    sb.table('canciones').update({'es_no_musical': es_no_musical}) \
        .eq('id_cancion', row['id_cancion']).execute()

print("✅ Clasificación de pistas no musicales completada.")
