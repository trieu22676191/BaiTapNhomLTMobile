import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import axiosInstance, { setAuthToken } from "../config/axiosConfig";

type ApiCartItem = {
  id: number;
  userId: number;
  bookId: number;
  quantity: number;
};

export const useCartCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCartCount = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setCount(0);
        return;
      }
      
      setAuthToken(token);
      
      // Lấy user info
      const userResponse = await axiosInstance.get("/users/me");
      const userId = userResponse.data.id;
      
      // Lấy cart items
      const cartResponse = await axiosInstance.get<ApiCartItem[]>(`/cart/user/${userId}`);
      const cartItems = cartResponse.data || [];
      
      // Đếm số sản phẩm khác nhau (số items), không phải tổng quantity
      const totalCount = cartItems.length;
      setCount(totalCount);
      
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh cart count mỗi khi user focus vào app
  useFocusEffect(
    useCallback(() => {
      fetchCartCount();
    }, [fetchCartCount])
  );

  return { count, loading, refresh: fetchCartCount };
};

