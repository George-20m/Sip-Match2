// app/home.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import HomeScreen from './components/HomeScreen';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [forceRender, setForceRender] = useState(false);

  // Force render after timeout if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('⚠️ Home page timeout - forcing render');
      setForceRender(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Home.tsx - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
  }, [isLoaded, isSignedIn]);

  // Show loading while checking auth status (with timeout)
  if (!isLoaded && !forceRender) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If user is not signed in, redirect to auth
  if (!isSignedIn && isLoaded) {
    console.log('Home.tsx - User NOT signed in, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  const handleNavigateToSettings = () => {
    router.push('/settings');
  };

  // Show home screen
  return <HomeScreen onNavigateToSettings={handleNavigateToSettings} />;
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