import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import RetryState from "../components/shared/RetryState";
import NewsRow from "../components/news/NewsRow";
import NewsFilters from "../components/news/NewsFilters";
import useNews from "../hooks/useNews";

const NewsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [sort, setSort] = useState("trending");
  const [region, setRegion] = useState("all");
  const { items, status, loadingMore, refreshing, loadMore, refresh, retry } = useNews({ sort, region });

  const renderItem = useCallback(
    ({ item }) => <NewsRow item={item} colors={colors} showBuzz={sort === "trending" || sort === "week"} />,
    [colors, sort],
  );
  const sep = useCallback(() => <View style={[styles.sep, { backgroundColor: colors.border }]} />, [colors.border]);

  let body;
  if (status === "loading") {
    body = <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />;
  } else if (status === "error") {
    body = <RetryState message="Couldn't load the news." onRetry={retry} />;
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        ItemSeparatorComponent={sep}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.text }]}>
            {sort === "today" ? "Nothing new in the last 24 hours." : "No stories here yet."}
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : items.length ? (
            <Text style={[styles.credit, { color: colors.text }]}>Headlines link to the publishers' own sites.</Text>
          ) : null
        }
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={navigation.goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>News</Text>
        </View>
      </View>

      <NewsFilters sort={sort} region={region} onSort={setSort} onRegion={setRegion} />
      {body}
    </View>
  );
};
export default NewsScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12, gap: 4 },
  back: { padding: 4 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, opacity: 0.55, marginTop: 1 },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  empty: { textAlign: "center", opacity: 0.6, marginTop: 60, paddingHorizontal: 30 },
  credit: { textAlign: "center", opacity: 0.4, fontSize: 12, padding: 24 },
});
