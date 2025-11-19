import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import axiosInstance, { setAuthToken } from "../config/axiosConfig";
import { User } from "../types/user";

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("auth_user");
      if (!savedUser) {
        setUnreadCount(0);
        return;
      }

      const user: User = JSON.parse(savedUser);
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setUnreadCount(0);
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/notifications/unread/${user.id}`);
      const data = response.data || [];
      setUnreadCount(data.length);
    } catch (error: any) {
      console.error("❌ Lỗi khi lấy số thông báo chưa đọc:", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh mỗi 30 giây
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { unreadCount, loading, refresh: fetchUnreadCount };
};

