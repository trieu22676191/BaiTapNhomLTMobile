import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BotTabs from "../app/mobile/components/BotTabs";
import Header from "../app/mobile/components/Header";
import { setAuthToken } from "../app/mobile/config/axiosConfig";
import { CartProvider } from "../app/mobile/context/CartContext";

export default function RootLayout() {
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
          </Stack>
          <BotTabs />
        </View>
      </CartProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
