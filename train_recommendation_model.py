import pandas as pd
from surprise import Dataset, Reader, KNNBasic
from surprise.model_selection import cross_validate
import pickle

def train_recommendation_model():
    # Cargar los datos combinados de valoraciones
    df_combined = pd.read_csv('./data/valoraciones_combinadas.csv')
    
    # Convertir los IDs a string para asegurar compatibilidad
    df_combined['usuario'] = df_combined['usuario'].astype(str)
    df_combined['entidad_id'] = df_combined['entidad_id'].astype(str)


    # Preparar los datos para Surprise
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df_combined[['usuario', 'entidad_id', 'calificacion']], reader)

    # Configuración de KNN
    sim_options = {
        'name': 'cosine',  # Usar similitud coseno
        'user_based': False  # Basado en ítems en lugar de usuarios
    }

    algo = KNNBasic(sim_options=sim_options)

    # Entrenar y evaluar el modelo
    cross_validate(algo, data, measures=['RMSE', 'MAE'], cv=5, verbose=True)

    # Entrenar el modelo en el conjunto completo de datos
    trainset = data.build_full_trainset()
    algo.fit(trainset)

    # Guardar el modelo entrenado
    with open('recommender_model.pkl', 'wb') as f:
        pickle.dump(algo, f)

if __name__ == "__main__":
    train_recommendation_model()
