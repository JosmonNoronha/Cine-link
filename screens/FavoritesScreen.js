import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useCustomTheme } from '../contexts/ThemeContext'; // Added missing import
import { getFavorites } from '../utils/storage';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const { colors } = useTheme();
  const { theme } = useCustomTheme(); // Already added, just ensuring it’s used

  useEffect(() => {
    const fetchFavorites = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
    };
    const unsubscribe = navigation.addListener('focus', fetchFavorites);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Details', { imdbID: item.imdbID })}
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}
    >
      {item.Poster !== 'N/A' && (
        <Image source={{ uri: item.Poster }} style={styles.poster} />
      )}
      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]}>{item.Title}</Text>
        <Text style={[styles.year, { color: colors.text }]}>{item.Year}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.container}>
        <Text style={[styles.header, { color: colors.text }]}>
          Your Favorites
        </Text>

        {favorites.length === 0 ? (
          <Text style={[styles.noFavorites, { color: colors.text }]}>
            You haven't added any favorites yet.
          </Text>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.imdbID}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noFavorites: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 8,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  year: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default FavoritesScreen;