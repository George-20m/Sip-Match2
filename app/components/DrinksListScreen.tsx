// app/components/DrinksListScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import FavoriteButton from './FavoriteButton';

const { width } = Dimensions.get('window');

interface DrinksListScreenProps {
  onBack?: () => void;
  userId?: string;
}

type TemperatureFilter = 'all' | 'hot' | 'cold' | 'frozen';
type CaffeineFilter = 'all' | 'none' | 'low' | 'medium' | 'high';

export default function DrinksListScreen({ onBack, userId }: DrinksListScreenProps) {
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('all');
  const [caffeineFilter, setCaffeineFilter] = useState<CaffeineFilter>('all');
  const [searchCategory, setSearchCategory] = useState<string | null>(null);

  // Fetch all drinks from Convex
  const allDrinks = useQuery(api.drinks.getAllDrinks);

  // Get unique categories
  const categories = allDrinks
    ? Array.from(new Set(allDrinks.map(d => d.category)))
    : [];

  // Filter drinks based on selected filters
  const filteredDrinks = allDrinks?.filter(drink => {
    const matchesTemperature = temperatureFilter === 'all' || drink.temperature === temperatureFilter;
    const matchesCaffeine = caffeineFilter === 'all' || drink.caffeineLevel === caffeineFilter;
    const matchesCategory = !searchCategory || drink.category === searchCategory;
    
    return matchesTemperature && matchesCaffeine && matchesCategory;
  });

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

  const renderDrinkCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.drinkCard} activeOpacity={0.7}>
      {/* Favorite Button */}
      {userId && (
        <FavoriteButton 
          userId={userId}
          drinkId={item._id as Id<"drinks">}
          style={styles.favoriteButtonPosition}
        />
      )}
      
      <View style={styles.drinkHeader}>
        <View style={styles.drinkTitleContainer}>
          <Text style={styles.drinkName}>{item.name}</Text>
          <Text style={styles.drinkNameArabic}>{item.nameArabic}</Text>
        </View>
        {item.seasonal && (
          <View style={styles.seasonalBadge}>
            <MaterialCommunityIcons name="snowflake" size={12} color="#8B5CF6" />
            <Text style={styles.seasonalText}>Seasonal</Text>
          </View>
        )}
      </View>

      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
      </View>

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
              {item.caffeineLevel ? item.caffeineLevel.charAt(0).toUpperCase() + item.caffeineLevel.slice(1) : 'N/A'}
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
      </View>

      {/* Dietary badges */}
      <View style={styles.dietaryBadges}>
        {item.vegan && (
          <View style={[styles.dietaryBadge, { backgroundColor: '#10B98115' }]}>
            <MaterialCommunityIcons name="leaf" size={12} color="#10B981" />
            <Text style={[styles.dietaryText, { color: '#10B981' }]}>Vegan</Text>
          </View>
        )}
        {item.vegetarian && !item.vegan && (
          <View style={[styles.dietaryBadge, { backgroundColor: '#8B5CF615' }]}>
            <MaterialCommunityIcons name="food-variant" size={12} color="#8B5CF6" />
            <Text style={[styles.dietaryText, { color: '#8B5CF6' }]}>Vegetarian</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!allDrinks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8D6E63" />
        <Text style={styles.loadingText}>Loading drinks...</Text>
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
        <Text style={styles.headerTitle}>All Drinks</Text>
        <View style={styles.headerRight}>
          <Text style={styles.drinkCount}>{filteredDrinks?.length || 0} drinks</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            onPress={() => setSearchCategory(null)}
            style={[
              styles.categoryChip,
              !searchCategory && styles.categoryChipActive
            ]}
          >
            <Text style={[
              styles.categoryChipText,
              !searchCategory && styles.categoryChipTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => setSearchCategory(category)}
              style={[
                styles.categoryChip,
                searchCategory === category && styles.categoryChipActive
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                searchCategory === category && styles.categoryChipTextActive
              ]}>
                {getCategoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Temperature & Caffeine Filters */}
      <View style={styles.quickFilters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Temperature:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'hot', 'cold', 'frozen'] as TemperatureFilter[]).map(temp => (
              <TouchableOpacity
                key={temp}
                onPress={() => setTemperatureFilter(temp)}
                style={[
                  styles.filterChip,
                  temperatureFilter === temp && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  temperatureFilter === temp && styles.filterChipTextActive
                ]}>
                  {temp === 'all' ? 'All' : temp.charAt(0).toUpperCase() + temp.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Caffeine:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'none', 'low', 'medium', 'high'] as CaffeineFilter[]).map(caff => (
              <TouchableOpacity
                key={caff}
                onPress={() => setCaffeineFilter(caff)}
                style={[
                  styles.filterChip,
                  caffeineFilter === caff && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  caffeineFilter === caff && styles.filterChipTextActive
                ]}>
                  {caff === 'all' ? 'All' : caff.charAt(0).toUpperCase() + caff.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Drinks List */}
      <FlatList
        data={filteredDrinks}
        renderItem={renderDrinkCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="coffee-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No drinks found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
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
    width: 40,
  },
  drinkCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8D6E63',
    textAlign: 'right',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  categoryScroll: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#8D6E63',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D4C41',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  quickFilters: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E6D3',
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4C41',
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5E6D3',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#8D6E63',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D4C41',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  favoriteButtonPosition: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 1,
  },
  drinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 48,
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
    marginTop: 4,
  },
});