import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Profile from "../../components/account/Profile"; // Thêm import
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { User } from "../../types/user"; // Thêm import
import Login from "./Login";
import Register from "./Register";
import RePass from "./RePass";

const Account: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // Thêm state
  const params = useLocalSearchParams<{ next?: string; bookId?: string }>();

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
      } catch {}
    };
    restoreSession();
  }, []);

  // Re-check session mỗi khi focus vào Account tab
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
          } else if (savedUser) {
            const parsed: User = JSON.parse(savedUser);
            setUser(parsed);
          }
        } catch (error) {
          console.error("Error checking session:", error);
          setUser(null);
        }
      };
      checkSession();
    }, [])
  );

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

  if (user.role_id === "admin") {
    return (
      <View style={styles.container}>
        <Text>Admin Dashboard (Sẽ thêm sau)</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.section} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đơn hàng của tôi</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
          <View style={styles.orderRow}>
            <View style={styles.orderItem}>
              <View style={styles.orderIcon}>
                <Ionicons name="wallet-outline" size={24} color="#111827" />
              </View>
              <Text style={styles.orderLabel}>Chờ thanh toán</Text>
            </View>
            <View style={styles.orderItem}>
              <View style={styles.orderIcon}>
                <Ionicons name="cube-outline" size={24} color="#111827" />
              </View>
              <Text style={styles.orderLabel}>Đang xử lý</Text>
            </View>
            <View style={styles.orderItem}>
              <View style={styles.orderIcon}>
                <Ionicons name="car-outline" size={24} color="#111827" />
              </View>
              <Text style={styles.orderLabel}>Đang giao hàng</Text>
            </View>
            <View style={styles.orderItem}>
              <View style={styles.orderIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="#111827"
                />
              </View>
              <Text style={styles.orderLabel}>Hoàn tất</Text>
            </View>
            <View style={styles.orderItem}>
              <View style={styles.orderIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color="#111827"
                />
              </View>
              <Text style={styles.orderLabel}>Đã huỷ</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.menuSection}>
          <MenuItem
            icon="person"
            iconColor="#C92127"
            label="Hồ sơ cá nhân"
            onPress={() => {
              console.log("Profile button clicked");
              setShowProfile(true);
            }}
          />
          <MenuItem
            icon="settings"
            iconColor="#C92127"
            label="Cài đặt ứng dụng"
          />
          <MenuItem
            icon="receipt"
            iconColor="#10B981"
            label="Ví voucher"
            badge={0} //dựa vào số lượng voucher trong database
          />
          <MenuItem
            icon="heart"
            iconColor="#C92127"
            label="Sản phẩm yêu thích"
          />
          <MenuItem icon="library" iconColor="#3B82F6" label="Sách theo bộ" />
          <MenuItem
            icon="help-circle"
            iconColor="#10B981"
            label="Trung tâm trợ giúp"
            iconType="filled-circle"
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
  },
  orderLabel: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
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
