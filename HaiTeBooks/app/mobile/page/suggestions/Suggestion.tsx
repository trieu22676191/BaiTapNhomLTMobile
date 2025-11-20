import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BookDetail from "../../components/home/BookDetail";
import axiosInstance from "../../config/axiosConfig";

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

type TabType = "search" | "recommend";

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " đ";

const Suggestion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [recommendLoading, setRecommendLoading] = useState<boolean>(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const [showBookDetail, setShowBookDetail] = useState(false);
  const [selectedBookDetailId, setSelectedBookDetailId] = useState<
    number | null
  >(null);

  // Load danh sách sách để chọn
  useEffect(() => {
    const fetchAllBooks = async () => {
      try {
        const response = await axiosInstance.get<Book[]>("/books");
        const books = response.data || [];

        // Fetch reviews cho mỗi sách
        const booksWithReviews = await Promise.all(
          books.map(async (book) => {
            try {
              const reviewsResp = await axiosInstance.get<any[]>(
                `/reviews/book/${book.id}`
              );
              const reviews = Array.isArray(reviewsResp.data)
                ? reviewsResp.data
                : [];

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
              // Nếu không fetch được reviews, set default
              return {
                ...book,
                averageRating: 0,
                reviewCount: 0,
              };
            }
          })
        );

        setAllBooks(booksWithReviews);
      } catch (err) {
        console.error("Lỗi khi tải danh sách sách:", err);
      }
    };
    fetchAllBooks();
  }, []);

  // Tìm kiếm semantic với fallback về tìm kiếm thông thường
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    const query = searchQuery.trim();

    try {
      console.log("🔍 Bắt đầu tìm kiếm AI với query:", query);

      // Thử tìm kiếm AI trước
      try {
        const response = await axiosInstance.get<Book[]>(`/ai/search`, {
          params: {
            q: query,
            limit: 20,
          },
          timeout: 15000, // Tăng timeout cho AI search
        });

        console.log(
          "✅ AI Search thành công, số kết quả:",
          response.data?.length || 0
        );

        if (response.data && response.data.length > 0) {
          // Enrich books với reviews
          const booksWithReviews = await Promise.all(
            response.data.map((book) => enrichBookWithReviews(book))
          );
          setSearchResults(booksWithReviews);
          return;
        }
      } catch (aiError: any) {
        console.warn(
          "⚠️ AI Search thất bại, thử fallback:",
          aiError?.response?.status,
          aiError?.message
        );

        // Nếu lỗi 404 hoặc 500, có thể do endpoint chưa có hoặc embeddings chưa được generate
        if (
          aiError?.response?.status === 404 ||
          aiError?.response?.status === 500
        ) {
          console.log("🔄 Chuyển sang tìm kiếm thông thường...");

          // Fallback: Tìm kiếm thông thường trong danh sách sách
          const filteredBooks = allBooks.filter((book) => {
            const searchLower = query.toLowerCase();
            return (
              book.title?.toLowerCase().includes(searchLower) ||
              book.author?.toLowerCase().includes(searchLower) ||
              book.categoryName?.toLowerCase().includes(searchLower) ||
              book.description?.toLowerCase().includes(searchLower)
            );
          });

          if (filteredBooks.length > 0) {
            // Enrich books với reviews
            const booksWithReviews = await Promise.all(
              filteredBooks.map((book) => enrichBookWithReviews(book))
            );
            setSearchResults(booksWithReviews);
            setSearchError(
              "⚠️ Tìm kiếm AI chưa sẵn sàng. Đang dùng tìm kiếm thông thường."
            );
            return;
          } else {
            setSearchError(
              "Không tìm thấy kết quả nào. Có thể embeddings chưa được generate. Vui lòng thử từ khóa khác hoặc liên hệ admin."
            );
            setSearchResults([]);
            return;
          }
        }

        // Nếu lỗi khác, throw để xử lý ở catch bên ngoài
        throw aiError;
      }

      // Nếu AI search trả về empty nhưng không có lỗi
      setSearchError(
        "Không tìm thấy kết quả nào. Có thể embeddings chưa được generate."
      );
      setSearchResults([]);
    } catch (err: any) {
      console.error("❌ Lỗi khi tìm kiếm:", err);
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message || err?.message;

      let errorMessage = "Lỗi khi tìm kiếm. Vui lòng thử lại.";

      if (status === 404) {
        errorMessage =
          "Endpoint AI search chưa được cấu hình. Vui lòng liên hệ admin.";
      } else if (status === 500) {
        errorMessage =
          "Lỗi server. Có thể embeddings chưa được generate. Vui lòng thử lại sau.";
      } else if (apiMessage) {
        errorMessage = apiMessage;
      }

      setSearchError(errorMessage);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Gợi ý sách tương tự
  const handleRecommend = async (bookId: number) => {
    setSelectedBookId(bookId);
    setRecommendLoading(true);
    setRecommendError(null);
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
      }
      if (!response.data || response.data.length === 0) {
        setRecommendError(
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

      setRecommendError(errorMessage);
      setRecommendations([]);
    } finally {
      setRecommendLoading(false);
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

  const openBookDetail = (bookId: number) => {
    setSelectedBookDetailId(bookId);
    setShowBookDetail(true);
  };

  const renderBookCard = (item: Book) => (
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 AI Gợi ý</Text>
        <Text style={styles.headerSubtitle}>
          Tìm kiếm thông minh & Gợi ý sách tương tự
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "search" && styles.tabActive]}
          onPress={() => setActiveTab("search")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="search"
            size={20}
            color={activeTab === "search" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "search" && styles.tabTextActive,
            ]}
          >
            Tìm kiếm
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "recommend" && styles.tabActive]}
          onPress={() => setActiveTab("recommend")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="sparkles"
            size={20}
            color={activeTab === "recommend" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "recommend" && styles.tabTextActive,
            ]}
          >
            Gợi ý
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "search" ? (
          // Tab Tìm kiếm
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập từ khóa (ví dụ: tài chính, tiểu thuyết, kỹ năng sống...)"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                activeOpacity={0.8}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {searchError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{searchError}</Text>
              </View>
            )}

            {searchLoading && searchResults.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C92127" />
                <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>
                  Tìm thấy {searchResults.length} kết quả
                </Text>
                <FlatList
                  data={searchResults}
                  renderItem={({ item }) => renderBookCard(item)}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              !searchLoading && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>
                    Nhập từ khóa và nhấn tìm kiếm để bắt đầu
                  </Text>
                </View>
              )
            )}
          </View>
        ) : (
          // Tab Gợi ý
          <View style={styles.recommendSection}>
            <Text style={styles.sectionTitle}>
              Chọn một cuốn sách để xem gợi ý tương tự
            </Text>

            {recommendError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{recommendError}</Text>
              </View>
            )}

            {recommendLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C92127" />
                <Text style={styles.loadingText}>
                  Đang tìm sách tương tự...
                </Text>
              </View>
            ) : recommendations.length > 0 ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>
                  Sách tương tự với "
                  {allBooks.find((b) => b.id === selectedBookId)?.title}"
                </Text>
                <FlatList
                  data={recommendations}
                  renderItem={({ item }) => renderBookCard(item)}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <View style={styles.bookListContainer}>
                <FlatList
                  data={allBooks}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.bookListItem,
                        selectedBookId === item.id &&
                          styles.bookListItemSelected,
                      ]}
                      onPress={() => handleRecommend(item.id)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri:
                            item.imageUrl ||
                            "https://via.placeholder.com/300x400",
                        }}
                        style={styles.bookListItemImage}
                        resizeMode="cover"
                      />
                      <View style={styles.bookListItemInfo}>
                        <Text
                          style={styles.bookListItemTitle}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.bookListItemPrice}>
                          {formatPrice(item.price)}
                        </Text>
                      </View>
                      {selectedBookId === item.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#C92127"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BookDetail
        visible={showBookDetail}
        bookId={selectedBookDetailId}
        onClose={() => {
          setShowBookDetail(false);
          setSelectedBookDetailId(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#C92127",
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  tabActive: {
    backgroundColor: "#C92127",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  searchSection: {
    gap: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
  },
  searchInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  searchButton: {
    backgroundColor: "#C92127",
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
  },
  recommendSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#EF4444",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  resultsContainer: {
    gap: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
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
  emptyContainer: {
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
  bookListContainer: {
    gap: 8,
  },
  bookListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  bookListItemSelected: {
    borderColor: "#C92127",
    borderWidth: 2,
    backgroundColor: "#FEF2F2",
  },
  bookListItemImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  bookListItemInfo: {
    flex: 1,
    gap: 4,
  },
  bookListItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  bookListItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C92127",
  },
});

export default Suggestion;
