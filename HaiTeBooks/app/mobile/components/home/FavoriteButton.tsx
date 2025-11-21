import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from "react-native";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";

interface FavoriteButtonProps {
  bookId: number;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  bookId,
  onFavoriteChange,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  // Kiểm tra xem sách đã được yêu thích chưa
  useEffect(() => {
    checkFavoriteStatus();
  }, [bookId]);

  const checkFavoriteStatus = async () => {
    if (!bookId) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setIsFavorite(false);
        setChecking(false);
        return;
      }

      setAuthToken(token);
      const response = await axiosInstance.get(`/favorites/check/${bookId}`);
      setIsFavorite(response.data === true);
    } catch (error: any) {
      // Nếu lỗi 401/403, user chưa đăng nhập
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setIsFavorite(false);
      } else {
        console.error("❌ Lỗi khi kiểm tra trạng thái yêu thích:", error);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!bookId) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert(
          "Yêu cầu đăng nhập",
          "Bạn cần đăng nhập để thêm sách vào mục yêu thích.",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Đăng nhập",
              onPress: () => {
                // Có thể navigate đến trang login nếu cần
              },
            },
          ]
        );
        return;
      }

      setAuthToken(token);

      if (isFavorite) {
        // Xóa khỏi favorites
        await axiosInstance.delete(`/favorites/remove/${bookId}`);
        setIsFavorite(false);
        onFavoriteChange?.(false);
        Alert.alert("Thành công", "Đã gỡ khỏi sách yêu thích");
      } else {
        // Thêm vào favorites
        await axiosInstance.post(`/favorites/add`, { bookId });
        setIsFavorite(true);
        onFavoriteChange?.(true);
        Alert.alert("Thành công", "Đã thêm vào sách yêu thích");
      }
    } catch (error: any) {
      console.error("❌ Lỗi khi thay đổi trạng thái yêu thích:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể thay đổi trạng thái yêu thích. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <TouchableOpacity style={styles.button} disabled>
        <ActivityIndicator size="small" color="#C92127" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, isFavorite && styles.buttonActive]}
      onPress={handleToggleFavorite}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isFavorite ? "#FFFFFF" : "#C92127"}
        />
      ) : (
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={24}
          color={isFavorite ? "#FFFFFF" : "#C92127"}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#C92127",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonActive: {
    backgroundColor: "#C92127",
    borderColor: "#C92127",
  },
});

export default FavoriteButton;

