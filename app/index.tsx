// app/index.tsx
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import SplashScreen from './components/SplashScreen';

const ONBOARDING_KEY = '@sip_match_onboarding_complete';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('Index - Auth State:', { isLoaded, isSignedIn, hasSeenOnboarding, showSplash });
  }, [isLoaded, isSignedIn, hasSeenOnboarding, showSplash]);

  // Check if user has seen onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Navigate when everything is loaded
  useEffect(() => {
    if (!showSplash && isLoaded && hasSeenOnboarding !== null && !isNavigating) {
      navigateToCorrectScreen();
    }
  }, [showSplash, isLoaded, hasSeenOnboarding, isSignedIn]);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      console.log('Onboarding status:', value);
      setHasSeenOnboarding(value === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  const navigateToCorrectScreen = async () => {
    if (isNavigating) return; // Prevent multiple navigations
    
    try {
      setIsNavigating(true);
      
      console.log('🚀 Navigation decision:', { isSignedIn, hasSeenOnboarding });
      
      if (isSignedIn) {
        console.log('→ Navigating to /home');
        router.replace('/home');
      } else if (hasSeenOnboarding) {
        console.log('→ Navigating to /auth');
        router.replace('/auth');
      } else {
        console.log('→ Navigating to /onboarding');
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to onboarding if something goes wrong
      router.replace('/onboarding');
    }
  };

  const handleSplashFinish = () => {
    console.log('✅ Splash finished');
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} minimumDisplayTime={2000} />;
  }

  // Show loading while checking auth and onboarding status
  if (!isLoaded || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // This should never show as navigation happens in useEffect
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#8D6E63" />
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: '500',
  },
});