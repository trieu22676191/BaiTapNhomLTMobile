import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useCart } from "../../context/CartContext";

// API Response types
type ApiCartItem = {
  id: number;
  userId: number;
  bookId: number;
  quantity: number;
};

type Book = {
  id: number;
  title: string;
  price: number;
  imageUrl?: string;
  stock: number;
};

type CartItem = {
  id: number; // cart item id
  bookId: number;
  title: string;
  price: number;
  image: string;
  qty: number;
  stock: number;
  checked: boolean;
};

const Cart: React.FC = () => {
  const { refreshCart } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Fetch cart từ backend
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);

      // Restore token
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        console.log("No token, user not logged in");
        setItems([]);
        setLoading(false);
        return;
      }

      setAuthToken(token);

      // Lấy thông tin user để có userId
      const userResponse = await axiosInstance.get("/users/me");
      const currentUserId = userResponse.data.id;
      setUserId(currentUserId);

      console.log("Fetching cart for userId:", currentUserId);

      // Lấy cart items
      const cartResponse = await axiosInstance.get<ApiCartItem[]>(
        `/cart/user/${currentUserId}`
      );
      const cartItems = cartResponse.data || [];

      console.log("Cart items from API:", cartItems);

      // Fetch book details cho mỗi cart item
      const itemsWithDetails = await Promise.all(
        cartItems.map(async (cartItem) => {
          try {
            const bookResponse = await axiosInstance.get<Book>(
              `/books/${cartItem.bookId}`
            );
            const book = bookResponse.data;

            return {
              id: cartItem.id,
              bookId: book.id,
              title: book.title,
              price: book.price,
              image: book.imageUrl || "https://via.placeholder.com/300x400",
              qty: cartItem.quantity,
              stock: book.stock,
              checked: false,
            };
          } catch (err) {
            console.error("Error fetching book details:", err);
            return null;
          }
        })
      );

      // Filter out null items
      const validItems = itemsWithDetails.filter(
        (item): item is CartItem => item !== null
      );
      setItems(validItems);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // User not authenticated
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cart khi component mount và khi user quay lại trang
  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  const allChecked = useMemo(
    () => items.length > 0 && items.every((i) => i.checked),
    [items]
  );

  const totalSelectedQty = useMemo(
    () => items.filter((i) => i.checked).reduce((s, i) => s + i.qty, 0),
    [items]
  );

  const totalPrice = useMemo(
    () =>
      items
        .filter((i) => i.checked)
        .reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const toggleAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, checked: !allChecked })));
  };

  const toggleOne = (id: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  };

  const increase = async (id: number) => {
    try {
      // Tìm item hiện tại để lấy quantity
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const newQty = item.qty + 1;

      // Update local state ngay (optimistic update)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, qty: newQty } : i))
      );

      // Gọi API update quantity - có thể là PUT /cart/update/{id} hoặc PUT /cart/{id}
      try {
        await axiosInstance.put(`/cart/update/${id}`, {
          bookId: item.bookId,
          quantity: newQty,
        });
      } catch (err: any) {
        // Thử endpoint khác nếu lỗi 404
        if (err?.response?.status === 404) {
          await axiosInstance.put(`/cart/${id}`, {
            bookId: item.bookId,
            quantity: newQty,
          });
        } else {
          throw err;
        }
      }

      // Refresh cart count trong context
      await refreshCart();
      console.log("➕ Quantity increased and saved");
    } catch (error) {
      console.error("Error increasing quantity:", error);
      // Rollback nếu lỗi
      fetchCart();
    }
  };

  const decrease = async (id: number) => {
    try {
      // Tìm item hiện tại để lấy quantity
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const newQty = Math.max(1, item.qty - 1);

      // Update local state ngay (optimistic update)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, qty: newQty } : i))
      );

      // Gọi API update quantity - có thể là PUT /cart/update/{id} hoặc PUT /cart/{id}
      try {
        await axiosInstance.put(`/cart/update/${id}`, {
          bookId: item.bookId,
          quantity: newQty,
        });
      } catch (err: any) {
        // Thử endpoint khác nếu lỗi 404
        if (err?.response?.status === 404) {
          await axiosInstance.put(`/cart/${id}`, {
            bookId: item.bookId,
            quantity: newQty,
          });
        } else {
          throw err;
        }
      }

      // Refresh cart count trong context
      await refreshCart();
      console.log("➖ Quantity decreased and saved");
    } catch (error) {
      console.error("Error decreasing quantity:", error);
      // Rollback nếu lỗi
      fetchCart();
    }
  };

  const removeItem = async (id: number) => {
    try {
      // Đảm bảo có userId trước khi xóa
      if (!userId) {
        // Nếu chưa có userId, lấy lại
        const token = await AsyncStorage.getItem("auth_token");
        if (!token) {
          Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");
          return;
        }
        setAuthToken(token);
        const userResponse = await axiosInstance.get("/users/me");
        const currentUserId = userResponse.data.id;
        setUserId(currentUserId);
      }

      // Sử dụng endpoint đúng theo API: DELETE /api/cart/remove/{id}
      await axiosInstance.delete(`/cart/remove/${id}`);

      // Update local state
      setItems((prev) => prev.filter((i) => i.id !== id));

      // Refresh cart count trong context
      await refreshCart();
      console.log("🗑️ Item removed and cart refreshed");
    } catch (error: any) {
      console.error("Error removing item:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        message: error?.response?.data,
        url: error?.config?.url,
      });
      
      // Xử lý các trường hợp lỗi khác nhau
      if (error?.response?.status === 401) {
        // Token hết hạn hoặc không hợp lệ
        Alert.alert(
          "Lỗi xác thực",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          [{ text: "OK" }]
        );
        // Reload cart để kiểm tra lại
        fetchCart();
      } else if (error?.response?.status === 403) {
        // Không có quyền - có thể do backend kiểm tra quyền sở hữu
        const errorMessage = error?.response?.data?.message || 
          "Bạn không có quyền xóa sản phẩm này. Vui lòng thử lại.";
        Alert.alert("Không có quyền", errorMessage);
        // Reload cart để đồng bộ lại
        fetchCart();
      } else if (error?.response?.status === 404) {
        // Sản phẩm không tồn tại trong giỏ hàng, xóa khỏi local state
        setItems((prev) => prev.filter((i) => i.id !== id));
        await refreshCart();
      } else {
        // Lỗi khác
        const errorMessage = error?.response?.data?.message || 
          "Không thể xóa sản phẩm. Vui lòng thử lại.";
        Alert.alert("Lỗi", errorMessage);
      }
    }
  };

  const deleteSelected = () => {
    const selectedItems = items.filter((i) => i.checked);

    if (selectedItems.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn sản phẩm cần xóa");
      return;
    }

    const isDeleteAll = selectedItems.length === items.length;
    const message = isDeleteAll
      ? "Bạn có chắc chắn xóa hết giỏ hàng?"
      : `Bạn có chắc chắn xóa ${selectedItems.length} sản phẩm đã chọn?`;

    Alert.alert("Xác nhận xóa", message, [
      {
        text: "Không",
        style: "cancel",
      },
      {
        text: "Có",
        style: "destructive",
        onPress: async () => {
          try {
            // Xóa từng item đã chọn - sử dụng endpoint đúng: DELETE /api/cart/remove/{id}
            await Promise.all(
              selectedItems.map((item) =>
                axiosInstance.delete(`/cart/remove/${item.id}`)
              )
            );

            // Update local state
            setItems((prev) => prev.filter((i) => !i.checked));

            // Refresh cart count
            await refreshCart();

            Alert.alert(
              "Thành công",
              `Đã xóa ${selectedItems.length} sản phẩm`
            );
            console.log(`🗑️ Deleted ${selectedItems.length} items`);
          } catch (error) {
            console.error("Error deleting items:", error);
            Alert.alert("Lỗi", "Không thể xóa sản phẩm");
            // Reload cart nếu lỗi
            fetchCart();
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        onPress={() => toggleOne(item.id)}
      >
        {item.checked ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : null}
      </TouchableOpacity>

      <Image source={{ uri: item.image }} style={styles.itemImage} />

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatVnd(item.price)}</Text>
        </View>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => decrease(item.id)}
          >
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.qty}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => increase(item.id)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.trashBtn}
            onPress={() => removeItem(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C92127" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
      </View>

      <View style={styles.selectAllRow}>
        <View style={styles.selectAllLeft}>
          <TouchableOpacity
            style={[styles.checkbox, allChecked && styles.checkboxChecked]}
            onPress={toggleAll}
          >
            {allChecked ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : null}
          </TouchableOpacity>
          <Text style={styles.selectAllText}>
            Chọn tất cả ({items.length} sản phẩm)
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={deleteSelected}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Giỏ hàng trống</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Thành tiền</Text>
          <Text style={styles.totalValue}>{formatVnd(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          disabled={totalSelectedQty === 0}
        >
          <Text style={styles.checkoutText}>Thanh toán</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function formatVnd(n: number) {
  if (!n) return "0 đ";
  return `${n.toLocaleString("vi-VN")} đ`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    backgroundColor: "#C92127",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectAllLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#C92127",
    borderColor: "#C92127",
  },
  selectAllText: { color: "#111827" },

  listContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  itemRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  itemImage: {
    width: 68,
    height: 90,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  itemInfo: { flex: 1 },
  itemTitle: { color: "#111827", fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  price: { color: "#C92127", fontWeight: "800" },
  oldPrice: { color: "#9CA3AF", textDecorationLine: "line-through" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  qtyBtnText: { color: "#111827", fontSize: 16, fontWeight: "800" },
  qtyValue: {
    width: 24,
    textAlign: "center",
    color: "#111827",
    fontWeight: "700",
  },
  trashBtn: { marginLeft: "auto" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  totalBox: { flex: 1 },
  totalLabel: { color: "#6B7280", fontSize: 12 },
  totalValue: { color: "#111827", fontSize: 16, fontWeight: "800" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FCA5A5",
    borderRadius: 999,
  },
  checkoutText: { color: "#FFFFFF", fontWeight: "800" },
  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#6B7280" },
});

export default Cart;
