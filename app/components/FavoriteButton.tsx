// app/components/FavoriteButton.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface FavoriteButtonProps {
  userId: string;
  drinkId: Id<"drinks">;
  style?: ViewStyle;
  size?: number;
}

export default function FavoriteButton({ 
  userId, 
  drinkId, 
  style,
  size = 24 
}: FavoriteButtonProps) {
  const isFavorited = useQuery(
    api.favorites.isFavorited,
    userId && drinkId ? { userId, drinkId } : 'skip'
  );
  
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  const handleToggle = async () => {
    try {
      await toggleFavorite({ userId, drinkId });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      style={[styles.favoriteButton, style]}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons 
        name={isFavorited ? "heart" : "heart-outline"} 
        size={size} 
        color={isFavorited ? "#F472B6" : "#8D6E63"} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});