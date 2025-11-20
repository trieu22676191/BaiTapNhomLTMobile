import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";

interface RegisterProps {
  onBackToLogin?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBackToLogin }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role] = useState("user");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation regex patterns
  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  const emailRegex = /^[\w\.-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  const usernameRegex = /^[A-Za-z][A-Za-z0-9_]{4,19}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,32}$/;

  // Error states for each field
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  // Validation functions
  const validateUsername = (value: string) => {
    if (value.trim().length === 0) {
      setUsernameError("Tên đăng nhập không được để trống");
      return false;
    }
    if (!usernameRegex.test(value)) {
      setUsernameError(
        "Tên đăng nhập phải bắt đầu bằng chữ cái, dài 5-20 ký tự, chỉ chứa chữ, số và dấu gạch dưới"
      );
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const validateEmail = (value: string) => {
    if (value.trim().length === 0) {
      setEmailError("Email không được để trống");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("Email không hợp lệ");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateFullName = (value: string) => {
    if (value.trim().length === 0) {
      setFullNameError("Họ và tên không được để trống");
      return false;
    }
    setFullNameError(null);
    return true;
  };

  const validateAddress = (value: string) => {
    if (value.trim().length === 0) {
      setAddressError("Địa chỉ không được để trống");
      return false;
    }
    setAddressError(null);
    return true;
  };

  const validatePhone = (value: string) => {
    if (value.trim().length === 0) {
      setPhoneError("Số điện thoại không được để trống");
      return false;
    }
    if (!phoneRegex.test(value)) {
      setPhoneError(
        "Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678"
      );
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validatePassword = (value: string) => {
    if (value.trim().length === 0) {
      setPasswordError("Mật khẩu không được để trống");
      return false;
    }
    if (!passwordRegex.test(value)) {
      setPasswordError(
        "Mật khẩu phải có 8-32 ký tự, bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&._-)"
      );
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (value.trim().length === 0) {
      setConfirmPasswordError("Xác nhận mật khẩu không được để trống");
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError("Mật khẩu không khớp");
      return false;
    }
    setConfirmPasswordError(null);
    return true;
  };

  // Check if all fields are valid
  const isValid =
    usernameError === null &&
    emailError === null &&
    fullNameError === null &&
    addressError === null &&
    phoneError === null &&
    passwordError === null &&
    confirmPasswordError === null &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    fullName.trim().length > 0 &&
    address.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword;

  // Update handlers with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.trim().length > 0) {
      validateUsername(value);
    } else {
      setUsernameError(null);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim().length > 0) {
      validateEmail(value);
    } else {
      setEmailError(null);
    }
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (value.trim().length > 0) {
      validateFullName(value);
    } else {
      setFullNameError(null);
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (value.trim().length > 0) {
      validateAddress(value);
    } else {
      setAddressError(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (value.trim().length > 0) {
      validatePhone(value);
    } else {
      setPhoneError(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.trim().length > 0) {
      validatePassword(value);
      // Re-validate confirm password when password changes
      if (confirmPassword.trim().length > 0) {
        validateConfirmPassword(confirmPassword);
      }
    } else {
      setPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value.trim().length > 0) {
      validateConfirmPassword(value);
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleRegister = async () => {
    // Validate all fields before submit
    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isFullNameValid = validateFullName(fullName);
    const isAddressValid = validateAddress(address);
    const isPhoneValid = validatePhone(phone);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (
      !isUsernameValid ||
      !isEmailValid ||
      !isFullNameValid ||
      !isAddressValid ||
      !isPhoneValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registerData = {
        username,
        email,
        fullName,
        address,
        phone,
        password,
        confirmpassword: confirmPassword,
        role,
      };

      const response = await axiosInstance.post("/auth/register", registerData);

      Alert.alert("Thành công", "Đăng ký tài khoản thành công!", [
        {
          text: "OK",
          onPress: () => {
            if (onBackToLogin) {
              onBackToLogin();
            } else {
              router.replace("/account");
            }
          },
        },
      ]);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Đăng ký thất bại. Vui lòng thử lại!";
      setError(errorMessage);
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Đăng ký</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            value={username}
            onChangeText={handleUsernameChange}
            onBlur={() => validateUsername(username)}
            placeholder="Nhập tên đăng nhập"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            autoCapitalize="none"
            style={[styles.input, usernameError && styles.inputError]}
          />
          {usernameError && (
            <Text style={styles.errorText}>{usernameError}</Text>
          )}

          <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={handleEmailChange}
            onBlur={() => validateEmail(email)}
            placeholder="Nhập email"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, emailError && styles.inputError]}
          />
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}

          <Text style={[styles.label, { marginTop: 14 }]}>Họ và tên</Text>
          <TextInput
            value={fullName}
            onChangeText={handleFullNameChange}
            onBlur={() => validateFullName(fullName)}
            placeholder="Nhập họ và tên"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            style={[styles.input, fullNameError && styles.inputError]}
          />
          {fullNameError && (
            <Text style={styles.errorText}>{fullNameError}</Text>
          )}

          <Text style={[styles.label, { marginTop: 14 }]}>Địa chỉ</Text>
          <TextInput
            value={address}
            onChangeText={handleAddressChange}
            onBlur={() => validateAddress(address)}
            placeholder="Nhập địa chỉ"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            style={[styles.input, addressError && styles.inputError]}
          />
          {addressError && <Text style={styles.errorText}>{addressError}</Text>}

          <Text style={[styles.label, { marginTop: 14 }]}>Số điện thoại</Text>
          <TextInput
            value={phone}
            onChangeText={handlePhoneChange}
            onBlur={() => validatePhone(phone)}
            placeholder="Nhập số điện thoại"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            style={[styles.input, phoneError && styles.inputError]}
          />
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

          <Text style={[styles.label, { marginTop: 14 }]}>Mật khẩu</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              value={password}
              onChangeText={handlePasswordChange}
              onBlur={() => validatePassword(password)}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, passwordError && styles.inputError]}
            />
            <TouchableOpacity
              style={styles.eyeIconContainer}
              activeOpacity={0.7}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
          {passwordError && (
            <Text style={styles.errorText}>{passwordError}</Text>
          )}

          <Text style={[styles.label, { marginTop: 14 }]}>
            Xác nhận mật khẩu
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              onBlur={() => validateConfirmPassword(confirmPassword)}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              style={[
                styles.passwordInput,
                confirmPasswordError && styles.inputError,
              ]}
            />
            <TouchableOpacity
              style={styles.eyeIconContainer}
              activeOpacity={0.7}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError && (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.registerBtn,
              (!isValid || loading) && styles.registerBtnDisabled,
            ]}
            disabled={!isValid || loading}
            activeOpacity={0.8}
            onPress={handleRegister}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.registerText,
                  (!isValid || loading) && styles.registerTextDisabled,
                ]}
              >
                Đăng Ký
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Bạn đã có tài khoản? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                onBackToLogin ? onBackToLogin() : router.push("/account")
              }
            >
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Bằng việc đăng ký, bạn đã đồng ý với HaiTeBooks.com về{" "}
              <Text
                style={styles.termsLink}
                onPress={() => router.push("" as any)}
              >
                Điều khoản sử dụng
              </Text>{" "}
              &{" "}
              <Text
                style={styles.termsLink}
                onPress={() => router.push("" as any)}
              >
                Chính sách bảo mật
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.footerLeft}
          onPress={() => router.push("" as any)}
        >
          <Ionicons name="help-circle-outline" size={16} color="#111827" />
          <Text style={styles.helpText}>Trung tâm trợ giúp</Text>
        </TouchableOpacity>
        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.flagButton} activeOpacity={0.7}>
            <Text style={styles.flagEmoji}>🇻🇳</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.flagButton} activeOpacity={0.7}>
            <Text style={styles.flagEmoji}>🇬🇧</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Đủ không gian cho footer
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 6,
  },
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
  inputError: {
    borderColor: "#EF4444",
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
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  registerBtn: {
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: "#C92127",
    alignItems: "center",
    paddingVertical: 12,
  },
  registerBtnDisabled: {
    backgroundColor: "#F3F4F6",
  },
  registerText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  registerTextDisabled: {
    color: "#9CA3AF",
  },
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  loginPromptText: {
    color: "#6B7280",
    fontSize: 14,
  },
  loginLink: {
    color: "#C92127",
    fontSize: 14,
    fontWeight: "700",
  },
  termsContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    textAlign: "center",
  },
  termsLink: {
    color: "#3B82F6",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 20, android: 16 }) as number,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helpText: {
    fontSize: 12,
    color: "#111827",
  },
  footerRight: {
    flexDirection: "row",
    gap: 8,
  },
  flagButton: {
    padding: 4,
  },
  flagEmoji: {
    fontSize: 24,
  },
});

export default Register;
