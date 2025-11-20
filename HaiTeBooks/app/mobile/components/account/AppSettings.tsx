import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../types/user";

interface AppSettingsProps {
  user: User;
  onBack?: () => void;
  onAccountDeleted?: () => void;
}

type Language = "vi" | "en";

const AppSettings: React.FC<AppSettingsProps> = ({
  user,
  onBack,
  onAccountDeleted,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme, setTheme: setThemeContext } = useTheme();
  const [language, setLanguage] = useState<Language>("vi");
  const [loading, setLoading] = useState(false);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log(
      "AppSettings component mounted, user:",
      user?.id,
      user?.username
    );
    if (!user) {
      console.error("AppSettings: user is null or undefined!");
    }
  }, [user]);

  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account states
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load saved language
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("app_language");
        if (savedLanguage === "vi" || savedLanguage === "en") {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };
    loadLanguage();
  }, []);

  // Save language
  const handleLanguageChange = async (newLang: Language) => {
    try {
      await AsyncStorage.setItem("app_language", newLang);
      setLanguage(newLang);
      Alert.alert("Thành công", "Ngôn ngữ đã được thay đổi");
    } catch (error) {
      console.error("Error saving language:", error);
      Alert.alert("Lỗi", "Không thể lưu cài đặt ngôn ngữ");
    }
  };

  // Handle theme change
  const handleThemeChange = (value: boolean) => {
    const newTheme = value ? "dark" : "light";
    setThemeContext(newTheme);
  };

  // Change password
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await axiosInstance.put("/users/change-password", {
        oldPassword,
        newPassword,
      });

      if (response.status === 200) {
        Alert.alert("Thành công", "Đổi mật khẩu thành công", [
          {
            text: "OK",
            onPress: () => {
              setShowChangePassword(false);
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể đổi mật khẩu. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // Verify password for delete account
  const handleVerifyDeletePassword = async () => {
    if (!deletePassword) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    try {
      // Verify password by trying to login
      const response = await axiosInstance.post("/auth/login", {
        username: user.username,
        password: deletePassword,
      });

      if (response.data && response.data.token) {
        setShowConfirmDelete(true);
      }
    } catch (error: any) {
      console.error("Error verifying password:", error);
      Alert.alert("Lỗi", "Mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "XÓA TÀI KHOẢN") {
      Alert.alert("Lỗi", 'Vui lòng nhập chính xác "XÓA TÀI KHOẢN"');
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await axiosInstance.delete("/users/me", {
        data: { password: deletePassword },
      });

      if (response.status === 200 || response.status === 204) {
        Alert.alert("Thành công", "Tài khoản đã được xóa", [
          {
            text: "OK",
            onPress: () => {
              if (onAccountDeleted) {
                onAccountDeleted();
              }
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể xóa tài khoản. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setDeletingAccount(false);
    }
  };

  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.primary },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt ứng dụng</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ngôn ngữ</Text>
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                language === "vi" && [
                  styles.languageButtonActive,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ],
              ]}
              onPress={() => handleLanguageChange("vi")}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: colors.textSecondary },
                  language === "vi" && [
                    styles.languageTextActive,
                    { color: "#FFFFFF" },
                  ],
                ]}
              >
                Tiếng Việt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                language === "en" && [
                  styles.languageButtonActive,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ],
              ]}
              onPress={() => handleLanguageChange("en")}
            >
              <Text
                style={[
                  styles.languageText,
                  { color: colors.textSecondary },
                  language === "en" && [
                    styles.languageTextActive,
                    { color: "#FFFFFF" },
                  ],
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Setting */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Chế độ xem
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {isDark ? "Tối" : "Sáng"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: "#D1D5DB", true: "#C92127" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Change Password */}
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

        {/* Delete Account */}
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
                Yêu cầu xóa tài khoản
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
                    Vui lòng nhập mật khẩu để xác nhận yêu cầu xóa tài khoản
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
                    Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể
                    hoàn tác.
                  </Text>
                  <Text
                    style={[
                      styles.confirmText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Vui lòng nhập "XÓA TÀI KHOẢN" để xác nhận
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
                      placeholder='Nhập "XÓA TÀI KHOẢN"'
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
                        <Text style={styles.submitButtonText}>
                          Xóa tài khoản
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  languageContainer: {
    flexDirection: "row",
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  languageButtonActive: {
    backgroundColor: "#C92127",
    borderColor: "#C92127",
  },
  languageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  languageTextActive: {
    color: "#FFFFFF",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#6B7280",
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

export default AppSettings;
