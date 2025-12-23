import joblib
import pandas as pd
import numpy as np
import os

class DrinkPredictor:
    def __init__(self, model_path='model'):
        """Load the trained model and encoders"""
        self.model = joblib.load(f'{model_path}/model.pkl')
        self.mood_encoder = joblib.load(f'{model_path}/mood_encoder.pkl')
        self.weather_encoder = joblib.load(f'{model_path}/weather_encoder.pkl')
        self.caffeine_encoder = joblib.load(f'{model_path}/caffeine_encoder.pkl')
        self.temperature_encoder = joblib.load(f'{model_path}/temperature_encoder.pkl')
        self.label_encoder = joblib.load(f'{model_path}/label_encoder.pkl')
        self.drinks_df = pd.read_pickle(f'{model_path}/drinks_df.pkl')
        
        print(f"✅ Model loaded successfully with {len(self.drinks_df)} drinks")
    
    def map_weather_condition(self, condition, temperature):
        """Map weather condition to drink-friendly format"""
        condition = condition.lower() if condition else ""
        
        if temperature >= 25:
            return "hot"
        elif temperature >= 18:
            return "warm"
        elif temperature >= 10:
            return "cool"
        else:
            return "cold"
    
    def get_time_of_day(self, timestamp):
        """Extract time of day from timestamp"""
        from datetime import datetime
        
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            hour = dt.hour
            
            if 5 <= hour < 12:
                return "morning"
            elif 12 <= hour < 17:
                return "afternoon"
            elif 17 <= hour < 21:
                return "evening"
            else:
                return "night"
        except:
            return "afternoon"  # default
    
    def predict(self, user_data):
        """Predict drink recommendations based on user data"""
        try:
            # Extract features
            mood = user_data.get('mood', 'Happy')
            weather_temp = user_data.get('weather', {}).get('temperature', 20)
            weather_condition = user_data.get('weather', {}).get('condition', 'clear')
            timestamp = user_data.get('timestamp', '')
            song = user_data.get('song')
            
            # Map weather
            weather = self.map_weather_condition(weather_condition, weather_temp)
            time_of_day = self.get_time_of_day(timestamp)
            
            # Determine temperature preference (hot/cold drinks)
            if weather in ['hot', 'warm']:
                preferred_temp = 'cold'
            else:
                preferred_temp = 'hot'
            
            # Filter drinks by temperature and time
            filtered_drinks = self.drinks_df[
                (self.drinks_df['temperature'] == preferred_temp) |
                (self.drinks_df['temperature'] == 'frozen')
            ].copy()
            
            # If song is provided, adjust for energy level
            energy_boost = 'energetic' in mood.lower() or (song is not None)
            
            # Score each filtered drink
            recommendations = []
            
            for _, drink in filtered_drinks.iterrows():
                score = 0
                
                # Mood match (highest weight)
                best_moods = drink.get('bestForMoods', [])
                mood_lower = mood.lower()
                
                if mood_lower in best_moods:
                    score += 50
                elif any(m in best_moods for m in [mood_lower, 'happy', 'refreshed']):
                    score += 30
                
                # Weather match
                best_weather = drink.get('bestForWeather', [])
                if weather in best_weather or 'any' in best_weather:
                    score += 20
                
                # Time of day match
                best_times = drink.get('bestTimeOfDay', [])
                if best_times and time_of_day in best_times:
                    score += 15
                
                # Energy/caffeine match
                caffeine = drink.get('caffeineLevel', 'none')
                if energy_boost and caffeine in ['high', 'medium']:
                    score += 15
                elif not energy_boost and caffeine in ['low', 'none']:
                    score += 10
                
                # Temperature match bonus
                if drink['temperature'] == preferred_temp:
                    score += 10
                
                # Song bonus (if song selected, prefer more energetic drinks)
                if song and drink.get('intensity', 0) >= 3:
                    score += 10
                
                recommendations.append({
                    'drink': drink.to_dict(),
                    'score': score,
                    'reasons': self._generate_reasons(drink, mood, weather, time_of_day, song)
                })
            
            # Sort by score and get top 5
            recommendations.sort(key=lambda x: x['score'], reverse=True)
            top_recommendations = recommendations[:5]
            
            return {
                'success': True,
                'recommendations': [
                    {
                        'name': rec['drink']['name'],
                        'nameArabic': rec['drink'].get('nameArabic', ''),
                        'category': rec['drink'].get('category', ''),
                        'temperature': rec['drink'].get('temperature', ''),
                        'caffeineLevel': rec['drink'].get('caffeineLevel', ''),
                        'sweetnessLevel': rec['drink'].get('sweetnessLevel', 0),
                        'score': rec['score'],
                        'reasons': rec['reasons'],
                        'flavorProfile': rec['drink'].get('flavorProfile', []),
                        'vegan': rec['drink'].get('vegan', False),
                        'intensity': rec['drink'].get('intensity', 3)
                    }
                    for rec in top_recommendations
                ],
                'context': {
                    'mood': mood,
                    'weather': weather,
                    'temperature': weather_temp,
                    'time_of_day': time_of_day,
                    'has_song': song is not None
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'recommendations': []
            }
    
    def _generate_reasons(self, drink, mood, weather, time_of_day, song):
        """Generate human-readable reasons for recommendation"""
        reasons = []
        
        # Mood reason
        best_moods = drink.get('bestForMoods', [])
        if mood.lower() in best_moods:
            reasons.append(f"Perfect for your {mood.lower()} mood")
        
        # Weather reason
        if weather in drink.get('bestForWeather', []):
            reasons.append(f"Great for {weather} weather")
        
        # Time reason
        if time_of_day in drink.get('bestTimeOfDay', []):
            reasons.append(f"Ideal for {time_of_day}")
        
        # Song reason
        if song:
            reasons.append("Matches your music energy")
        
        # Flavor reason
        flavors = drink.get('flavorProfile', [])
        if flavors:
            reasons.append(f"Features {', '.join(flavors[:2])} notes")
        
        return reasons[:3]  # Return top 3 reasons