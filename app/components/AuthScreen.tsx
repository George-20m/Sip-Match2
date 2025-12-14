// app/components/AuthScreen.tsx
import { useOAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../convex/_generated/api';

const { width, height } = Dimensions.get('window');

type AuthStep = 'email' | 'password' | 'verification';

const ArrowLeft = () => (
  <Text style={{ fontSize: 20, color: '#8D6E63', fontWeight: '600' }}>←</Text>
);

const GoogleIcon = () => (
  <View style={styles.googleIcon}>
    <Text style={{ fontSize: 18 }}>G</Text>
  </View>
);

export default function AuthScreen() {
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { user } = useUser();
  const router = useRouter();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [step, setStep] = useState<AuthStep>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;

    try {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Animation error:', error);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [step]);

  // Helper function to sync user with Convex
  const syncUserWithConvex = async (clerkUserId: string, authMethod: 'google' | 'email', hasPassword: boolean) => {
    try {
      // Wait a bit for Clerk user to be fully populated
      await new Promise(resolve => setTimeout(resolve, 500));

      const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
      const email = user?.emailAddresses?.[0]?.emailAddress || emailAddress;
      const imageUrl = user?.imageUrl || null;

      console.log('🔄 Syncing user with Convex...', { clerkUserId, email, authMethod });

      await getOrCreateUser({
        clerkId: clerkUserId,
        email: email,
        userName: firstName,
        authMethod: authMethod,
        hasPassword: hasPassword,
        image: imageUrl,
      });

      console.log('✅ User synced with Convex successfully');
      return true;
    } catch (error) {
      console.error('❌ Error syncing user with Convex:', error);
      // Don't block the flow if Convex sync fails
      return false;
    }
  };

  const onEmailSubmit = async () => {
    try {
      if (!signUpLoaded || !signInLoaded) {
        Alert.alert('Loading', 'Please wait, authentication is initializing...');
        return;
      }

      if (!emailAddress.trim()) {
        Alert.alert('Oops!', 'Please enter your email address');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return;
      }

      setLoading(true);

      try {
        await signIn.create({
          identifier: emailAddress,
        });

        setIsSignUp(false);
        setStep('password');
      } catch (err: any) {
        if (
          err.errors?.[0]?.code === 'form_identifier_not_found' ||
          err.errors?.[0]?.message?.toLowerCase().includes('not found') ||
          err.errors?.[0]?.message?.toLowerCase().includes("couldn't find")
        ) {
          setIsSignUp(true);
          setStep('password');
        } else {
          Alert.alert('Error', err.errors?.[0]?.message || 'Failed to verify email');
        }
      }
    } catch (error: any) {
      console.error('Email submission error:', error);
      Alert.alert(
        'Unexpected Error',
        'Something went wrong while processing your email. Please try again.'
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onPasswordSubmit = async () => {
    try {
      if (!signUpLoaded || !signInLoaded) {
        Alert.alert('Loading', 'Please wait, authentication is initializing...');
        return;
      }

      if (!password.trim()) {
        Alert.alert('Oops!', 'Please enter your password');
        return;
      }

      setLoading(true);

      try {
        if (isSignUp) {
          if (password.length < 8) {
            Alert.alert('Weak Password', 'Password must be at least 8 characters');
            setLoading(false);
            return;
          }

          await signUp.create({
            emailAddress,
            password,
          });

          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setStep('verification');
        } else {
          // SIGN IN
          const signInAttempt = await signIn.create({
            identifier: emailAddress,
            password,
          });

          if (signInAttempt.status === 'complete') {
            await setActiveSignIn({ session: signInAttempt.createdSessionId });
            
            console.log('✅ Sign in complete, navigating...');
            
            // Navigate immediately
            router.replace('/home');
            
            // Sync with Convex in background
            setTimeout(async () => {
              try {
                const maxAttempts = 5;
                let attempts = 0;
                
                while (attempts < maxAttempts && !user?.id) {
                  console.log(`⏳ Waiting for user data... (attempt ${attempts + 1}/${maxAttempts})`);
                  await new Promise(resolve => setTimeout(resolve, 500));
                  attempts++;
                }
                
                if (user?.id) {
                  await syncUserWithConvex(user.id, 'email', true);
                }
              } catch (error) {
                console.error('Error in background sync:', error);
              }
            }, 100);
            
          } else {
            Alert.alert('Error', 'Sign in failed. Please try again.');
          }
        }
      } catch (err: any) {
        Alert.alert(
          'Authentication Failed',
          err.errors?.[0]?.message || `${isSignUp ? 'Sign up' : 'Sign in'} failed`
        );
      }
    } catch (error: any) {
      console.error('Password submission error:', error);
      Alert.alert(
        'Unexpected Error',
        'Something went wrong during authentication. Please try again.'
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onVerificationSubmit = async () => {
    try {
      if (!signUpLoaded) {
        Alert.alert('Loading', 'Please wait, verification is initializing...');
        return;
      }

      if (!verificationCode.trim()) {
        Alert.alert('Oops!', 'Please enter the verification code');
        return;
      }

      if (verificationCode.length !== 6) {
        Alert.alert('Invalid Code', 'Please enter a 6-digit code');
        return;
      }

      setLoading(true);

      try {
        const signUpAttempt = await signUp.attemptEmailAddressVerification({
          code: verificationCode,
        });

        if (signUpAttempt.status === 'complete') {
          await setActiveSignUp({ session: signUpAttempt.createdSessionId });
          
          console.log('✅ Sign up complete, navigating...');
          
          // Navigate immediately
          router.replace('/home');
          
          // Sync with Convex in background
          setTimeout(async () => {
            try {
              const maxAttempts = 5;
              let attempts = 0;
              
              while (attempts < maxAttempts && !user?.id) {
                console.log(`⏳ Waiting for user data... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
              }
              
              if (user?.id) {
                await syncUserWithConvex(user.id, 'email', true);
              }
            } catch (error) {
              console.error('Error in background sync:', error);
            }
          }, 100);
          
        } else {
          Alert.alert('Verification Failed', 'Please try again.');
        }
      } catch (err: any) {
        Alert.alert('Verification Failed', err.errors?.[0]?.message || 'Invalid code');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert(
        'Unexpected Error',
        'Something went wrong during verification. Please try again.'
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onGoogleAuth = async () => {
    try {
      setLoading(true);
      console.log('🔵 Starting Google OAuth flow...');
      
      const { createdSessionId, setActive } = await startOAuthFlow();

      console.log('🔵 OAuth flow returned:', { createdSessionId: !!createdSessionId });

      if (createdSessionId && setActive) {
        console.log('🔵 Setting active session...');
        await setActive({ session: createdSessionId });
        
        console.log('✅ Session activated, redirecting...');
        
        // Navigate immediately
        router.replace('/home');
        
        // Sync with Convex after navigation (in background)
        setTimeout(async () => {
          try {
            // Reload user to ensure we have latest data
            const maxAttempts = 5;
            let attempts = 0;
            
            while (attempts < maxAttempts && !user?.id) {
              console.log(`⏳ Waiting for user data... (attempt ${attempts + 1}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 500));
              attempts++;
            }
            
            if (user?.id) {
              console.log('🔄 Syncing user with Convex...');
              await syncUserWithConvex(user.id, 'google', false);
            } else {
              console.warn('⚠️ User data not available after max attempts');
            }
          } catch (error) {
            console.error('Error in background sync:', error);
          }
        }, 100);
        
      } else {
        console.error('❌ OAuth flow failed - no session created');
        Alert.alert('Authentication Failed', 'Google sign in did not complete successfully');
      }
    } catch (error: any) {
      console.error('❌ Google auth error:', error);
      
      // Don't show alert if user cancelled
      if (!error.message?.toLowerCase().includes('cancel')) {
        Alert.alert(
          'Authentication Failed',
          error.message || 'Google sign in failed'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    try {
      if (step === 'password') {
        setStep('email');
        setPassword('');
        setShowPassword(false);
      } else if (step === 'verification') {
        setStep('password');
        setVerificationCode('');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to go back. Please try again.');
    }
  };

  const handleResendCode = async () => {
    try {
      if (!signUpLoaded) {
        Alert.alert('Loading', 'Please wait...');
        return;
      }

      setLoading(true);

      try {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        Alert.alert('Success!', 'Verification code sent to your email');
      } catch (err: any) {
        Alert.alert('Error', err.errors?.[0]?.message || 'Failed to resend code. Please try again.');
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      Alert.alert('Unexpected Error', 'Failed to resend verification code. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image with Gradient Overlay */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../assets/images/Authbackground.jpeg')}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => console.warn('Failed to load hero image')}
          />
          <View style={styles.imageOverlay} />

          {/* Logo or Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>☕</Text>
            </View>
            <Text style={styles.brandTitle}>Welcome</Text>
            <Text style={styles.brandSubtitle}>Your journey starts here</Text>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.contentContainer}>
          <View style={styles.curvedTop} />

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Back Button */}
            {step !== 'email' && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {/* Email Step */}
            {step === 'email' && (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Let's get started</Text>
                  <Text style={styles.stepSubtitle}>Sign in or create a new account</Text>
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={onGoogleAuth}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <GoogleIcon />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#A1887F"
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={onEmailSubmit}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onEmailSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Processing...' : 'Continue'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            )}

            {/* Password Step */}
            {step === 'password' && (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>
                    {isSignUp ? 'Create your password' : 'Welcome back!'}
                  </Text>
                  <Text style={styles.stepSubtitle}>{emailAddress}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                      placeholderTextColor="#A1887F"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={onPasswordSubmit}
                      autoFocus
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconContainer}
                      onPress={togglePasswordVisibility}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#8D6E63"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isSignUp && (
                  <View style={styles.passwordHint}>
                    <Text style={styles.passwordHintText}>
                      💡 Use a strong password with letters, numbers, and symbols
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onPasswordSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading
                      ? isSignUp
                        ? 'Creating your account...'
                        : 'Signing you in...'
                      : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                {!isSignUp && (
                // In AuthScreen.tsx, update the forgot password button:
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => router.push('/forgot-password')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
                )}
              </View>
            )}

            {/* Verification Step */}
            {step === 'verification' && (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Check your email</Text>
                  <Text style={styles.stepSubtitle}>
                    We've sent a 6-digit code to{'\n'}
                    <Text style={styles.emailHighlight}>{emailAddress}</Text>
                  </Text>
                </View>

                <View style={styles.otpContainer}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="••••••"
                    placeholderTextColor="#A1887F"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={onVerificationSubmit}
                    autoFocus
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onVerificationSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  heroContainer: {
    height: height * 0.55,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(62, 39, 35, 0.35)',
  },
  brandContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  contentContainer: {
    flex: 1,
    marginTop: -40,
  },
  curvedTop: {
    width: '100%',
    height: 40,
    backgroundColor: '#FFFAF0',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    paddingHorizontal: 28,
    paddingBottom: 0,
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8D6E63',
    marginLeft: 8,
    fontWeight: '500',
  },
  stepContainer: {
    width: '100%',
    flex: 1,
  },
  stepHeader: {
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#8D6E63',
    lineHeight: 22,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#3E2723',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D7CCC8',
  },
  dividerText: {
    fontSize: 13,
    color: '#A1887F',
    marginHorizontal: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#3E2723',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    color: '#3E2723',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eyeIconContainer: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  otpContainer: {
    marginBottom: 20,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 12,
    fontSize: 24,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#3E2723',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 13,
    color: '#A1887F',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: '#6D4C41',
    fontWeight: '600',
  },
  passwordHint: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  passwordHintText: {
    fontSize: 13,
    color: '#6D4C41',
    lineHeight: 18,
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 15,
    color: '#6D4C41',
    fontWeight: '600',
  },
  emailHighlight: {
    color: '#5D4037',
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#A1887F',
  },
  resendLink: {
    fontSize: 14,
    color: '#6D4C41',
    fontWeight: '700',
  },
});