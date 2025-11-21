import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  const [errorCount, setErrorCount] = useState(0); // Đếm số lỗi liên tiếp

  const refreshUnreadCount = useCallback(async () => {
    // Sử dụng functional update để luôn có errorCount mới nhất
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
      const response = await axiosInstance.get(
        `/notifications/unread/${user.id}`
      );
      const data = response.data || [];
      setUnreadCount(data.length);
      setErrorCount(0); // Reset error count khi thành công

      console.log("🔄 Unread notifications refreshed, count:", data.length);
    } catch (error: any) {
      const status = error?.response?.status;

      // Xử lý các loại lỗi khác nhau
      if (status === 401 || status === 403) {
        // Token invalid - interceptor sẽ xử lý
        console.log("⚠️ Token invalid - skipping notification refresh");
        setUnreadCount(0);
        setErrorCount(0); // Reset error count cho auth errors
      } else if (status === 502 || status === 503 || status === 504) {
        // Bad Gateway / Service Unavailable / Gateway Timeout
        // Backend tạm thời không khả dụng - tăng error count và log (chỉ 3 lần đầu)
        setErrorCount((prev) => {
          const newCount = prev + 1;
          if (newCount <= 3) {
            // Chỉ log 3 lần đầu để tránh spam
            console.log(
              "⚠️ Backend temporarily unavailable (502/503/504) - keeping current count"
            );
          }
          return newCount;
        });
        // Không set unreadCount về 0, giữ nguyên giá trị hiện tại
      } else if (status >= 500) {
        // Server errors khác - tăng error count và log (chỉ 3 lần đầu)
        setErrorCount((prev) => {
          const newCount = prev + 1;
          if (newCount <= 3) {
            console.warn(
              "⚠️ Server error when fetching notifications:",
              status
            );
          }
          return newCount;
        });
        // Giữ nguyên count hiện tại thay vì set về 0
      } else {
        // Các lỗi khác (network, timeout, etc.) - không tăng error count
        console.warn(
          "⚠️ Error fetching notifications:",
          error?.message || "Unknown error"
        );
        // Giữ nguyên count hiện tại
      }
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

    return () => {
      clearTimeout(timeout);
    };
  }, [refreshUnreadCount]);

  // ✅ Refresh định kỳ với interval động dựa trên errorCount
  useEffect(() => {
    // Tính interval dựa trên số lỗi liên tiếp
    let intervalMs = 5000; // Mặc định 5 giây
    if (errorCount >= 5) {
      intervalMs = 30000; // 30 giây nếu có 5+ lỗi liên tiếp
    } else if (errorCount >= 3) {
      intervalMs = 15000; // 15 giây nếu có 3+ lỗi liên tiếp
    }

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [refreshUnreadCount, errorCount]);

  // ✅ Refresh khi app active lại (từ background)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          console.log("📱 App became active - refreshing notifications");
          refreshUnreadCount();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, refreshUnreadCount, loading }}
    >
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
