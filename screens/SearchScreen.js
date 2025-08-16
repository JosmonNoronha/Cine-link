import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useCustomTheme } from '../contexts/ThemeContext';
import { searchMovies } from '../services/api';
import MovieCard from '../components/MovieCard';
import ShimmerMovieCard from '../components/ShimmerMovieCard';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  const performSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log('Searching for:', searchQuery);
        const data = await searchMovies(searchQuery);
        console.log('Search results:', data); // Debug: Check for imdbID
        const filteredData = filterType === 'all'
          ? data
          : data.filter(item => item.Type.toLowerCase() === filterType);
        setResults(filteredData);
        setError(null);
      } catch (err) {
        setResults([]);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [filterType]
  );

  useEffect(() => {
    performSearch(query);
    return () => performSearch.cancel();
  }, [query, performSearch]);

  const toggleFilter = (type) => {
    setFilterType(type);
    if (query.trim()) performSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
  };

  const handleManualSearch = () => {
    if (query.trim()) {
      performSearch.cancel();
      performSearch(query);
    }
  };

  const renderShimmer = () => (
    <FlatList
      data={Array(5).fill({})}
      keyExtractor={(_, index) => `shimmer-${index}`}
      renderItem={() => <ShimmerMovieCard />}
      contentContainerStyle={styles.listContent}
    />
  );

  const renderItem = useCallback(({ item }) => (
    <MovieCard
      movie={item}
      onPress={() => navigation.navigate('Details', { imdbID: item.imdbID })}
    />
  ), [navigation]);

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Search Movies & Series</Text>
        <View style={styles.header}>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
                borderColor: isFocused
                  ? theme === 'dark' ? '#1e88e5' : '#1976d2'
                  : theme === 'dark' ? '#444' : '#ddd',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isFocused ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: isFocused ? 8 : 4,
              },
            ]}
          >
            <TextInput
              placeholder="Search movies or series..."
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={handleManualSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
              style={[styles.input, { color: colors.text }]}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={theme === 'dark' ? '#888' : '#757575'}
                />
              </TouchableOpacity>
            )}
            {isLoading ? (
              <ActivityIndicator size="small" color={theme === 'dark' ? '#1e88e5' : '#1976d2'} style={styles.loading} />
            ) : (
              <TouchableOpacity onPress={handleManualSearch} style={styles.innerSearchButton}>
                <Ionicons
                  name="search"
                  size={24}
                  color={theme === 'dark' ? '#1e88e5' : '#1976d2'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'all' && styles.activeFilter,
              { backgroundColor: filterType === 'all' ? (theme === 'dark' ? '#1e88e5' : '#bbdefb') : colors.card },
            ]}
            onPress={() => toggleFilter('all')}
          >
            <Text style={[styles.filterText, { color: filterType === 'all' ? '#fff' : colors.text }]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'movie' && styles.activeFilter,
              { backgroundColor: filterType === 'movie' ? (theme === 'dark' ? '#1e88e5' : '#bbdefb') : colors.card },
            ]}
            onPress={() => toggleFilter('movie')}
          >
            <Text style={[styles.filterText, { color: filterType === 'movie' ? '#fff' : colors.text }]}>
              Movies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'series' && styles.activeFilter,
              { backgroundColor: filterType === 'series' ? (theme === 'dark' ? '#1e88e5' : '#bbdefb') : colors.card },
            ]}
            onPress={() => toggleFilter('series')}
          >
            <Text style={[styles.filterText, { color: filterType === 'series' ? '#fff' : colors.text }]}>
              Series
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
        ) : isLoading ? (
          renderShimmer()
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.imdbID}-${index}`} // Fallback to imdbID + index
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {query.trim() ? 'No results found' : 'Enter a title to search'}
              </Text>
            }
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
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  header: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  loading: {
    marginLeft: 10,
  },
  innerSearchButton: {
    padding: 5,
    marginLeft: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
  },
  activeFilter: {
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.9,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default SearchScreen;