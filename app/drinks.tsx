// app/drinks.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import DrinksListScreen from './components/DrinksListScreen';

export default function Drinks() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [forceRender, setForceRender] = useState(false);

  // Force render after timeout if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('⚠️ Drinks page timeout - forcing render');
      setForceRender(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Drinks.tsx - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
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
    console.log('Drinks.tsx - User NOT signed in, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  const handleBack = () => {
    router.back();
  };

  // Show drinks list screen
  return <DrinksListScreen onBack={handleBack} />;
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