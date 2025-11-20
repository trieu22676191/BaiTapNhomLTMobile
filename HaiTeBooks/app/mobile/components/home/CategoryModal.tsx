import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../config/axiosConfig";

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory?: (category: string) => void;
}

type ApiCategory = {
  id: number;
  name: string;
  description?: string;
  bookCount?: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onSelectCategory,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.85)).current;

  useEffect(() => {
    if (visible) {
      fetchCategories();
      // Animation trượt từ trái sang
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation khi đóng
      slideAnim.setValue(-SCREEN_WIDTH * 0.85);
    }
  }, [visible]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<ApiCategory[]>("/categories");
      const categoriesData = response.data || [];

      // Lấy danh sách tên danh mục từ API
      const categoryNames = categoriesData
        .map((cat) => cat.name?.trim())
        .filter((name) => name && name.length > 0)
        .sort() as string[];

      // Thêm "Tất cả" vào đầu danh sách
      setCategories(["Tất cả", ...categoryNames]);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError(
        err?.response?.data?.message || err?.message || "Không thể tải danh mục"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Animation trượt về trái khi đóng
    Animated.timing(slideAnim, {
      toValue: -SCREEN_WIDTH * 0.85,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSelectCategory = (category: string) => {
    onSelectCategory?.(category);
    handleClose();
    // Navigate to category books page
    router.push({
      pathname: "/mobile/page/homes/CategoryBooks",
      params: { category },
    });
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleSelectCategory(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryText}>{item}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              paddingTop: insets.top,
              height: "100%",
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Danh mục sách</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C92127" />
              <Text style={styles.loadingText}>Đang tải danh mục...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchCategories}
              >
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không có danh mục nào</Text>
                </View>
              }
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    width: SCREEN_WIDTH * 0.85,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#C92127",
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default CategoryModal;
