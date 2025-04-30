import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const ShimmerMovieCard = () => {
  const { colors, dark } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: dark ? '#1a1a1a' : '#f0f0f0' }]}>
      <ShimmerPlaceholder
        style={styles.poster}
        shimmerColors={
          dark
            ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
            : ['#e0e0e0', '#f5f5f5', '#e0e0e0']
        }
      />
      <View style={styles.details}>
        <ShimmerPlaceholder
          style={styles.title}
          shimmerColors={
            dark
              ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
              : ['#e0e0e0', '#f5f5f5', '#e0e0e0']
          }
        />
        <ShimmerPlaceholder
          style={styles.subtitle}
          shimmerColors={
            dark
              ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
              : ['#e0e0e0', '#f5f5f5', '#e0e0e0']
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    elevation: 2,
  },
  poster: {
    width: 80,
    height: 110,
    borderRadius: 10,
  },
  details: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    width: '75%',
    height: 20,
    borderRadius: 6,
    marginBottom: 10,
  },
  subtitle: {
    width: '50%',
    height: 16,
    borderRadius: 6,
  },
});

export default ShimmerMovieCard;
