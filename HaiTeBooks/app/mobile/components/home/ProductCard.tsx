import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance from "../../config/axiosConfig";
import BookDetail from "./BookDetail";
import BuyNowButton from "./BuyNowButton";
import SimilarBooksModal from "./SimilarBooksModal";

type ApiBook = {
  id: number;
  title: string;
  author?: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  barcode?: string;
  categoryName?: string;
};

type BookWithReviews = ApiBook & {
  averageRating?: number;
  reviewCount?: number;
};

// Module-level cache để lưu books data
let cachedBooks: BookWithReviews[] = [];
let isInitialized = false;

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " đ";

const Card: React.FC<{ item: BookWithReviews }> = ({ item }) => {
  const [showBookDetail, setShowBookDetail] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [showSimilarBooks, setShowSimilarBooks] = useState(false);
  const [similarBookId, setSimilarBookId] = useState<number | null>(null);
  const [similarBookTitle, setSimilarBookTitle] = useState<string>("");
  const uri = item.imageUrl || "https://via.placeholder.com/300x400";

  const handleShowSimilarBooks = (bookId: number, bookTitle?: string) => {
    console.log("🔍 Card: handleShowSimilarBooks called", {
      bookId,
      bookTitle,
    });
    setSimilarBookId(bookId);
    setSimilarBookTitle(bookTitle || "");
    setShowBookDetail(false); // Đóng BookDetail trước
    setTimeout(() => {
      setShowSimilarBooks(true);
    }, 300); // Đợi một chút để BookDetail đóng xong
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedBookId(item.id);
          setShowBookDetail(true);
        }}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
            onError={(error) => {
              console.log(
                "Image load error for book:",
                item.id,
                "URI:",
                uri,
                error
              );
            }}
          />
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
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            <Text style={styles.stock}>Còn {item.stock}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.similarButton}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                setSimilarBookId(item.id);
                setSimilarBookTitle(item.title);
                setShowSimilarBooks(true);
              }}
            >
              <Ionicons name="sparkles" size={20} color="#C92127" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buyWrap}
              activeOpacity={1}
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              <BuyNowButton
                bookId={item.id}
                bookTitle={item.title}
                stock={item.stock}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      <BookDetail
        visible={showBookDetail}
        bookId={selectedBookId || item.id}
        onClose={() => {
          setShowBookDetail(false);
          setSelectedBookId(null);
        }}
        onBookClick={(bookId) => {
          // Mở BookDetail trực tiếp với sách mới
          setSelectedBookId(bookId);
          setShowBookDetail(true);
        }}
        onShowSimilarBooks={(bookId, bookTitle) => {
          console.log("🔍 ProductCard: onShowSimilarBooks called", {
            bookId,
            bookTitle,
          });
          setSimilarBookId(bookId);
          setSimilarBookTitle(bookTitle || "");
          setShowBookDetail(false); // Đóng BookDetail trước
          setSelectedBookId(null);
          setTimeout(() => {
            setShowSimilarBooks(true); // Mở SimilarBooksModal sau
          }, 300);
        }}
      />
      <SimilarBooksModal
        visible={showSimilarBooks}
        bookId={similarBookId}
        bookTitle={similarBookTitle}
        onClose={() => {
          setShowSimilarBooks(false);
          setSimilarBookId(null);
          setSimilarBookTitle("");
        }}
        onBookClick={(bookId) => {
          // Đóng SimilarBooksModal
          setShowSimilarBooks(false);
          setSimilarBookId(null);
          setSimilarBookTitle("");
          // Mở BookDetail với bookId được chọn
          setTimeout(() => {
            setSelectedBookId(bookId);
            setShowBookDetail(true);
          }, 300);
        }}
      />
    </>
  );
};

interface ProductCardProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ refreshTrigger }) => {
  const router = useRouter();
  const [books, setBooks] = useState<BookWithReviews[]>(cachedBooks);
  const [loading, setLoading] = useState<boolean>(!isInitialized);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshTrigger = useRef<number>(0);

  const fetchBooks = async (force: boolean = false) => {
    // Nếu đã có cache và không force refresh, sử dụng cache
    if (!force && isInitialized && cachedBooks.length > 0) {
      setBooks(cachedBooks);
      setLoading(false);
      return;
    }

    setLoading(true);
    const source = axios.CancelToken.source();
    try {
      const booksResp = await axiosInstance.get<ApiBook[]>("/books", {
        timeout: 10000,
        cancelToken: source.token,
      });

      const booksData = booksResp.data || [];

      // Fetch reviews cho mỗi sách song song để tối ưu performance
      const booksWithReviews = await Promise.all(
        booksData.map(async (book) => {
          try {
            const reviewsResp = await axiosInstance.get<any[]>(
              `/reviews/book/${book.id}`,
              { cancelToken: source.token }
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
            // Nếu không fetch được reviews, set default values
            return {
              ...book,
              averageRating: 0,
              reviewCount: 0,
            };
          }
        })
      );

      // Lưu vào cache
      cachedBooks = booksWithReviews;
      isInitialized = true;
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

  // Lần đầu mount: fetch nếu chưa có cache
  useEffect(() => {
    if (!isInitialized || cachedBooks.length === 0) {
      fetchBooks(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi refreshTrigger thay đổi: force refresh
  useEffect(() => {
    if (refreshTrigger > lastRefreshTrigger.current) {
      lastRefreshTrigger.current = refreshTrigger;
      fetchBooks(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // group books by categoryName
  const sections = useMemo(() => {
    const map = books.reduce<Record<string, BookWithReviews[]>>((acc, b) => {
      const key =
        b.categoryName?.trim() && b.categoryName!.trim().length > 0
          ? b.categoryName!
          : "Khác";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});
    return map;
  }, [books]);

  const handleViewMore = (category: string) => {
    router.push({
      pathname: "/mobile/page/homes/CategoryBooks",
      params: { category },
    });
  };

  if (loading) return <ActivityIndicator style={{ margin: 12 }} />;

  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View>
      {Object.entries(sections).map(([category, items]) => {
        // Giới hạn tối đa 8 sách cho mỗi thể loại
        const limitedItems = items.slice(0, 8);
        return (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{category}</Text>
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => handleViewMore(category)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMoreText}>Xem thêm</Text>
                <Ionicons name="chevron-forward" size={16} color="#C92127" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={limitedItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => <Card item={item} />}
            />
          </View>
        );
      })}
    </View>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C5181A",
    flex: 1,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#C92127",
  },
  card: {
    width: 180,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#C5181A",
    elevation: 3,
  },
  imageWrap: {
    width: "100%",
    height: 150,
    backgroundColor: "#fbfbfb",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "94%",
    height: "94%",
    borderRadius: 8,
    backgroundColor: "#f6f6f6",
  },
  info: {
    padding: 12,
    // make info area consistent so elements align across cards
    minHeight: 140,
    justifyContent: "flex-start",
  },
  category: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  // ensure title area has fixed height (2 lines) so neighbouring cards align
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
  // meta row holds price and stock horizontally aligned
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C5181A",
  },
  stock: {
    fontSize: 12,
    color: "#6B7280",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  similarButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C92127",
    backgroundColor: "#FFFFFF",
  },
  buyWrap: {
    flex: 1,
  },
  error: { color: "#e74c3c", textAlign: "center", marginTop: 12 },
});
