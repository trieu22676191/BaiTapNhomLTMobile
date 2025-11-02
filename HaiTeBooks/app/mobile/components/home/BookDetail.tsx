import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";
import BuyNowButton from "./BuyNowButton";

interface BookDetailProps {
  visible: boolean;
  bookId: number | null;
  onClose: () => void;
}

type BookDetail = {
  id: number;
  title: string;
  author?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  categoryName?: string;
  averageRating?: number;
  reviewCount?: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " đ";

const BookDetail: React.FC<BookDetailProps> = ({
  visible,
  bookId,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && bookId) {
      fetchBookDetail();
    }
  }, [visible, bookId]);

  const fetchBookDetail = async () => {
    if (!bookId) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch book details
      const bookResp = await axiosInstance.get<BookDetail>(`/books/${bookId}`);
      const bookData = bookResp.data;

      // Fetch reviews
      try {
        const reviewsResp = await axiosInstance.get<any>(
          `/reviews/book/${bookId}`
        );
        const reviewsData = reviewsResp.data;

        let reviewCount = 0;
        let averageRating = 0;

        if (Array.isArray(reviewsData)) {
          reviewCount = reviewsData.length;
          const sum = reviewsData.reduce((acc: number, r: any) => {
            const n = Number(r?.rating);
            return acc + (Number.isFinite(n) ? n : 0);
          }, 0);
          averageRating = reviewCount > 0 ? sum / reviewCount : 0;
        } else if (reviewsData && typeof reviewsData === "object") {
          reviewCount =
            reviewsData.reviewCount ??
            reviewsData.count ??
            reviewsData.totalReviews ??
            0;
          averageRating =
            reviewsData.averageRating ??
            reviewsData.avgRating ??
            reviewsData.ratingAverage ??
            reviewsData.average ??
            0;
        }

        setBook({
          ...bookData,
          averageRating,
          reviewCount,
        });
      } catch (reviewErr) {
        // Nếu không fetch được reviews, chỉ hiển thị book info
        setBook({
          ...bookData,
          averageRating: 0,
          reviewCount: 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching book detail:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải thông tin sách"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !bookId) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chi tiết sách</Text>
            <View style={styles.backButtonPlaceholder} />
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C92127" />
              <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchBookDetail}
              >
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : book ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Book Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: book.imageUrl || "https://via.placeholder.com/300x400",
                  }}
                  style={styles.bookImage}
                  resizeMode="cover"
                />
              </View>

              {/* Book Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.category}>
                  {book.categoryName || "Khác"}
                </Text>
                <Text style={styles.title}>{book.title}</Text>
                {book.author && (
                  <Text style={styles.author}>Tác giả: {book.author}</Text>
                )}

                {/* Rating */}
                {book.reviewCount && book.reviewCount > 0 ? (
                  <View style={styles.ratingContainer}>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={20} color="#FFB800" />
                      <Text style={styles.rating}>
                        {Number.isFinite(book.averageRating)
                          ? book.averageRating!.toFixed(1)
                          : "0.0"}
                      </Text>
                      <Text style={styles.reviewCount}>
                        ({book.reviewCount} đánh giá)
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noReviews}>Chưa có đánh giá</Text>
                )}

                {/* Price and Stock */}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatPrice(book.price)}</Text>
                  <View style={styles.stockContainer}>
                    <Ionicons name="cube-outline" size={16} color="#10B981" />
                    <Text style={styles.stock}>Còn {book.stock} cuốn</Text>
                  </View>
                </View>

                {/* Description */}
                {book.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionTitle}>Mô tả sách</Text>
                    <Text style={styles.description}>{book.description}</Text>
                  </View>
                )}

                {/* Barcode */}
                {book.barcode && (
                  <View style={styles.barcodeContainer}>
                    <Text style={styles.barcodeLabel}>Mã sách:</Text>
                    <Text style={styles.barcode}>{book.barcode}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                  <BuyNowButton
                    bookId={book.id}
                    bookTitle={book.title}
                    stock={book.stock}
                  />
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#C92127",
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  bookImage: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    padding: 16,
    gap: 12,
  },
  category: {
    fontSize: 12,
    color: "#C92127",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 28,
  },
  author: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  ratingContainer: {
    paddingVertical: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  reviewCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  noReviews: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: "#C92127",
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stock: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  descriptionContainer: {
    paddingTop: 12,
    gap: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    textAlign: "justify",
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  barcodeLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  barcode: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "monospace",
  },
  actionContainer: {
    paddingTop: 16,
  },
});

export default BookDetail;
