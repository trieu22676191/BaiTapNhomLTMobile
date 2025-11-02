import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
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

const formatPrice = (v: number) =>
  new Intl.NumberFormat("vi-VN").format(v) + " đ";

const Card: React.FC<{ item: BookWithReviews }> = ({ item }) => {
  const [showBookDetail, setShowBookDetail] = useState(false);
  const uri = item.imageUrl || "https://via.placeholder.com/300x400";

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setShowBookDetail(true)}
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
      </TouchableOpacity>

      <BookDetail
        visible={showBookDetail}
        bookId={item.id}
        onClose={() => setShowBookDetail(false)}
      />
    </>
  );
};

const ProductCard: React.FC = () => {
  const [books, setBooks] = useState<BookWithReviews[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const source = axios.CancelToken.source();

    const fetchBooks = async () => {
      try {
        // Fetch books
        const booksResp = await axiosInstance.get<ApiBook[]>("/books", {
          timeout: 10000,
          cancelToken: source.token,
        });

        if (!mounted) return;

        const booksData = booksResp.data || [];

        // Fetch reviews for each book in parallel
        const booksWithReviews = await Promise.all(
          booksData.map(async (book) => {
            try {
              const reviewsResp = await axiosInstance.get<any>(
                `/reviews/book/${book.id}`,
                { timeout: 5000, cancelToken: source.token }
              );

              const data = reviewsResp.data;

              // DEBUG: Xem dữ liệu reviews
              console.log("=== REVIEWS DEBUG ===");
              console.log("Book ID:", book.id);
              console.log("Response data:", data);
              console.log(
                "Data type:",
                Array.isArray(data) ? "Array" : typeof data
              );
              console.log("====================");

              let reviewCount = 0;
              let averageRating = 0;

              if (Array.isArray(data)) {
                // Trả về mảng reviews
                reviewCount = data.length;
                const sum = data.reduce((acc: number, r: any) => {
                  const n = Number(r?.rating);
                  return acc + (Number.isFinite(n) ? n : 0);
                }, 0);
                averageRating = reviewCount > 0 ? sum / reviewCount : 0;
              } else if (data && typeof data === "object") {
                // Trả về object thống kê
                const count =
                  data.reviewCount ?? data.count ?? data.totalReviews ?? 0;
                const avg =
                  data.averageRating ??
                  data.avgRating ??
                  data.ratingAverage ??
                  data.average ??
                  0;

                reviewCount = Number(count) || 0;
                averageRating = Number(avg) || 0;
              }

              // DEBUG: Kết quả sau khi xử lý
              console.log(
                "Book ID:",
                book.id,
                "| ReviewCount:",
                reviewCount,
                "| AverageRating:",
                averageRating
              );

              return {
                ...book,
                averageRating,
                reviewCount,
              };
            } catch (err) {
              // DEBUG: Lỗi khi fetch reviews
              console.log(
                "ERROR fetching reviews for book ID:",
                book.id,
                "| Error:",
                err
              );

              return {
                ...book,
                averageRating: 0,
                reviewCount: 0,
              };
            }
          })
        );

        if (mounted) setBooks(booksWithReviews);
      } catch (err: any) {
        if (axios.isCancel(err)) return;
        if (mounted)
          setError(
            err?.response?.data?.message ??
              err.message ??
              "Lỗi khi lấy dữ liệu từ API"
          );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBooks();
    return () => {
      mounted = false;
      source.cancel("Component unmounted");
    };
  }, []);

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

  if (loading) return <ActivityIndicator style={{ margin: 12 }} />;

  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View>
      {Object.entries(sections).map(([category, items]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionTitle}>{category}</Text>

          <FlatList
            data={items}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Card item={item} />}
          />
        </View>
      ))}
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
  sectionTitle: {
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#C5181A",
    marginBottom: 8,
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
    height: 44, // đủ cho 2 dòng với fontSize 14 + lineHeight 18
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
  buyWrap: {
    marginTop: 8,
  },
  error: { color: "#e74c3c", textAlign: "center", marginTop: 12 },
});
