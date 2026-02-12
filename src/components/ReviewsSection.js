import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.8;
const CARD_MARGIN = 10;

// Helper function to get rating color based on value
const getRatingColor = (rating) => {
  if (rating >= 8) return "#10b981"; // Green for excellent (8-10)
  if (rating >= 6.5) return "#84cc16"; // Light green for good (6.5-8)
  if (rating >= 5) return "#f59e0b"; // Amber for average (5-6.5)
  if (rating >= 3.5) return "#f97316"; // Orange for below average (3.5-5)
  return "#ef4444"; // Red for poor (0-3.5)
};

const ReviewsSection = React.memo(
  ({ reviews, loading, colors, theme, totalReviews, onLoadMore }) => {
    const [selectedReview, setSelectedReview] = useState(null);

    console.log("📝 ReviewsSection render:", {
      loading,
      reviewCount: reviews?.length || 0,
      totalReviews,
    });

    if (loading) {
      return (
        <View style={[styles.reviewsSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            User Reviews
          </Text>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      );
    }

    if (!reviews || reviews.length === 0) {
      return (
        <View style={styles.reviewsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, paddingHorizontal: 15 },
            ]}
          >
            User Reviews
          </Text>
          <View
            style={[
              styles.emptyReviewsContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor:
                    theme === "dark"
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)",
                },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={32}
                color={theme === "dark" ? "#667eea" : "#764ba2"}
              />
            </View>
            <Text style={[styles.emptyReviewsTitle, { color: colors.text }]}>
              No Reviews Yet
            </Text>
          </View>
        </View>
      );
    }

    const openReviewModal = (review) => {
      setSelectedReview(review);
    };

    const closeReviewModal = () => {
      setSelectedReview(null);
    };

    const openTMDBReview = (url) => {
      if (url) {
        Linking.openURL(url).catch((err) =>
          console.error("Failed to open TMDB review:", err),
        );
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const truncateText = (text, maxLength = 200) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    return (
      <View style={styles.reviewsSection}>
        <View style={[styles.reviewsHeader, { paddingHorizontal: 15 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            User Reviews
          </Text>
          {totalReviews > 0 && (
            <Text style={[styles.reviewCount, { color: colors.text }]}>
              {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </Text>
          )}
        </View>

        {/* Horizontal Scroll Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          snapToAlignment="start"
        >
          {reviews.map((review, index) => {
            const needsTruncation = review.content.length > 200;

            return (
              <View
                key={review.id}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor:
                      theme === "dark" ? "rgba(255,255,255,0.05)" : "#f9fafb",
                    width: CARD_WIDTH,
                    marginLeft: index === 0 ? 15 : CARD_MARGIN,
                    marginRight:
                      index === reviews.length - 1 ? 15 : CARD_MARGIN,
                  },
                ]}
              >
                {/* Review Header */}
                <View style={styles.reviewHeader}>
                  <View style={styles.authorInfo}>
                    <Ionicons
                      name="person-circle-outline"
                      size={24}
                      color={colors.text}
                    />
                    <View style={styles.authorDetails}>
                      <Text
                        style={[styles.authorName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {review.author}
                      </Text>
                      <Text style={[styles.reviewDate, { color: colors.text }]}>
                        {formatDate(review.created_at)}
                      </Text>
                    </View>
                  </View>

                  {review.author_details?.rating && (
                    <View
                      style={[
                        styles.ratingBadge,
                        {
                          backgroundColor: getRatingColor(
                            review.author_details.rating,
                          ),
                        },
                      ]}
                    >
                      <Ionicons name="star" size={12} color="#fff" />
                      <Text style={styles.ratingText}>
                        {review.author_details.rating}/10
                      </Text>
                    </View>
                  )}
                </View>

                {/* Review Content */}
                <Text
                  style={[styles.reviewContent, { color: colors.text }]}
                  numberOfLines={6}
                >
                  {truncateText(review.content)}
                </Text>

                {/* Review Actions */}
                <View style={styles.reviewActions}>
                  {needsTruncation && (
                    <TouchableOpacity
                      onPress={() => openReviewModal(review)}
                      style={styles.actionButton}
                    >
                      <Text
                        style={[styles.actionText, { color: colors.primary }]}
                      >
                        Read more
                      </Text>
                      <Ionicons
                        name="expand-outline"
                        size={14}
                        color={colors.primary}
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => openTMDBReview(review.url)}
                    style={styles.actionButton}
                  >
                    <Text
                      style={[styles.actionText, { color: colors.primary }]}
                    >
                      TMDB
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={colors.primary}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Load More Card */}
          {onLoadMore && reviews.length < totalReviews && (
            <TouchableOpacity
              style={[
                styles.loadMoreCard,
                {
                  backgroundColor:
                    theme === "dark" ? "rgba(255,255,255,0.05)" : "#f9fafb",
                  borderColor: colors.primary,
                  width: CARD_WIDTH,
                  marginLeft: CARD_MARGIN,
                  marginRight: 15,
                },
              ]}
              onPress={onLoadMore}
            >
              <Ionicons
                name="add-circle-outline"
                size={40}
                color={colors.primary}
              />
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                Load More Reviews
              </Text>
              <Text style={[styles.loadMoreSubtext, { color: colors.text }]}>
                {reviews.length} of {totalReviews}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Full Review Modal */}
        <Modal
          visible={selectedReview !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={closeReviewModal}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
                },
              ]}
            >
              {/* Modal Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.modalAuthorInfo}>
                  <Ionicons
                    name="person-circle-outline"
                    size={28}
                    color={colors.text}
                  />
                  <View style={styles.authorDetails}>
                    <Text
                      style={[styles.modalAuthorName, { color: colors.text }]}
                    >
                      {selectedReview?.author}
                    </Text>
                    <Text style={[styles.reviewDate, { color: colors.text }]}>
                      {selectedReview?.created_at &&
                        formatDate(selectedReview.created_at)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={closeReviewModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Rating Badge */}
              {selectedReview?.author_details?.rating && (
                <View style={styles.modalRatingContainer}>
                  <View
                    style={[
                      styles.modalRatingBadge,
                      {
                        backgroundColor: getRatingColor(
                          selectedReview.author_details.rating,
                        ),
                      },
                    ]}
                  >
                    <Ionicons name="star" size={16} color="#fff" />
                    <Text style={styles.modalRatingText}>
                      {selectedReview.author_details.rating}/10
                    </Text>
                  </View>
                </View>
              )}

              {/* Scrollable Review Content */}
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
              >
                <Text
                  style={[styles.modalReviewContent, { color: colors.text }]}
                >
                  {selectedReview?.content}
                </Text>
              </ScrollView>

              {/* Modal Footer */}
              <View
                style={[styles.modalFooter, { borderTopColor: colors.border }]}
              >
                <TouchableOpacity
                  style={[
                    styles.tmdbButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => openTMDBReview(selectedReview?.url)}
                >
                  <Text style={styles.tmdbButtonText}>View on TMDB</Text>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

ReviewsSection.displayName = "ReviewsSection";

const styles = StyleSheet.create({
  reviewsSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewCount: {
    fontSize: 14,
    opacity: 0.6,
  },
  noReviews: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
    paddingHorizontal: 15,
  },
  emptyReviewsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyReviewsSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 20,
  },
  carouselContainer: {
    paddingVertical: 10,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 16,
    height: 260,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorDetails: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 8,
  },
  ratingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadMoreCard: {
    borderRadius: 16,
    padding: 16,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  loadMoreSubtext: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalAuthorName: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  modalRatingContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  modalRatingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalReviewContent: {
    fontSize: 15,
    lineHeight: 24,
    paddingBottom: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  tmdbButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  tmdbButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ReviewsSection;
