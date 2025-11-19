import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BookDetail from "../../components/home/BookDetail";
import BuyNowButton from "../../components/home/BuyNowButton";
import axiosInstance from "../../config/axiosConfig";

type ApiBook = {
  id: number;
  title: string;
  author?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  categoryName?: string;
  soldCount?: number;
};

type BookWithReviews = ApiBook & {
  averageRating?: number;
  reviewCount?: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 24 - 8) / 2; // 2 columns with padding and gap

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " ₫";

const CategoryBooks: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const categoryName = params.category || "Tất cả";
  const searchParam = params.search || "";

  const [books, setBooks] = useState<BookWithReviews[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>(searchParam);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  // Update searchText khi search param thay đổi
  useEffect(() => {
    if (searchParam) {
      setSearchText(searchParam);
    }
  }, [searchParam]);

  useEffect(() => {
    fetchBooks();
  }, [categoryName]);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    const source = axios.CancelToken.source();
    try {
      // Fetch all books
      const booksResp = await axiosInstance.get<ApiBook[]>("/books", {
        timeout: 10000,
        cancelToken: source.token,
      });

      let booksData = booksResp.data || [];

      // Filter by category
      if (categoryName !== "Tất cả") {
        booksData = booksData.filter(
          (book) =>
            book.categoryName?.trim() === categoryName.trim() ||
            book.categoryName === categoryName
        );
      }

      // Không fetch reviews ở đây để tối ưu performance
      // Reviews sẽ được fetch khi user mở BookDetail
      // Set default values cho reviews
      const booksWithReviews: BookWithReviews[] = booksData.map((book) => ({
        ...book,
        averageRating: 0,
        reviewCount: 0,
      }));

      setBooks(booksWithReviews);
    } catch (err: any) {
      if (axios.isCancel(err)) return;
      setError(
        err?.response?.data?.message ??
          err.message ??
          "Lỗi khi lấy dữ liệu từ API"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter books by search text
  const filteredBooks = books.filter((book) => {
    if (!searchText.trim()) return true;
    const searchLower = searchText.toLowerCase().trim();
    const searchNormalized = searchText.trim().replace(/\s+/g, "");

    // Ưu tiên tìm exact match với barcode trước
    if (book.barcode) {
      const bookBarcode = book.barcode.toString().trim().replace(/\s+/g, "");
      if (
        bookBarcode === searchNormalized ||
        bookBarcode.toLowerCase() === searchLower
      ) {
        return true;
      }
    }

    // Sau đó tìm trong các trường khác
    return (
      book.title.toLowerCase().includes(searchLower) ||
      book.author?.toLowerCase().includes(searchLower) ||
      book.categoryName?.toLowerCase().includes(searchLower) ||
      book.barcode?.toLowerCase().includes(searchLower)
    );
  });

  const calculateDiscount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const renderBookCard = ({ item }: { item: BookWithReviews }) => {
    const discount = calculateDiscount(item.price, item.originalPrice);
    const uri = item.imageUrl || "https://via.placeholder.com/300x400";

    return (
      <>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => setSelectedBookId(item.id)}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
            {item.stock === 0 && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Sắp có hàng</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.category} numberOfLines={1}>
              {item.categoryName || "Khác"}
            </Text>

            {/* Title wrapped in fixed-height box so all titles align */}
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            {/* Reviews section */}
            <View style={styles.reviewsRow}>
              {item.reviewCount && item.reviewCount > 0 ? (
                <>
                  <Text style={styles.rating}>
                    ★{" "}
                    {Number.isFinite(item.averageRating)
                      ? item.averageRating!.toFixed(1)
                      : "0.0"}
                  </Text>
                  <Text style={styles.reviewCount}>({item.reviewCount})</Text>
                </>
              ) : (
                <Text style={styles.noReviews}>Chưa có đánh giá</Text>
              )}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.currentPrice}>
                  {formatPrice(item.price)}
                </Text>
                {item.originalPrice && item.originalPrice > item.price && (
                  <Text style={styles.originalPrice}>
                    {formatPrice(item.originalPrice)}
                  </Text>
                )}
              </View>
              <Text style={styles.stock}>Còn {item.stock}</Text>
            </View>

            {item.soldCount !== undefined && item.soldCount > 0 && (
              <Text style={styles.soldCount}>Đã bán {item.soldCount}</Text>
            )}

            <View style={styles.buttonContainer}>
              <BuyNowButton
                bookId={item.id}
                bookTitle={item.title}
                stock={item.stock}
              />
            </View>
          </View>
        </TouchableOpacity>

        {selectedBookId === item.id && (
          <BookDetail
            visible={selectedBookId === item.id}
            bookId={item.id}
            onClose={() => setSelectedBookId(null)}
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={16}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Cây thông Noel"
              placeholderTextColor="#999"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
        </View>

        <View style={styles.headerRight}>
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C92127" />
          <Text style={styles.loadingText}>Đang tải sách...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBooks}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>
            {searchText
              ? `Không tìm thấy sách nào với "${searchText}"`
              : "Không có sách nào trong danh mục này"}
          </Text>
          {searchText && /^\d+$/.test(searchText.trim()) && (
            <Text style={styles.emptySubText}>
              Có thể mã vạch này chưa được thêm vào hệ thống
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          renderItem={renderBookCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C92127",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.04,
        shadowRadius: 0.5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flex: 1,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 36,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: 0,
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    padding: 20,
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
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "space-between",
    gap: 8,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 0.7,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  outOfStockBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  info: {
    padding: 12,
    minHeight: 140,
    justifyContent: "flex-start",
  },
  category: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  titleWrap: {
    height: 44,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 18,
  },
  reviewsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    minHeight: 18,
  },
  rating: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "600",
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  noReviews: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C92127",
  },
  originalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  stock: {
    fontSize: 12,
    color: "#6B7280",
  },
  soldCount: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 8,
  },
});

export default CategoryBooks;
