// app/components/FavoritesScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const { width } = Dimensions.get('window');

interface FavoritesScreenProps {
  onBack: () => void;
  userId: string;
}

export default function FavoritesScreen({ onBack, userId }: FavoritesScreenProps) {
  const favorites = useQuery(api.favorites.getUserFavorites, { userId });
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  const getCaffeineIcon = (level?: string) => {
    switch (level) {
      case 'high': return 'lightning-bolt';
      case 'medium': return 'flash';
      case 'low': return 'weather-night';
      case 'none': return 'sleep';
      default: return 'help-circle-outline';
    }
  };

  const getCaffeineColor = (level?: string) => {
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

  const getSweetnessLabel = (level?: number) => {
    if (!level) return 'Not sweet';
    if (level <= 2) return 'Slightly sweet';
    if (level <= 5) return 'Medium sweet';
    if (level <= 7) return 'Sweet';
    return 'Very sweet';
  };

  const getCategoryLabel = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleToggleFavorite = async (drinkId: Id<"drinks">) => {
    try {
      await toggleFavorite({ userId, drinkId });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderDrinkCard = ({ item }: { item: any }) => {
    const drink = item.drink;
    
    return (
      <View style={styles.drinkCard}>
        {/* Favorite Button */}
        <TouchableOpacity
          onPress={() => handleToggleFavorite(drink._id)}
          style={styles.favoriteButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="heart" 
            size={24} 
            color="#F472B6" 
          />
        </TouchableOpacity>

        <View style={styles.drinkHeader}>
          <View style={styles.drinkTitleContainer}>
            <Text style={styles.drinkName}>{drink.name}</Text>
            <Text style={styles.drinkNameArabic}>{drink.nameArabic}</Text>
          </View>
          {drink.seasonal && (
            <View style={styles.seasonalBadge}>
              <MaterialCommunityIcons name="snowflake" size={12} color="#8B5CF6" />
              <Text style={styles.seasonalText}>Seasonal</Text>
            </View>
          )}
        </View>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryLabel(drink.category)}</Text>
        </View>

        <View style={styles.drinkDetails}>
          {/* Temperature */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: `${getTemperatureColor(drink.temperature)}15` }]}>
              <MaterialCommunityIcons 
                name={getTemperatureIcon(drink.temperature) as any} 
                size={18} 
                color={getTemperatureColor(drink.temperature)} 
              />
            </View>
            <View>
              <Text style={styles.detailLabel}>Temperature</Text>
              <Text style={styles.detailValue}>{drink.temperature.charAt(0).toUpperCase() + drink.temperature.slice(1)}</Text>
            </View>
          </View>

          {/* Caffeine Level */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: `${getCaffeineColor(drink.caffeineLevel)}15` }]}>
              <MaterialCommunityIcons 
                name={getCaffeineIcon(drink.caffeineLevel) as any} 
                size={18} 
                color={getCaffeineColor(drink.caffeineLevel)} 
              />
            </View>
            <View>
              <Text style={styles.detailLabel}>Caffeine</Text>
              <Text style={styles.detailValue}>
                {drink.caffeineLevel ? drink.caffeineLevel.charAt(0).toUpperCase() + drink.caffeineLevel.slice(1) : 'N/A'}
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
              <Text style={styles.detailValue}>{getSweetnessLabel(drink.sweetnessLevel)}</Text>
            </View>
          </View>
        </View>

        {/* Dietary badges */}
        <View style={styles.dietaryBadges}>
          {drink.vegan && (
            <View style={[styles.dietaryBadge, { backgroundColor: '#10B98115' }]}>
              <MaterialCommunityIcons name="leaf" size={12} color="#10B981" />
              <Text style={[styles.dietaryText, { color: '#10B981' }]}>Vegan</Text>
            </View>
          )}
          {drink.vegetarian && !drink.vegan && (
            <View style={[styles.dietaryBadge, { backgroundColor: '#8B5CF615' }]}>
              <MaterialCommunityIcons name="food-variant" size={12} color="#8B5CF6" />
              <Text style={[styles.dietaryText, { color: '#8B5CF6' }]}>Vegetarian</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!favorites) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
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
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.headerRight}>
          <Text style={styles.favoritesCount}>{favorites.length} drinks</Text>
        </View>
      </View>

      {/* Favorites List */}
      <FlatList
        data={favorites}
        renderItem={renderDrinkCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the heart icon on any drink to add it to your favorites!
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
  favoritesCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
    textAlign: 'right',
  },
  listContent: {
    padding: 24,
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
  favoriteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4F4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  drinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 40,
  },
  drinkTitleContainer: {
    flex: 1,
  },
  drinkName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: 2,
  },
  drinkNameArabic: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  seasonalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  seasonalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
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