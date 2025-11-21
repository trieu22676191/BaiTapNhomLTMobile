import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BookDetail from "../../components/home/BookDetail";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";

interface FavoriteBook {
  id: number;
  userId: number;
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  bookPrice: number;
  bookImageUrl: string;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
  stock?: number;
}

const FavoriteBooks: React.FC = () => {
  const router = useRouter();
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [showBookDetail, setShowBookDetail] = useState<boolean>(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const fetchFavoriteBooks = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const savedUser = await AsyncStorage.getItem("auth_user");

      if (!token || !savedUser) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để xem sách yêu thích");
        router.back();
        return;
      }

      const user = JSON.parse(savedUser);
      const currentUserId = user?.id || user?.userId;

      if (!currentUserId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
        router.back();
        return;
      }

      setUserId(currentUserId);
      setAuthToken(token);

      const response = await axiosInstance.get<FavoriteBook[]>(
        `/favorites/user/${currentUserId}`
      );
      const favorites = response.data || [];

      // Enrich với rating, reviewCount và stock từ API
      const enrichedFavorites = await Promise.all(
        favorites.map(async (favorite) => {
          try {
            // Fetch reviews và book detail song song
            const [reviewsResp, bookResp] = await Promise.all([
              axiosInstance
                .get(`/reviews/book/${favorite.bookId}`)
                .catch(() => ({ data: [] })),
              axiosInstance
                .get(`/books/${favorite.bookId}`)
                .catch(() => ({ data: null })),
            ]);

            // Xử lý reviews
            const reviews = Array.isArray(reviewsResp.data)
              ? reviewsResp.data
              : [];

            // Debug: Log reviews để kiểm tra
            console.log(`📋 Reviews for book ${favorite.bookId}:`, reviews);
            if (reviews.length > 0) {
              console.log(`📋 First review sample:`, {
                id: reviews[0].id,
                status: reviews[0].status,
                rating: reviews[0].rating,
              });
            }

            // Filter reviews: giống với BookDetail - bao gồm cả reviews không có status hoặc status = "approved"
            const approvedReviews = reviews.filter((r: any) =>
              r?.status ? r.status === "approved" : true
            );

            console.log(
              `✅ Approved reviews for book ${favorite.bookId}:`,
              approvedReviews.length
            );

            const reviewCount = approvedReviews.length;
            const averageRating =
              reviewCount > 0
                ? approvedReviews.reduce(
                    (acc: number, curr: any) => acc + Number(curr.rating || 0),
                    0
                  ) / reviewCount
                : 0;

            console.log(
              `⭐ Rating for book ${favorite.bookId}:`,
              averageRating,
              `(${reviewCount} reviews)`
            );

            // Lấy stock từ book detail
            const stock = bookResp.data?.stock || 0;

            const result = { ...favorite, averageRating, reviewCount, stock };
            console.log(`📦 Final data for book ${favorite.bookId}:`, {
              title: result.bookTitle,
              averageRating: result.averageRating,
              reviewCount: result.reviewCount,
              stock: result.stock,
            });
            return result;
          } catch (err) {
            console.warn(
              `Không thể tải thông tin cho sách ${favorite.bookId}:`,
              (err as any)?.message
            );
            return { ...favorite, averageRating: 0, reviewCount: 0, stock: 0 };
          }
        })
      );

      setFavoriteBooks(enrichedFavorites);
    } catch (error: any) {
      console.error("❌ Lỗi khi tải sách yêu thích:", error);

      // Xử lý lỗi 500 (LazyInitializationException) - backend issue
      if (error?.response?.status === 500) {
        const errorMessage = error?.response?.data?.message || "";
        if (
          errorMessage.includes("could not initialize proxy") ||
          errorMessage.includes("no Session")
        ) {
          Alert.alert(
            "Lỗi hệ thống",
            "Lỗi khi tải dữ liệu sách yêu thích. Vui lòng thử lại sau hoặc liên hệ admin.\n\n" +
              "(Lỗi: LazyInitializationException - Backend cần sửa @EntityGraph trong FavoriteBookRepository)"
          );
        } else {
          Alert.alert(
            "Lỗi",
            "Không thể tải danh sách sách yêu thích. Vui lòng thử lại."
          );
        }
      } else if (
        error?.response?.status === 401 ||
        error?.response?.status === 403
      ) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
        router.replace("/account");
      } else {
        Alert.alert(
          "Lỗi",
          error?.response?.data?.message ||
            "Không thể tải danh sách sách yêu thích. Vui lòng thử lại."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchFavoriteBooks();
  }, [fetchFavoriteBooks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavoriteBooks();
  }, [fetchFavoriteBooks]);

  const handleRemoveFavorite = async (bookId: number) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập");
        return;
      }

      setAuthToken(token);
      await axiosInstance.delete(`/favorites/remove/${bookId}`);

      // Cập nhật danh sách sau khi xóa
      setFavoriteBooks((prev) => prev.filter((book) => book.bookId !== bookId));
      Alert.alert("Thành công", "Đã xóa khỏi mục yêu thích");
    } catch (error: any) {
      console.error("❌ Lỗi khi xóa sách yêu thích:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          "Không thể xóa sách khỏi mục yêu thích. Vui lòng thử lại."
      );
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const renderBookItem = ({ item }: { item: FavoriteBook }) => (
    <TouchableOpacity
      style={styles.bookCard}
      activeOpacity={0.8}
      onPress={() => {
        setSelectedBookId(item.bookId);
        setShowBookDetail(true);
      }}
    >
      <Image
        source={{
          uri: item.bookImageUrl || "https://via.placeholder.com/150x200",
        }}
        style={styles.bookImage}
        resizeMode="cover"
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.bookTitle}
        </Text>
        {item.bookAuthor && (
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.bookAuthor}
          </Text>
        )}
        {/* Rating */}
        {item.reviewCount !== undefined && item.reviewCount > 0 ? (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.rating}>
              {item.averageRating && Number.isFinite(item.averageRating)
                ? Number(item.averageRating).toFixed(1)
                : "0.0"}
            </Text>
            <Text style={styles.reviewCount}>
              ({item.reviewCount} đánh giá)
            </Text>
          </View>
        ) : (
          <Text style={styles.noReviews}>Chưa có đánh giá</Text>
        )}
        {/* Stock */}
        <View style={styles.stockContainer}>
          <Ionicons name="cube-outline" size={14} color="#10B981" />
          <Text style={styles.stock}>Còn {item.stock || 0} cuốn</Text>
        </View>
        <Text style={styles.bookPrice}>{formatPrice(item.bookPrice)}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => {
          Alert.alert(
            "Xác nhận",
            "Bạn có chắc muốn xóa sách này khỏi mục yêu thích?",
            [
              {
                text: "Hủy",
                style: "cancel",
              },
              {
                text: "Xóa",
                style: "destructive",
                onPress: () => handleRemoveFavorite(item.bookId),
              },
            ]
          );
        }}
      >
        <Ionicons name="heart" size={20} color="#C92127" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sách yêu thích</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C92127" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sách yêu thích</Text>
        <View style={styles.placeholder} />
      </View>

      {favoriteBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Chưa có sách yêu thích</Text>
          <Text style={styles.emptySubtitle}>
            Hãy thêm sách vào mục yêu thích để xem lại sau
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoriteBooks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#C92127"]}
            />
          }
        />
      )}

      <BookDetail
        visible={showBookDetail}
        bookId={selectedBookId}
        onClose={() => {
          setShowBookDetail(false);
          setSelectedBookId(null);
        }}
        onBookClick={(bookId: number) => {
          setSelectedBookId(bookId);
          setShowBookDetail(true);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#C92127",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  noReviews: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    fontStyle: "italic",
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  stock: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
    marginLeft: 4,
  },
  bookPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C92127",
  },
  removeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});

export default FavoriteBooks;
