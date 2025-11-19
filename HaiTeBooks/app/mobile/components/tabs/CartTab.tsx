import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "../../context/CartContext";

interface CartTabProps {
  isActive?: boolean;
}

const CartTab: React.FC<CartTabProps> = ({ isActive = false }) => {
  const router = useRouter();
  const { cartCount, refreshCart } = useCart();
  const iconColor = isActive ? "#C92127" : "#999";
  const textColor = isActive ? "#C92127" : "#999";

  // Chỉ fetch cart khi tab được active (user đang xem tab này)
  useEffect(() => {
    if (isActive) {
      refreshCart();
    }
  }, [isActive, refreshCart]);

  // Debug log
  console.log("🛒 CartTab - count:", cartCount);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.container}
      onPress={() => router.push("/mobile/page/carts/Cart")}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isActive ? "cart" : "cart-outline"}
          size={25}
          color={iconColor}
        />
        {cartCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {cartCount > 99 ? "99+" : cartCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.text, { color: textColor }]}>Giỏ hàng</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconContainer: {
    marginBottom: 0,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -12,
    backgroundColor: "#FF0000",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default CartTab;
