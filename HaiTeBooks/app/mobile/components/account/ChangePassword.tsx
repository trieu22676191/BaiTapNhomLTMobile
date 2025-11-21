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

interface ChangePasswordProps {
  onPasswordChanged?: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({
  onPasswordChanged,
}) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Change password
  const handleChangePassword = async () => {
    // ✅ Validation: Kiểm tra mật khẩu cũ không được để trống
    if (!oldPassword || oldPassword.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu cũ");
      return;
    }

    // ✅ Validation: Kiểm tra mật khẩu mới không được để trống
    if (!newPassword || newPassword.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới");
      return;
    }

    // ✅ Validation: Kiểm tra xác nhận mật khẩu không được để trống
    if (!confirmPassword || confirmPassword.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập xác nhận mật khẩu");
      return;
    }

    // ✅ Validation: Mật khẩu mới phải có ít nhất 6 ký tự
    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    // ✅ Validation: Mật khẩu mới và xác nhận mật khẩu phải khớp
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    setChangingPassword(true);
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
              onPress: () => {
                // ✅ Chuyển về trang đăng nhập
                router.replace("/account");
              },
            },
          ]
        );
        setChangingPassword(false);
        return;
      }
      setAuthToken(token);

      // ✅ Sửa từ PUT sang POST để khớp với backend
      const response = await axiosInstance.post("/users/change-password", {
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      });

      // ✅ Backend trả về Map<String, String> với key "message"
      if (response.status === 200) {
        Alert.alert(
          "Thành công",
          "Mật khẩu đã được thay đổi, hãy đăng nhập lại để tiếp tục sử dụng",
          [
            {
              text: "OK",
              onPress: async () => {
                // ✅ Clear form
                setShowChangePassword(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");

                // ✅ Đăng xuất: Clear auth data
                await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
                setAuthToken(undefined);

                // ✅ Chuyển về trang đăng nhập
                router.replace("/account");

                // ✅ Gọi callback nếu có
                if (onPasswordChanged) {
                  onPasswordChanged();
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Error changing password:", error);

      // ✅ Xử lý các lỗi cụ thể từ backend
      let errorMessage = "Không thể đổi mật khẩu. Vui lòng thử lại.";

      if (error.response) {
        // Lỗi từ backend (400, 401, 500, etc.)
        const backendMessage = error.response?.data?.message;

        if (backendMessage) {
          errorMessage = backendMessage;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 400) {
          // Validation errors từ backend
          const validationErrors = error.response?.data;
          if (validationErrors && typeof validationErrors === "object") {
            const firstError = Object.values(validationErrors)[0];
            errorMessage = Array.isArray(firstError)
              ? firstError[0]
              : String(firstError);
          } else {
            errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
          }
        } else if (
          error.response.status === 401 ||
          error.response.status === 403
        ) {
          // ✅ Nếu là lỗi 401/403 (token hết hạn), chuyển về trang đăng nhập
          if (
            error.response.status === 401 &&
            !error.response?.data?.message?.includes("Mật khẩu")
          ) {
            // Token hết hạn, không phải lỗi mật khẩu
            errorMessage =
              "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
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
            setChangingPassword(false);
            return;
          } else {
            // Lỗi mật khẩu cũ không đúng
            errorMessage = "Mật khẩu cũ không đúng";
          }
        } else if (error.response.status === 500) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Lỗi", errorMessage);
    } finally {
      setChangingPassword(false);
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
        onPress={() => setShowChangePassword(!showChangePassword)}
        activeOpacity={0.7}
      >
        <View style={styles.actionButtonLeft}>
          <Ionicons
            name="lock-closed-outline"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            Đổi mật khẩu
          </Text>
        </View>
        <Ionicons
          name={showChangePassword ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {showChangePassword && (
        <View style={styles.passwordForm}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Mật khẩu cũ
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
              placeholder="Nhập mật khẩu cũ"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Mật khẩu mới
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
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Xác nhận mật khẩu
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
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.submitButton,
              changingPassword && styles.submitButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Đổi mật khẩu</Text>
            )}
          </TouchableOpacity>
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
  passwordForm: {
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
});

export default ChangePassword;
