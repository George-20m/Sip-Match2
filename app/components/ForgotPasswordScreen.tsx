// app/components/ForgotPasswordScreen.tsx
import { useSignIn } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const { width, height } = Dimensions.get('window');

type ResetStep = 'email' | 'verification' | 'newPassword';

const ArrowLeft = () => (
  <Text style={{ fontSize: 20, color: '#8D6E63', fontWeight: '600' }}>←</Text>
);

export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const onEmailSubmit = async () => {
    try {
      if (!isLoaded) {
        Alert.alert('Loading', 'Please wait, initialization in progress...');
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
        // Create password reset request
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: emailAddress,
        });

        console.log('✅ Password reset email sent');
        setStep('verification');
      } catch (err: any) {
        console.error('Email submission error:', err);
        
        if (
          err.errors?.[0]?.code === 'form_identifier_not_found' ||
          err.errors?.[0]?.message?.toLowerCase().includes('not found')
        ) {
          Alert.alert(
            'Email Not Found',
            'No account exists with this email address. Please check your email or sign up for a new account.'
          );
        } else {
          Alert.alert(
            'Error',
            err.errors?.[0]?.message || 'Failed to send reset code. Please try again.'
          );
        }
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      Alert.alert(
        'Unexpected Error',
        'Something went wrong. Please try again.'
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const onVerificationSubmit = async () => {
    try {
      if (!isLoaded) {
        Alert.alert('Loading', 'Please wait...');
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
        // Verify the code - just checking if it's valid
        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code: verificationCode,
        });

        console.log('✅ Code verified successfully');
        setStep('newPassword');
      } catch (err: any) {
        console.error('Verification error:', err);
        Alert.alert(
          'Verification Failed',
          err.errors?.[0]?.message || 'Invalid code. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Unexpected verification error:', error);
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

  const onPasswordResetSubmit = async () => {
    try {
      if (!isLoaded) {
        Alert.alert('Loading', 'Please wait...');
        return;
      }

      if (!newPassword.trim()) {
        Alert.alert('Oops!', 'Please enter your new password');
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match');
        return;
      }

      setLoading(true);

      try {
        // Reset the password
        const result = await signIn.resetPassword({
          password: newPassword,
        });

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          
          Alert.alert(
            'Success!',
            'Your password has been reset successfully.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/home'),
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to reset password. Please try again.');
        }
      } catch (err: any) {
        console.error('Password reset error:', err);
        Alert.alert(
          'Reset Failed',
          err.errors?.[0]?.message || 'Failed to reset password. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Unexpected password reset error:', error);
      Alert.alert(
        'Unexpected Error',
        'Something went wrong. Please try again.'
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    try {
      if (step === 'verification') {
        setStep('email');
        setVerificationCode('');
      } else if (step === 'newPassword') {
        setStep('verification');
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        // Go back to auth screen
        router.back();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to go back. Please try again.');
    }
  };

  const handleResendCode = async () => {
    try {
      if (!isLoaded) {
        Alert.alert('Loading', 'Please wait...');
        return;
      }

      setLoading(true);

      try {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: emailAddress,
        });
        
        Alert.alert('Success!', 'Verification code sent to your email');
      } catch (err: any) {
        Alert.alert(
          'Error',
          err.errors?.[0]?.message || 'Failed to resend code. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      Alert.alert('Unexpected Error', 'Failed to resend code. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
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
              <Text style={styles.logoText}>🔐</Text>
            </View>
            <Text style={styles.brandTitle}>Reset Password</Text>
            <Text style={styles.brandSubtitle}>We'll help you get back in</Text>
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
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Email Step */}
            {step === 'email' && (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Forgot your password?</Text>
                  <Text style={styles.stepSubtitle}>
                    Enter your email and we'll send you a code to reset your password
                  </Text>
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
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onEmailSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Sending code...' : 'Send Reset Code'}
                  </Text>
                </TouchableOpacity>
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
                    {loading ? 'Verifying...' : 'Verify Code'}
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

            {/* New Password Step */}
            {step === 'newPassword' && (
              <View style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Create new password</Text>
                  <Text style={styles.stepSubtitle}>
                    Choose a strong password for your account
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#A1887F"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      returnKeyType="next"
                      autoFocus
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconContainer}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#8D6E63"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#A1887F"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={onPasswordResetSubmit}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconContainer}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#8D6E63"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.passwordHint}>
                  <Text style={styles.passwordHintText}>
                    💡 Use a strong password with letters, numbers, and symbols
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onPasswordResetSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Resetting password...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
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