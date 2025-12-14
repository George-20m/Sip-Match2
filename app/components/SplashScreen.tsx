// app/components/SplashScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  minimumDisplayTime?: number;
}

export default function SplashScreen({ 
  onFinish, 
  minimumDisplayTime = 3000 
}: SplashScreenProps) {
  // Animation values with useRef to prevent re-creation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  
  // Refs for proper cleanup
  const dotAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Start all animations
    startEntranceAnimation();
    startLogoRotation();
    
    // Start dot animation after entrance completes
    dotAnimationRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        animateDots();
      }
    }, 800);
    
    // Automatically finish after minimum display time
    finishTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        handleFinish();
      }
    }, minimumDisplayTime);
    
    // CRITICAL: Cleanup to prevent memory leaks and stuck screens
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts
      if (dotAnimationRef.current) {
        clearTimeout(dotAnimationRef.current);
      }
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      
      // Stop all animations
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      logoRotate.stopAnimation();
      slideUp.stopAnimation();
      dotAnim1.stopAnimation();
      dotAnim2.stopAnimation();
      dotAnim3.stopAnimation();
    };
  }, []);

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startLogoRotation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateDots = () => {
    if (!isMountedRef.current) return;
    
    Animated.sequence([
      Animated.timing(dotAnim1, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(dotAnim2, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(dotAnim3, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(dotAnim1, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim2, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim3, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Recursively call only if still mounted
      if (isMountedRef.current) {
        animateDots();
      }
    });
  };

  const handleFinish = () => {
    // Fade out smoothly before calling onFinish
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      if (isMountedRef.current && onFinish) {
        onFinish();
      }
    });
  };

  const rotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  const dot1Scale = dotAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const dot2Scale = dotAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const dot3Scale = dotAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Image with proper error handling */}
      <Image
        source={require('../../assets/images/SipMatchBackground.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        onError={(error) => {
          console.warn('Failed to load splash background:', error.nativeEvent.error);
        }}
      />
      <View style={styles.overlay} />

      {/* Decorative Elements */}
      <View style={styles.topDecoration}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }, { rotate: rotation }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <View style={styles.logoInnerCircle}>
              <MaterialCommunityIcons name="coffee" size={56} color="#8D6E63" />
            </View>
          </View>
        </Animated.View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Sip&Match</Text>
          <View style={styles.subtitleContainer}>
            <View style={styles.decorLine} />
            <Text style={styles.subtitle}>sip your mood, match your moment</Text>
            <View style={styles.decorLine} />
          </View>
        </View>

        {/* Loading Dots */}
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.dot,
              { opacity: dotAnim1, transform: [{ scale: dot1Scale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { opacity: dotAnim2, transform: [{ scale: dot2Scale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { opacity: dotAnim3, transform: [{ scale: dot3Scale }] },
            ]}
          />
        </View>
      </Animated.View>

      {/* Bottom Decoration */}
      <View style={styles.bottomDecoration}>
        <View style={styles.waveShape} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(62, 39, 35, 0.45)',
  },
  topDecoration: {
    position: 'absolute',
    top: -50,
    right: -50,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'absolute',
  },
  decorCircle2: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'absolute',
    top: 20,
    right: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 4,
    borderColor: 'rgba(255, 250, 240, 0.8)',
  },
  logoInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFAF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    marginBottom: 16,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  decorLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 100,
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    overflow: 'hidden',
  },
  waveShape: {
    width: width * 1.5,
    height: 120,
    backgroundColor: 'transparent',
    borderTopLeftRadius: width,
    borderTopRightRadius: width,
    position: 'absolute',
    bottom: -60,
    left: -width * 0.25,
  },
});