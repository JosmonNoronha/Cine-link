import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const ShimmerMovieCard = () => {
  const { colors, dark } = useTheme();

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <LinearGradient
          colors={[colors.card, colors.background]}
          style={styles.cardGradient}
        />
        <View style={styles.content}>
          <ShimmerPlaceholder
            style={styles.poster}
            shimmerColors={
              dark
                ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
                : ['#e0e0e0', '#f5f5f5', '#e0e0e0']
            }
          />
          <View style={styles.info}>
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
          <ShimmerPlaceholder
            style={styles.favButton}
            shimmerColors={
              dark
                ? ['#2a2a2a', '#3a3a3a', '#2a2a2a']
                : ['#e0e0e0', '#f5f5f5', '#e0e0e0']
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 8,
    marginHorizontal: 12,
  },
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 10,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    width: '80%',
    height: 22, // Approximate height for fontSize: 17, lineHeight: 22
    borderRadius: 6,
    marginBottom: 6,
  },
  subtitle: {
    width: '50%',
    height: 16, // Approximate height for fontSize: 13
    borderRadius: 6,
  },
  favButton: {
    width: 40, // Approximate size for icon (24) + padding (8 + 8)
    height: 40,
    borderRadius: 12,
    marginLeft: 8,
  },
});

export default ShimmerMovieCard;