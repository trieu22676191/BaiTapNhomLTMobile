import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user";

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  orderDate: string;
  orderItems?: OrderItem[];
}

interface OrderItem {
  id: number;
  bookId: number;
  bookTitle?: string;
  quantity: number;
  price: number;
}

const MyOrder: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ status?: string }>();
  const statusFilter = params.status as OrderStatus | undefined;

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewedOrderIds, setViewedOrderIds] = useState<Set<number>>(new Set());

  // Load user và viewed order IDs
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("auth_user");
        if (savedUser) {
          const parsed: User = JSON.parse(savedUser);
          setUser(parsed);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();

    const loadViewedOrders = async () => {
      try {
        const viewedData = await AsyncStorage.getItem("viewed_order_ids");
        if (viewedData) {
          const viewedIds = JSON.parse(viewedData);
          setViewedOrderIds(new Set(viewedIds));
        }
      } catch (error) {
        console.error("Error loading viewed orders:", error);
      }
    };
    loadViewedOrders();
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập");
        router.back();
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/orders/user/${user.id}`);
      const rawData = response.data || [];

      // Normalize orders
      const normalizedOrders = rawData.map((order: any) => ({
        id: order.id,
        userId: order.userId,
        total: order.total || order.totalAmount,
        status: (order.status || order.statusOrder || "").toUpperCase(),
        orderDate: order.orderDate || order.createdAt,
        orderItems: order.orderItems || order.items || [],
      }));

      setOrders(normalizedOrders);

      // Mark order as viewed when fetched
      const viewedData = await AsyncStorage.getItem("viewed_order_ids");
      const viewedIds = viewedData ? JSON.parse(viewedData) : [];
      const newViewedIds = [
        ...new Set([...viewedIds, ...normalizedOrders.map((o: Order) => o.id)]),
      ];
      await AsyncStorage.setItem(
        "viewed_order_ids",
        JSON.stringify(newViewedIds)
      );
      setViewedOrderIds(new Set(newViewedIds));
    } catch (error: any) {
      const status = error?.response?.status;
      console.error("❌ Error fetching orders:", {
        message: error?.message,
        response: error?.response?.data,
        status: status,
        url: error?.config?.url,
      });

      // Hiển thị thông báo cho người dùng khi gặp lỗi 502 hoặc 401/403
      if (
        status === 401 ||
        status === 403 ||
        status === 502 ||
        status === 503 ||
        status === 504
      ) {
        Alert.alert(
          "Phiên đăng nhập đã hết hạn",
          "Vui lòng đăng nhập lại để tiếp tục.",
          [{ text: "OK" }]
        );
      }

      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, router]);

  useEffect(() => {
    console.log("🔄 useEffect triggered - user?.id:", user?.id);
    if (user?.id) {
      console.log("✅ User ID exists, fetching orders...");
      fetchOrders();
    } else {
      console.log("⚠️ User ID not available yet, skipping fetchOrders");
      setLoading(false);
    }
  }, [user?.id, fetchOrders]);

  // Refresh khi focus vào trang
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchOrders();
      }
    }, [user?.id, fetchOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders by status
  const filteredOrders = statusFilter
    ? orders.filter((order) => order.status === statusFilter)
    : orders;

  // Calculate order counts by status
  const orderCounts = {
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
    SHIPPING: orders.filter((o) => o.status === "SHIPPING").length,
    COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  // Check if order is unviewed
  const isUnviewed = (orderId: number) => !viewedOrderIds.has(orderId);

  // Handle tab press
  const handleTabPress = (status: OrderStatus | "ALL") => {
    if (status === "ALL") {
      router.push("/mobile/page/accounts/MyOrder");
    } else {
      router.push(`/mobile/page/accounts/MyOrder?status=${status}`);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      PROCESSING: "Đang xử lý",
      SHIPPING: "Đang giao",
      COMPLETED: "Hoàn tất",
      CANCELLED: "Đã huỷ",
    };
    return statusMap[status.toUpperCase()] || status;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: "#F59E0B",
      PROCESSING: "#3B82F6",
      SHIPPING: "#8B5CF6",
      COMPLETED: "#10B981",
      CANCELLED: "#EF4444",
    };
    return colorMap[status.toUpperCase()] || "#6B7280";
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const unviewed = isUnviewed(item.id);
    return (
      <TouchableOpacity
        style={[styles.orderCard, unviewed && styles.orderCardUnviewed]}
        activeOpacity={0.7}
        onPress={() => {
          // Mark as viewed
          const newViewedIds = [...viewedOrderIds, item.id];
          setViewedOrderIds(new Set(newViewedIds));
          AsyncStorage.setItem(
            "viewed_order_ids",
            JSON.stringify([...newViewedIds])
          );

          router.push(`/mobile/page/accounts/OrderDetail?id=${item.id}`);
        }}
      >
        {unviewed && <View style={styles.unviewedDot} />}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Đơn hàng #{item.id}</Text>
            <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.orderTotal}>
          Tổng tiền: {item.total.toLocaleString("vi-VN")} ₫
        </Text>
        {item.status === "SHIPPING" && (
          <TouchableOpacity
            style={styles.receiveButton}
            onPress={() => {
              router.push(`/mobile/page/accounts/OrderDetail?id=${item.id}`);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.receiveButtonText}>Đã nhận hàng</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <View style={styles.backButton} />
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, !statusFilter && styles.tabActive]}
            onPress={() => handleTabPress("ALL")}
          >
            <Text
              style={[styles.tabText, !statusFilter && styles.tabTextActive]}
            >
              Tất cả ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              statusFilter === "PROCESSING" && styles.tabActive,
            ]}
            onPress={() => handleTabPress("PROCESSING")}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === "PROCESSING" && styles.tabTextActive,
              ]}
            >
              Đang xử lý ({orderCounts.PROCESSING})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              statusFilter === "SHIPPING" && styles.tabActive,
            ]}
            onPress={() => handleTabPress("SHIPPING")}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === "SHIPPING" && styles.tabTextActive,
              ]}
            >
              Đang giao ({orderCounts.SHIPPING})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              statusFilter === "COMPLETED" && styles.tabActive,
            ]}
            onPress={() => handleTabPress("COMPLETED")}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === "COMPLETED" && styles.tabTextActive,
              ]}
            >
              Hoàn thành ({orderCounts.COMPLETED})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statusFilter === "PENDING" && styles.tabActive]}
            onPress={() => handleTabPress("PENDING")}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === "PENDING" && styles.tabTextActive,
              ]}
            >
              Chờ xác nhận ({orderCounts.PENDING})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              statusFilter === "CANCELLED" && styles.tabActive,
            ]}
            onPress={() => handleTabPress("CANCELLED")}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === "CANCELLED" && styles.tabTextActive,
              ]}
            >
              Đã huỷ ({orderCounts.CANCELLED})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {statusFilter
              ? `Không có đơn hàng ${getStatusLabel(
                  statusFilter
                ).toLowerCase()}`
              : "Chưa có đơn hàng nào"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    backgroundColor: "#C92127",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
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
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  orderCardUnviewed: {
    backgroundColor: "#FEF3C7",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  unviewedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#C92127",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C92127",
    marginBottom: 12,
  },
  receiveButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  receiveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
  },
  tabContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#C92127",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
});

export default MyOrder;
