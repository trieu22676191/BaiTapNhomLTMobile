import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import BuyNowButton from "./BuyNowButton";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

type ReviewItem = {
  id: number;
  userId: number;
  bookId: number;
  rating: number;
  comment?: string;
  createdAt?: string;
  status?: "pending" | "approved" | "rejected";
  userName?: string;
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
  const [allReviews, setAllReviews] = useState<ReviewItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [userReview, setUserReview] = useState<ReviewItem | null>(null);
  const [formRating, setFormRating] = useState<number>(0);
  const [formComment, setFormComment] = useState<string>("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [authUserId, setAuthUserId] = useState<number | null>(null);
  const [authUserName, setAuthUserName] = useState<string>("");
  const [isEditingReview, setIsEditingReview] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;
    const loadAuthUser = async () => {
      try {
        // Kiểm tra token trước
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          console.log("📱 BookDetail - No auth_token found");
          setAuthUserId(null);
          setAuthUserName("");
          return;
        }

        // Set token cho axios instance
        setAuthToken(token);

        // Thử lấy user từ API trước (để có đầy đủ thông tin, đặc biệt là ID)
        try {
          const userResponse = await axiosInstance.get("/users/me");
          const apiUser = userResponse.data;
          const userId = apiUser?.id || apiUser?.userId;
          
          if (userId) {
            console.log("✅ BookDetail - User loaded from API, userId:", userId);
            setAuthUserId(typeof userId === "number" ? userId : Number(userId));
            setAuthUserName(
              apiUser?.fullName || apiUser?.full_name || apiUser?.username || ""
            );
            
            // Cập nhật AsyncStorage với user đầy đủ thông tin
            const userToSave = {
              id: userId,
              username: apiUser?.username || "",
              email: apiUser?.email || "",
              full_name: apiUser?.fullName || apiUser?.full_name || "",
              phone: apiUser?.phone || apiUser?.phoneNumber || "",
              address: apiUser?.address || "",
              role_id: apiUser?.role || apiUser?.role_id || "user",
            };
            await AsyncStorage.setItem("auth_user", JSON.stringify(userToSave));
            return;
          }
        } catch (apiError) {
          console.warn("⚠️ BookDetail - Could not fetch user from API, trying AsyncStorage:", apiError);
        }

        // Fallback: lấy từ AsyncStorage
        const stored = await AsyncStorage.getItem("auth_user");
        console.log("📱 BookDetail - Reading auth_user from storage:", stored);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("📱 BookDetail - Parsed user data:", parsed);
          
          // Thử nhiều cách để lấy userId
          let parsedId = parsed?.id ?? parsed?.userId ?? parsed?.user_id ?? null;
          
          // Nếu id là undefined hoặc null, không set userId
          if (parsedId === undefined || parsedId === null) {
            console.warn("⚠️ BookDetail - No userId found in user object");
            setAuthUserId(null);
            setAuthUserName("");
            return;
          }
          
          // Convert sang number nếu cần
          const userId = typeof parsedId === "number" ? parsedId : Number(parsedId);
          
          if (isNaN(userId) || userId <= 0) {
            console.warn("⚠️ BookDetail - Invalid userId:", parsedId);
            setAuthUserId(null);
            setAuthUserName("");
            return;
          }
          
          console.log("✅ BookDetail - Setting authUserId from storage:", userId);
          setAuthUserId(userId);
          setAuthUserName(
            parsed?.full_name || parsed?.fullName || parsed?.username || ""
          );
        } else {
          console.log("📱 BookDetail - No auth_user found in storage");
          setAuthUserId(null);
          setAuthUserName("");
        }
      } catch (err) {
        console.error("❌ BookDetail - Error reading user info:", err);
        setAuthUserId(null);
        setAuthUserName("");
      }
    };
    loadAuthUser();
  }, [visible]);

  useEffect(() => {
    if (visible && bookId) {
      fetchBookDetail();
      setIsEditingReview(false); // Reset chế độ chỉnh sửa khi mở modal mới
    } else if (!visible) {
      setIsEditingReview(false); // Reset khi đóng modal
    }
  }, [visible, bookId]);

  const syncUserReview = useCallback(
    (list: ReviewItem[]) => {
      if (!authUserId) {
        setUserReview(null);
        setFormRating(0);
        setFormComment("");
        return;
      }
      const existing = list.find((review) => review.userId === authUserId);
      setUserReview(existing ?? null);
      if (existing) {
        setFormRating(existing.rating);
        setFormComment(existing.comment || "");
      } else {
        setFormRating(0);
        setFormComment("");
      }
    },
    [authUserId]
  );

  useEffect(() => {
    syncUserReview(allReviews);
  }, [allReviews, syncUserReview]);

  useEffect(() => {
    console.log("🔍 BookDetail - authUserId changed:", authUserId, "type:", typeof authUserId);
  }, [authUserId]);

  const topReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return reviews.slice(0, 6);
  }, [reviews]);

  const formatReviewDate = useCallback((value?: string) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }, []);

  const renderStaticStars = (value: number, size = 16) => (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, index) => {
        const current = index + 1;
        return (
          <Ionicons
            key={current}
            name={value >= current ? "star" : "star-outline"}
            size={size}
            color="#FFB800"
          />
        );
      })}
    </View>
  );

  const fetchBookDetail = async () => {
    if (!bookId) return;

    setLoading(true);
    setError(null);
    setFormError(null);
    setFormMessage(null);
    try {
      const [bookResp, reviewsResp] = await Promise.all([
        axiosInstance.get<BookDetail>(`/books/${bookId}`),
        axiosInstance
          .get<ReviewItem[]>(`/reviews/book/${bookId}`)
          .catch((reviewErr) => {
            console.warn("Không thể tải reviews:", reviewErr?.message);
            return { data: [] as ReviewItem[] };
          }),
      ]);
      const bookData = bookResp.data;
      const rawReviews = Array.isArray(reviewsResp.data)
        ? reviewsResp.data
        : [];
      setAllReviews(rawReviews);

      const approvedReviews = rawReviews.filter((review) =>
        review?.status ? review.status === "approved" : true
      );

      const reviewCount = approvedReviews.length;
      const averageRating =
        reviewCount > 0
          ? approvedReviews.reduce(
              (acc, curr) => acc + Number(curr.rating || 0),
              0
            ) / reviewCount
          : 0;

      setReviews(approvedReviews);
      setBook({
        ...bookData,
        averageRating,
        reviewCount,
      });
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

  const handleSubmitReview = async () => {
    if (!bookId) return;
    if (!authUserId) {
      setFormError("Vui lòng đăng nhập để đánh giá sách.");
      return;
    }
    if (formRating < 1 || formRating > 5) {
      setFormError("Vui lòng chọn số sao (1-5).");
      return;
    }

    const payload = {
      userId: authUserId,
      bookId,
      rating: formRating,
      comment: formComment?.trim() || "",
    };

    setSubmittingReview(true);
    setFormError(null);
    setFormMessage(null);
    try {
      if (userReview?.id) {
        // Cập nhật review đã có
        await axiosInstance.put(`/reviews/${userReview.id}`, payload);
        setFormMessage("Bạn đã cập nhật đánh giá thành công.");
        setIsEditingReview(false); // Tắt chế độ chỉnh sửa sau khi cập nhật thành công
      } else {
        // Tạo review mới
        await axiosInstance.post(`/reviews`, payload);
        setFormMessage("Đã gửi đánh giá. Vui lòng chờ duyệt.");
      }
      await fetchBookDetail();
    } catch (err: any) {
      console.error("Không thể gửi đánh giá:", err);
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      
      // Xử lý các trường hợp lỗi cụ thể
      if (apiMessage?.includes("already reviewed") || apiMessage?.includes("already reviewed")) {
        setFormError("Bạn đã đánh giá sách này rồi. Vui lòng sử dụng tính năng chỉnh sửa.");
      } else if (apiMessage?.includes("can only update your own")) {
        setFormError("Bạn chỉ có thể chỉnh sửa đánh giá của chính mình.");
      } else {
        setFormError(apiMessage || "Không thể gửi đánh giá. Vui lòng thử lại.");
      }
    } finally {
      setSubmittingReview(false);
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
            <>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Book Image */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri:
                        book.imageUrl || "https://via.placeholder.com/300x400",
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

                  {/* Review Form */}
                  <View style={styles.reviewSection}>
                    <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
                    {authUserId ? (
                      <View style={styles.reviewForm}>
                        {userReview?.id && !isEditingReview ? (
                          // Hiển thị review hiện tại với nút chỉnh sửa
                          <View style={styles.existingReviewContainer}>
                            <View style={styles.existingReviewHeader}>
                              <Text style={styles.existingReviewTitle}>
                                Đánh giá của bạn
                              </Text>
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setIsEditingReview(true)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="create-outline" size={18} color="#C92127" />
                                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.existingReviewContent}>
                              <View style={styles.existingReviewStars}>
                                {renderStaticStars(userReview.rating, 20)}
                              </View>
                              {userReview.comment && (
                                <Text style={styles.existingReviewComment}>
                                  {userReview.comment}
                                </Text>
                              )}
                              {userReview.status === "pending" && (
                                <Text style={styles.pendingReviewText}>
                                  Đang chờ duyệt
                                </Text>
                              )}
                              {userReview.status === "approved" && (
                                <Text style={styles.approvedReviewText}>
                                  Đã được duyệt
                                </Text>
                              )}
                            </View>
                          </View>
                        ) : (
                          // Hiển thị form (tạo mới hoặc chỉnh sửa)
                          <>
                            {userReview?.id && (
                              <View style={styles.editingHeader}>
                                <Text style={styles.editingTitle}>Chỉnh sửa đánh giá</Text>
                                <TouchableOpacity
                                  style={styles.cancelButton}
                                  onPress={() => {
                                    setIsEditingReview(false);
                                    // Reset form về giá trị ban đầu
                                    if (userReview) {
                                      setFormRating(userReview.rating);
                                      setFormComment(userReview.comment || "");
                                    }
                                    setFormError(null);
                                    setFormMessage(null);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.cancelButtonText}>Hủy</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                            <View style={styles.starInputRow}>
                              {Array.from({ length: 5 }).map((_, index) => {
                                const starValue = index + 1;
                                const isFilled = formRating >= starValue;
                                return (
                                  <TouchableOpacity
                                    key={starValue}
                                    onPress={() => setFormRating(starValue)}
                                    style={styles.starButton}
                                    activeOpacity={0.7}
                                    disabled={submittingReview}
                                  >
                                    <Ionicons
                                      name={isFilled ? "star" : "star-outline"}
                                      size={28}
                                      color="#FFB800"
                                    />
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            <TextInput
                              style={styles.commentInput}
                              value={formComment}
                              placeholder="Chia sẻ cảm nhận của bạn..."
                              placeholderTextColor="#9CA3AF"
                              multiline
                              numberOfLines={4}
                              onChangeText={setFormComment}
                              editable={!submittingReview}
                            />
                            {formError && (
                              <Text style={styles.formErrorText}>{formError}</Text>
                            )}
                            {formMessage && (
                              <Text style={styles.formSuccessText}>
                                {formMessage}
                              </Text>
                            )}
                            <TouchableOpacity
                              style={[
                                styles.submitButton,
                                submittingReview && styles.submitButtonDisabled,
                              ]}
                              onPress={handleSubmitReview}
                              activeOpacity={0.8}
                              disabled={submittingReview}
                            >
                              {submittingReview ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <Text style={styles.submitButtonText}>
                                  {userReview?.id ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.loginPrompt}>
                        Đăng nhập để chia sẻ cảm nhận và nhận ưu đãi từ HaiTeBooks.
                      </Text>
                    )}
                  </View>

                  {/* Review List */}
                  <View style={styles.reviewListSection}>
                    <Text style={styles.sectionTitle}>Đánh giá gần đây</Text>
                    {topReviews.length === 0 ? (
                      <Text style={styles.emptyReviewText}>
                        Chưa có đánh giá nào được hiển thị.
                      </Text>
                    ) : (
                      topReviews.map((reviewItem) => (
                        <View key={reviewItem.id} style={styles.reviewCard}>
                          <View style={styles.reviewCardHeader}>
                            <Text style={styles.reviewerName}>
                              {reviewItem.userName || "Người dùng ẩn danh"}
                            </Text>
                            <Text style={styles.reviewDate}>
                              {formatReviewDate(reviewItem.createdAt)}
                            </Text>
                          </View>
                          <View style={styles.reviewStars}>
                            {renderStaticStars(reviewItem.rating, 18)}
                          </View>
                          {reviewItem.comment ? (
                            <Text style={styles.reviewComment}>
                              {reviewItem.comment}
                            </Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </ScrollView>

              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <BuyNowButton
                  bookId={book.id}
                  bookTitle={book.title}
                  stock={book.stock}
                />
              </View>
            </>
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
    paddingBottom: 160,
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
  reviewSection: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  reviewForm: {
    gap: 12,
  },
  starInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  formErrorText: {
    color: "#EF4444",
    fontSize: 13,
  },
  formSuccessText: {
    color: "#059669",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#C92127",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pendingReviewText: {
    fontSize: 12,
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  approvedReviewText: {
    fontSize: 12,
    color: "#065F46",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  existingReviewContainer: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  existingReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  existingReviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C92127",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#C92127",
  },
  editingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  existingReviewInfo: {
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    gap: 8,
  },
  existingReviewLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  existingReviewContent: {
    gap: 8,
  },
  existingReviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  existingReviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  loginPrompt: {
    fontSize: 14,
    color: "#6B7280",
  },
  reviewListSection: {
    marginTop: 20,
    gap: 12,
  },
  emptyReviewText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  reviewCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

export default BookDetail;
