import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useTheme } from "../../context/ThemeContext";

interface Promotion {
  id: number;
  name: string;
  code: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  quantity: number;
  isActive: boolean;
  approvedByUserId?: number;
  status?: "pending" | "approved" | "rejected" | "deactivated";
  minimumOrderAmount?: number | null;
}

const Voucher: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lấy danh sách promotions đang hoạt động
  const fetchPromotions = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        setAuthToken(token);
      }

      const response = await axiosInstance.get("/promotions");
      const rawData = response.data || [];

      // Normalize data và filter chỉ lấy promotions đang hoạt động
      const activePromotions: Promotion[] = rawData
        .map((promo: any) => ({
          id: promo.id,
          name: promo.name,
          code: promo.code,
          discountPercent: promo.discountPercent,
          startDate: promo.startDate,
          endDate: promo.endDate,
          quantity: promo.quantity,
          isActive:
            promo.isActive !== undefined
              ? promo.isActive
              : promo.active !== undefined
              ? promo.active
              : true,
          approvedByUserId: promo.approvedByUserId || promo.approvedBy,
          status: promo.status,
          minimumOrderAmount: promo.minimumOrderAmount || null,
        }))
        .filter((promo: Promotion) => {
          // Chỉ lấy promotions đã được approve và đang active
          const isApproved =
            promo.approvedByUserId != null || promo.status === "approved";
          const isActive = promo.isActive && promo.status !== "deactivated";

          // Kiểm tra ngày bắt đầu và ngày hết hạn
          const now = new Date();
          const startDate = new Date(promo.startDate);
          const endDate = new Date(promo.endDate);
          const isStarted = startDate <= now;
          const isNotExpired = endDate >= now;

          // Kiểm tra số lượng còn lại (nếu có)
          const hasQuantity = promo.quantity > 0;

          return (
            isApproved && isActive && isStarted && isNotExpired && hasQuantity
          );
        });

      setPromotions(activePromotions);
    } catch (error: any) {
      console.error("❌ Lỗi khi tải khuyến mãi:", error);
      setPromotions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPromotions();
  }, [fetchPromotions]);

  // Copy mã voucher vào clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert("Thành công", `Đã copy mã: ${code}`);
    } catch (error) {
      console.error("❌ Lỗi khi copy:", error);
      Alert.alert("Lỗi", "Không thể copy mã");
    }
  };

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  // Format số tiền giảm
  const formatDiscount = (percent: number) => {
    return `Giảm ${percent}%`;
  };

  // Format số tiền (VND) sang k (nghìn)
  const formatMinOrder = (amount: number | null | undefined): string => {
    if (!amount || amount === 0) return "";
    return `${Math.round(amount / 1000)}k`;
  };

  // Render voucher item
  const renderVoucherItem = ({ item }: { item: Promotion }) => {
    const minOrderText = item.minimumOrderAmount
      ? formatMinOrder(item.minimumOrderAmount)
      : null;

    return (
      <View style={styles.voucherCard}>
        {/* Icon voucher bên trái */}
        <View style={styles.voucherIconContainer}>
          <Ionicons name="ticket-outline" size={40} color="#10B981" />
        </View>

        {/* Thông tin voucher ở giữa */}
        <View style={styles.voucherInfo}>
          <Text style={styles.voucherName}>{item.name}</Text>
          <Text style={styles.voucherCondition}>
            {minOrderText
              ? `Giảm ${item.discountPercent}% cho đơn hàng từ ${minOrderText}`
              : `Giảm ${item.discountPercent}%`}
          </Text>
          <View style={styles.voucherCodeContainer}>
            <Text style={styles.voucherCodeLabel}>Mã: </Text>
            <Text style={styles.voucherCode}>{item.code}</Text>
          </View>
          <Text style={styles.voucherExpiry}>
            HSD: {formatDate(item.endDate)}
          </Text>
        </View>

        {/* Nút Copy mã bên phải */}
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => handleCopyCode(item.code)}
        >
          <Text style={styles.copyButtonText}>Copy mã</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Đang tải...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="ticket-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Không có voucher nào
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header màu đỏ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví Voucher</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Danh sách voucher */}
      <FlatList
        data={promotions}
        renderItem={renderVoucherItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          promotions.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#C92127",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  voucherIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  voucherInfo: {
    flex: 1,
    marginRight: 12,
  },
  voucherName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  voucherCondition: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  voucherCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  voucherCodeLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  voucherCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  voucherExpiry: {
    fontSize: 12,
    color: "#6B7280",
  },
  copyButton: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: "auto",
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default Voucher;
