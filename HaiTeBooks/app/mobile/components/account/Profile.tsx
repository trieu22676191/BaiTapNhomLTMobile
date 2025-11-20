import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
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
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});

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
        // Khởi tạo form với dữ liệu hiện tại
        setEditForm({
          fullName: mappedUser.full_name || "",
          email: mappedUser.email || "",
          phone: mappedUser.phone || "",
          address: mappedUser.address || "",
        });
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
        setEditForm({
          fullName: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          address: user.address || "",
        });
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

  // Validate form
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    let isValid = true;

    if (!editForm.fullName || editForm.fullName.trim() === "") {
      errors.fullName = "Họ và tên không được để trống";
      isValid = false;
    }

    if (!editForm.email || editForm.email.trim() === "") {
      errors.email = "Email không được để trống";
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        errors.email = "Email không hợp lệ";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // Xử lý chỉnh sửa
  const handleEdit = () => {
    setIsEditing(true);
    setFormErrors({});
  };

  // Xử lý hủy chỉnh sửa
  const handleCancel = () => {
    setIsEditing(false);
    setFormErrors({});
    // Khôi phục dữ liệu ban đầu
    if (displayUser) {
      setEditForm({
        fullName: displayUser.full_name || "",
        email: displayUser.email || "",
        phone: displayUser.phone || "",
        address: displayUser.address || "",
      });
    }
  };

  // Xử lý lưu thông tin
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin đã nhập");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await axiosInstance.put("/users/me", {
        username: displayUser.username, // Giữ nguyên username
        email: editForm.email.trim(),
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
      });

      // Cập nhật userData với dữ liệu mới từ API
      const apiUser = response.data;
      const apiAddress =
        apiUser?.address || apiUser?.diaChi || apiUser?.fullAddress || "";

      const updatedUser: User = {
        id: apiUser?.id || displayUser.id,
        username: apiUser?.username || displayUser.username || "",
        password: "",
        email: apiUser?.email || editForm.email,
        full_name: apiUser?.fullName || apiUser?.full_name || editForm.fullName,
        phone:
          apiUser?.phone ||
          apiUser?.phoneNumber ||
          apiUser?.sdt ||
          editForm.phone ||
          "",
        address: apiAddress || editForm.address || "",
        role_id: displayUser.role_id || "user",
      };

      setUserData(updatedUser);
      setIsEditing(false);
      setFormErrors({});

      Alert.alert("Thành công", "Cập nhật thông tin thành công");
    } catch (err: any) {
      console.error("Error updating user data:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật thông tin";
      setError(errorMessage);
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSaving(false);
    }
  };

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
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>{displayUser.username}</Text>
              {!isEditing && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#C92127" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.infoSection}>
            <InfoRow
              label="Tên đăng nhập"
              value={displayUser.username || "-"}
              editable={false}
            />
            {isEditing ? (
              <>
                <EditInfoRow
                  label="Họ và tên"
                  value={editForm.fullName}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, fullName: text })
                  }
                  error={formErrors.fullName}
                  placeholder="Nhập họ và tên"
                />
                <EditInfoRow
                  label="Email"
                  value={editForm.email}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, email: text })
                  }
                  error={formErrors.email}
                  placeholder="Nhập email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <EditInfoRow
                  label="Số điện thoại"
                  value={editForm.phone}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, phone: text })
                  }
                  error={formErrors.phone}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
                <EditInfoRow
                  label="Địa chỉ"
                  value={editForm.address}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, address: text })
                  }
                  error={formErrors.address}
                  placeholder="Nhập địa chỉ"
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : (
              <>
                <InfoRow label="Họ và tên" value={displayUser.full_name || "-"} />
                <InfoRow label="Email" value={displayUser.email || "-"} />
                <InfoRow label="Số điện thoại" value={displayUser.phone || "-"} />
                <InfoRow label="Địa chỉ" value={displayUser.address || "-"} />
              </>
            )}
          </View>

          {/* Nút Lưu/Hủy khi đang chỉnh sửa */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  editable?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, editable = true }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

interface EditInfoRowProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  numberOfLines?: number;
}

const EditInfoRow: React.FC<EditInfoRowProps> = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
  numberOfLines = 1,
}) => {
  return (
    <View style={styles.editInfoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          error && styles.textInputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
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
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
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
  editInfoRow: {
    gap: 6,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    minHeight: 44,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  textInputError: {
    borderColor: "#EF4444",
  },
  actionButtons: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: "#C92127",
  },
  saveButton: {
    backgroundColor: "#10B981",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Profile;
