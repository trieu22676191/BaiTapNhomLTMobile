import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";
import { User } from "../../types/user";
import LogoutButton from "./LogoutButton";

interface ProfileProps {
  user: User; // Nhận user object (có id)
  onBack?: () => void;
  onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onBack, onLogout }) => {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Kiểm tra khi component mount
  useEffect(() => {
    console.log("Profile component mounted with user:", user?.id, user?.username);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Gọi API /users/me
        const response = await axiosInstance.get<any>("/users/me");

        // Debug: Xem response từ API
        console.log(
          "User API Response:",
          JSON.stringify(response.data, null, 2)
        );
        console.log("All API response keys:", Object.keys(response.data || {}));
        console.log("API fields check:", {
          phone: response.data?.phone,
          phoneNumber: response.data?.phoneNumber,
          sdt: response.data?.sdt,
          address: response.data?.address,
          diaChi: response.data?.diaChi,
          fullAddress: response.data?.fullAddress,
        });
        console.log("User prop address:", user.address);

        // Map dữ liệu từ UserResponse: id, username, email, fullName, phone, address
        const apiUser = response.data;

        // Debug: Kiểm tra address từ API
        const apiAddress =
          apiUser?.address || apiUser?.diaChi || apiUser?.fullAddress || "";

        console.log("Address mapping:", {
          "apiUser.address": apiUser?.address,
          "apiUser.diaChi": apiUser?.diaChi,
          "apiUser.fullAddress": apiUser?.fullAddress,
          "final apiAddress": apiAddress,
          "user.address (prop)": user.address,
          "final address": apiAddress || user.address || "",
        });

        const mappedUser: User = {
          id: apiUser?.id || user.id,
          username: apiUser?.username || user.username || "",
          password: "", // Không lưu password
          email: apiUser?.email || user.email || "",
          full_name:
            apiUser?.fullName || apiUser?.full_name || user.full_name || "",
          phone:
            apiUser?.phone ||
            apiUser?.phoneNumber ||
            apiUser?.sdt ||
            user.phone ||
            "",
          address: apiAddress || user.address || "", // Ưu tiên API, sau đó user prop
          role_id: user.role_id || "user", // Backend không trả về role_id, giữ từ user prop
        };

        console.log("Mapped User Data:", JSON.stringify(mappedUser, null, 2));
        console.log("Final address value:", mappedUser.address);

        setUserData(mappedUser);
      } catch (err: any) {
        console.error("Error fetching user data:", err);
        setError(
          err?.response?.status === 403
            ? "Request failed with status code 403"
            : err?.response?.data?.message ||
                err?.message ||
                "Không thể tải thông tin người dùng"
        );
        // Fallback: dùng thông tin từ user prop nếu API fail
        setUserData(user);
      } finally {
        setLoading(false);
      }
    };

    // Fetch dữ liệu khi component mount hoặc user.id thay đổi
    fetchUserData();
  }, [user?.id]); // Fetch lại khi user.id thay đổi

  // Tính toán displayUser trước khi sử dụng (đảm bảo hooks được gọi cùng thứ tự)
  const displayUser = userData || user;

  // Debug: Kiểm tra giá trị address khi hiển thị
  useEffect(() => {
    if (!loading && displayUser) {
      console.log("Display User Debug:", {
        "userData?.address": userData?.address,
        "user.address": user.address,
        "displayUser.address": displayUser.address,
        "has userData": !!userData,
      });
    }
  }, [userData, user, loading]); // Bỏ displayUser khỏi dependency vì nó được tính từ userData và user

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C92127" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error} - Đang hiển thị thông tin từ phiên đăng nhập
            </Text>
          </View>
        )}

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={48} color="#C92127" />
            </View>
            <Text style={styles.usernameText}>{displayUser.username}</Text>
          </View>

          <View style={styles.infoSection}>
            <InfoRow
              label="Tên đăng nhập"
              value={displayUser.username || "-"}
            />
            <InfoRow label="Họ và tên" value={displayUser.full_name || "-"} />
            <InfoRow label="Email" value={displayUser.email || "-"} />
            <InfoRow label="Số điện thoại" value={displayUser.phone || "-"} />
            <InfoRow label="Địa chỉ" value={displayUser.address || "-"} />
          </View>
        </View>

        {/* Logout button */}
        {onLogout ? <LogoutButton onPress={onLogout} /> : null}
      </ScrollView>
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#C92127",
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
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
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
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#C92127",
  },
  usernameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
});

export default Profile;
