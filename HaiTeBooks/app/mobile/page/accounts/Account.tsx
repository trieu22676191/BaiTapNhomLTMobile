import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppSettings from "../../components/account/AppSettings"; // Thêm import
import Profile from "../../components/account/Profile"; // Thêm import
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useCart } from "../../context/CartContext";
import { useNotification } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user"; // Thêm import
import Login from "./Login";
import Register from "./Register";
import RePass from "./RePass";

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
}

const Account: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshCart } = useCart();
  const { refreshUnreadCount } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [voucherCount, setVoucherCount] = useState(0);
  const [viewedOrderIds, setViewedOrderIds] = useState<Set<number>>(new Set());
  const params = useLocalSearchParams<{
    next?: string;
    bookId?: string;
    refresh?: string;
  }>();

  // Rehydrate session when Account mounts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, savedUser] = await Promise.all([
          AsyncStorage.getItem("auth_token"),
          AsyncStorage.getItem("auth_user"),
        ]);
        if (token) {
          setAuthToken(token);
        }
        if (savedUser) {
          const parsed: User = JSON.parse(savedUser);
          setUser(parsed);
        }

        // Kiểm tra payment status nếu có pending payment
        await checkPendingPayment();
      } catch {}
    };
    restoreSession();

    // Lắng nghe khi app được mở lại từ background (sau khi thanh toán VNPay)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Khi app active lại, kiểm tra payment status
        checkPendingPayment();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Kiểm tra payment status nếu có pending payment
  const checkPendingPayment = async () => {
    try {
      const pendingOrderId = await AsyncStorage.getItem(
        "pending_payment_order"
      );
      if (!pendingOrderId) return;

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      setAuthToken(token);

      // ✅ BỎ API /payments/order/ - Kiểm tra order status trực tiếp
      try {
        const orderResponse = await axiosInstance.get(
          `/orders/${pendingOrderId}`
        );
        const order = orderResponse.data;

        // Kiểm tra nếu order có paymentMethod = VNPAY và status = PENDING (đã thanh toán thành công)
        const isVNPayOrder =
          (order.paymentMethod === "VNPAY" ||
            order.paymentMethod === "vnpay") &&
          (order.status === "PENDING" || order.status === "pending");

        if (isVNPayOrder) {
          // Payment thành công, xóa pending và refresh cart
          await AsyncStorage.multiRemove([
            "pending_payment_order",
            "pending_payment_txnRef",
          ]);
          await refreshCart();
          Alert.alert(
            "Thanh toán thành công!",
            `Đơn hàng #${pendingOrderId} đã được thanh toán thành công.`,
            [{ text: "OK" }]
          );
        }
      } catch (orderError) {
        // Ignore errors khi check order
        console.log("Check pending payment (order):", orderError);
      }
    } catch (error) {
      // Ignore errors khi check payment
      console.log("Check pending payment:", error);
    }
  };

  // Fetch orders của user
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingOrders(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      setAuthToken(token);
      const response = await axiosInstance.get(`/orders/user/${user.id}`);
      const rawOrders = response.data || [];

      // Normalize orders - đảm bảo status là uppercase
      const newOrders = rawOrders.map((order: any) => ({
        ...order,
        status: (order.status || order.statusOrder || "").toUpperCase(),
      }));

      // ✅ Phát hiện đơn hàng có trạng thái thay đổi và xóa khỏi viewedOrderIds
      // để đơn hàng đó được coi là "chưa xem" ở trạng thái mới
      setOrders((prevOrders) => {
        if (prevOrders.length === 0) {
          // Lần đầu load, không cần so sánh
          return newOrders;
        }

        // Tạo map để so sánh trạng thái cũ và mới
        const prevOrderMap = new Map(prevOrders.map((o) => [o.id, o.status]));
        const statusChangedOrderIds: number[] = [];

        newOrders.forEach((newOrder: Order) => {
          const prevStatus = prevOrderMap.get(newOrder.id);
          if (prevStatus && prevStatus !== newOrder.status) {
            // Trạng thái đã thay đổi
            statusChangedOrderIds.push(newOrder.id);
          }
        });

        // Xóa các đơn hàng có trạng thái thay đổi khỏi viewedOrderIds
        if (statusChangedOrderIds.length > 0) {
          // Load viewedOrderIds hiện tại
          AsyncStorage.getItem("viewed_order_ids")
            .then((viewedData) => {
              const viewedIds = viewedData ? JSON.parse(viewedData) : [];
              const newViewedIds = viewedIds.filter(
                (id: number) => !statusChangedOrderIds.includes(id)
              );

              // Cập nhật AsyncStorage
              AsyncStorage.setItem(
                "viewed_order_ids",
                JSON.stringify(newViewedIds)
              ).then(() => {
                // Cập nhật state
                setViewedOrderIds(new Set(newViewedIds));
              });
            })
            .catch((err) => {
              console.warn("⚠️ Error updating viewed orders:", err);
            });
        }

        return newOrders;
      });

      // ✅ Reload viewedOrderIds mỗi khi fetch orders để cập nhật badge
      // (sau khi đã xử lý status changes ở trên)
      setTimeout(async () => {
        try {
          const viewedData = await AsyncStorage.getItem("viewed_order_ids");
          if (viewedData) {
            const viewedIds: number[] = JSON.parse(viewedData);
            const viewedSet = new Set<number>(viewedIds);
            setViewedOrderIds(viewedSet);
          } else {
            setViewedOrderIds(new Set());
          }
        } catch (viewedError) {
          console.warn("⚠️ Error loading viewed orders:", viewedError);
          setViewedOrderIds(new Set());
        }
      }, 100); // Delay nhỏ để đảm bảo AsyncStorage đã được cập nhật
    } catch (error: any) {
      const status = error?.response?.status;

      // Xử lý các loại lỗi khác nhau
      if (status === 401 || status === 403) {
        // Token invalid - interceptor sẽ xử lý
        console.log("⚠️ Token invalid - skipping orders fetch");
        setOrders([]);
      } else if (status === 502 || status === 503 || status === 504) {
        // Bad Gateway / Service Unavailable / Gateway Timeout
        // Backend tạm thời không khả dụng - không log error, giữ nguyên orders hiện tại
        console.log(
          "⚠️ Backend temporarily unavailable (502/503/504) - keeping current orders"
        );
        // Không set orders về [], giữ nguyên giá trị hiện tại
      } else if (status >= 500) {
        // Server errors khác - log nhưng không crash
        console.warn("⚠️ Server error when fetching orders:", status);
        // Giữ nguyên orders hiện tại
      } else {
        // Các lỗi khác (network, timeout, etc.)
        console.warn(
          "⚠️ Error fetching orders:",
          error?.message || "Unknown error"
        );
        // Chỉ set về [] nếu không phải lỗi server
        setOrders([]);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id]);

  const fetchVoucherCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setVoucherCount(0);
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get("/promotions");
      const rawData = response.data || [];

      const activeCount = rawData
        .map((promo: any) => ({
          id: promo.id,
          name: promo.name,
          discountPercent: promo.discountPercent,
          startDate: promo.startDate,
          endDate: promo.endDate,
          quantity: promo.quantity,
          isActive:
            promo.isActive !== undefined
              ? promo.isActive
              : promo.active !== undefined
              ? promo.active
              : true,
          approvedByUserId: promo.approvedByUserId || promo.approvedBy,
          status: promo.status,
        }))
        .filter((promo: any) => {
          const isApproved =
            promo.approvedByUserId != null || promo.status === "approved";
          const isActive = promo.isActive && promo.status !== "deactivated";
          const now = new Date();
          const startDate = new Date(promo.startDate);
          const endDate = new Date(promo.endDate);
          const isStarted = startDate <= now;
          const isNotExpired = endDate >= now;
          const hasQuantity = promo.quantity > 0;

          return (
            isApproved && isActive && isStarted && isNotExpired && hasQuantity
          );
        }).length;

      setVoucherCount(activeCount);
    } catch (error: any) {
      // Xử lý lỗi một cách graceful - không crash app
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        error?.response?.statusText ||
        "Unknown error";
      const statusCode = error?.response?.status;

      console.error("Error fetching voucher count:", {
        message: errorMessage,
        status: statusCode,
        error: error,
      });

      // Với lỗi 502 (Bad Gateway), có thể là backend tạm thời không khả dụng
      // Set về 0 và không hiển thị badge
      setVoucherCount(0);
    }
  }, []);

  // Re-check session và refresh orders mỗi khi focus vào Account tab
  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        try {
          const [token, savedUser] = await Promise.all([
            AsyncStorage.getItem("auth_token"),
            AsyncStorage.getItem("auth_user"),
          ]);

          // Nếu không có token hoặc savedUser, logout
          if (!token || !savedUser) {
            setUser(null);
            setShowProfile(false);
            setOrders([]);
          } else if (savedUser) {
            const parsed: User = JSON.parse(savedUser);
            setUser(parsed);
            // Refresh orders khi quay lại Account
            if (parsed.id) {
              const token = await AsyncStorage.getItem("auth_token");
              if (token) {
                setAuthToken(token);
                try {
                  const response = await axiosInstance.get(
                    `/orders/user/${parsed.id}`
                  );
                  const rawOrders = response.data || [];
                  // Normalize orders - đảm bảo status là uppercase
                  const normalizedOrders = rawOrders.map((order: any) => ({
                    ...order,
                    status: (
                      order.status ||
                      order.statusOrder ||
                      ""
                    ).toUpperCase(),
                  }));
                  setOrders(normalizedOrders);
                } catch (error) {
                  console.error("Error fetching orders:", error);
                }
              }
            }
          }

          // ✅ Reload viewed orders để cập nhật badge - QUAN TRỌNG!
          const viewedData = await AsyncStorage.getItem("viewed_order_ids");
          if (viewedData) {
            const viewedIds: number[] = JSON.parse(viewedData);
            const viewedSet = new Set<number>(viewedIds);
            setViewedOrderIds(viewedSet);
          } else {
            setViewedOrderIds(new Set());
          }
        } catch (error) {
          console.error("Error checking session:", error);
          setUser(null);
          setOrders([]);
        }
      };
      checkSession();
      fetchVoucherCount();
      // ✅ Refresh notification khi focus vào Account tab (để cập nhật khi admin thay đổi trạng thái)
      refreshUnreadCount();
    }, [fetchVoucherCount, refreshUnreadCount])
  );

  // Fetch orders khi user thay đổi
  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id, fetchOrders]);

  // ✅ Refresh orders khi app active lại (từ background)
  useEffect(() => {
    if (!user?.id) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchOrders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id, fetchOrders]);

  // ✅ Tự động reload orders định kỳ để badge cập nhật (5 giây)
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      // Chỉ reload khi app đang active
      if (AppState.currentState === "active") {
        fetchOrders();
      }
    }, 5000); // 5 giây

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, fetchOrders]);

  useEffect(() => {
    fetchVoucherCount();
  }, [fetchVoucherCount]);

  // Load viewed order IDs từ AsyncStorage
  useEffect(() => {
    const loadViewedOrders = async () => {
      try {
        const viewedData = await AsyncStorage.getItem("viewed_order_ids");
        if (viewedData) {
          const viewedIds = JSON.parse(viewedData);
          setViewedOrderIds(new Set(viewedIds));
        }
      } catch (error) {
        console.error("Lỗi khi load viewed orders:", error);
      }
    };
    loadViewedOrders();
  }, []);

  // Đếm số lượng orders chưa xem theo status (phải đặt trước early returns)
  // Normalize status để so sánh (uppercase)
  const orderCounts = {
    pending: orders.filter(
      (o) =>
        (o.status?.toUpperCase() || "") === "PENDING" &&
        !viewedOrderIds.has(o.id)
    ).length,
    processing: orders.filter(
      (o) =>
        (o.status?.toUpperCase() || "") === "PROCESSING" &&
        !viewedOrderIds.has(o.id)
    ).length,
    shipping: orders.filter(
      (o) =>
        (o.status?.toUpperCase() || "") === "SHIPPING" &&
        !viewedOrderIds.has(o.id)
    ).length,
    completed: orders.filter(
      (o) =>
        (o.status?.toUpperCase() || "") === "COMPLETED" &&
        !viewedOrderIds.has(o.id)
    ).length,
    cancelled: orders.filter(
      (o) =>
        (o.status?.toUpperCase() || "") === "CANCELLED" &&
        !viewedOrderIds.has(o.id)
    ).length,
  };

  const handleLogout = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem("auth_token"),
        AsyncStorage.removeItem("auth_user"),
      ]);
    } catch {}
    setAuthToken(undefined);
    setUser(null);
    setShowProfile(false);
  }, []);

  if (!user) {
    if (showRegister) {
      return <Register onBackToLogin={() => setShowRegister(false)} />;
    }
    if (showRePass) {
      return <RePass />;
    }
    return (
      <Login
        onLoginSuccess={async (userData: User) => {
          setUser(userData);
          if (params?.next === "add_to_cart" && params?.bookId) {
            try {
              await axiosInstance.post("/cart/add", {
                bookId: Number(params.bookId),
                quantity: 1,
              });
            } catch {}
          }
          // Chuyển sang trang chủ sau khi đăng nhập thành công
          router.replace("/");
        }}
        onRegisterPress={() => setShowRegister(true)}
        onForgotPress={() => setShowRePass(true)}
      />
    );
  }

  // Nếu đang hiển thị Profile
  if (showProfile) {
    return (
      <Profile
        user={user}
        onBack={() => setShowProfile(false)}
        onLogout={handleLogout}
      />
    );
  }

  // Nếu đang hiển thị AppSettings
  if (showAppSettings && user) {
    return (
      <AppSettings
        user={user}
        onBack={() => {
          setShowAppSettings(false);
        }}
        onAccountDeleted={handleLogout}
      />
    );
  }

  if (user.role_id === "admin") {
    return (
      <View style={styles.container}>
        <Text>Admin Dashboard (Sẽ thêm sau)</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.7}
          onPress={() => router.push("/mobile/page/accounts/MyOrder")}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đơn hàng của tôi</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
          <View style={styles.orderRow}>
            <TouchableOpacity
              style={styles.orderItem}
              onPress={() =>
                router.push("/mobile/page/accounts/MyOrder?status=PENDING")
              }
            >
              <View style={styles.orderIcon}>
                <Ionicons name="wallet-outline" size={24} color="#111827" />
                {orderCounts.pending > 0 && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>
                      {orderCounts.pending > 99 ? "99+" : orderCounts.pending}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.orderLabel}>Chờ xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.orderItem}
              onPress={() =>
                router.push("/mobile/page/accounts/MyOrder?status=PROCESSING")
              }
            >
              <View style={styles.orderIcon}>
                <Ionicons name="cube-outline" size={24} color="#111827" />
                {orderCounts.processing > 0 && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>
                      {orderCounts.processing > 99
                        ? "99+"
                        : orderCounts.processing}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.orderLabel}>Đang xử lý</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.orderItem}
              onPress={() =>
                router.push("/mobile/page/accounts/MyOrder?status=SHIPPING")
              }
            >
              <View style={styles.orderIcon}>
                <Ionicons name="car-outline" size={24} color="#111827" />
                {orderCounts.shipping > 0 && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>
                      {orderCounts.shipping > 99 ? "99+" : orderCounts.shipping}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.orderLabel}>Đang giao</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View style={styles.menuSection}>
          <MenuItem
            icon="person"
            iconColor="#C92127"
            label="Hồ sơ cá nhân"
            onPress={() => {
              setShowProfile(true);
            }}
          />
          <MenuItem
            icon="settings"
            iconColor="#C92127"
            label="Cài đặt ứng dụng"
            onPress={() => {
              setShowAppSettings(true);
            }}
          />
          <MenuItem
            icon="receipt"
            iconColor="#10B981"
            label="Ví voucher"
            badge={voucherCount > 0 ? voucherCount : undefined}
            onPress={() => router.push("/mobile/page/accounts/Voucher")}
          />
          <MenuItem
            icon="heart"
            iconColor="#C92127"
            label="Sản phẩm yêu thích"
            onPress={() => router.push("/mobile/page/accounts/FavoriteBooks")}
          />
          <MenuItem
            icon="help-circle"
            iconColor="#10B981"
            label="Trung tâm trợ giúp"
            iconType="filled-circle"
            onPress={() => router.push("/mobile/page/accounts/HelpCenter")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface MenuItemProps {
  icon: string;
  iconColor: string;
  label: string;
  badge?: number;
  iconType?: "outline" | "filled-circle" | "custom-circle";
  onPress?: () => void; // Thêm onPress prop
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconColor,
  label,
  badge,
  iconType = "outline",
  onPress, // Thêm onPress
}) => {
  const renderIcon = () => {
    if (iconType === "filled-circle") {
      return (
        <View style={[styles.menuIconCircle, { backgroundColor: iconColor }]}>
          <Ionicons name={icon as any} size={16} color="#FFFFFF" />
        </View>
      );
    }
    if (iconType === "custom-circle") {
      return (
        <View style={[styles.menuIconCircle, { backgroundColor: iconColor }]}>
          <Text style={styles.menuIconText}>F</Text>
        </View>
      );
    }
    return (
      <Ionicons name={`${icon}-outline` as any} size={24} color={iconColor} />
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.menuLeft}>
        {renderIcon()}
        <Text style={styles.menuLabel}>{label}</Text>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#C92127",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    gap: 4,
  },
  warningMain: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  warningLink: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  section: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  orderItem: {
    alignItems: "center",
    flex: 1,
  },
  orderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  orderLabel: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
  },
  orderBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#C92127",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  orderBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  menuLabel: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  badge: {
    backgroundColor: "#C92127",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default Account;
