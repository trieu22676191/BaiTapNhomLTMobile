import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { User } from "../../types/user";

interface LoginProps {
  onLoginSuccess?: (user: User) => void;
  onRegisterPress?: () => void;
  onForgotPress?: () => void;
}

const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onRegisterPress,
  onForgotPress,
}) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = username.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const loginData = {
        username,
        password,
      };

      const response = await axiosInstance.post("/auth/login", loginData);

      console.log("🔐 Login Response:", response.data);

      // Lấy token và cấu hình header Authorization
      const token = response.data?.token;
      console.log(
        "🔑 Token from login:",
        token ? `${token.substring(0, 30)}...` : "NULL"
      );

      if (token) {
        setAuthToken(token);
        console.log("✅ Token saved to axios and AsyncStorage");
        try {
          await AsyncStorage.setItem("auth_token", token);
        } catch {}
      } else {
        console.log("⚠️ No token in login response!");
      }

      // Nếu đăng nhập thành công, response có thể chứa user data hoặc token
      const userData = response.data?.user || response.data;

      // Tạo User object từ response - xử lý nhiều format
      const user: User = {
        id: userData?.id || userData?.userId || undefined,
        username: userData?.username || username,
        password: "", // Không lưu password
        email: userData?.email || "",
        full_name: userData?.fullName || userData?.full_name || "",
        phone: userData?.phone || userData?.phoneNumber || userData?.sdt || "",
        address: userData?.address || userData?.diaChi || "",
        role_id: userData?.role || userData?.role_id || "user",
      };

      console.log("Mapped User from Login:", JSON.stringify(user, null, 2));

      // Persist user for session restore
      try {
        await AsyncStorage.setItem("auth_user", JSON.stringify(user));
      } catch {}

      onLoginSuccess?.(user);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu!";
      setError(errorMessage);
      Alert.alert("Lỗi đăng nhập", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRed, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Đăng nhập</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              Chào mừng bạn đến với HaiTeBooks
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Tên tài khoản</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Nhập tên tài khoản của bạn"
              placeholderTextColor="#9CA3AF"
              keyboardType="default"
              autoCapitalize="none"
              style={styles.input}
              editable={!loading}
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Mật khẩu</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIconContainer}
                activeOpacity={0.7}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onForgotPress}
                disabled={loading}
              >
                <Text style={styles.forgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}></View>
            <TouchableOpacity
              style={[
                styles.loginBtn,
                (!isValid || loading) && styles.loginBtnDisabled,
              ]}
              disabled={!isValid || loading}
              activeOpacity={0.8}
              onPress={handleLogin}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.loginText,
                    (!isValid || loading) && styles.loginTextDisabled,
                  ]}
                >
                  Đăng nhập
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.orRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>Hoặc</Text>
              <View style={styles.divider} />
            </View>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: "#DB4437" }]}
                activeOpacity={0.8}
              >
                <View style={styles.socialContent}>
                  <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                  <Text style={styles.socialText}>Google</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: "#1877F2" }]}
                activeOpacity={0.8}
              >
                <View style={styles.socialContent}>
                  <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
                  <Text style={styles.socialText}>Facebook</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Chưa có tài khoản?</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onRegisterPress}>
                <Text style={styles.linkText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRed: {
    backgroundColor: "#C92127",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  keyboardView: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: "center", marginTop: 16, marginBottom: 16 },
  subtitle: { fontSize: 13, color: "#6B7280" },

  form: { marginTop: 16 },
  label: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }) as number,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  passwordInputContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingRight: 40,
    paddingVertical: Platform.select({ ios: 12, android: 10 }) as number,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  eyeIconContainer: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 8,
  },
  checkboxText: { color: "#4B5563", fontSize: 12 },
  forgot: {
    color: "#C92127",
    fontSize: 12,
    fontWeight: "700",
    paddingTop: 10,
    paddingRight: 10,
  },

  loginBtn: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#C92127",
    alignItems: "center",
    paddingVertical: 12,
  },
  loginBtnDisabled: { backgroundColor: "#F3F4F6" },
  loginText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  loginTextDisabled: { color: "#9CA3AF" },

  orRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divider: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  orText: { marginHorizontal: 10, color: "#6B7280", fontSize: 12 },

  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  socialContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  socialText: { color: "#111827", fontWeight: "700" },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  footerText: { color: "#6B7280", marginRight: 6 },
  linkText: { color: "#C92127", fontWeight: "800" },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 8,
    paddingHorizontal: 4,
    textAlign: "center",
  },
});

export default Login;
