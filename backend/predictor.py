import pandas as pd
import numpy as np
import joblib
from datetime import datetime

# --- DÉFINITIONS GLOBALES (pour la logique de routage) ---
Point1 = ['Dacia', 'Suzuki', 'Citroen', 'Geely', 'Chery', 'Chevrolet']
Point2 = ['Hyundai', 'Renault', 'Skoda', 'Ford', 'Seat', 'Nissan', 'Fiat', 'Opel', 'Jetour', 'Mitsubishi']
Point3 = ['Volkswagen', 'Peugeot', 'Kia', 'Toyota', 'Cupra', 'DS']
Point4 = ['Audi', 'Mercedes', 'BMW', 'Land Rover']
Point5 = ['Porsche']
urban_types = ['SUV', 'Compacte', 'Citadine', 'Berline', 'Monospace']
utility_types = ['Pickup', 'Utilitaire']

def assigner_level(brand):
    if brand in Point1: return 1
    elif brand in Point2: return 2
    elif brand in Point3: return 3
    elif brand in Point4: return 4
    elif brand in Point5: return 5
    else: return 0

# --- CHARGEMENT DU ZOO DE MODÈLES ---
try:
    pipelines_zoo = joblib.load('ultimate_car_price_zoo.joblib')
    print("✅ Zoo de modèles ultimes chargé avec succès.")
except Exception as e:
    print(f"❌ ERREUR au chargement de 'ultimate_car_price_zoo.joblib': {e}")
    pipelines_zoo = None

def predict_price_master(new_car_data, prediction_mode='level'):
    if pipelines_zoo is None:
        raise RuntimeError("Le zoo de modèles n'est pas chargé.")
        
    input_df = pd.DataFrame([new_car_data])
    numeric_cols = ['Matricule Year', 'Kilometres counter', 'Motor Power', 'Boot Size']
    for col in numeric_cols:
        input_df[col] = pd.to_numeric(input_df[col], errors='coerce').fillna(0)
    
    # Création de 'Age' et 'is_new'
    current_year = datetime.now().year
    input_df['Age'] = current_year - input_df['Matricule Year']
    input_df['is_new'] = (input_df['Matricule Year'] == current_year).astype(int)
    
    # Création de 'Kilometres_per_year'
    age_safe = input_df['Age'].replace(0, 1)
    input_df['Kilometres_per_year'] = input_df['Kilometres counter'] / age_safe
    
    # Création de 'Level'
    input_df['Level'] = input_df['Brand'].apply(assigner_level)
    
    # Conversion de 'Papers' (si elle n'est pas déjà numérique)
    if 'Papers' in input_df.columns and input_df['Papers'].dtype == 'object':
        input_df['Papers'] = input_df['Papers'].apply(lambda x: 1 if str(x).lower() == 'ok' else 0)

    # Création de 'Risk_Factor' et 'Power_per_Size' si vous les avez utilisés dans le notebook
    if 'Risk_Factor' in pipelines_zoo['urban'].feature_names_in_:
        input_df['Risk_Factor'] = (1 - input_df['Papers']) * input_df['Level']
    if 'Power_per_Size' in pipelines_zoo['urban'].feature_names_in_:
        boot_size_safe = input_df['Boot Size'].replace(0, 1)
        input_df['Power_per_Size'] = input_df['Motor Power'] / boot_size_safe
    
    # --- ROUTAGE ---
    model_key = None
    if prediction_mode == 'type':
        car_type = input_df.iloc[0]['Car Type']
        if car_type in urban_types: model_key = 'urban'
        elif car_type in utility_types: model_key = 'utility'
    else: # Mode 'level' par défaut
        brand = input_df.iloc[0]['Brand']
        level = assigner_level(brand)
        if level > 0:
            model_key = f'level{level}'
            # Gérer le cas où le modèle spécialiste n'existe pas (ex: Level 5 trop rare)
            if model_key not in pipelines_zoo or pipelines_zoo[model_key] is None:
                print(f"Avertissement : Pas de modèle spécialiste pour '{model_key}'. Utilisation du modèle 'urban' comme solution de secours.")
                model_key = 'urban' # On se rabat sur le modèle le plus général

    if model_key is None or model_key not in pipelines_zoo or pipelines_zoo[model_key] is None:
        raise ValueError(f"Impossible de trouver un modèle valide pour cette voiture.")
        
    print(f"Routage vers le pipeline spécialiste : '{model_key}'")
    
    pipeline = pipelines_zoo[model_key]
    
    # --- PRÉDICTION ---
    # Le pipeline gère TOUT : Feature Engineering interne, Preprocessing, Prédiction
    prediction_log = pipeline.predict(input_df)
    final_prediction = np.expm1(prediction_log)
    
    return final_prediction[0]