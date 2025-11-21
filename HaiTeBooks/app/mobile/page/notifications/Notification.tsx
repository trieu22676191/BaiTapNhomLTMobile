import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useNotification } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user";

interface Notification {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  senderId?: number;
  receiverId: number;
}

type TabType = "unread" | "read";

const Notification: React.FC = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { refreshUnreadCount, unreadCount } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("unread");

  // Load user từ AsyncStorage và fetch notifications
  useEffect(() => {
    const loadUserAndFetchNotifications = async () => {
      try {
        setLoading(true);
        
        // Load user trước
        const savedUser = await AsyncStorage.getItem("auth_user");
        if (!savedUser) {
          console.log("⚠️ No user found in AsyncStorage");
          setLoading(false);
          return;
        }

        let parsed: User = JSON.parse(savedUser);
        console.log("📋 Parsed user from AsyncStorage:", JSON.stringify(parsed, null, 2));
        console.log("📋 User ID:", parsed?.id);
        console.log("📋 User keys:", Object.keys(parsed || {}));

        // Load token trước
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          console.log("⚠️ No token found");
          setLoading(false);
          return;
        }

        setAuthToken(token);

        // Nếu user không có id, thử fetch lại từ API
        if (!parsed?.id) {
          console.log("⚠️ User ID not found in AsyncStorage, fetching from API...");
          
          try {
            const response = await axiosInstance.get("/users/me");
            const apiUser = response.data;
            
            console.log("📥 API User Response:", JSON.stringify(apiUser, null, 2));
            console.log("📥 API User ID:", apiUser?.id);
            console.log("📥 API User keys:", Object.keys(apiUser || {}));

            // Normalize user object từ API response
            parsed = {
              id: apiUser?.id || apiUser?.userId,
              username: apiUser?.username || parsed.username || "",
              password: "", // Không lưu password
              email: apiUser?.email || parsed.email || "",
              full_name: apiUser?.fullName || apiUser?.full_name || parsed.full_name || "",
              phone: apiUser?.phone || apiUser?.phoneNumber || apiUser?.sdt || parsed.phone || "",
              address: apiUser?.address || apiUser?.diaChi || parsed.address || "",
              role_id: (apiUser?.role?.name || apiUser?.role || apiUser?.role_id || parsed.role_id || "user").toString().toLowerCase().replace("role_", "") as "admin" | "user",
            };

            console.log("✅ Normalized User from API:", JSON.stringify(parsed, null, 2));
            console.log("✅ Normalized User ID:", parsed.id);

            // Cập nhật AsyncStorage với user đầy đủ thông tin
            await AsyncStorage.setItem("auth_user", JSON.stringify(parsed));
          } catch (apiError: any) {
            console.error("❌ Failed to fetch user from API:", apiError);
            console.error("❌ API Error details:", {
              message: apiError?.message,
              response: apiError?.response?.data,
              status: apiError?.response?.status,
            });
            setLoading(false);
            return;
          }
        }

        if (!parsed?.id) {
          console.error("❌ User ID still not found after API fetch");
          setLoading(false);
          return;
        }

        setUser(parsed);
        console.log("✅ User loaded with ID:", parsed.id);

        // Fetch notifications ngay sau khi có user và token
        console.log(`📡 Fetching notifications for user ${parsed.id}...`);
        const response = await axiosInstance.get(`/notifications/${parsed.id}`);
        const data = response.data || [];

        console.log("📥 Raw notifications data:", JSON.stringify(data, null, 2));
        console.log("📥 Data type:", Array.isArray(data) ? "array" : typeof data);
        console.log("📥 Data length:", Array.isArray(data) ? data.length : "N/A");

        // Kiểm tra nếu data không phải là array
        if (!Array.isArray(data)) {
          console.error("❌ Expected array but got:", typeof data);
          setNotifications([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // Normalize data - xử lý nhiều format có thể có
        const userId = parsed.id; // Lưu userId để dùng trong map
        const normalizedNotifications: Notification[] = data.map((noti: any, index: number) => {
          try {
            // Xử lý isRead với nhiều format có thể có
            // Jackson có thể serialize boolean isRead thành "read" hoặc "isRead"
            let isReadValue = false;
            if (noti.isRead !== undefined && noti.isRead !== null) {
              isReadValue = Boolean(noti.isRead);
            } else if (noti.is_read !== undefined && noti.is_read !== null) {
              isReadValue = Boolean(noti.is_read);
            } else if (noti.read !== undefined && noti.read !== null) {
              isReadValue = Boolean(noti.read);
            }

            // Xử lý createdAt - có thể là string hoặc object
            let createdAtValue = "";
            if (noti.createdAt) {
              if (typeof noti.createdAt === "string") {
                createdAtValue = noti.createdAt;
              } else if (typeof noti.createdAt === "object") {
                // Nếu là object (LocalDateTime từ Java), convert sang string
                createdAtValue = JSON.stringify(noti.createdAt);
              }
            } else if (noti.created_at) {
              createdAtValue = noti.created_at;
            }

            const normalized = {
              id: noti.id || index,
              title: noti.title || "",
              content: noti.content || "",
              createdAt: createdAtValue,
              isRead: isReadValue,
              senderId: noti.senderId || noti.sender_id,
              receiverId: noti.receiverId || noti.receiver_id || userId,
            };

            console.log(`📌 Notification ${normalized.id}:`, {
              raw: { 
                id: noti.id,
                isRead: noti.isRead, 
                is_read: noti.is_read, 
                read: noti.read,
                createdAt: noti.createdAt,
              },
              normalized: { 
                id: normalized.id,
                isRead: normalized.isRead,
                createdAt: normalized.createdAt,
              },
            });

            return normalized;
          } catch (error) {
            console.error(`❌ Error normalizing notification at index ${index}:`, error);
            console.error(`❌ Raw notification data:`, noti);
            // Return a fallback notification
            return {
              id: index,
              title: "Lỗi",
              content: "Không thể tải thông báo này",
              createdAt: "",
              isRead: false,
              receiverId: userId,
            };
          }
        });

        console.log(
          "✅ Normalized notifications:",
          JSON.stringify(
            normalizedNotifications.map((n) => ({ id: n.id, isRead: n.isRead })),
            null,
            2
          )
        );

        setNotifications(normalizedNotifications);
        console.log(`✅ Loaded ${normalizedNotifications.length} notifications`);
      } catch (error: any) {
        console.error("❌ Lỗi khi tải thông báo:", error);
        console.error("❌ Error details:", {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
        setNotifications([]);
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          Alert.alert("Lỗi", "Không thể tải thông báo. Vui lòng thử lại.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadUserAndFetchNotifications();
  }, []);

  // Fetch notifications function để dùng cho refresh
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log("⚠️ Cannot fetch notifications: user ID not available");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        console.log("⚠️ No token found for refresh");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setAuthToken(token);
      console.log(`📡 Refreshing notifications for user ${user.id}...`);
      const response = await axiosInstance.get(`/notifications/${user.id}`);
      const data = response.data || [];

      console.log("📥 Raw notifications data (refresh):", JSON.stringify(data, null, 2));
      console.log("📥 Data type:", Array.isArray(data) ? "array" : typeof data);
      console.log("📥 Data length:", Array.isArray(data) ? data.length : "N/A");

      // Kiểm tra nếu data không phải là array
      if (!Array.isArray(data)) {
        console.error("❌ Expected array but got:", typeof data);
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Normalize data
      const userId = user.id;
      const normalizedNotifications: Notification[] = data.map((noti: any, index: number) => {
        try {
          let isReadValue = false;
          if (noti.isRead !== undefined && noti.isRead !== null) {
            isReadValue = Boolean(noti.isRead);
          } else if (noti.is_read !== undefined && noti.is_read !== null) {
            isReadValue = Boolean(noti.is_read);
          } else if (noti.read !== undefined && noti.read !== null) {
            isReadValue = Boolean(noti.read);
          }

          // Xử lý createdAt - có thể là string hoặc object
          let createdAtValue = "";
          if (noti.createdAt) {
            if (typeof noti.createdAt === "string") {
              createdAtValue = noti.createdAt;
            } else if (typeof noti.createdAt === "object") {
              // Nếu là object (LocalDateTime từ Java), convert sang string
              createdAtValue = JSON.stringify(noti.createdAt);
            }
          } else if (noti.created_at) {
            createdAtValue = noti.created_at;
          }

          return {
            id: noti.id || index,
            title: noti.title || "",
            content: noti.content || "",
            createdAt: createdAtValue,
            isRead: isReadValue,
            senderId: noti.senderId || noti.sender_id,
            receiverId: noti.receiverId || noti.receiver_id || userId,
          };
        } catch (error) {
          console.error(`❌ Error normalizing notification at index ${index}:`, error);
          console.error(`❌ Raw notification data:`, noti);
          return {
            id: index,
            title: "Lỗi",
            content: "Không thể tải thông báo này",
            createdAt: "",
            isRead: false,
            receiverId: userId,
          };
        }
      });

      setNotifications(normalizedNotifications);
      console.log(`✅ Refreshed ${normalizedNotifications.length} notifications`);
    } catch (error: any) {
      console.error("❌ Lỗi khi refresh thông báo:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        Alert.alert("Lỗi", "Không thể tải thông báo. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Refresh badge khi focus vào trang (không refresh danh sách tự động)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // ✅ Chỉ refresh badge, không refresh danh sách tự động
        refreshUnreadCount();
      }
    }, [user?.id, refreshUnreadCount])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Đánh dấu đã đọc
  const handleMarkAsRead = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      setAuthToken(token);
      console.log(`🔄 Marking notification ${id} as read...`);
      await axiosInstance.put(`/notifications/mark-read/${id}`);
      console.log(`✅ Notification ${id} marked as read successfully`);

      // Update local state ngay lập tức
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === id ? { ...noti, isRead: true } : noti))
      );

      // ✅ Refresh unread count ngay lập tức để cập nhật badge
      refreshUnreadCount();

      // Refresh lại từ server sau 300ms để đảm bảo sync
      setTimeout(() => {
        if (user?.id) {
          fetchNotifications();
        }
      }, 300);
    } catch (error: any) {
      console.error("❌ Lỗi khi đánh dấu đã đọc:", error);
      console.error("❌ Error response:", error?.response?.data);
      Alert.alert("Lỗi", "Không thể đánh dấu đã đọc");
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      setAuthToken(token);
      console.log(
        `🔄 Marking all notifications as read for user ${user.id}...`
      );
      await axiosInstance.put(`/notifications/mark-all-read/${user.id}`);
      console.log(`✅ All notifications marked as read successfully`);

      // Update local state ngay lập tức
      setNotifications((prev) =>
        prev.map((noti) => ({ ...noti, isRead: true }))
      );

      // ✅ Refresh unread count ngay lập tức để cập nhật badge
      refreshUnreadCount();

      // Refresh lại từ server sau 300ms để đảm bảo sync
      setTimeout(() => {
        if (user?.id) {
          fetchNotifications();
        }
      }, 300);

      Alert.alert("Thành công", "Đã đánh dấu tất cả là đã đọc");
    } catch (error: any) {
      console.error("❌ Lỗi khi đánh dấu tất cả đã đọc:", error);
      console.error("❌ Error response:", error?.response?.data);
      Alert.alert("Lỗi", "Không thể đánh dấu tất cả đã đọc");
    }
  };

  // Xóa notification
  const handleDelete = async (id: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("auth_token");
            if (!token) return;

            setAuthToken(token);
            await axiosInstance.delete(`/notifications/${id}`);

            // Update local state
            const deletedNotification = notifications.find((n) => n.id === id);
            setNotifications((prev) => prev.filter((noti) => noti.id !== id));

            // ✅ Nếu xóa notification chưa đọc, refresh unread count
            if (deletedNotification && !deletedNotification.isRead) {
              refreshUnreadCount();
            }
          } catch (error: any) {
            console.error("❌ Lỗi khi xóa thông báo:", error);
            Alert.alert("Lỗi", "Không thể xóa thông báo");
          }
        },
      },
    ]);
  };

  // Parse order ID từ notification content
  const parseOrderId = (content: string): number | null => {
    // Tìm pattern "Đơn hàng #123" hoặc "Đơn #123" hoặc "#123"
    const match = content.match(/#(\d+)/);
    if (match && match[1]) {
      const orderId = parseInt(match[1], 10);
      return isNaN(orderId) ? null : orderId;
    }
    return null;
  };

  // Kiểm tra xem notification có liên quan đến đơn hàng không
  const isOrderNotification = (item: Notification): boolean => {
    const orderKeywords = [
      "đơn hàng",
      "đặt hàng",
      "đơn",
      "order",
      "giao hàng",
      "vận chuyển",
      "hoàn tất",
      "hủy",
    ];
    const contentLower = item.content.toLowerCase();
    const titleLower = item.title.toLowerCase();
    return (
      orderKeywords.some((keyword) => contentLower.includes(keyword)) ||
      orderKeywords.some((keyword) => titleLower.includes(keyword))
    );
  };

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;

      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "";
    }
  };

  // Handle notification press
  const handleNotificationPress = (item: Notification) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }

    // Nếu là notification về đơn hàng, navigate đến OrderDetail
    if (isOrderNotification(item)) {
      const orderId = parseOrderId(item.content);
      if (orderId) {
        router.push(`/mobile/page/accounts/OrderDetail?id=${orderId}`);
        return;
      }
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead && styles.notificationItemUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadDot} />}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
          </View>
          <Text style={styles.notificationText}>{item.content}</Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const localUnreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  // Filter notifications theo tab
  const filteredNotifications = notifications.filter((noti) => {
    if (activeTab === "unread") {
      return !noti.isRead;
    } else {
      return noti.isRead;
    }
  });

  // Render empty state với message phù hợp theo tab
  const renderEmptyForTab = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Đang tải...
          </Text>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Vui lòng đăng nhập để xem thông báo
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {activeTab === "unread"
            ? "Hiện tại chưa có thông báo mới"
            : "Không có thông báo đã đọc"}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabSection}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "unread" && styles.tabActive]}
            onPress={() => setActiveTab("unread")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "unread" && styles.tabTextActive,
              ]}
            >
              Chưa đọc
            </Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "read" && styles.tabActive]}
            onPress={() => setActiveTab("read")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "read" && styles.tabTextActive,
              ]}
            >
              Đã đọc
            </Text>
          </TouchableOpacity>
        </View>
        {/* Nút đánh dấu tất cả đã đọc - chỉ hiển thị ở tab Chưa đọc */}
        {activeTab === "unread" && unreadCount > 0 && (
          <View style={styles.markAllContainer}>
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {loading && notifications.length === 0 ? (
        renderEmptyForTab()
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={
            filteredNotifications.length === 0
              ? styles.listContentEmpty
              : styles.listContent
          }
          ListEmptyComponent={renderEmptyForTab}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
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
    minHeight: 56,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  tabSection: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  markAllContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  markAllButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  markAllText: {
    fontSize: 13,
    color: "#C92127",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
  },
  notificationItemUnread: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C92127",
    zIndex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 8,
  },
  tabActive: {
    borderBottomColor: "#C92127",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#C92127",
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "#C92127",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default Notification;
