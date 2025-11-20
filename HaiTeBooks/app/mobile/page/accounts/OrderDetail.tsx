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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";

interface OrderItem {
  id: number;
  bookId: number;
  bookTitle?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  orderDate: string;
  address?: string;
  note?: string;
  orderItems?: OrderItem[];
  appliedPromotion?: {
    id: number;
    code: string;
    discountPercent: number;
    name: string;
    maxDiscountAmount?: number | null;
  };
}

const OrderDetail: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = params.id ? parseInt(params.id, 10) : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      Alert.alert("Lỗi", "Không tìm thấy đơn hàng");
      router.back();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập");
        router.back();
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/orders/${orderId}`);
      const orderData = response.data;

      console.log(
        "📦 Order data from backend:",
        JSON.stringify(orderData, null, 2)
      );
      console.log(
        "🎁 Applied promotion from backend:",
        orderData.appliedPromotion
      );

      // Normalize data
      const normalizedOrder: Order = {
        id: orderData.id,
        userId: orderData.userId || orderData.user?.id,
        total: orderData.total || orderData.totalAmount,
        status: orderData.status || orderData.statusOrder,
        orderDate: orderData.orderDate || orderData.createdAt,
        address: orderData.address || orderData.shippingAddress,
        note: orderData.note || orderData.customerNote,
        orderItems: orderData.orderItems || orderData.items || [],
        appliedPromotion: orderData.appliedPromotion
          ? {
              id: orderData.appliedPromotion.id,
              code: orderData.appliedPromotion.code,
              discountPercent: orderData.appliedPromotion.discountPercent,
              name: orderData.appliedPromotion.name,
              maxDiscountAmount: orderData.appliedPromotion.maxDiscountAmount || null,
            }
          : undefined,
      };

      console.log(
        "✅ Normalized order:",
        JSON.stringify(normalizedOrder, null, 2)
      );
      console.log(
        "💰 Subtotal:",
        normalizedOrder.orderItems?.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ) || 0
      );
      console.log("🎁 Applied promotion:", normalizedOrder.appliedPromotion);
      if (normalizedOrder.appliedPromotion) {
        const subtotalCalc =
          normalizedOrder.orderItems?.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ) || 0;
        const discountCalc =
          (subtotalCalc * normalizedOrder.appliedPromotion!.discountPercent) /
          100;
        console.log("💵 Discount amount:", discountCalc);
        console.log(
          "💵 Final total (subtotal - discount):",
          subtotalCalc - discountCalc
        );
        console.log("💵 Order total from backend:", normalizedOrder.total);
      }
      setOrder(normalizedOrder);
    } catch (error: any) {
      console.error("❌ Lỗi khi tải đơn hàng:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin đơn hàng");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getStatusInfo = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || status;
    switch (normalizedStatus) {
      case "PENDING":
        return {
          label: "Chờ xác nhận",
          color: "#F59E0B",
          bgColor: "#FEF3C7",
        };
      case "PROCESSING":
        return {
          label: "Đang xử lý",
          color: "#3B82F6",
          bgColor: "#DBEAFE",
        };
      case "SHIPPING":
        return {
          label: "Đang giao",
          color: "#8B5CF6",
          bgColor: "#E9D5FF",
        };
      case "COMPLETED":
        return {
          label: "Hoàn thành",
          color: "#10B981",
          bgColor: "#D1FAE5",
        };
      case "CANCELLED":
        return {
          label: "Đã hủy",
          color: "#EF4444",
          bgColor: "#FEE2E2",
        };
      default:
        return {
          label: status,
          color: "#6B7280",
          bgColor: "#F3F4F6",
        };
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Không tìm thấy đơn hàng
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const subtotal =
    order.orderItems?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ) || 0;
  
  // Tính discount amount với maxDiscountAmount (giống backend)
  const discountAmount = order.appliedPromotion
    ? (() => {
        const calculatedDiscount = (subtotal * order.appliedPromotion!.discountPercent) / 100;
        // Nếu có maxDiscountAmount và calculatedDiscount vượt quá, thì dùng maxDiscountAmount
        if (order.appliedPromotion!.maxDiscountAmount != null && calculatedDiscount > order.appliedPromotion!.maxDiscountAmount) {
          return order.appliedPromotion!.maxDiscountAmount;
        }
        return calculatedDiscount;
      })()
    : 0;
  
  // Dùng order.total từ backend vì backend đã tính đúng với maxDiscountAmount
  // Chỉ tính lại để hiển thị discount amount, nhưng finalTotal dùng từ backend
  const finalTotal = order.total;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin đơn hàng
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.bgColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Mã đơn hàng:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              #{order.id}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Ngày đặt:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(order.orderDate)}
            </Text>
          </View>
          {order.address && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Địa chỉ:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {order.address}
              </Text>
            </View>
          )}
          {order.note && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Ghi chú:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {order.note}
              </Text>
            </View>
          )}
          {order.appliedPromotion && (
            <View style={styles.promotionSection}>
              <View style={styles.promotionHeader}>
                <Ionicons name="pricetag" size={18} color="#10B981" />
                <Text style={[styles.promotionTitle, { color: colors.text }]}>
                  Mã khuyến mãi đã áp dụng
                </Text>
              </View>
              <View style={styles.promotionInfo}>
                <View style={styles.promotionRow}>
                  <Text
                    style={[
                      styles.promotionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Mã:
                  </Text>
                  <Text style={[styles.promotionCode, { color: "#10B981" }]}>
                    {order.appliedPromotion.code}
                  </Text>
                </View>
                <View style={styles.promotionRow}>
                  <Text
                    style={[
                      styles.promotionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tên khuyến mãi:
                  </Text>
                  <Text style={[styles.promotionValue, { color: colors.text }]}>
                    {order.appliedPromotion.name}
                  </Text>
                </View>
                <View style={styles.promotionRow}>
                  <Text
                    style={[
                      styles.promotionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Giảm giá:
                  </Text>
                  <Text style={[styles.promotionValue, { color: "#10B981" }]}>
                    {order.appliedPromotion.discountPercent}%
                  </Text>
                </View>
                <View style={[styles.promotionRow, styles.promotionAmountRow]}>
                  <Text
                    style={[
                      styles.promotionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Số tiền đã giảm:
                  </Text>
                  <Text style={[styles.promotionAmount, { color: "#10B981" }]}>
                    -{formatCurrency(discountAmount)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Sản phẩm đã đặt
          </Text>
          {order.orderItems && order.orderItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {order.orderItems.map((item, index) => (
                <View key={item.id || `item-${item.bookId}-${index}`} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {item.bookTitle || `Sách #${item.bookId}`}
                    </Text>
                    <Text
                      style={[styles.itemMeta, { color: colors.textSecondary }]}
                    >
                      Số lượng: {item.quantity} x {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: colors.text }]}>
                    {formatCurrency(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Không có sản phẩm
            </Text>
          )}
        </View>

        {/* Order Summary */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Tổng kết đơn hàng
          </Text>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Tạm tính:
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(subtotal)}
            </Text>
          </View>
          {order.appliedPromotion && (
            <View style={styles.summaryRow}>
              <View style={styles.discountInfo}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Khuyến mãi:
                </Text>
                <Text style={[styles.discountCode, { color: "#10B981" }]}>
                  {order.appliedPromotion.code} (-
                  {order.appliedPromotion.discountPercent}%)
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryValue,
                  { color: "#10B981", fontWeight: "700" },
                ]}
              >
                -{formatCurrency(discountAmount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Tổng tiền:
            </Text>
            <Text style={[styles.totalValue, { color: "#C92127" }]}>
              {formatCurrency(finalTotal)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#C92127",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  itemsContainer: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  discountInfo: {
    flex: 1,
  },
  discountCode: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  promotionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  promotionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  promotionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  promotionInfo: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  promotionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  promotionAmountRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#D1FAE5",
    marginBottom: 0,
  },
  promotionLabel: {
    fontSize: 14,
    flex: 1,
  },
  promotionCode: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  promotionValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  promotionAmount: {
    fontSize: 16,
    fontWeight: "800",
    flex: 2,
    textAlign: "right",
  },
});

export default OrderDetail;
