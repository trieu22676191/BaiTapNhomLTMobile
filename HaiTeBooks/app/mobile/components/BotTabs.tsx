import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotification } from "../context/NotificationContext";
import AccountTab from "./tabs/AccountTab";
import CartTab from "./tabs/CartTab";
import HomeTab from "./tabs/HomeTab";
import NotificationsTab from "./tabs/NotificationsTab";
import SuggestionsTab from "./tabs/SuggestionsTab";

export type TabType =
  | "home"
  | "account"
  | "suggestions"
  | "notifications"
  | "cart";

interface BotTabsProps {
  activeTab?: TabType;
  onTabPress?: (tab: TabType) => void;
}

const BotTabs: React.FC<BotTabsProps> = ({
  activeTab = "home",
  onTabPress,
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>(activeTab);
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount, refreshUnreadCount } = useNotification();

  const handleTabPress = (tab: TabType) => {
    // Chỉ navigate khi route hiện tại khác với route mục tiêu
    if (tab === "account") {
      if (pathname !== "/account") {
        router.replace("/account");
      }
    } else if (tab === "home") {
      if (pathname !== "/") {
        router.replace("/");
      }
    } else if (tab === "cart") {
      if (pathname !== "/mobile/page/carts/Cart") {
        router.replace("/mobile/page/carts/Cart");
      }
    } else if (tab === "suggestions") {
      if (pathname !== "/mobile/page/suggestions/Suggestion") {
        router.replace("/mobile/page/suggestions/Suggestion");
      }
    } else if (tab === "notifications") {
      if (pathname !== "/mobile/page/notifications/Notification") {
        router.replace("/mobile/page/notifications/Notification");
      }
    }

    // Chỉ update state sau khi navigate để tránh double render
    // setCurrentTab sẽ được sync bởi useEffect
    onTabPress?.(tab);
  };

  // Sync active tab with current pathname when navigating programmatically
  useEffect(() => {
    if (pathname === "/") {
      setCurrentTab("home");
    } else if (pathname === "/account" || (pathname.startsWith("/mobile/page/accounts/") && !pathname.includes("/Chatbot"))) {
      // Nhận diện trang account và tất cả các trang con (MyOrder, OrderDetail, Voucher, etc.)
      // Loại trừ Chatbot để không highlight tab Account
      setCurrentTab("account");
    } else if (pathname === "/cart" || pathname === "/mobile/page/carts/Cart") {
      setCurrentTab("cart");
    } else if (pathname === "/mobile/page/suggestions/Suggestion") {
      setCurrentTab("suggestions");
    } else if (pathname === "/mobile/page/notifications/Notification") {
      setCurrentTab("notifications");
    } else if (pathname?.includes("/Chatbot")) {
      // Khi ở trang Chatbot, không highlight tab nào cả
      // Giữ nguyên tab hiện tại
    }
  }, [pathname]);

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress("home")}
          activeOpacity={0.7}
        >
          <HomeTab isActive={currentTab === "home"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress("cart")}
          activeOpacity={0.7}
        >
          <CartTab isActive={currentTab === "cart"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress("suggestions")}
          activeOpacity={0.7}
        >
          <SuggestionsTab isActive={currentTab === "suggestions"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => {
            handleTabPress("notifications");
            // ✅ Refresh unread count khi click vào notification tab
            refreshUnreadCount();
          }}
          activeOpacity={0.7}
        >
          <NotificationsTab 
            isActive={currentTab === "notifications"} 
            unreadCount={unreadCount}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress("account")}
          activeOpacity={0.7}
        >
          <AccountTab isActive={currentTab === "account"} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BotTabs;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabsContainer: {
    flexDirection: "row",
    height: 70,
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
