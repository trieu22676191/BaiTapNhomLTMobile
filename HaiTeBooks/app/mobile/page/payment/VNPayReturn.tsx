import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance, { setAuthToken } from "../../config/axiosConfig";
import { useCart } from "../../context/CartContext";

const VNPayReturn: React.FC = () => {
  const router = useRouter();
  const { refreshCart } = useCart();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "failed" | "checking">(
    "checking"
  );
  const [countdown, setCountdown] = useState(3);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    handleVNPayCallback();

    // Lắng nghe khi app được mở lại từ background (sau khi thanh toán trên browser)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Khi app active lại, kiểm tra payment status nếu có pending
        checkPaymentStatusFromStorage();
      }
    });

    return () => {
      subscription.remove();
      // Cleanup countdown interval khi component unmount
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Tự động redirect khi countdown về 0
  useEffect(() => {
    if (status === "success" && countdown === 0) {
      router.replace("/account");
    }
  }, [countdown, status, router]);

  // Kiểm tra payment status từ AsyncStorage (khi user quay lại app thủ công)
  const checkPaymentStatusFromStorage = async () => {
    try {
      const orderId = await AsyncStorage.getItem("pending_payment_order");
      if (!orderId) return;

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      setAuthToken(token);

      // Kiểm tra payment status
      const paymentResponse = await axiosInstance.get(
        `/payments/order/${orderId}`
      );
      const payments = paymentResponse.data || [];
      const successPayment = payments.find((p: any) => p.status === "SUCCESS");

      if (successPayment) {
        setStatus("success");
        await AsyncStorage.multiRemove([
          "pending_payment_order",
          "pending_payment_txnRef",
        ]);
        await refreshCart();

        // Bắt đầu countdown
        setCountdown(3);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        Alert.alert(
          "Thanh toán thành công!",
          `Đơn hàng #${orderId} đã được thanh toán thành công.`,
          [{ text: "Xem đơn hàng", onPress: () => router.replace("/account") }]
        );
      }
    } catch (error) {
      console.log("Check payment from storage:", error);
    }
  };

  const handleVNPayCallback = async () => {
    try {
      setLoading(true);

      // Lấy token
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setStatus("failed");
        setLoading(false);
        Alert.alert("Lỗi", "Vui lòng đăng nhập để kiểm tra thanh toán");
        router.replace("/account");
        return;
      }
      setAuthToken(token);

      // Lấy txnRef từ params (VNPay sẽ trả về trong URL)
      const txnRef = params.vnp_TxnRef as string;
      const vnpResponseCode = params.vnp_ResponseCode as string;
      const vnpTransactionStatus = params.vnp_TransactionStatus as string;

      console.log("📥 VNPay callback params:", {
        txnRef,
        vnpResponseCode,
        vnpTransactionStatus,
        allParams: params,
      });

      if (!txnRef) {
        // Nếu không có txnRef trong params, lấy từ AsyncStorage
        const savedTxnRef = await AsyncStorage.getItem(
          "pending_payment_txnRef"
        );
        const orderId = await AsyncStorage.getItem("pending_payment_order");

        if (!savedTxnRef && !orderId) {
          setStatus("failed");
          setLoading(false);
          Alert.alert("Lỗi", "Không tìm thấy thông tin giao dịch");
          router.replace("/account");
          return;
        }

        // Nếu có orderId, kiểm tra payment status từ order
        if (orderId) {
          try {
            const paymentResponse = await axiosInstance.get(
              `/payments/order/${orderId}`
            );
            const payments = paymentResponse.data || [];
            const payment = payments.find((p: any) => p.status === "SUCCESS");

            if (payment) {
              setStatus("success");
              await AsyncStorage.multiRemove([
                "pending_payment_order",
                "pending_payment_txnRef",
              ]);
              await refreshCart();

              // Bắt đầu countdown
              setCountdown(3);
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                  if (prev <= 1) {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                    }
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);

              Alert.alert(
                "Thanh toán thành công!",
                "Đơn hàng của bạn đã được thanh toán thành công.",
                [
                  {
                    text: "Xem đơn hàng",
                    onPress: () => router.replace("/account"),
                  },
                ]
              );
              return;
            }
          } catch (e) {
            console.error("Error checking payment:", e);
          }
        }
      }

      // Kiểm tra response code từ VNPay
      // ResponseCode = "00" và TransactionStatus = "00" là thành công
      const isSuccess =
        vnpResponseCode === "00" ||
        (vnpTransactionStatus === "00" && vnpResponseCode === "00");

      if (isSuccess && txnRef) {
        // Backend đã xử lý IPN và cập nhật payment status
        // Kiểm tra lại payment status từ API
        try {
          // Tìm payment bằng txnRef thông qua order
          const orderId = await AsyncStorage.getItem("pending_payment_order");
          if (orderId) {
            const paymentResponse = await axiosInstance.get(
              `/payments/order/${orderId}`
            );
            const payments = paymentResponse.data || [];
            const payment = payments.find(
              (p: any) =>
                p.vnpTxnRef === txnRef || p.vnpTxnRef === params.vnp_TxnRef
            );

            if (payment && payment.status === "SUCCESS") {
              setStatus("success");
              await AsyncStorage.multiRemove([
                "pending_payment_order",
                "pending_payment_txnRef",
              ]);
              await refreshCart();

              // Bắt đầu countdown
              setCountdown(3);
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                  if (prev <= 1) {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                    }
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);

              Alert.alert(
                "Thanh toán thành công!",
                `Đơn hàng #${orderId} đã được thanh toán thành công. Cảm ơn bạn đã mua sắm!`,
                [
                  {
                    text: "Xem đơn hàng",
                    onPress: () => router.replace("/account"),
                  },
                ]
              );
              return;
            }
          }
        } catch (e) {
          console.error("Error verifying payment:", e);
        }

        // Nếu không verify được nhưng response code là 00, vẫn coi là thành công
        setStatus("success");
        await AsyncStorage.multiRemove([
          "pending_payment_order",
          "pending_payment_txnRef",
        ]);
        await refreshCart();

        // Bắt đầu countdown
        setCountdown(3);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        Alert.alert(
          "Thanh toán thành công!",
          "Đơn hàng của bạn đã được thanh toán thành công.",
          [{ text: "Xem đơn hàng", onPress: () => router.replace("/account") }]
        );
      } else {
        // Thanh toán thất bại
        setStatus("failed");
        await AsyncStorage.removeItem("pending_payment_txnRef");

        Alert.alert(
          "Thanh toán thất bại",
          `Mã lỗi: ${
            vnpResponseCode || "Unknown"
          }. Giao dịch thanh toán không thành công. Vui lòng thử lại.`,
          [{ text: "Quay lại", onPress: () => router.replace("/account") }]
        );
      }
    } catch (error: any) {
      console.error("Error handling VNPay callback:", error);
      setStatus("failed");
      Alert.alert(
        "Lỗi",
        "Không thể xác minh trạng thái thanh toán. Vui lòng kiểm tra lại đơn hàng của bạn trong mục 'Đơn hàng của tôi'.",
        [{ text: "Quay lại", onPress: () => router.replace("/account") }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {loading || status === "checking" ? (
          <>
            <ActivityIndicator size="large" color="#C92127" />
            <Text style={styles.message}>Đang xử lý thanh toán...</Text>
          </>
        ) : status === "success" ? (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.title}>Thanh toán thành công!</Text>
            <Text style={styles.message}>
              Đơn hàng của bạn đã được thanh toán thành công.
            </Text>
            {countdown > 0 && (
              <Text style={styles.countdown}>
                Tự động chuyển về trang đơn hàng sau {countdown} giây...
              </Text>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/account")}
            >
              <Text style={styles.buttonText}>Xem đơn hàng ngay</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.title}>Thanh toán thất bại</Text>
            <Text style={styles.message}>
              Giao dịch thanh toán không thành công. Vui lòng thử lại.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/account")}
            >
              <Text style={styles.buttonText}>Quay lại</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#C92127",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  countdown: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
});

export default VNPayReturn;
