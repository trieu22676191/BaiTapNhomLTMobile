import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { User } from "../../types/user";

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
  const params = useLocalSearchParams<{ status?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(
    params.status || "all"
  );
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(
    null
  );
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(
    null
  );

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("👤 Loading user...");
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          console.log("⚠️ No token found in AsyncStorage");
          setLoading(false);
          return;
        }

        setAuthToken(token);
        console.log("✅ Token loaded");

        // Lấy user từ API để có đầy đủ thông tin, đặc biệt là ID
        try {
          const userResponse = await axiosInstance.get("/users/me");
          const apiUser = userResponse.data;

          const user: User = {
            id: apiUser?.id || apiUser?.userId,
            username: apiUser?.username || "",
            password: "",
            email: apiUser?.email || "",
            full_name: apiUser?.fullName || apiUser?.full_name || "",
            phone: apiUser?.phone || apiUser?.phoneNumber || "",
            address: apiUser?.address || "",
            role_id: apiUser?.role || apiUser?.role_id || "user",
          };

          console.log("✅ User loaded from API:", {
            id: user.id,
            username: user.username,
          });

          // Cập nhật AsyncStorage với user đầy đủ thông tin
          await AsyncStorage.setItem("auth_user", JSON.stringify(user));
          setUser(user);
        } catch (apiError: any) {
          console.error("❌ Error fetching user from API:", apiError);

          // Fallback: thử lấy từ AsyncStorage
          const savedUser = await AsyncStorage.getItem("auth_user");
          if (savedUser) {
            const parsed: User = JSON.parse(savedUser);
            console.log("⚠️ Using user from AsyncStorage (may not have ID):", {
              id: parsed.id,
              username: parsed.username,
            });
            setUser(parsed);
          } else {
            console.log("⚠️ No user found in AsyncStorage");
          }
        }
      } catch (error) {
        console.error("❌ Error loading user:", error);
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const fetchOrders = useCallback(async () => {
    console.log("🔍 fetchOrders called - user?.id:", user?.id);
    if (!user?.id) {
      console.log("⚠️ No user ID, skipping fetchOrders");
      setLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        console.log("⚠️ No token found");
        setLoading(false);
        return;
      }

      setAuthToken(token);
      console.log(`📦 Fetching orders for user ID: ${user.id}`);
      console.log(`📦 API URL: /orders/user/${user.id}`);

      const response = await axiosInstance.get(`/orders/user/${user.id}`);

      console.log("✅ Orders response:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataType: Array.isArray(response.data) ? "array" : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
        data: JSON.stringify(response.data, null, 2),
      });

      // Xử lý response - có thể là array trực tiếp hoặc object có data property
      let ordersData = response.data;

      // Nếu response.data là object và có property là array
      if (
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data)
      ) {
        // Thử các key phổ biến
        if (Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        } else if (Array.isArray(response.data.orders)) {
          ordersData = response.data.orders;
        } else if (Array.isArray(response.data.content)) {
          ordersData = response.data.content;
        } else if (Array.isArray(response.data.items)) {
          ordersData = response.data.items;
        }
      }

      if (!Array.isArray(ordersData)) {
        console.warn("⚠️ Response is not an array:", {
          type: typeof ordersData,
          value: ordersData,
          keys:
            ordersData && typeof ordersData === "object"
              ? Object.keys(ordersData)
              : "N/A",
        });
        ordersData = [];
      }

      // Normalize dữ liệu
      const normalizedOrders = ordersData.map((order: any) => {
        const normalized = {
          ...order,
          id: order.id,
          userId: order.userId || order.user?.id || user.id,
          status: order.status?.toUpperCase() || order.status || "PENDING",
          total: order.total || order.totalAmount || 0,
          orderDate:
            order.orderDate ||
            order.createdAt ||
            order.order_date ||
            new Date().toISOString(),
          orderItems: order.orderItems || order.order_items || [],
        };
        console.log("📦 Normalized order:", normalized);
        return normalized;
      });

      console.log(`✅ Loaded ${normalizedOrders.length} orders`);
      setOrders(normalizedOrders);
    } catch (error: any) {
      console.error("❌ Error fetching orders:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
      });
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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

  // Cập nhật filter khi params thay đổi
  useEffect(() => {
    if (params.status) {
      setStatusFilter(params.status);
    } else {
      setStatusFilter("all");
    }
  }, [params.status]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // Parse date string từ backend
      let date: Date;

      // Kiểm tra xem date string có timezone info không
      // Format có timezone: "2024-01-01T10:00:00Z" hoặc "2024-01-01T10:00:00+07:00"
      // Format không có timezone: "2024-01-01T10:00:00"
      const hasTimezone =
        dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString); // Có +HH:MM hoặc -HH:MM ở cuối

      if (!hasTimezone && dateString.includes("T")) {
        // Nếu không có timezone và có format ISO, giả sử backend trả về UTC
        // Thêm Z để parse như UTC
        date = new Date(dateString + "Z");
      } else {
        // Nếu đã có timezone, parse bình thường
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) return "N/A";

      // Format với timezone Việt Nam (Asia/Ho_Chi_Minh = UTC+7)
      // toLocaleString sẽ tự động convert từ UTC sang VN timezone
      return date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const handleCancelOrder = (order: Order) => {
    // Chỉ cho phép hủy đơn hàng ở trạng thái PENDING
    if (order.status !== "PENDING") {
      Alert.alert(
        "Không thể hủy",
        "Chỉ có thể hủy đơn hàng đang ở trạng thái 'Chờ xác nhận'."
      );
      return;
    }

    Alert.alert(
      "Xác nhận hủy đơn hàng",
      `Bạn có chắc chắn muốn hủy đơn hàng #${
        order.id
      }?\n\nTổng tiền: ${formatCurrency(order.total)}`,
      [
        {
          text: "Không",
          style: "cancel",
        },
        {
          text: "Có, hủy đơn",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingOrderId(order.id);

              // Đảm bảo token được set
              const token = await AsyncStorage.getItem("auth_token");
              if (!token) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
                return;
              }
              setAuthToken(token);

              // Thử nhiều cách để hủy đơn (tùy vào backend implementation)
              try {
                // Cách 1: PUT /orders/{id} với status CANCELLED
                await axiosInstance.put(`/orders/${order.id}`, {
                  status: "CANCELLED",
                });
              } catch (err1: any) {
                // Cách 2: PATCH /orders/{id}/cancel
                try {
                  await axiosInstance.patch(`/orders/${order.id}/cancel`);
                } catch (err2: any) {
                  // Cách 3: PUT /orders/{id}/cancel
                  try {
                    await axiosInstance.put(`/orders/${order.id}/cancel`, {});
                  } catch (err3: any) {
                    throw err3;
                  }
                }
              }

              // Refresh danh sách đơn hàng để đảm bảo dữ liệu mới nhất
              await fetchOrders();

              Alert.alert("Thành công", "Đơn hàng đã được hủy thành công.", [
                {
                  text: "OK",
                  onPress: () => {
                    // Tự động chuyển sang tab "Đã hủy" nếu đang ở tab "Chờ xác nhận"
                    if (statusFilter === "PENDING") {
                      setStatusFilter("CANCELLED");
                    }
                  },
                },
              ]);
            } catch (error: any) {
              console.error("Lỗi khi hủy đơn hàng:", error);
              const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Không thể hủy đơn hàng. Vui lòng thử lại.";

              Alert.alert("Lỗi", errorMessage);
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceived = (order: Order) => {
    // Chỉ cho phép xác nhận đơn hàng ở trạng thái SHIPPING
    if (order.status !== "SHIPPING") {
      Alert.alert(
        "Không thể xác nhận",
        "Chỉ có thể xác nhận đơn hàng đang ở trạng thái 'Đang giao'."
      );
      return;
    }

    Alert.alert(
      "Xác nhận đã nhận hàng",
      `Bạn có chắc chắn đã nhận được hàng cho đơn hàng #${
        order.id
      }?\n\nTổng tiền: ${formatCurrency(
        order.total
      )}\n\nSau khi xác nhận, chứng tỏ bạn đã nhận được hàng. Đơn hàng sẽ được chuyển sang trạng thái 'Hoàn thành'.`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: async () => {
            setConfirmingOrderId(order.id);
            try {
              const token = await AsyncStorage.getItem("auth_token");
              if (!token) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
                return;
              }

              setAuthToken(token);
              await axiosInstance.put(`/orders/${order.id}`, {
                status: "COMPLETED",
              });

              // Refresh danh sách đơn hàng
              await fetchOrders();

              Alert.alert("Thành công", "Đã xác nhận nhận hàng thành công!", [
                {
                  text: "OK",
                  onPress: () => {
                    // Tự động chuyển sang tab "Hoàn tất" nếu đang ở tab "Đang giao"
                    if (statusFilter === "SHIPPING") {
                      setStatusFilter("COMPLETED");
                    }
                  },
                },
              ]);
            } catch (error: any) {
              console.error("Lỗi khi xác nhận nhận hàng:", error);
              const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Không thể xác nhận nhận hàng. Vui lòng thử lại.";

              Alert.alert("Lỗi", errorMessage);
            } finally {
              setConfirmingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const orderCounts = {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
    SHIPPING: orders.filter((o) => o.status === "SHIPPING").length,
    COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusInfo = getStatusInfo(item.status);
    const isPending = item.status === "PENDING";
    const isShipping = item.status === "SHIPPING";
    const isCancelling = cancellingOrderId === item.id;
    const isConfirming = confirmingOrderId === item.id;

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            router.push(`/mobile/page/accounts/OrderDetail?id=${item.id}`);
          }}
        >
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>Đơn hàng #{item.id}</Text>
              <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
            </View>
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
          <View style={styles.orderBody}>
            <Text style={styles.orderTotal}>
              Tổng tiền: {formatCurrency(item.total)}
            </Text>
            {item.orderItems && item.orderItems.length > 0 && (
              <Text style={styles.orderItems}>
                {item.orderItems.length} sản phẩm
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Nút hủy đơn - chỉ hiển thị cho đơn hàng PENDING */}
        {isPending && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                isCancelling && styles.cancelButtonDisabled,
              ]}
              onPress={() => handleCancelOrder(item)}
              activeOpacity={0.7}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.cancelButtonText}>Hủy đơn</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Nút đã nhận hàng - chỉ hiển thị cho đơn hàng SHIPPING */}
        {isShipping && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isConfirming && styles.confirmButtonDisabled,
              ]}
              onPress={() => handleConfirmReceived(item)}
              activeOpacity={0.7}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Đã nhận hàng</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C92127" />
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
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {[
            { value: "all", label: "Tất cả", count: orderCounts.all },
            {
              value: "PENDING",
              label: "Chờ xác nhận",
              count: orderCounts.PENDING,
            },
            {
              value: "PROCESSING",
              label: "Đang xử lý",
              count: orderCounts.PROCESSING,
            },
            {
              value: "SHIPPING",
              label: "Đang giao",
              count: orderCounts.SHIPPING,
            },
            {
              value: "COMPLETED",
              label: "Hoàn thành",
              count: orderCounts.COMPLETED,
            },
            {
              value: "CANCELLED",
              label: "Đã hủy",
              count: orderCounts.CANCELLED,
            },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setStatusFilter(filter.value)}
              style={[
                styles.filterButton,
                statusFilter === filter.value && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === filter.value && styles.filterTextActive,
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
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
    backgroundColor: "#F9FAFB",
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#C92127",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontWeight: "600",
  },
  orderBody: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C92127",
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 13,
    color: "#6B7280",
  },
  orderActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    marginTop: 16,
  },
});

export default MyOrder;
