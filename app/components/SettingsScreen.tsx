// app/components/SettingsScreen.tsx
import { useAuth, useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../convex/_generated/api';

import * as Location from 'expo-location';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { signOut, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  
  // Convex queries and mutations
  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [userLocation, setUserLocation] = useState<string>('Cairo, Egypt');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Initialize user in Convex if not found
  useEffect(() => {
    const initializeUser = async () => {
      if (!clerkUser) return;

      // If convexUser is undefined (not null, undefined means still loading)
      if (convexUser === undefined) {
        return; // Still loading
      }

      // If convexUser is null, user doesn't exist in Convex yet
      if (convexUser === null) {
        console.log('User not found in Convex, creating...');
        try {
          const firstName = clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
          
          // CHANGED: Set image to null instead of using Clerk's image
          await getOrCreateUser({
            clerkId: clerkUser.id,
            email: email,
            userName: firstName,
            authMethod: clerkUser.externalAccounts?.[0]?.provider === 'google' ? 'google' : 'email',
            hasPassword: clerkUser.passwordEnabled || false,
            image: null, // Start with null to show letter avatar
          });

          console.log('✅ User created in Convex');
        } catch (error) {
          console.error('❌ Error creating user in Convex:', error);
        }
      }

      setIsInitializing(false);
    };

    initializeUser();
  }, [clerkUser, convexUser]);

  // Update editedName when convexUser loads
  useEffect(() => {
    if (convexUser) {
      setEditedName(convexUser.userName);
    } else if (clerkUser) {
      // Fallback to Clerk data
      setEditedName(clerkUser.firstName || clerkUser.username || 'User');
    }
  }, [convexUser, clerkUser]);

  // Fetch user location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setIsLoadingLocation(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = currentLocation.coords;
        
        const locationData = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (locationData.length > 0) {
          const place = locationData[0];
          const city = place.city || place.district || place.region || 'Unknown';
          const country = place.country || '';
          setUserLocation(`${city}, ${country}`);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocation();
  }, []);

  // Listen for auth state changes and navigate to auth screen when signed out
  useEffect(() => {
    if (isSignedIn === false) {
      router.replace('/auth');
    }
  }, [isSignedIn]);

  useEffect(() => {
    // Start animations only when not initializing
    if (!isInitializing) {
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
    }
  }, [isInitializing]);

  // Use Convex data if available, fallback to Clerk
  const userName = convexUser?.userName || clerkUser?.firstName || clerkUser?.username || 'User';
  const userEmail = convexUser?.email || clerkUser?.emailAddresses[0]?.emailAddress || 'user@example.com';
  // CHANGED: Only use convexUser image, not Clerk's
  const userImage = convexUser?.image || null;
  const authMethod = convexUser?.authMethod || (clerkUser?.externalAccounts?.[0]?.provider === 'google' ? 'google' : 'email');
  const hasPassword = convexUser?.hasPassword ?? clerkUser?.passwordEnabled ?? false;
  const avatarLetter = (isEditingName ? editedName : userName).charAt(0).toUpperCase();
  const hasNameChanged = editedName.trim() !== userName && editedName.trim().length > 0;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditName = () => {
    setIsEditingName(true);
    setEditedName(userName);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(userName);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (editedName.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return;
    }

    if (!clerkUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsSaving(true);

    try {
      // Update in Convex
      await updateUserProfile({
        clerkId: clerkUser.id,
        userName: editedName.trim(),
      });

      // Also update in Clerk
      await clerkUser.update({
        firstName: editedName.trim(),
      });

      Alert.alert('Success', 'Your name has been updated successfully!');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true, // ADD THIS LINE - Request base64 encoding
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const asset = result.assets[0];

        try {
          // CHANGE THIS SECTION - Use base64 instead of URI
          if (!asset.base64) {
            throw new Error('Failed to get base64 image data');
          }

          // Update Clerk profile image with base64
          await clerkUser?.setProfileImage({ 
            file: `data:image/jpeg;base64,${asset.base64}` 
          });

          // Wait a moment for Clerk to process
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Get the new image URL from Clerk
          const newImageUrl = clerkUser?.imageUrl;

          // Update in Convex
          if (clerkUser?.id && newImageUrl) {
            await updateUserProfile({
              clerkId: clerkUser.id,
              image: newImageUrl,
            });
          }

          Alert.alert('Success', 'Profile picture updated!');
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploadingImage(true);

              // Update in Convex to null
              if (clerkUser?.id) {
                await updateUserProfile({
                  clerkId: clerkUser.id,
                  image: null,
                });
              }

              // Note: Clerk doesn't easily support removing profile image
              // The Convex database will show null and display the letter avatar

              Alert.alert('Success', 'Profile picture removed!');
            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
            } finally {
              setIsUploadingImage(false);
            }
          },
        },
      ]
    );
  };

  const handleSpotifyConnect = () => {
    Alert.alert(
      'Spotify Integration 🎵',
      'Connect your Spotify account to automatically detect your mood from your music!\n\nThis feature is coming soon.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Your privacy is important to us. We collect and use your data to provide personalized drink recommendations based on your mood and preferences.',
      [{ text: 'OK' }]
    );
  };

  const ToggleSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) => (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={[styles.switch, value && styles.switchActive]}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </TouchableOpacity>
  );

  // Show loading while initializing
  if (isInitializing || !clerkUser) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={{ marginTop: 16, color: '#8D6E63', fontSize: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#8D6E63" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              onPress={handleImagePick}
              activeOpacity={0.8}
              disabled={isUploadingImage}
            >
              {userImage ? (
                <Image source={{ uri: userImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                </View>
              )}
              {isUploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              <View style={styles.editImageBadge}>
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{isEditingName ? editedName : userName}</Text>
              {/* CHANGED: Only show "Remove picture" if user has uploaded an image */}
              {userImage && (
                <TouchableOpacity onPress={handleRemoveImage} style={{ marginTop: 4 }}>
                  <Text style={styles.removeImageText}>Remove picture</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* User Information */}
          <View style={styles.infoSection}>
            {/* Name Section - Editable */}
            <View style={[
              styles.infoItem,
              isEditingName && styles.editingItem,
              isEditingName && styles.noBorder
            ]}>
              <View style={styles.infoIconContainer}>
                <MaterialCommunityIcons name="account-outline" size={20} color="#8D6E63" />
              </View>
              <View style={styles.infoTextContainer}>
                <View style={styles.infoHeader}>
                  <Text style={styles.infoLabel}>Name</Text>
                  {!isEditingName && (
                    <TouchableOpacity onPress={handleEditName}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditingName ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your name"
                    placeholderTextColor="#8D6E63"
                    autoFocus
                  />
                ) : (
                  <Text style={styles.infoValue}>{userName}</Text>
                )}
              </View>
            </View>

            {/* Edit Actions */}
            {isEditingName && (
              <View style={styles.editActionsWrapper}>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!hasNameChanged || isSaving) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSaveName}
                    disabled={!hasNameChanged || isSaving}
                    activeOpacity={0.7}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Email - Read Only */}
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#8D6E63" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userEmail}</Text>
              </View>
            </View>

            {/* Location - Read Only */}
            <View style={[styles.infoItem, styles.noBorder]}>
              <View style={styles.infoIconContainer}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color="#8D6E63" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Location</Text>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#8D6E63" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                ) : (
                  <Text style={styles.infoValue}>{userLocation}</Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Preferences Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.cardTitle}>Preferences</Text>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#EDE9FE' }]}>
                <MaterialCommunityIcons name="weather-night" size={24} color="#7C3AED" />
              </View>
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Dark Mode</Text>
                <Text style={styles.preferenceSubtext}>Switch to dark theme</Text>
              </View>
            </View>
            <ToggleSwitch value={darkMode} onValueChange={setDarkMode} />
          </View>

          <View style={[styles.preferenceItem, styles.noBorder]}>
            <View style={styles.preferenceContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <MaterialCommunityIcons name="bell-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Notifications</Text>
                <Text style={styles.preferenceSubtext}>Daily drink suggestions</Text>
              </View>
            </View>
            <ToggleSwitch value={notifications} onValueChange={setNotifications} />
          </View>
        </Animated.View>

        {/* Connected Services Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.cardTitle}>Connected Services</Text>

          <TouchableOpacity
            style={[styles.preferenceItem, styles.noBorder]}
            onPress={handleSpotifyConnect}
            activeOpacity={0.7}
          >
            <View style={styles.preferenceContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="spotify" size={24} color="#1DB954" />
              </View>
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Spotify</Text>
                <Text style={styles.preferenceSubtext}>
                  {spotifyConnected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8D6E63" />
          </TouchableOpacity>
        </Animated.View>

        {/* Account Actions */}
        <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePrivacyPolicy}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={22} color="#3E2723" />
            <Text style={styles.actionButtonText}>Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#8D6E63" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#DC2626" />
            <Text style={[styles.actionButtonText, styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version */}
        <Text style={styles.versionText}>Sip&Match v1.0.0</Text>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F5E6D3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E2723',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#8D6E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3E2723', // Changed to requested color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8D6E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#8D6E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8D6E63',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3E2723',
  },
  removeImageText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: '#F5E6D3',
    paddingTop: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  editingItem: {
    paddingBottom: 16,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8D6E63',
    fontWeight: '500',
  },
  editText: {
    fontSize: 14,
    color: '#D4A574',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#3E2723',
    fontWeight: '600',
  },
  editInput: {
    fontSize: 16,
    color: '#3E2723',
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8D6E63',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  editActionsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
    paddingBottom: 12,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 56,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5E6D3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5E6D3',
  },
  cancelButtonText: {
    color: '#3E2723',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8D6E63',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D0C4BD',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceText: {
    marginLeft: 12,
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 2,
  },
  preferenceSubtext: {
    fontSize: 13,
    color: '#8D6E63',
  },
  switch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#8D6E63',
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F5E6D3',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E2723',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    borderColor: '#F5E6D3',
    backgroundColor: '#fff7f7ff',
  },
  logoutText: {
    color: '#DC2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 24,
    marginBottom: 16,
    fontWeight: '500',
  },
});