import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useCart } from "../../context/CartContext";

export interface BuyNowButtonProps {
  bookId: number;
  bookTitle: string;
  stock: number;
  showIcon?: boolean;
}

const BuyNowButton: React.FC<BuyNowButtonProps> = ({
  bookId,
  bookTitle,
  stock,
  showIcon = true,
}) => {
  const router = useRouter();
  const { refreshCart } = useCart();
  const [isPressed, setIsPressed] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const isDisabled = stock === 0 || isAddingToCart;

  const handlePress = async () => {
    if (isDisabled) return;

    try {
      setIsAddingToCart(true);
      const token = await AsyncStorage.getItem("auth_token");

      console.log("🛒 Adding to cart - Book ID:", bookId);
      console.log(
        "🔑 Token from AsyncStorage:",
        token ? `${token.substring(0, 20)}...` : "NULL"
      );

      if (!token) {
        console.log("⚠️ No token found, showing alert before redirecting to login");
        // Hiển thị thông báo trước khi chuyển đến trang đăng nhập
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Bạn cần đăng nhập để thêm sách vào giỏ hàng. Vui lòng đăng nhập để tiếp tục.",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Đăng nhập",
              onPress: () => {
                // Điều hướng tới trang tài khoản/đăng nhập
                router.push({
                  pathname: "/account",
                  params: { next: "add_to_cart", bookId: String(bookId) },
                });
              },
            },
          ],
          { cancelable: true }
        );
        setIsAddingToCart(false);
        return;
      }

      // Đảm bảo token được set vào axios instance
      setAuthToken(token);
      console.log("✅ Token set to axios instance");

      // Gọi API /cart/add với request body theo format CartRequest
      console.log("🛒 Calling POST /cart/add...");

      const cartRequest = {
        bookId: bookId,
        quantity: 1,
      };

      console.log("📦 CartRequest body:", JSON.stringify(cartRequest, null, 2));

      const response = await axiosInstance.post("/cart/add", cartRequest);

      console.log("✅ Cart add response:", response.data);

      console.log("✅ Successfully added to cart");
      Alert.alert("Thành công", `Đã thêm "${bookTitle}" vào giỏ hàng`);

      // Refresh cart count ngay lập tức
      await refreshCart();
      console.log("🔄 Cart count refreshed");
    } catch (err: any) {
      console.error("❌ Error adding to cart:", err);
      console.error("❌ Response:", err?.response);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể thêm vào giỏ";
      Alert.alert("Lỗi", msg);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDisabled && styles.buttonDisabled,
        isPressed && !isDisabled && styles.buttonPressed,
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={isDisabled}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      {isAddingToCart ? (
        <ActivityIndicator size="small" color="#C92127" />
      ) : (
        <View style={styles.content}>
          {showIcon && (
            <Ionicons
              name="cart-outline"
              size={16}
              color={isPressed && !isDisabled ? "#FFFFFF" : "#C92127"}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              isDisabled && styles.buttonTextDisabled,
              isPressed && !isDisabled && styles.buttonTextPressed,
            ]}
          >
            Mua ngay
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: "#C92127",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    minHeight: 44,
  },
  buttonPressed: {
    backgroundColor: "#FFA500",
    borderColor: "#FFA500",
  },
  buttonDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 6,
  },
  buttonText: {
    color: "#C92127",
    fontWeight: "700",
    fontSize: 12,
  },
  buttonTextPressed: {
    color: "#FFFFFF",
  },
  buttonTextDisabled: {
    color: "#9CA3AF",
  },
});

export default BuyNowButton;
