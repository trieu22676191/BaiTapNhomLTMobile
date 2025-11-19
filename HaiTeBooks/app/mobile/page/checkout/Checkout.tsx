import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useCart } from "../../context/CartContext";

type CartItem = {
  id: number;
  bookId: number;
  title: string;
  price: number;
  image: string;
  qty: number;
  stock: number;
};

const Checkout: React.FC = () => {
  const router = useRouter();
  const { refreshCart } = useCart();
  const params = useLocalSearchParams<{ items?: string }>();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  // Promotion state
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<{
    id: number;
    code: string;
    discountPercent: number;
    name: string;
  } | null>(null);
  const [validatingPromotion, setValidatingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    paymentMethod: "cod" as "cod" | "bank",
    note: "",
  });

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);

      // Restore token
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để thanh toán");
        router.back();
        return;
      }

      setAuthToken(token);

      // Lấy thông tin user từ API
      const userResponse = await axiosInstance.get("/users/me");
      const apiUser = userResponse.data;
      setUserId(apiUser.id);

      // Lấy thông tin user từ AsyncStorage làm fallback
      const savedUserStr = await AsyncStorage.getItem("auth_user");
      let savedUser = null;
      if (savedUserStr) {
        try {
          savedUser = JSON.parse(savedUserStr);
        } catch (e) {
          console.error("Error parsing saved user:", e);
        }
      }

      // Debug: Log user data để kiểm tra
      console.log("User data from API:", JSON.stringify(apiUser, null, 2));
      console.log(
        "User data from Storage:",
        JSON.stringify(savedUser, null, 2)
      );
      console.log("User fields check:", {
        "apiUser.fullName": apiUser.fullName,
        "apiUser.full_name": apiUser.full_name,
        "savedUser.full_name": savedUser?.full_name,
        "apiUser.phone": apiUser.phone,
        "apiUser.phoneNumber": apiUser.phoneNumber,
        "savedUser.phone": savedUser?.phone,
        "apiUser.address": apiUser.address,
        "savedUser.address": savedUser?.address,
      });

      // Set form data từ user info - ưu tiên API, sau đó fallback sang savedUser
      const finalFullName =
        apiUser.fullName ||
        apiUser.full_name ||
        savedUser?.full_name ||
        savedUser?.fullName ||
        "";

      const finalPhone =
        apiUser.phone ||
        apiUser.phoneNumber ||
        apiUser.sdt ||
        savedUser?.phone ||
        "";

      const finalAddress =
        apiUser.address ||
        apiUser.diaChi ||
        apiUser.fullAddress ||
        savedUser?.address ||
        "";

      console.log("📝 Setting form data:", {
        finalFullName,
        finalPhone,
        finalAddress,
      });

      setFormData({
        fullName: finalFullName,
        phone: finalPhone,
        address: finalAddress,
        paymentMethod: "cod",
        note: "",
      });

      // Parse items từ params
      if (params.items) {
        try {
          const parsedItems = JSON.parse(params.items) as CartItem[];
          setItems(parsedItems);
        } catch (e) {
          console.error("Error parsing items:", e);
          Alert.alert("Lỗi", "Không thể tải thông tin sản phẩm");
          router.back();
        }
      } else {
        Alert.alert("Lỗi", "Không có sản phẩm để thanh toán");
        router.back();
      }
    } catch (error: any) {
      console.error("Error loading checkout data:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
        router.back();
      } else {
        Alert.alert("Lỗi", "Không thể tải thông tin thanh toán");
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  // Tính tổng tiền sau khi áp dụng giảm giá
  const discountAmount = appliedPromotion
    ? (subtotal * appliedPromotion.discountPercent) / 100
    : 0;
  const totalPrice = subtotal - discountAmount;

  const handleValidatePromotion = async () => {
    if (!promotionCode.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã giảm giá");
      return;
    }

    try {
      setValidatingPromotion(true);
      setPromotionError("");

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để sử dụng mã giảm giá");
        return;
      }

      setAuthToken(token);

      const response = await axiosInstance.get(
        `/promotions/validate/${promotionCode.trim().toUpperCase()}`
      );

      // Backend trả về PromotionResponse trực tiếp (không có wrapper)
      if (response.data && response.data.id) {
        setAppliedPromotion({
          id: response.data.id,
          code: response.data.code,
          discountPercent: response.data.discountPercent,
          name: response.data.name,
        });
        Alert.alert(
          "Thành công",
          `Áp dụng mã giảm giá ${response.data.discountPercent}% thành công!`
        );
      } else {
        setPromotionError("Mã giảm giá không hợp lệ");
        setAppliedPromotion(null);
      }
    } catch (error: any) {
      console.error("Error validating promotion:", error);
      setPromotionError(
        error?.response?.data?.message ||
          "Mã giảm giá không hợp lệ hoặc đã hết hạn"
      );
      setAppliedPromotion(null);
    } finally {
      setValidatingPromotion(false);
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    setPromotionError("");
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ tên");
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ giao hàng");
      return;
    }

    if (!userId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
      return;
    }

    Alert.alert(
      "Xác nhận đơn hàng",
      `Bạn có chắc chắn muốn đặt hàng với tổng tiền ${formatVnd(totalPrice)}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setSubmitting(true);

              // Đảm bảo token được set trước khi tạo đơn hàng
              const token = await AsyncStorage.getItem("auth_token");
              if (!token) {
                Alert.alert(
                  "Lỗi",
                  "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                );
                router.back();
                return;
              }
              setAuthToken(token);

              // Verify token bằng cách gọi /users/me trước
              try {
                await axiosInstance.get("/users/me");
                console.log("✅ Token verified before creating order");
              } catch (verifyError: any) {
                if (
                  verifyError?.response?.status === 401 ||
                  verifyError?.response?.status === 403
                ) {
                  Alert.alert(
                    "Lỗi",
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                  );
                  router.back();
                  return;
                }
              }

              // Tạo đơn hàng - Backend sẽ nhận OrderRequest DTO (sau khi sửa backend)
              // Format theo OrderRequest DTO structure
              const orderData = {
                userId: userId, // OrderRequest có userId (Long)
                total: totalPrice, // OrderRequest có total (Double) - cần thêm vào DTO
                status: "PENDING", // OrderRequest có status (String) - cần thêm vào DTO
                orderItems: items.map((item) => ({
                  bookId: item.bookId, // OrderItemRequest có bookId (Long)
                  quantity: item.qty, // OrderItemRequest có quantity (Integer)
                  price: item.price, // OrderItemRequest có price (Double)
                })),
                address: formData.address, // OrderRequest có address (String)
                note: formData.note || "", // OrderRequest có note (String)
                appliedPromotionId: appliedPromotion?.id || null, // Thêm promotion ID nếu có
              };

              console.log(
                "📦 Sending order data (Order entity format):",
                JSON.stringify(orderData, null, 2)
              );
              console.log("🔐 Token exists:", token ? "Yes" : "No");
              console.log(
                "🔐 Token preview:",
                token ? token.substring(0, 50) + "..." : "No token"
              );
              console.log("👤 User ID:", userId);

              let orderResponse;
              try {
                // Thử format chính với Order entity đầy đủ
                console.log("🚀 Attempting to create order...");
                orderResponse = await axiosInstance.post("/orders", orderData);
                console.log("✅ Order created successfully!");
              } catch (firstError: any) {
                console.error("❌ Format 1 failed!");
                console.error("Error status:", firstError?.response?.status);
                console.error(
                  "Error statusText:",
                  firstError?.response?.statusText
                );
                console.error("Error data:", firstError?.response?.data);
                console.error("Error message:", firstError?.message);
                console.error("Error config:", {
                  url: firstError?.config?.url,
                  method: firstError?.config?.method,
                  headers: firstError?.config?.headers,
                });

                // Nếu lỗi 403, có thể do Spring Security hoặc JWT filter
                if (firstError?.response?.status === 403) {
                  console.error("🔒 403 Forbidden - Possible causes:");
                  console.error("1. JWT filter không parse token đúng");
                  console.error("2. Spring Security từ chối request");
                  console.error("3. Token không hợp lệ hoặc hết hạn");
                  console.error("4. User không có quyền truy cập endpoint này");
                }

                // Format 2: Không có status (để backend set mặc định)
                console.log("⚠️ Trying Format 2 (no status)...");
                const orderDataFormat2 = {
                  user: { id: userId },
                  total: totalPrice,
                  orderItems: items.map((item) => ({
                    book: { id: item.bookId },
                    quantity: item.qty,
                    price: item.price,
                  })),
                };
                console.log(
                  "📦 Trying Format 2:",
                  JSON.stringify(orderDataFormat2, null, 2)
                );
                try {
                  orderResponse = await axiosInstance.post(
                    "/orders",
                    orderDataFormat2
                  );
                } catch (secondError: any) {
                  // Format 3: Với orderItems có bookId trực tiếp
                  console.log(
                    "⚠️ Format 2 failed, trying Format 3 (bookId only)..."
                  );
                  const orderDataFormat3 = {
                    user: { id: userId },
                    total: totalPrice,
                    status: "PENDING",
                    orderItems: items.map((item) => ({
                      bookId: item.bookId,
                      quantity: item.qty,
                      price: item.price,
                    })),
                  };
                  console.log(
                    "📦 Trying Format 3:",
                    JSON.stringify(orderDataFormat3, null, 2)
                  );
                  orderResponse = await axiosInstance.post(
                    "/orders",
                    orderDataFormat3
                  );
                }
              }
              const order = orderResponse.data;

              console.log("✅ Order created:", JSON.stringify(order, null, 2));

              // Nếu thanh toán online, tạo payment
              if (formData.paymentMethod === "bank") {
                try {
                  const paymentData = {
                    orderId: order.id,
                    amount: totalPrice,
                    method: "bank",
                  };
                  await axiosInstance.post("/payments", paymentData);
                } catch (paymentError) {
                  console.error("Payment error:", paymentError);
                  // Vẫn tiếp tục nếu payment fail
                }
              }

              // Xóa các sản phẩm đã thanh toán khỏi giỏ hàng
              try {
                await Promise.all(
                  items.map((item) =>
                    axiosInstance.delete(`/cart/remove/${item.id}`)
                  )
                );
              } catch (cartError) {
                console.error("Error removing cart items:", cartError);
                // Vẫn tiếp tục nếu xóa cart fail
              }

              // Refresh cart count
              await refreshCart();

              Alert.alert(
                "Thành công!",
                "Đơn hàng của bạn đã được tạo thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Về trang account để xem đơn hàng mới ở mục "Đang xử lý"
                      router.replace("/account");
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error("❌ Error creating order:", error);
              console.error("Error details:", {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                message: error?.message,
                url: error?.config?.url,
                method: error?.config?.method,
                requestData: error?.config?.data,
              });

              // Hiển thị thông báo lỗi chi tiết hơn
              let errorMessage = "Không thể tạo đơn hàng. Vui lòng thử lại.";

              if (error?.response?.data) {
                const errorData = error.response.data;
                errorMessage =
                  errorData.message ||
                  errorData.error ||
                  errorData.errors
                    ?.map((e: any) => e.message || e.defaultMessage)
                    .join(", ") ||
                  `Lỗi ${error.response.status}: ${error.response.statusText}`;
              } else if (error?.message) {
                errorMessage = error.message;
              }

              Alert.alert("Lỗi tạo đơn hàng", errorMessage);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={styles.backButton} />
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
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Đơn hàng ({totalItems} sản phẩm)
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.orderItemQty}>Số lượng: {item.qty}</Text>
              </View>
              <Text style={styles.orderItemPrice}>
                {formatVnd(item.price * item.qty)}
              </Text>
            </View>
          ))}
          {appliedPromotion && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>
                Giảm giá ({appliedPromotion.code}):
              </Text>
              <Text style={styles.discountValue}>
                -{formatVnd(discountAmount)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{formatVnd(totalPrice)}</Text>
          </View>
        </View>

        {/* Promotion Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã giảm giá</Text>

          {appliedPromotion ? (
            <View style={styles.promotionApplied}>
              <View style={styles.promotionAppliedInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <View style={styles.promotionAppliedText}>
                  <Text style={styles.promotionAppliedCode}>
                    {appliedPromotion.code}
                  </Text>
                  <Text style={styles.promotionAppliedName}>
                    {appliedPromotion.name} - Giảm {appliedPromotion.discountPercent}%
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleRemovePromotion}
                style={styles.removePromotionButton}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promotionInputContainer}>
              <TextInput
                style={[
                  styles.promotionInput,
                  promotionError && styles.promotionInputError,
                ]}
                value={promotionCode}
                onChangeText={(text) => {
                  setPromotionCode(text.toUpperCase());
                  setPromotionError("");
                }}
                placeholder="Nhập mã giảm giá"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.applyPromotionButton,
                  validatingPromotion && styles.applyPromotionButtonDisabled,
                ]}
                onPress={handleValidatePromotion}
                disabled={validatingPromotion || !promotionCode.trim()}
              >
                {validatingPromotion ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyPromotionButtonText}>Áp dụng</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {promotionError && (
            <Text style={styles.promotionErrorText}>{promotionError}</Text>
          )}
        </View>

        {/* Shipping Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, fullName: text }))
              }
              placeholder="Nhập họ và tên"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phone: text }))
              }
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ giao hàng *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, address: text }))
              }
              placeholder="Nhập địa chỉ giao hàng"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.note}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, note: text }))
              }
              placeholder="Ghi chú thêm (tùy chọn)"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              formData.paymentMethod === "cod" && styles.paymentOptionSelected,
            ]}
            onPress={() =>
              setFormData((prev) => ({ ...prev, paymentMethod: "cod" }))
            }
          >
            <View style={styles.paymentOptionLeft}>
              <View
                style={[
                  styles.radio,
                  formData.paymentMethod === "cod" && styles.radioSelected,
                ]}
              >
                {formData.paymentMethod === "cod" && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.paymentOptionText}>
                Thanh toán khi nhận hàng (COD)
              </Text>
            </View>
            <Ionicons name="cash-outline" size={24} color="#C92127" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              formData.paymentMethod === "bank" && styles.paymentOptionSelected,
            ]}
            onPress={() =>
              setFormData((prev) => ({ ...prev, paymentMethod: "bank" }))
            }
          >
            <View style={styles.paymentOptionLeft}>
              <View
                style={[
                  styles.radio,
                  formData.paymentMethod === "bank" && styles.radioSelected,
                ]}
              >
                {formData.paymentMethod === "bank" && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.paymentOptionText}>
                Chuyển khoản ngân hàng
              </Text>
            </View>
            <Ionicons name="card-outline" size={24} color="#C92127" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {appliedPromotion && (
          <View style={styles.footerDiscount}>
            <Text style={styles.footerDiscountLabel}>
              Giảm giá ({appliedPromotion.discountPercent}%):
            </Text>
            <Text style={styles.footerDiscountValue}>
              -{formatVnd(discountAmount)}
            </Text>
          </View>
        )}
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Tổng cộng:</Text>
          <Text style={styles.footerTotalValue}>{formatVnd(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Đặt hàng</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function formatVnd(n: number) {
  if (!n) return "0 đ";
  return `${n.toLocaleString("vi-VN")} đ`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#C92127",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  orderItemQty: {
    fontSize: 12,
    color: "#6B7280",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C92127",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#C92127",
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  discountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  promotionInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  promotionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  promotionInputError: {
    borderColor: "#EF4444",
  },
  applyPromotionButton: {
    backgroundColor: "#C92127",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  applyPromotionButtonDisabled: {
    opacity: 0.6,
  },
  applyPromotionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  promotionApplied: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  promotionAppliedInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  promotionAppliedText: {
    marginLeft: 8,
    flex: 1,
  },
  promotionAppliedCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  promotionAppliedName: {
    fontSize: 12,
    color: "#059669",
    marginTop: 2,
  },
  removePromotionButton: {
    marginLeft: 8,
  },
  promotionErrorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  paymentOptionSelected: {
    borderColor: "#C92127",
    backgroundColor: "#FEF2F2",
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioSelected: {
    borderColor: "#C92127",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C92127",
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  footerDiscount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerDiscountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  footerDiscountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  footerTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  footerTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#C92127",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C92127",
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default Checkout;
