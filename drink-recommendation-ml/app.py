from flask import Flask, request, jsonify
from flask_cors import CORS
from model.predictor import DrinkPredictor
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize predictor
try:
    predictor = DrinkPredictor(model_path='model')
    print("✅ Predictor initialized successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not load model - {e}")
    print("Run 'python model/train_model.py' first to train the model")
    predictor = None

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'model_loaded': predictor is not None,
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/recommend', methods=['POST'])
def recommend_drink():
    """
    Main recommendation endpoint
    Expects JSON with: user_id, email, mood, song, location, weather, timestamp
    """
    try:
        # Get request data
        user_data = request.get_json()
        
        print(f"\n📥 Received request from app:")
        print(f"   User: {user_data.get('email', 'unknown')}")
        print(f"   Mood: {user_data.get('mood', 'unknown')}")
        print(f"   Song: {user_data.get('song', 'None')}")
        print(f"   Weather: {user_data.get('weather', {}).get('temperature', '?')}°C, {user_data.get('weather', {}).get('condition', '?')}")
        
        # Validate required fields
        if not user_data or 'mood' not in user_data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: mood',
                'recommendations': []
            }), 400
        
        # Check if model is loaded
        if predictor is None:
            return jsonify({
                'success': False,
                'error': 'Model not trained. Run train_model.py first.',
                'recommendations': []
            }), 500
        
        # Get recommendations
        result = predictor.predict(user_data)
        
        if result['success']:
            print(f"\n✅ Returning {len(result.get('recommendations', []))} recommendations:")
            for i, rec in enumerate(result.get('recommendations', [])[:3], 1):
                print(f"   {i}. {rec['name']} (score: {rec['score']})")
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"\n❌ Error processing request: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """
    Endpoint to retrain the model with fresh data from Convex
    """
    try:
        from model.train_model import DrinkRecommendationModel
        
        print("\n🔄 Starting model retraining...")
        model = DrinkRecommendationModel()
        
        if model.train():
            model.save_model()
            
            # Reload predictor
            global predictor
            predictor = DrinkPredictor(model_path='model')
            
            return jsonify({
                'success': True,
                'message': 'Model retrained successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Training failed'
            }), 500
            
    except Exception as e:
        print(f"\n❌ Error retraining model: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get model statistics"""
    try:
        if predictor is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 500
        
        stats = {
            'success': True,
            'total_drinks': len(predictor.drinks_df),
            'categories': predictor.drinks_df['category'].value_counts().to_dict(),
            'temperatures': predictor.drinks_df['temperature'].value_counts().to_dict(),
            'caffeine_levels': predictor.drinks_df['caffeineLevel'].value_counts().to_dict()
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/test', methods=['POST'])
def test_recommendation():
    """Test endpoint with sample data"""
    sample_data = {
        "user_id": "test_user",
        "email": "test@example.com",
        "mood": "Happy",
        "song": None,
        "location": {
            "latitude": 30.0543978,
            "longitude": 31.453874,
            "city": "Cairo"
        },
        "weather": {
            "temperature": 15,
            "condition": "cloudy"
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # Override with any provided data
    user_data = request.get_json()
    if user_data:
        sample_data.update(user_data)
    
    result = predictor.predict(sample_data)
    return jsonify(result), 200

if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '192.168.1.3')
    port = int(os.getenv('FLASK_PORT', 3000))
    
    print(f"\n{'='*60}")
    print(f"🚀 DRINK RECOMMENDATION ML SYSTEM")
    print(f"{'='*60}")
    print(f"\n📡 Server starting on http://{host}:{port}")
    print(f"\n📋 Available Endpoints:")
    print(f"   GET  http://{host}:{port}/")
    print(f"        → Health check")
    print(f"\n   POST http://{host}:{port}/recommend")
    print(f"        → Get drink recommendations")
    print(f"\n   POST http://{host}:{port}/retrain")
    print(f"        → Retrain model with latest data")
    print(f"\n   GET  http://{host}:{port}/stats")
    print(f"        → Get model statistics")
    print(f"\n   POST http://{host}:{port}/test")
    print(f"        → Test with sample data")
    print(f"\n{'='*60}\n")
    
    app.run(
        host=host,
        port=port,
        debug=True
    )