// app/oauth-native-callback.tsx
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function OAuthCallback() {
  useEffect(() => {
    // This component handles the OAuth redirect
    // Clerk will automatically process the callback and update auth state
    // The user will then be redirected by the auth flow
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8D6E63" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
  },
});