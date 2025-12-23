#!/usr/bin/env python3
"""
Test script for the Drink Recommendation ML API
"""
import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://192.168.1.3:3000"

def test_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_recommendation_with_song():
    """Test recommendation with song"""
    print("\n" + "="*60)
    print("TEST 2: Recommendation WITH Song (Energetic Mood)")
    print("="*60)
    
    data = {
        "user_id": "user_test123",
        "email": "test@example.com",
        "mood": "Energetic",
        "song": "Pump It Up - Summer Sensations",
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
    
    response = requests.post(f"{BASE_URL}/recommend", json=data)
    print(f"Status Code: {response.status_code}")
    result = response.json()
    
    if result.get('success'):
        print(f"\n✅ Got {len(result['recommendations'])} recommendations:")
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n{i}. {rec['name']} ({rec['nameArabic']})")
            print(f"   Score: {rec['score']}")
            print(f"   Category: {rec['category']}")
            print(f"   Temperature: {rec['temperature']}")
            print(f"   Caffeine: {rec['caffeineLevel']}")
            print(f"   Reasons: {', '.join(rec['reasons'])}")
    else:
        print(f"❌ Error: {result.get('error')}")
    
    return response.status_code == 200

def test_recommendation_without_song():
    """Test recommendation without song"""
    print("\n" + "="*60)
    print("TEST 3: Recommendation WITHOUT Song (Happy Mood)")
    print("="*60)
    
    data = {
        "user_id": "user_test456",
        "email": "test2@example.com",
        "mood": "Happy",
        "song": None,
        "location": {
            "latitude": 30.0543978,
            "longitude": 31.453874,
            "city": "Cairo"
        },
        "weather": {
            "temperature": 28,
            "condition": "sunny"
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    response = requests.post(f"{BASE_URL}/recommend", json=data)
    print(f"Status Code: {response.status_code}")
    result = response.json()
    
    if result.get('success'):
        print(f"\n✅ Got {len(result['recommendations'])} recommendations:")
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n{i}. {rec['name']} ({rec['nameArabic']})")
            print(f"   Score: {rec['score']}")
            print(f"   Category: {rec['category']}")
            print(f"   Temperature: {rec['temperature']}")
            print(f"   Reasons: {', '.join(rec['reasons'])}")
    else:
        print(f"❌ Error: {result.get('error')}")
    
    return response.status_code == 200

def test_all_moods():
    """Test all available moods"""
    print("\n" + "="*60)
    print("TEST 4: Testing All Moods")
    print("="*60)
    
    moods = ["Happy", "Calm", "Energetic", "Tired", "Romantic", "Focused"]
    
    for mood in moods:
        data = {
            "user_id": f"user_mood_test_{mood.lower()}",
            "email": "mood_test@example.com",
            "mood": mood,
            "song": None,
            "weather": {"temperature": 20, "condition": "clear"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        response = requests.post(f"{BASE_URL}/recommend", json=data)
        result = response.json()
        
        if result.get('success') and result['recommendations']:
            top_drink = result['recommendations'][0]
            print(f"\n{mood:12} → {top_drink['name']:30} (score: {top_drink['score']})")
        else:
            print(f"\n{mood:12} → Error or no recommendations")

def test_stats():
    """Test statistics endpoint"""
    print("\n" + "="*60)
    print("TEST 5: Model Statistics")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/stats")
    print(f"Status Code: {response.status_code}")
    result = response.json()
    
    if result.get('success'):
        print(f"\n✅ Model Statistics:")
        print(f"   Total Drinks: {result['total_drinks']}")
        print(f"\n   By Category:")
        for cat, count in result['categories'].items():
            print(f"      {cat}: {count}")
        print(f"\n   By Temperature:")
        for temp, count in result['temperatures'].items():
            print(f"      {temp}: {count}")
        print(f"\n   By Caffeine Level:")
        for caff, count in result['caffeine_levels'].items():
            print(f"      {caff}: {count}")
    else:
        print(f"❌ Error: {result.get('error')}")
    
    return response.status_code == 200

def main():
    """Run all tests"""
    print("\n🧪 STARTING API TESTS")
    print("="*60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Recommendation with Song", test_recommendation_with_song),
        ("Recommendation without Song", test_recommendation_without_song),
        ("All Moods", test_all_moods),
        ("Statistics", test_stats)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except requests.exceptions.ConnectionError:
            print(f"\n❌ ERROR: Could not connect to {BASE_URL}")
            print("   Make sure the Flask server is running!")
            return
        except Exception as e:
            print(f"\n❌ ERROR in {test_name}: {e}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\n{passed}/{total} tests passed")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()