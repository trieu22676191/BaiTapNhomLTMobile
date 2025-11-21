import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import axiosInstance, { setAuthToken } from "../config/axiosConfig";
import { User } from "../types/user";

type NotificationContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  loading: false,
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setLoading(true);

      const savedUser = await AsyncStorage.getItem("auth_user");
      if (!savedUser) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const user: User = JSON.parse(savedUser);
      if (!user?.id) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/notifications/unread/${user.id}`);
      const data = response.data || [];
      setUnreadCount(data.length);

      console.log("🔄 Unread notifications refreshed, count:", data.length);
    } catch (error: any) {
      // Chỉ log error nếu không phải 401/403 (token invalid)
      // 401/403 sẽ được interceptor xử lý, không cần log lại
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        console.error("❌ Lỗi khi lấy số thông báo chưa đọc:", error);
      } else {
        console.log("⚠️ Token invalid - skipping notification refresh");
      }
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh khi app khởi động (delay một chút để token được verify trước)
  useEffect(() => {
    // Delay 1 giây để đảm bảo token đã được verify trong _layout.tsx
    const timeout = setTimeout(() => {
      refreshUnreadCount();
    }, 1000);
    
    // ✅ Refresh mỗi 5 giây để cập nhật nhanh hơn khi admin thay đổi trạng thái đơn hàng
    const interval = setInterval(refreshUnreadCount, 5000);
    
    // ✅ Refresh khi app active lại (từ background)
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("📱 App became active - refreshing notifications");
        refreshUnreadCount();
      }
    });
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, loading }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

