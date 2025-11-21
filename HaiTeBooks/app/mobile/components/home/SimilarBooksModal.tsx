import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";
import BookDetail from "./BookDetail";

type Book = {
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

interface SimilarBooksModalProps {
  visible: boolean;
  bookId: number | null;
  bookTitle?: string;
  onClose: () => void;
  onBookClick?: (bookId: number) => void;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " đ";

const SimilarBooksModal: React.FC<SimilarBooksModalProps> = ({
  visible,
  bookId,
  bookTitle,
  onClose,
  onBookClick,
}) => {
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookDetail, setShowBookDetail] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && bookId) {
      fetchRecommendations();
    } else {
      // Reset khi đóng modal
      setRecommendations([]);
      setError(null);
    }
  }, [visible, bookId]);

  const fetchRecommendations = async () => {
    if (!bookId) return;

    setLoading(true);
    setError(null);

    try {
      console.log("🎯 Bắt đầu gợi ý sách tương tự cho bookId:", bookId);

      const response = await axiosInstance.get<Book[]>(
        `/ai/recommend/${bookId}`,
        {
          params: {
            limit: 10,
          },
          timeout: 15000,
        }
      );

      console.log(
        "✅ Gợi ý thành công, số kết quả:",
        response.data?.length || 0
      );

      if (response.data && response.data.length > 0) {
        // Enrich books với reviews
        const booksWithReviews = await Promise.all(
          response.data.map((book) => enrichBookWithReviews(book))
        );
        setRecommendations(booksWithReviews);
      } else {
        setRecommendations([]);
        setError(
          "Không tìm thấy sách tương tự. Có thể embeddings chưa được generate cho sách này hoặc không có sách tương tự đủ độ tương đồng."
        );
      }
    } catch (err: any) {
      console.error("❌ Lỗi khi gợi ý:", err);
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message || err?.message;

      let errorMessage = "Lỗi khi gợi ý sách. Vui lòng thử lại.";

      if (status === 404) {
        errorMessage =
          "Endpoint AI recommend chưa được cấu hình. Vui lòng liên hệ admin.";
      } else if (status === 500) {
        errorMessage =
          "Lỗi server. Có thể embeddings chưa được generate. Vui lòng thử lại sau.";
      } else if (apiMessage) {
        errorMessage = apiMessage;
      }

      setError(errorMessage);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function để enrich book với reviews
  const enrichBookWithReviews = async (book: Book): Promise<Book> => {
    try {
      const reviewsResp = await axiosInstance.get<any[]>(
        `/reviews/book/${book.id}`
      );
      const reviews = Array.isArray(reviewsResp.data) ? reviewsResp.data : [];

      const approvedReviews = reviews.filter((r: any) =>
        r?.status ? r.status === "approved" : true
      );

      const reviewCount = approvedReviews.length;
      const averageRating =
        reviewCount > 0
          ? approvedReviews.reduce(
              (acc, curr) => acc + Number(curr.rating || 0),
              0
            ) / reviewCount
          : 0;

      return {
        ...book,
        averageRating,
        reviewCount,
      };
    } catch (reviewErr) {
      // Nếu không fetch được reviews, trả về book với default values
      return {
        ...book,
        averageRating: 0,
        reviewCount: 0,
      };
    }
  };

  const openBookDetail = (id: number) => {
    // Nếu có callback từ parent, sử dụng callback đó
    if (onBookClick) {
      onClose();
      setTimeout(() => {
        onBookClick(id);
      }, 300);
    } else {
      // Fallback: mở BookDetail modal trong component này
      onClose();
      setTimeout(() => {
        setSelectedBookId(id);
        setShowBookDetail(true);
      }, 300);
    }
  };

  const renderBookCard = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookCard}
      activeOpacity={0.8}
      onPress={() => openBookDetail(item.id)}
    >
      <View style={styles.bookImageContainer}>
        <Image
          source={{
            uri: item.imageUrl || "https://via.placeholder.com/300x400",
          }}
          style={styles.bookImage}
          resizeMode="cover"
        />
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookCategory} numberOfLines={1}>
          {item.categoryName || "Khác"}
        </Text>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.author && (
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        )}
        {/* Reviews section */}
        <View style={styles.bookReviewsRow}>
          {item.reviewCount && item.reviewCount > 0 ? (
            <>
              <Text style={styles.bookRating}>
                ★{" "}
                {Number.isFinite(item.averageRating)
                  ? item.averageRating!.toFixed(1)
                  : "0.0"}
              </Text>
              <Text style={styles.bookReviewCount}>({item.reviewCount})</Text>
            </>
          ) : (
            <Text style={styles.bookNoReviews}>Chưa có đánh giá</Text>
          )}
        </View>
        <View style={styles.bookMeta}>
          <Text style={styles.bookPrice}>{formatPrice(item.price)}</Text>
          <Text style={styles.bookStock}>Còn {item.stock}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Early return if not visible or no bookId
  if (!visible || !bookId) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        hardwareAccelerated={true}
      >
        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          <View
            style={[styles.container, { paddingTop: insets.top }]}
            pointerEvents="box-none"
          >
            {/* Header */}
            <View style={styles.header} pointerEvents="auto">
              <TouchableOpacity
                style={styles.backButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Sách tương tự</Text>
                {bookTitle && (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {bookTitle}
                  </Text>
                )}
              </View>
              <View style={styles.backButtonPlaceholder} />
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C92127" />
                <Text style={styles.loadingText}>
                  Đang tìm sách tương tự...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchRecommendations}
                >
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : recommendations.length > 0 ? (
              <View style={styles.content} pointerEvents="auto">
                <Text style={styles.resultsTitle}>
                  Tìm thấy {recommendations.length} sách tương tự
                </Text>
                <FlatList
                  data={recommendations}
                  renderItem={renderBookCard}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  Không tìm thấy sách tương tự
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <BookDetail
        visible={showBookDetail}
        bookId={selectedBookId}
        onClose={() => {
          setShowBookDetail(false);
          setSelectedBookId(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "98%",
    minHeight: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 44,
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
    width: 36,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bookCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  bookImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#F3F4F6",
  },
  bookImage: {
    width: "100%",
    height: "100%",
  },
  bookInfo: {
    padding: 12,
    gap: 6,
  },
  bookCategory: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minHeight: 36,
  },
  bookAuthor: {
    fontSize: 12,
    color: "#6B7280",
  },
  bookReviewsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minHeight: 18,
  },
  bookRating: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "600",
    marginRight: 4,
  },
  bookReviewCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  bookNoReviews: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  bookMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  bookPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C92127",
  },
  bookStock: {
    fontSize: 11,
    color: "#6B7280",
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

export default SimilarBooksModal;
