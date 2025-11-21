import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BotTabs from "../app/mobile/components/BotTabs";
import Header from "../app/mobile/components/Header";
import { setAuthToken } from "../app/mobile/config/axiosConfig";
import { CartProvider } from "../app/mobile/context/CartContext";
import { ThemeProvider } from "../app/mobile/context/ThemeContext";

export default function RootLayout() {
  const router = useRouter();

  // ✅ Handle deep linking khi app được mở từ URL (ví dụ: từ VNPay redirect)
  useEffect(() => {
    // Lắng nghe deep link khi app đang chạy
    const subscription = Linking.addEventListener("url", (event) => {
      const { url } = event;
      console.log("🔗 Deep link received:", url);

      // Kiểm tra nếu là VNPay return URL
      if (url.includes("/payment/VNPayReturn") || url.includes("vnp_TxnRef")) {
        // Parse URL để lấy params
        const parsed = Linking.parse(url);
        console.log("📋 Parsed deep link:", parsed);

        // Navigate đến VNPayReturn với params
        if (
          parsed.path === "mobile/page/payment/VNPayReturn" ||
          url.includes("VNPayReturn")
        ) {
          router.push({
            pathname: "/mobile/page/payment/VNPayReturn",
            params: parsed.queryParams || {},
          });
        }
      }
    });

    // Kiểm tra initial URL khi app mở từ deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🔗 Initial deep link:", url);
        if (
          url.includes("/payment/VNPayReturn") ||
          url.includes("vnp_TxnRef")
        ) {
          const parsed = Linking.parse(url);
          if (
            parsed.path === "mobile/page/payment/VNPayReturn" ||
            url.includes("VNPayReturn")
          ) {
            router.push({
              pathname: "/mobile/page/payment/VNPayReturn",
              params: parsed.queryParams || {},
            });
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Restore và verify token khi app khởi động
  useEffect(() => {
    const restoreAndVerifyToken = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        if (token) {
          setAuthToken(token);
          console.log("Token restored from AsyncStorage");

          // Verify token bằng cách gọi API /users/me
          try {
            const axiosInstance =
              require("../app/mobile/config/axiosConfig").default;
            await axiosInstance.get("/users/me");
            console.log("✅ Token verified successfully");
          } catch (verifyError: any) {
            // Token invalid (401/403) hoặc user không tồn tại
            if (
              verifyError?.response?.status === 401 ||
              verifyError?.response?.status === 403
            ) {
              console.log("🔴 Token invalid - Clearing auth data");
              await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
              setAuthToken(undefined);
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore token:", error);
      }
    };
    restoreAndVerifyToken();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CartProvider>
          <View style={styles.container}>
            <Stack
              screenOptions={{
                header: () => <Header />,
                animation: "none",
                animationTypeForReplace: "pop",
                animationDuration: 0,
                presentation: "card",
              }}
            >
              <Stack.Screen
                name="account"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="account/register"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/carts/Cart"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/suggestions/Suggestion"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/notifications/Notification"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/checkout/Checkout"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/accounts/MyOrder"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/homes/CategoryBooks"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/accounts/Voucher"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/accounts/OrderDetail"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="mobile/page/payment/VNPayReturn"
                options={{
                  headerShown: false,
                  animation: "none",
                }}
              />
            </Stack>
            <BotTabs />
          </View>
        </CartProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
