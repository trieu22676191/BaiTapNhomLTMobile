import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axiosInstance, { setAuthToken } from "../config/axiosConfig";

type ApiCartItem = {
  id: number;
  userId: number;
  bookId: number;
  quantity: number;
};

type CartContextType = {
  cartCount: number;
  refreshCart: () => Promise<void>;
  loading: boolean;
};

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  refreshCart: async () => {},
  loading: false,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setCartCount(0);
        setLoading(false);
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
      setCartCount(totalCount);
      
      console.log("🔄 Cart refreshed, count:", totalCount, "items");
      
    } catch (error) {
      console.error("Error refreshing cart:", error);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // KHÔNG tự động fetch khi mount để tránh gọi API không cần thiết
  // Chỉ fetch khi component nào đó gọi refreshCart() explicitly
  // useEffect(() => {
  //   refreshCart();
  // }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

