import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import requests
import os
from dotenv import load_dotenv

load_dotenv()

class DrinkRecommendationModel:
    def __init__(self):
        self.model = None
        self.mood_encoder = LabelEncoder()
        self.weather_encoder = LabelEncoder()
        self.caffeine_encoder = LabelEncoder()
        self.temperature_encoder = LabelEncoder()
        self.label_encoder = LabelEncoder()
        self.drinks_df = None
        
    def fetch_drinks_from_convex(self):
        """Fetch drinks data from Convex database"""
        convex_url = os.getenv('CONVEX_URL')
        
        if not convex_url:
            print("❌ Error: CONVEX_URL not set in .env file")
            return []
        
        try:
            # Call your Convex query using the HTTP API
            api_url = f"{convex_url}/api/query"
            
            response = requests.post(
                api_url,
                json={
                    "path": "drinks:getAllDrinks",
                    "args": {},
                    "format": "json"
                },
                headers={
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Convex returns the data directly or in a 'value' field
            drinks = data if isinstance(data, list) else data.get('value', [])
            
            print(f"✅ Fetched {len(drinks)} drinks from Convex")
            return drinks
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error fetching from Convex: {e}")
            print(f"   URL attempted: {api_url}")
            return []
        except Exception as e:
            print(f"❌ Error processing Convex response: {e}")
            return []
    
    def prepare_training_data(self, drinks):
        """Convert drinks data to training format"""
        training_data = []
        
        for drink in drinks:
            # Create multiple training samples for each mood
            for mood in drink.get('bestForMoods', []):
                for weather in drink.get('bestForWeather', ['any']):
                    training_data.append({
                        'mood': mood,
                        'weather': weather,
                        'temperature': drink.get('temperature', 'any'),
                        'caffeineLevel': drink.get('caffeineLevel', 'none'),
                        'sweetnessLevel': drink.get('sweetnessLevel', 5),
                        'intensity': drink.get('intensity', 3),
                        'vegan': int(drink.get('vegan', False)),
                        'drink_name': drink['name']
                    })
        
        df = pd.DataFrame(training_data)
        print(f"📊 Created {len(df)} training samples from {len(drinks)} drinks")
        return df
    
    def train(self):
        """Train the recommendation model"""
        print("🚀 Starting model training...")
        
        # Fetch drinks from Convex
        drinks = self.fetch_drinks_from_convex()
        if not drinks:
            print("❌ No drinks data available for training")
            return False
        
        # Store drinks for later use
        self.drinks_df = pd.DataFrame(drinks)
        
        # Prepare training data
        df = self.prepare_training_data(drinks)
        
        # Map user moods to drink moods
        mood_mapping = {
            'Happy': ['happy', 'indulgent', 'fun', 'social', 'refreshed'],
            'Calm': ['calm', 'relaxed', 'comfortable', 'cozy'],
            'Energetic': ['energetic', 'focused', 'productive', 'refreshed'],
            'Tired': ['comfort', 'cozy', 'relaxed', 'warm'],
            'Romantic': ['indulgent', 'cozy', 'warm', 'relaxed'],
            'Focused': ['focused', 'productive', 'energetic']
        }
        
        # Expand training data with user mood mappings
        expanded_data = []
        for user_mood, drink_moods in mood_mapping.items():
            mood_df = df[df['mood'].isin(drink_moods)].copy()
            mood_df['user_mood'] = user_mood
            expanded_data.append(mood_df)
        
        training_df = pd.concat(expanded_data, ignore_index=True)
        
        # Encode features
        training_df['mood_encoded'] = self.mood_encoder.fit_transform(training_df['user_mood'])
        training_df['weather_encoded'] = self.weather_encoder.fit_transform(training_df['weather'])
        training_df['caffeine_encoded'] = self.caffeine_encoder.fit_transform(training_df['caffeineLevel'])
        training_df['temp_encoded'] = self.temperature_encoder.fit_transform(training_df['temperature'])
        training_df['drink_encoded'] = self.label_encoder.fit_transform(training_df['drink_name'])
        
        # Prepare features and labels
        feature_columns = ['mood_encoded', 'weather_encoded', 'caffeine_encoded', 
                          'temp_encoded', 'sweetnessLevel', 'intensity', 'vegan']
        X = training_df[feature_columns]
        y = training_df['drink_encoded']
        
        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced'
        )
        
        self.model.fit(X, y)
        
        print(f"✅ Model trained with accuracy: {self.model.score(X, y):.2%}")
        return True
    
    def save_model(self, path='model'):
        """Save the trained model and encoders"""
        os.makedirs(path, exist_ok=True)
        
        joblib.dump(self.model, f'{path}/model.pkl')
        joblib.dump(self.mood_encoder, f'{path}/mood_encoder.pkl')
        joblib.dump(self.weather_encoder, f'{path}/weather_encoder.pkl')
        joblib.dump(self.caffeine_encoder, f'{path}/caffeine_encoder.pkl')
        joblib.dump(self.temperature_encoder, f'{path}/temperature_encoder.pkl')
        joblib.dump(self.label_encoder, f'{path}/label_encoder.pkl')
        self.drinks_df.to_pickle(f'{path}/drinks_df.pkl')
        
        print(f"💾 Model saved to {path}/")

if __name__ == "__main__":
    model = DrinkRecommendationModel()
    if model.train():
        model.save_model()
        print("🎉 Training complete!")
    else:
        print("❌ Training failed!")