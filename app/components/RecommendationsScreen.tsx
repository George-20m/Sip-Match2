// app/components/RecommendationsScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MLDrinkRecommendation } from '../services/mlService';

const { width } = Dimensions.get('window');

interface RecommendationsScreenProps {
  recommendations: MLDrinkRecommendation[];
  context: {
    mood: string;
    weather: string;
    temperature: number;
    time_of_day: string;
    has_song: boolean;
  };
  onBack: () => void;
  selectedMood: string;
  selectedSong?: string | null;
}

export default function RecommendationsScreen({
  recommendations,
  context,
  onBack,
  selectedMood,
  selectedSong,
}: RecommendationsScreenProps) {
  const getCaffeineIcon = (level: string) => {
    switch (level) {
      case 'high': return 'lightning-bolt';
      case 'medium': return 'flash';
      case 'low': return 'weather-night';
      case 'none': return 'sleep';
      default: return 'help-circle-outline';
    }
  };

  const getCaffeineColor = (level: string) => {
    switch (level) {
      case 'high': return '#DC2626';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      case 'none': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const getTemperatureIcon = (temp: string) => {
    switch (temp) {
      case 'hot': return 'fire';
      case 'cold': return 'snowflake';
      case 'frozen': return 'ice-cream';
      default: return 'temperature-celsius';
    }
  };

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'hot': return '#DC2626';
      case 'cold': return '#3B82F6';
      case 'frozen': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getSweetnessLabel = (level: number) => {
    if (level === 0) return 'Not sweet';
    if (level <= 2) return 'Slightly sweet';
    if (level <= 5) return 'Medium sweet';
    if (level <= 7) return 'Sweet';
    return 'Very sweet';
  };

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

  const getScoreColor = (score: number) => {
    if (score >= 100) return '#10B981';
    if (score >= 90) return '#34D399';
    if (score >= 80) return '#60A5FA';
    return '#93C5FD';
  };

  const renderDrinkCard = ({ item, index }: { item: MLDrinkRecommendation; index: number }) => (
    <View style={styles.drinkCard}>
      {/* Ranking Badge */}
      <View style={[
        styles.rankBadge,
        index === 0 && styles.rankBadgeFirst,
        index === 1 && styles.rankBadgeSecond,
        index === 2 && styles.rankBadgeThird,
      ]}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>

      {/* Score Badge */}
      <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(item.score)}20` }]}>
        <MaterialCommunityIcons name="star" size={14} color={getScoreColor(item.score)} />
        <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
          {item.score}% Match
        </Text>
      </View>

      <View style={styles.drinkHeader}>
        <View style={styles.drinkTitleContainer}>
          <Text style={styles.drinkName}>{item.name}</Text>
          <Text style={styles.drinkNameArabic}>{item.nameArabic}</Text>
        </View>
      </View>

      {/* Reasons for Recommendation */}
      <View style={styles.reasonsContainer}>
        <Text style={styles.reasonsTitle}>Why we recommend this:</Text>
        {item.reasons.map((reason, idx) => (
          <View key={idx} style={styles.reasonItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Flavor Profile */}
      {item.flavorProfile && item.flavorProfile.length > 0 && (
        <View style={styles.flavorContainer}>
          <Text style={styles.flavorTitle}>Flavor Notes:</Text>
          <View style={styles.flavorTags}>
            {item.flavorProfile.map((flavor, idx) => (
              <View key={idx} style={styles.flavorTag}>
                <Text style={styles.flavorText}>{flavor}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Drink Details */}
      <View style={styles.drinkDetails}>
        {/* Temperature */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: `${getTemperatureColor(item.temperature)}15` }]}>
            <MaterialCommunityIcons 
              name={getTemperatureIcon(item.temperature) as any} 
              size={18} 
              color={getTemperatureColor(item.temperature)} 
            />
          </View>
          <View>
            <Text style={styles.detailLabel}>Temperature</Text>
            <Text style={styles.detailValue}>{item.temperature.charAt(0).toUpperCase() + item.temperature.slice(1)}</Text>
          </View>
        </View>

        {/* Caffeine Level */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: `${getCaffeineColor(item.caffeineLevel)}15` }]}>
            <MaterialCommunityIcons 
              name={getCaffeineIcon(item.caffeineLevel) as any} 
              size={18} 
              color={getCaffeineColor(item.caffeineLevel)} 
            />
          </View>
          <View>
            <Text style={styles.detailLabel}>Caffeine</Text>
            <Text style={styles.detailValue}>
              {item.caffeineLevel.charAt(0).toUpperCase() + item.caffeineLevel.slice(1)}
            </Text>
          </View>
        </View>

        {/* Sweetness Level */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#FACC1515' }]}>
            <MaterialCommunityIcons name="candy" size={18} color="#FACC15" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Sweetness</Text>
            <Text style={styles.detailValue}>{getSweetnessLabel(item.sweetnessLevel)}</Text>
          </View>
        </View>

        {/* Intensity */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#F4743B15' }]}>
            <MaterialCommunityIcons name="speedometer" size={18} color="#F4743B" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Intensity</Text>
            <Text style={styles.detailValue}>{item.intensity}/5</Text>
          </View>
        </View>
      </View>

      {/* Dietary Badge */}
      {item.vegan && (
        <View style={styles.dietaryBadges}>
          <View style={[styles.dietaryBadge, { backgroundColor: '#10B98115' }]}>
            <MaterialCommunityIcons name="leaf" size={12} color="#10B981" />
            <Text style={[styles.dietaryText, { color: '#10B981' }]}>Vegan</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#3E2723" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Your Perfect Matches</Text>
          <Text style={styles.headerSubtitle}>{recommendations.length} drinks found</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Context Card */}
      <View style={styles.contextCard}>
        <View style={styles.contextHeader}>
          <MaterialCommunityIcons name="information" size={20} color="#8D6E63" />
          <Text style={styles.contextTitle}>Matched for you</Text>
        </View>
        <View style={styles.contextDetails}>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Mood:</Text>
            <Text style={styles.contextValue}>{getMoodEmoji(selectedMood)} {selectedMood}</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Weather:</Text>
            <Text style={styles.contextValue}>{context.temperature}°C, {context.weather}</Text>
          </View>
          <View style={styles.contextItem}>
            <Text style={styles.contextLabel}>Time:</Text>
            <Text style={styles.contextValue}>{context.time_of_day}</Text>
          </View>
          {selectedSong && (
            <View style={styles.contextItem}>
              <Text style={styles.contextLabel}>Music:</Text>
              <Text style={styles.contextValue} numberOfLines={1}>🎵 {selectedSong}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Recommendations List */}
      <FlatList
        data={recommendations}
        renderItem={renderDrinkCard}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <MaterialCommunityIcons name="trophy" size={24} color="#F59E0B" />
            <Text style={styles.listHeaderText}>Ranked by AI match score</Text>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E2723',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F5E6D3',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3E2723',
  },
  contextDetails: {
    gap: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8D6E63',
    width: 80,
  },
  contextValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E2723',
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D6E63',
  },
  listContent: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  drinkCard: {
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
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#8D6E63',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  rankBadgeFirst: {
    backgroundColor: '#F59E0B',
  },
  rankBadgeSecond: {
    backgroundColor: '#9CA3AF',
  },
  rankBadgeThird: {
    backgroundColor: '#D97706',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  drinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  drinkTitleContainer: {
    flex: 1,
  },
  drinkName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 2,
  },
  drinkNameArabic: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  reasonsContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
  },
  flavorContainer: {
    marginBottom: 12,
  },
  flavorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 6,
  },
  flavorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flavorTag: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  flavorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  drinkDetails: {
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3E2723',
  },
  dietaryBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dietaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dietaryText: {
    fontSize: 11,
    fontWeight: '700',
  },
});