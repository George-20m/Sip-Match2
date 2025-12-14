import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getMoodBasedTracks, searchTracks, SpotifyTrack } from '../services/spotifyService';

const { width, height } = Dimensions.get('window');

interface SpotifyMusicSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectTrack: (track: SpotifyTrack) => void;
  selectedMood?: string | null;
}

export default function SpotifyMusicSelector({
  visible,
  onClose,
  onSelectTrack,
  selectedMood,
}: SpotifyMusicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  useEffect(() => {
    // Load mood-based tracks when modal opens
    if (visible && selectedMood && !isSearchMode) {
      loadMoodBasedTracks();
    }

    // Cleanup sound when modal closes
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, selectedMood]);

  useEffect(() => {
    // Configure audio session
    configureAudio();
  }, []);

  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error configuring audio:', error);
    }
  };

  const loadMoodBasedTracks = async () => {
    if (!selectedMood) return;

    setIsLoading(true);
    try {
      const moodTracks = await getMoodBasedTracks(selectedMood);
      setTracks(moodTracks);
    } catch (error) {
      console.error('Error loading mood tracks:', error);
      Alert.alert('Error', 'Failed to load music. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a song name or artist.');
      return;
    }

    setIsLoading(true);
    setIsSearchMode(true);
    try {
      const searchResults = await searchTracks(searchQuery);
      setTracks(searchResults);
    } catch (error) {
      console.error('Error searching tracks:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = async (track: SpotifyTrack) => {
    try {
      // Stop current sound if playing
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingTrackId(null);
      }

      // If clicking the same track, just stop
      if (playingTrackId === track.id) {
        return;
      }

      // Check if preview is available
      if (!track.preview_url) {
        Alert.alert('No Preview', 'This song doesn\'t have a preview available.');
        return;
      }

      // Load and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingTrackId(track.id);

      // Stop when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingTrackId(null);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing preview:', error);
      Alert.alert('Playback Error', 'Failed to play preview.');
    }
  };

  const handleSelectTrack = async (track: SpotifyTrack) => {
    // Stop any playing audio
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingTrackId(null);
    }

    onSelectTrack(track);
    onClose();
  };

  const handleClose = async () => {
    // Stop any playing audio
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingTrackId(null);
    }
    
    setSearchQuery('');
    setIsSearchMode(false);
    onClose();
  };

  const renderTrackItem = ({ item }: { item: SpotifyTrack }) => {
    const isPlaying = playingTrackId === item.id;
    const albumImage = item.album.images[0]?.url;
    const artistNames = item.artists.map((a) => a.name).join(', ');

    return (
      <TouchableOpacity
        style={styles.trackItem}
        onPress={() => handleSelectTrack(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackContent}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            {albumImage ? (
              <Image source={{ uri: albumImage }} style={styles.albumArt} />
            ) : (
              <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
                <MaterialCommunityIcons name="music" size={24} color="#8D6E63" />
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {artistNames}
            </Text>
          </View>

          {/* Play Button */}
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={() => playPreview(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={isPlaying ? '#1DB954' : '#8D6E63'}
            />
          </TouchableOpacity>

          {/* Preview indicator */}
          {!item.preview_url && (
            <View style={styles.noPreviewBadge}>
              <Text style={styles.noPreviewText}>No preview</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={28} color="#3E2723" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Select Your Mood Song</Text>
            <Text style={styles.headerSubtitle}>
              {isSearchMode ? 'Search results' : `${selectedMood || 'mood'} vibes`}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#8D6E63" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs or artists..."
              placeholderTextColor="#A1887F"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#8D6E63" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Back to mood button */}
        {isSearchMode && selectedMood && (
          <TouchableOpacity
            style={styles.backToMoodButton}
            onPress={() => {
              setIsSearchMode(false);
              setSearchQuery('');
              loadMoodBasedTracks();
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color="#8D6E63" />
            <Text style={styles.backToMoodText}>Back to {selectedMood} mood</Text>
          </TouchableOpacity>
        )}

        {/* Track List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Loading music...</Text>
          </View>
        ) : tracks.length > 0 ? (
          <FlatList
            data={tracks}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="music-off" size={64} color="#D7CCC8" />
            <Text style={styles.emptyText}>No songs found</Text>
            <Text style={styles.emptySubtext}>Try searching for something else</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  closeButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3E2723',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F5E6D3',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#3E2723',
  },
  searchButton: {
    backgroundColor: '#3E2723',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backToMoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FFF4E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  backToMoodText: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  trackItem: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5E6D3',
    overflow: 'hidden',
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  albumArtContainer: {
    marginRight: 12,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  albumArtPlaceholder: {
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 13,
    color: '#8D6E63',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  noPreviewBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFE6E6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noPreviewText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D32F2F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#8D6E63',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6D4C41',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A1887F',
    marginTop: 8,
  },
});