// app/forgot-password.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';

export default function ForgotPassword() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while checking auth status
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
      </View>
    );
  }

  // If user is already signed in, redirect to home
  if (isSignedIn) {
    return <Redirect href="/home" />;
  }

  // Show forgot password screen
  return <ForgotPasswordScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
  },
});