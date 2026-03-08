import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACHIEVEMENTS } from "../utils/gamification";

const { width } = Dimensions.get("window");
// 3 columns, 16px outer padding each side, 4px inter-cell margin each side
const ITEM_SIZE = (width - 32 - 24) / 3;

const CATEGORY = {
  first_watch: "WATCH MILESTONE",
  five_watched: "WATCH MILESTONE",
  ten_watched: "WATCH MILESTONE",
  twentyfive_watched: "WATCH MILESTONE",
  fifty_watched: "WATCH MILESTONE",
  hundred_watched: "WATCH MILESTONE",
  first_list: "WATCHLIST",
  three_lists: "WATCHLIST",
  five_lists: "WATCHLIST",
  first_complete: "WATCHLIST",
  three_complete: "WATCHLIST",
  five_complete: "WATCHLIST",
  streak_3: "STREAK",
  streak_7: "STREAK",
  streak_14: "STREAK",
  streak_30: "STREAK",
  daily_double: "BINGE",
  triple_feature: "BINGE",
  weekly_binge: "BINGE",
  weekly_marathon: "BINGE",
};

const BadgesModal = ({
  visible,
  onClose,
  unlockedAchievements = [],
  colors,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const detailAnim = useRef(new Animated.Value(0)).current;
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      setSelectedBadge(null);
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(detailAnim, {
      toValue: selectedBadge ? 1 : 0,
      useNativeDriver: true,
      tension: 90,
      friction: 13,
    }).start();
  }, [selectedBadge]);

  const renderBadge = ({ item }) => {
    const isUnlocked = unlockedAchievements.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.badgeCell, { opacity: isUnlocked ? 1 : 0.4 }]}
        onPress={() => setSelectedBadge(item)}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.badgeIconBox,
            isUnlocked
              ? {
                  borderColor: "rgba(229,9,20,0.35)",
                  backgroundColor: "rgba(229,9,20,0.06)",
                }
              : {
                  borderColor: "rgba(128,128,128,0.2)",
                  backgroundColor: "rgba(128,128,128,0.03)",
                },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={26}
            color={isUnlocked ? "#E50914" : "rgba(128,128,128,0.5)"}
          />
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons
                name="lock-closed"
                size={11}
                color="rgba(128,128,128,0.6)"
              />
            </View>
          )}
          {isUnlocked && <View style={styles.unlockedCorner} />}
        </View>
        <Text
          style={[
            styles.badgeName,
            { color: isUnlocked ? colors.text : "rgba(128,128,128,0.5)" },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {isUnlocked && <View style={styles.unlockedDot} />}
      </TouchableOpacity>
    );
  };

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const pct =
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const detailIsUnlocked = selectedBadge
    ? unlockedAchievements.includes(selectedBadge.id)
    : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.dismissArea}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card },
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [700, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Red accent bar */}
          <View style={styles.topBar} />

          {/* Header row */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>BADGES</Text>
              <Text style={[styles.headerSub, { color: colors.text }]}>
                {unlockedCount}
                <Text style={{ color: "#E50914" }}>/</Text>
                {totalCount} earned
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{pct}% COMPLETE</Text>

          {/* Badge grid */}
          <FlatList
            data={ACHIEVEMENTS}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={renderBadge}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.row}
          />

          {/* ── Detail panel slides up over the grid ── */}
          {selectedBadge && (
            <Animated.View
              style={[
                styles.detailPanel,
                { backgroundColor: colors.card },
                {
                  transform: [
                    {
                      translateY: detailAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [600, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.topBar} />

              {/* Back button */}
              <TouchableOpacity
                onPress={() => setSelectedBadge(null)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
                <Text style={[styles.backLabel, { color: colors.text }]}>
                  BADGES
                </Text>
              </TouchableOpacity>

              {/* Category chip */}
              <Text style={styles.detailCategory}>
                {CATEGORY[selectedBadge.id] ?? "BADGE"}
              </Text>

              {/* Large icon */}
              <View
                style={[
                  styles.detailIconBox,
                  detailIsUnlocked
                    ? {
                        borderColor: "rgba(229,9,20,0.4)",
                        backgroundColor: "rgba(229,9,20,0.07)",
                      }
                    : {
                        borderColor: "rgba(128,128,128,0.2)",
                        backgroundColor: "rgba(128,128,128,0.05)",
                      },
                ]}
              >
                <Ionicons
                  name={selectedBadge.icon}
                  size={52}
                  color={detailIsUnlocked ? "#E50914" : "rgba(128,128,128,0.5)"}
                />
                {detailIsUnlocked && <View style={styles.detailCorner} />}
              </View>

              {/* Badge title */}
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selectedBadge.title}
              </Text>

              {/* Short description */}
              <Text style={styles.detailDesc}>{selectedBadge.desc}</Text>

              {/* Earned / Locked status tag */}
              <View
                style={[
                  styles.statusTag,
                  detailIsUnlocked
                    ? styles.statusUnlocked
                    : styles.statusLocked,
                ]}
              >
                <Ionicons
                  name={detailIsUnlocked ? "checkmark-circle" : "lock-closed"}
                  size={12}
                  color={detailIsUnlocked ? "#E50914" : "rgba(128,128,128,0.7)"}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: detailIsUnlocked
                        ? "#E50914"
                        : "rgba(128,128,128,0.7)",
                    },
                  ]}
                >
                  {detailIsUnlocked ? "EARNED" : "LOCKED"}
                </Text>
              </View>

              {/* How to earn */}
              <View style={styles.howSection}>
                <Text style={styles.howLabel}>HOW TO EARN</Text>
                <Text style={[styles.howText, { color: colors.text }]}>
                  {selectedBadge.how}
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: "82%",
    overflow: "hidden",
  },
  topBar: {
    height: 3,
    backgroundColor: "#E50914",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    color: "#E50914",
  },
  headerSub: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(229,9,20,0.12)",
    marginHorizontal: 20,
    marginBottom: 5,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E50914",
  },
  progressText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#E50914",
    opacity: 0.5,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: { justifyContent: "flex-start" },
  badgeCell: {
    width: ITEM_SIZE,
    margin: 4,
    alignItems: "center",
  },
  badgeIconBox: {
    width: ITEM_SIZE - 8,
    height: ITEM_SIZE - 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  lockOverlay: {
    position: "absolute",
    bottom: 3,
    right: 3,
  },
  unlockedCorner: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    backgroundColor: "#E50914",
  },
  badgeName: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  unlockedDot: {
    width: 4,
    height: 4,
    backgroundColor: "#E50914",
    marginTop: 4,
  },

  // ── Detail panel ──────────────────────────────────────
  detailPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  backLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  detailCategory: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "#E50914",
    marginBottom: 20,
    marginTop: 4,
  },
  detailIconBox: {
    width: 100,
    height: 100,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  detailCorner: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: "#E50914",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  detailDesc: {
    fontSize: 12,
    color: "rgba(128,128,128,0.75)",
    textAlign: "center",
    letterSpacing: 0.2,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    marginBottom: 28,
  },
  statusUnlocked: {
    borderColor: "rgba(229,9,20,0.3)",
    backgroundColor: "rgba(229,9,20,0.06)",
  },
  statusLocked: {
    borderColor: "rgba(128,128,128,0.2)",
    backgroundColor: "rgba(128,128,128,0.05)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  howSection: {
    width: "100%",
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.12)",
    paddingTop: 20,
  },
  howLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "#E50914",
    marginBottom: 10,
  },
  howText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.85,
  },
});

export default BadgesModal;
