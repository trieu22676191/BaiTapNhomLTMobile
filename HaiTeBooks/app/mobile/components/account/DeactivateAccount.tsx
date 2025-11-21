import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user";

interface DeactivateAccountProps {
  user: User;
  onAccountDeactivated?: () => void;
}

const DeactivateAccount: React.FC<DeactivateAccountProps> = ({
  user,
  onAccountDeactivated,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verify password for delete account
  const handleVerifyDeletePassword = async () => {
    if (!deletePassword || deletePassword.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    try {
      // ✅ Đảm bảo token được set trước khi gọi API
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
        setLoading(false);
        return;
      }
      setAuthToken(token);

      // Verify password by trying to login
      const response = await axiosInstance.post("/auth/login", {
        username: user.username,
        password: deletePassword.trim(),
      });

      if (response.data && response.data.token) {
        setShowConfirmDelete(true);
      }
    } catch (error: any) {
      console.error("Error verifying password:", error);

      // ✅ Kiểm tra nếu là lỗi 401/403 (token hết hạn)
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          [
            {
              text: "OK",
              onPress: async () => {
                // Clear auth data
                await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
                setAuthToken(undefined);
                // ✅ Chuyển về trang đăng nhập
                router.replace("/account");
              },
            },
          ]
        );
      } else {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Mật khẩu không đúng";
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "XÁC NHẬN") {
      Alert.alert("Lỗi", 'Vui lòng nhập chính xác "XÁC NHẬN"');
      return;
    }

    if (!deletePassword || deletePassword.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }

    setDeletingAccount(true);
    try {
      // ✅ Đảm bảo token được set trước khi gọi API
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          [
            {
              text: "OK",
              onPress: async () => {
                // Clear auth data
                await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
                setAuthToken(undefined);
                // ✅ Chuyển về trang đăng nhập
                router.replace("/account");
              },
            },
          ]
        );
        setDeletingAccount(false);
        return;
      }
      setAuthToken(token);

      // ✅ Backend có thể yêu cầu password trong body hoặc query param
      // Thử gửi password trong body trước (nếu backend hỗ trợ)
      // Nếu không, có thể cần gửi trong query param hoặc header
      const response = await axiosInstance.delete("/users/me", {
        data: { password: deletePassword.trim() },
      });

      if (response.status === 200 || response.status === 204) {
        const successMessage =
          response.data?.message || "Tài khoản đã được vô hiệu hóa thành công";
        Alert.alert("Thành công", successMessage, [
          {
            text: "OK",
            onPress: async () => {
              // ✅ Đăng xuất: Clear auth data
              await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
              setAuthToken(undefined);

              // ✅ Chuyển về trang đăng nhập
              router.replace("/account");

              // ✅ Gọi callback nếu có
              if (onAccountDeactivated) {
                onAccountDeactivated();
              }
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);

      // ✅ Xử lý các lỗi cụ thể từ backend
      let errorMessage = "Không thể xóa tài khoản. Vui lòng thử lại.";
      let shouldRedirectToLogin = false;

      if (error.response) {
        const backendMessage = error.response?.data?.message;
        if (backendMessage) {
          errorMessage = backendMessage;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 400) {
          errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
        } else if (
          error.response.status === 401 ||
          error.response.status === 403
        ) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
          shouldRedirectToLogin = true;
        } else if (error.response.status === 404) {
          errorMessage = "Không tìm thấy tài khoản.";
        } else if (error.response.status === 500) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (shouldRedirectToLogin) {
        Alert.alert("Lỗi", errorMessage, [
          {
            text: "OK",
            onPress: async () => {
              // Clear auth data
              await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
              setAuthToken(undefined);
              // ✅ Chuyển về trang đăng nhập
              router.replace("/account");
            },
          },
        ]);
      } else {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowDeleteAccount(!showDeleteAccount)}
        activeOpacity={0.7}
      >
        <View style={styles.actionButtonLeft}>
          <Ionicons name="trash-outline" size={24} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}>
            Vô hiệu hóa tài khoản
          </Text>
        </View>
        <Ionicons
          name={showDeleteAccount ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {showDeleteAccount && (
        <View style={styles.deleteForm}>
          {!showConfirmDelete ? (
            <>
              <Text style={[styles.warningText, { color: colors.error }]}>
                Vui lòng nhập mật khẩu để xác nhận vô hiệu hóa tài khoản
              </Text>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Mật khẩu
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  styles.deleteButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleVerifyDeletePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.warningText, { color: colors.error }]}>
                Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Tài khoản sẽ bị vô
                hiệu hóa và bạn sẽ không thể đăng nhập lại.
              </Text>
              <Text
                style={[styles.confirmText, { color: colors.textSecondary }]}
              >
                Vui lòng nhập "XÁC NHẬN" để xác nhận
              </Text>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Xác nhận xóa
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder='Nhập "XÁC NHẬN"'
                  placeholderTextColor={colors.textSecondary}
                  value={confirmDeleteText}
                  onChangeText={setConfirmDeleteText}
                />
              </View>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, styles.deleteActionButton]}
                  onPress={() => {
                    setShowConfirmDelete(false);
                    setConfirmDeleteText("");
                    setDeletePassword("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    styles.deleteButton,
                    deletingAccount && styles.submitButtonDisabled,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Xóa tài khoản</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  deleteForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
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
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#C92127",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  warningText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 16,
    lineHeight: 20,
  },
  confirmText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    fontStyle: "italic",
  },
  deleteActions: {
    flexDirection: "row",
    gap: 12,
  },
  deleteActionButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DeactivateAccount;
