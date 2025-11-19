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

const Notification: React.FC = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user từ AsyncStorage
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
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setLoading(false);
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/notifications/${user.id}`);
      const data = response.data || [];

      console.log("📥 Raw notifications data:", JSON.stringify(data, null, 2));

      // Normalize data - xử lý nhiều format có thể có
      const normalizedNotifications: Notification[] = data.map((noti: any) => {
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

        const normalized = {
          id: noti.id,
          title: noti.title || "",
          content: noti.content || "",
          createdAt: noti.createdAt || noti.created_at || "",
          isRead: isReadValue,
          senderId: noti.senderId || noti.sender_id,
          receiverId: noti.receiverId || noti.receiver_id,
        };

        console.log(`📌 Notification ${normalized.id}:`, {
          raw: { isRead: noti.isRead, is_read: noti.is_read, read: noti.read },
          normalized: { isRead: normalized.isRead },
        });

        return normalized;
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
    } catch (error: any) {
      console.error("❌ Lỗi khi tải thông báo:", error);
      setNotifications([]);
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        Alert.alert("Lỗi", "Không thể tải thông báo");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Fetch khi user thay đổi
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Refresh khi focus vào trang
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchNotifications();
      }
    }, [user?.id, fetchNotifications])
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
            setNotifications((prev) => prev.filter((noti) => noti.id !== id));
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
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.isRead && <View style={styles.unreadDot} />}
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

  // Render empty state
  const renderEmpty = () => {
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
          Không có thông báo nào
        </Text>
      </View>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading && notifications.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={
            notifications.length === 0
              ? styles.listContentEmpty
              : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 12,
    color: "#FFFFFF",
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C92127",
    marginLeft: 8,
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
});

export default Notification;
