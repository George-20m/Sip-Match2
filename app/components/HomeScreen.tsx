// app/components/HomeScreen.tsx
import { useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../convex/_generated/api';
import { MLDrinkRecommendation, mlService } from '../services/mlService';
import { SpotifyTrack } from '../services/spotifyService';
import HistoryScreen from './HistoryScreen';
import RecommendationsScreen from './RecommendationsScreen';
import SpotifyMusicSelector from './SpotifyMusicSelector';

import axios from 'axios';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@sip_match_onboarding_complete';
const ML_API_URL = 'http://192.168.1.3:3000'; // Your ngrok URL // Replace with your actual ML API URL

interface Mood {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const moods: Mood[] = [
  { id: 'happy', label: 'Happy', icon: 'emoticon-happy-outline', color: '#FACC15' },
  { id: 'calm', label: 'Calm', icon: 'cloud-outline', color: '#60A5FA' },
  { id: 'energetic', label: 'Energetic', icon: 'lightning-bolt-outline', color: '#FB923C' },
  { id: 'tired', label: 'Tired', icon: 'sleep', color: '#D97706' },
  { id: 'romantic', label: 'Romantic', icon: 'heart-outline', color: '#F472B6' },
  { id: 'focused', label: 'Focused', icon: 'bullseye-arrow', color: '#C084FC' },
];

interface HomeScreenProps {
  onNavigateToSettings?: () => void;
}

export default function HomeScreen({ onNavigateToSettings }: HomeScreenProps) {
  const { user } = useUser();
  const router = useRouter();
  const isMountedRef = useRef(true);

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);

  const [showRecommendations, setShowRecommendations] = useState(false);
  const [mlRecommendations, setMlRecommendations] = useState<MLDrinkRecommendation[]>([]);
  const [mlContext, setMlContext] = useState<any>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [location, setLocation] = useState<string>('Cairo');
  const [temperature, setTemperature] = useState<number>(28);
  const [weatherIcon, setWeatherIcon] = useState<string>('weather-sunny');
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const moodAnims = useRef(moods.map(() => new Animated.Value(0))).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMountedRef.current = true;
    requestLocationAndWeather();

      const weatherInterval = setInterval(() => {
        requestLocationAndWeather();
      }, 60 * 60 * 1000); // 1 hour in milliseconds

    // Start animations
    startAnimations();

    return () => {
      isMountedRef.current = false;
      // Stop all animations
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      headerAnim.stopAnimation();
      ctaAnim.stopAnimation();
      moodAnims.forEach(anim => anim.stopAnimation());
      clearInterval(weatherInterval);
    };
  }, []);

  const startAnimations = () => {
    // Header slide down
    Animated.spring(headerAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Content fade in and slide up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger mood card animations
    Animated.stagger(
      70,
      moodAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        })
      )
    ).start();

    // CTA button animation
    Animated.spring(ctaAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      delay: 400,
      useNativeDriver: true,
    }).start();
  };

  const getWeatherIcon = (condition: string): string => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return 'weather-sunny';
    if (lowerCondition.includes('cloud')) return 'weather-cloudy';
    if (lowerCondition.includes('rain')) return 'weather-rainy';
    if (lowerCondition.includes('storm')) return 'weather-lightning';
    if (lowerCondition.includes('snow')) return 'weather-snowy';
    if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) return 'weather-fog';
    return 'weather-partly-cloudy';
  };

  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      setIsLoadingWeather(true);
      
      // Using Open-Meteo API (free, no API key required)
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      );

      const temp = Math.round(response.data.current.temperature_2m);
      const weatherCode = response.data.current.weather_code;
      
      // Map weather codes to conditions
      let condition = 'Clear';
      if (weatherCode >= 61 && weatherCode <= 67) condition = 'Rain';
      else if (weatherCode >= 71 && weatherCode <= 77) condition = 'Snow';
      else if (weatherCode >= 80 && weatherCode <= 82) condition = 'Rain';
      else if (weatherCode >= 51 && weatherCode <= 57) condition = 'Rain';
      else if (weatherCode >= 2 && weatherCode <= 3) condition = 'Cloudy';
      else if (weatherCode >= 95) condition = 'Storm';
      else if (weatherCode >= 45) condition = 'Fog';

      setTemperature(temp);
      setWeatherIcon(getWeatherIcon(condition));
      
      // Get location name from coordinates
      const locationResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (locationResponse.length > 0) {
        const place = locationResponse[0];
        const locationName = place.city || place.district || place.region || 'Unknown';
        setLocation(locationName);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Keep default values if error
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const requestLocationAndWeather = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        setIsLoadingWeather(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;
      await fetchWeatherData(latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setIsLoadingWeather(false);
    }
  };

  const handleNavigateToSettings = () => {
    if (onNavigateToSettings) {
      onNavigateToSettings();
    }
  };

  const handleMoodSelect = (moodId: string) => {
    try {
      setSelectedMood(moodId);
      
      // Haptic feedback simulation with animation
      const selectedAnim = moodAnims[moods.findIndex(m => m.id === moodId)];
      Animated.sequence([
        Animated.timing(selectedAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(selectedAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error selecting mood:', error);
    }
  };

  const handleGetRecommendation = async () => {
    if (!selectedMood) {
      Alert.alert('Select Your Mood', 'Please select how you\'re feeling first!');
      return;
    }

    setIsLoadingRecommendations(true);

    try {
      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;

      // Prepare request body
      const requestBody = {
        user_id: user?.id || 'guest',
        email: user?.emailAddresses[0]?.emailAddress || 'guest@sipmatch.com',
        mood: selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1),
        song: selectedTrack 
          ? `${selectedTrack.name} - ${selectedTrack.artists.map(a => a.name).join(', ')}` 
          : null,
        location: {
          latitude: latitude,
          longitude: longitude,
          city: location
        },
        weather: {
          temperature: temperature,
          condition: weatherIcon.replace('weather-', ''),
          humidity: null
        },
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending ML request:', requestBody);

      // Call ML service
      const response = await mlService.getRecommendations(requestBody);

      if (response.success && response.recommendations.length > 0) {
        console.log('✅ Got recommendations:', response.recommendations.length);
        
        // Store recommendations and context
        setMlRecommendations(response.recommendations);
        setMlContext(response.context);
        
        // Save recommendations to Convex database
        try {
          if (user?.id && allDrinks) {
            // Match ML recommendations to Convex drink IDs
            const drinkIds = response.recommendations
              .map(mlDrink => {
                const drink = allDrinks.find(d => d.name === mlDrink.name);
                return drink?._id;
              })
              .filter(Boolean) as any[];

            if (drinkIds.length > 0) {
              await saveRecommendationBatch({
                userId: user.id,
                drinkIds: drinkIds,
                context: {
                  mood: selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1),
                  temperature: temperature,
                  weatherCondition: weatherIcon.replace('weather-', ''),
                  timeOfDay: response.context.time_of_day,
                  song: selectedTrack?.name,
                },
              });
              console.log('✅ Saved recommendations to history');
            }
          }
        } catch (error) {
          console.error('Failed to save recommendations:', error);
          // Don't block user experience if save fails
        }
        
        // Show recommendations screen
        setShowRecommendations(true);
      } else {
        Alert.alert(
          'No Recommendations Found',
          response.error || 'Unable to find matching drinks. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error getting recommendations:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to recommendation service. Please make sure:\n\n' +
        '1. The ML server is running on your computer\n' +
        '2. Your phone and computer are on the same WiFi network\n' +
        '3. The IP address (192.168.1.3) is correct',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleSpotifyConnect = () => {
    if (!selectedMood) {
      Alert.alert(
        'Select Your Mood First',
        'Please select how you\'re feeling before choosing music.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowSpotifyModal(true);
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    Alert.alert(
      'Song Selected! 🎵',
      `"${track.name}" by ${track.artists.map(a => a.name).join(', ')}\n\nThis perfectly captures your ${selectedMood} mood!`,
      [{ text: 'Awesome!' }]
    );
  };

  const handleNavigateToFavorites = () => {
    Alert.alert('Favorites', 'Your favorite drinks feature is coming soon!', [{ text: 'OK' }]);
  };

  const handleNavigateToHistory = () => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to view your history.', [{ text: 'OK' }]);
      return;
    }
    setShowHistory(true);
  };

  const handleNavigateToDrinks = () => {
    router.push('/drinks');
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show you the onboarding screens again next time you open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(ONBOARDING_KEY);
              Alert.alert('Success', 'Onboarding has been reset!');
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding.');
            }
          },
        },
      ]
    );
  };

  // Add this near the top of the component with other hooks
  const convexUser = useQuery(
    api.users.getCurrentUser,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const saveRecommendationBatch = useMutation(api.recommendations.saveRecommendationBatch);
  const allDrinks = useQuery(api.drinks.getAllDrinks);

  // Then update the userName and userImageUrl variables
  const userName = convexUser?.userName || user?.firstName || user?.username || 'Friend';
  const userImageUrl = convexUser?.image || null;

  // Show history screen if active
  if (showHistory) {
    return (
      <HistoryScreen
        onBack={() => setShowHistory(false)}
        userId={user?.id || ''}
      />
    );
  }

  // Show recommendations screen if available (keep existing code below)
  if (showRecommendations && mlRecommendations.length > 0 && mlContext) {
    return (
      <RecommendationsScreen
        recommendations={mlRecommendations}
        context={mlContext}
        onBack={() => setShowRecommendations(false)}
        selectedMood={selectedMood || ''}
        selectedSong={selectedTrack ? `${selectedTrack.name} - ${selectedTrack.artists.map(a => a.name).join(', ')}` : null}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerAnim }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
            <View style={styles.weatherContainer}>
              {isLoadingWeather ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <>
                  <MaterialCommunityIcons name={weatherIcon as any} size={16} color="#F59E0B" />
                  <Text style={styles.weatherText}>{temperature}°C, {location}</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleNavigateToSettings}
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            {userImageUrl ? (
              <Image
                source={{ uri: userImageUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Selection Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <View style={styles.moodGrid}>
            {moods.map((mood, index) => {
              const isSelected = selectedMood === mood.id;
              return (
                <Animated.View
                  key={mood.id}
                  style={[
                    styles.moodCardWrapper,
                    {
                      opacity: moodAnims[index],
                      transform: [
                        {
                          scale: moodAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleMoodSelect(mood.id)}
                    style={[
                      styles.moodCard,
                      isSelected && styles.moodCardSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.moodIconContainer,
                        { backgroundColor: isSelected ? mood.color : `${mood.color}20` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={mood.icon as any}
                        size={32}
                        color={isSelected ? '#FFFFFF' : mood.color}
                      />
                    </View>
                    <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                      {mood.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Music Detection Card */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.musicCardWrapper}>
            <TouchableOpacity
              onPress={handleSpotifyConnect}
              style={styles.musicCard}
              activeOpacity={0.7}
            >
              <View style={styles.musicIconContainer}>
                <MaterialCommunityIcons name="spotify" size={32} color="#1DB954" />
              </View>
              <View style={styles.musicTextContainer}>
                <Text style={styles.musicTitle}>Express Mood with Music</Text>
                <Text style={styles.musicSubtitle}>
                  {selectedTrack 
                    ? `Playing: ${selectedTrack.name.substring(0, 25)}${selectedTrack.name.length > 25 ? '...' : ''}` 
                    : 'Browse and preview songs'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#8D6E63" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            onPress={handleNavigateToFavorites}
            style={styles.statCard}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#FFE6E6' }]}>
              <MaterialCommunityIcons name="heart" size={28} color="#F472B6" />
            </View>
            <Text style={styles.statLabel}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNavigateToHistory}
            style={styles.statCard}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <MaterialCommunityIcons name="history" size={28} color="#818CF8" />
            </View>
            <Text style={styles.statLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNavigateToDrinks}
            style={styles.statCard}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF4E6' }]}>
              <MaterialCommunityIcons name="coffee" size={28} color="#D97706" />
            </View>
            <Text style={styles.statLabel}>Drinks</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Today's Suggestion */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.suggestionCard}>
            <View style={styles.suggestionBadge}>
              <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
              <Text style={styles.suggestionBadgeText}>Today's Pick</Text>
            </View>
            <Text style={styles.suggestionTitle}>Caramel Macchiato</Text>
            <Text style={styles.suggestionDescription}>
              Perfect for a sunny morning in Cairo! Sweet and energizing.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Coming Soon! 🎉',
                  'This drink recommendation feature is coming soon!\n\nSelect your mood above and tap "Get Recommendation" to try our mood-based matching.',
                  [{ text: 'Got it!' }]
                );
              }}
              style={styles.tryButton}
              activeOpacity={0.7}
            >
              <Text style={styles.tryButtonText}>Try it now</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#8D6E63" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* UNCOMMENT THEN SAVE TO RESET ONBOARDING */}
        {/* Debug Section - Remove in Production */}
        {/* <TouchableOpacity
          style={styles.debugButton}
          onPress={handleResetOnboarding}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="refresh" size={18} color="#8D6E63" />
          <Text style={styles.debugButtonText}>Reset Onboarding (Debug)</Text>
        </TouchableOpacity> */}

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA Button */}
      <Animated.View
        style={[
          styles.bottomContainer,
          {
            opacity: ctaAnim,
            transform: [
              {
                translateY: ctaAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleGetRecommendation}
          disabled={!selectedMood || isLoadingRecommendations}
          style={[
            styles.ctaButton, 
            (!selectedMood || isLoadingRecommendations) && styles.ctaButtonDisabled
          ]}
          activeOpacity={0.8}
        >
          {isLoadingRecommendations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.loadingText}>Finding perfect drinks...</Text>
            </View>
          ) : (
            <Text style={[
              styles.ctaButtonText, 
              !selectedMood && styles.ctaButtonTextDisabled
            ]}>
              Get Recommendation
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Spotify Music Selector Modal */}
      <SpotifyMusicSelector
        visible={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        onSelectTrack={handleTrackSelect}
        selectedMood={selectedMood}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 6,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherText: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3E2723', // Changed from '#F5E6D3' to match SettingsScreen
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodCardWrapper: {
    width: (width - 72) / 3,
  },
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  moodCardSelected: {
    borderColor: '#8D6E63',
    backgroundColor: '#FFFAF0',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  moodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D4C41',
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: '#3E2723',
    fontWeight: '700',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8D6E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicCardWrapper: {
    position: 'relative',
  },
  musicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  musicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  musicTextContainer: {
    flex: 1,
  },
  musicTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 4,
  },
  musicSubtitle: {
    fontSize: 13,
    color: '#8D6E63',
  },
  comingSoonBadge: {
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
    textAlign: 'center',
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#8D6E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 4,
  },
  suggestionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  suggestionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 8,
  },
  suggestionDescription: {
    fontSize: 15,
    color: '#6D4C41',
    lineHeight: 22,
    marginBottom: 16,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  tryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4037',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    gap: 8,
  },
  debugButtonText: {
    fontSize: 13,
    color: '#8D6E63',
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#3E2723',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0.1,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ctaButtonTextDisabled: {
    color: '#A1887F',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});