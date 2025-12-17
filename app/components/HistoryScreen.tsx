// app/components/HistoryScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { MLDrinkRecommendation } from '../services/mlService';
import FavoriteButton from './FavoriteButton';
import RecommendationsScreen from './RecommendationsScreen';

interface HistoryScreenProps {
  onBack: () => void;
  userId: string;
}

export default function HistoryScreen({ onBack, userId }: HistoryScreenProps) {
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Fetch user's history from Convex
  const historyData = useQuery(
    api.recommendations.getUserHistoryGrouped,
    userId ? { userId } : 'skip'
  );

  const getMoodEmoji = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'happy': return '😊';
      case 'calm': return '😌';
      case 'energetic': return '⚡';
      case 'tired': return '😴';
      case 'romantic': return '💕';
      case 'focused': return '🎯';
      default: return '😊';
    }
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower === 'clear') return 'weather-sunny';
    if (lower.includes('cloud')) return 'weather-cloudy';
    if (lower.includes('rain')) return 'weather-rainy';
    if (lower.includes('storm')) return 'weather-lightning';
    return 'weather-partly-cloudy';
  };

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay.toLowerCase()) {
      case 'morning': return 'weather-sunset-up';
      case 'afternoon': return 'weather-sunny';
      case 'evening': return 'weather-sunset-down';
      case 'night': return 'weather-night';
      default: return 'clock-outline';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSessionPress = (session: any) => {
    setSelectedSession(session);
  };

  const handleBackFromRecommendations = () => {
    setSelectedSession(null);
  };

  // Convert history session to ML recommendation format
  const convertToMLFormat = (session: any): MLDrinkRecommendation[] => {
    return session.recommendations.map((rec: any, index: number) => ({
      name: rec.drink?.name || 'Unknown',
      nameArabic: rec.drink?.nameArabic || '',
      category: rec.drink?.category || '',
      temperature: rec.drink?.temperature || '',
      caffeineLevel: rec.drink?.caffeineLevel || 'none',
      sweetnessLevel: rec.drink?.sweetnessLevel || 0,
      score: 100 - (index * 5), // Approximate scores
      reasons: rec.drink?.bestForMoods?.slice(0, 3) || [],
      flavorProfile: rec.drink?.flavorProfile || [],
      vegan: rec.drink?.vegan || false,
      intensity: rec.drink?.intensity || 3,
    }));
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const context = item.context;
    const drinksCount = item.recommendations.length;
    const firstDrink = item.recommendations[0]?.drink;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => handleSessionPress(item)}
        activeOpacity={0.7}
      >
        {/* Favorite Button */}
        {firstDrink && userId && (
          <FavoriteButton 
            userId={userId}
            drinkId={firstDrink._id as Id<"drinks">}
            style={styles.favoriteButtonPosition}
            size={20}
          />
        )}
        
        {/* Header */}
        <View style={styles.historyHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
            <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
          </View>
          <View style={styles.drinksCountBadge}>
            <MaterialCommunityIcons name="coffee" size={14} color="#8D6E63" />
            <Text style={styles.drinksCountText}>{drinksCount}</Text>
          </View>
        </View>

        {/* Context Info */}
        <View style={styles.contextRow}>
          <View style={styles.contextItem}>
            <Text style={styles.contextEmoji}>{getMoodEmoji(context.mood)}</Text>
            <Text style={styles.contextLabel}>{context.mood}</Text>
          </View>

          <View style={styles.contextDivider} />

          <View style={styles.contextItem}>
            <MaterialCommunityIcons 
              name={getWeatherIcon(context.weatherCondition) as any} 
              size={18} 
              color="#8D6E63" 
            />
            <Text style={styles.contextLabel}>{context.temperature}°C</Text>
          </View>

          <View style={styles.contextDivider} />

          <View style={styles.contextItem}>
            <MaterialCommunityIcons 
              name={getTimeIcon(context.timeOfDay) as any} 
              size={18} 
              color="#8D6E63" 
            />
            <Text style={styles.contextLabel}>{context.timeOfDay}</Text>
          </View>
        </View>

        {/* Top Drinks Preview */}
        <View style={styles.drinksPreview}>
          <Text style={styles.previewTitle}>Top recommendations:</Text>
          {item.recommendations.slice(0, 3).map((rec: any, index: number) => (
            <View key={index} style={styles.drinkPreviewItem}>
              <View style={styles.rankDot}>
                <Text style={styles.rankDotText}>{index + 1}</Text>
              </View>
              <Text style={styles.drinkPreviewName} numberOfLines={1}>
                {rec.drink?.name || 'Unknown'}
              </Text>
            </View>
          ))}
          {drinksCount > 3 && (
            <Text style={styles.moreText}>+{drinksCount - 3} more</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Show recommendations screen if session selected
  if (selectedSession) {
    return (
      <RecommendationsScreen
        recommendations={convertToMLFormat(selectedSession)}
        context={{
          mood: selectedSession.context.mood,
          weather: selectedSession.context.weatherCondition,
          temperature: selectedSession.context.temperature,
          time_of_day: selectedSession.context.timeOfDay,
          has_song: false,
        }}
        onBack={handleBackFromRecommendations}
        selectedMood={selectedSession.context.mood}
        selectedSong={null}
        userId={userId}
      />
    );
  }

  if (!historyData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#3E2723" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.headerRight}>
          <Text style={styles.sessionCount}>{historyData.length} sessions</Text>
        </View>
      </View>

      {/* History List */}
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.timestamp.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No history yet</Text>
            <Text style={styles.emptySubtext}>
              Get your first drink recommendation to start building your history!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
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
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3E2723',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
  },
  sessionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
    textAlign: 'right',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F5E6D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  favoriteButtonPosition: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 1,
    width: 32,
    height: 32,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2723',
  },
  timeText: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 2,
  },
  drinksCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  drinksCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E63',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F5E6D3',
    marginBottom: 12,
  },
  contextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contextEmoji: {
    fontSize: 18,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
  },
  contextDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F5E6D3',
  },
  drinksPreview: {
    gap: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 4,
  },
  drinkPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8D6E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drinkPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});