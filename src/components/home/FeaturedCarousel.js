import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Animated, FlatList, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { getTitle, getYear, getKind, backdropUri } from "./mediaMeta";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const SLOT = 24;
const INTERVAL = 5000;

const FeaturedCard = React.memo(({ item, width, onOpen }) => {
  const handle = useCallback(() => onOpen(item), [onOpen, item]);
  const year = getYear(item);
  return (
    <Pressable onPress={handle} style={[styles.card, { width }]}>
      <Image
        source={{ uri: backdropUri(item, "w780") }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <LinearGradient colors={["transparent", "rgba(4,7,16,0.85)"]} style={styles.overlay}>
        <View style={styles.badge}>
          <Ionicons name="flame" size={15} color="#FF6B35" />
          <Text style={styles.badgeText}>Trending</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {getTitle(item)}
        </Text>
        <Text style={styles.sub}>
          {getKind(item)}
          {year ? `  ${year}` : ""}
        </Text>
      </LinearGradient>
    </Pressable>
  );
});
FeaturedCard.displayName = "FeaturedCard";

const FeaturedCarousel = ({ items, width, onOpen }) => {
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const isFocused = useIsFocused();
  const count = items.length;

  // One interval for the lifetime of the carousel (not recreated on every slide)
  useEffect(() => {
    if (count <= 1 || !isFocused) return undefined;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, INTERVAL);
    return () => clearInterval(id);
  }, [count, isFocused, width]);

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: true,
    }),
  ).current;

  const onBeginDrag = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const onMomentumEnd = useCallback(
    (e) => {
      indexRef.current = Math.round(e.nativeEvent.contentOffset.x / width);
      pausedRef.current = false;
    },
    [width],
  );

  const renderItem = useCallback(
    ({ item }) => <FeaturedCard item={item} width={width} onOpen={onOpen} />,
    [width, onOpen],
  );

  const getItemLayout = useCallback(
    (_, index) => ({ length: width, offset: width * index, index }),
    [width],
  );

  if (!count) return null;

  const translateX = scrollX.interpolate({
    inputRange: items.map((_, i) => i * width),
    outputRange: items.map((_, i) => i * SLOT),
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrap}>
      <AnimatedFlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.imdbID}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={onBeginDrag}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        windowSize={3}
      />
      {count > 1 && (
        <View style={styles.pagination}>
          <View style={[styles.rail, { width: count * SLOT }]}>
            <Animated.View style={[styles.pill, { transform: [{ translateX }] }]} />
            {items.map((item) => (
              <View key={item.imdbID} style={styles.slot}>
                <View style={styles.dot} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default React.memo(FeaturedCarousel);

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginTop: 20, marginBottom: 22 },
  card: { borderRadius: 18, overflow: "hidden", backgroundColor: "#0f1720" },
  image: { width: "100%", aspectRatio: 16 / 9, minHeight: 210, maxHeight: 300 },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 52 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,53,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: { color: "#FF6B35", fontSize: 12, fontWeight: "700" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", lineHeight: 31, marginBottom: 6 },
  sub: { color: "rgba(236,241,247,0.92)", fontSize: 14, fontWeight: "500" },
  pagination: { alignItems: "center", marginTop: 12 },
  rail: { height: 8, flexDirection: "row", alignItems: "center" },
  slot: { width: SLOT, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(125,142,164,0.45)" },
  pill: {
    position: "absolute",
    top: 0,
    left: 3,
    width: 18,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1e88e5",
  },
});