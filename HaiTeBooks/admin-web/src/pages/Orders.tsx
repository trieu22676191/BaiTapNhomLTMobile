import {
  CheckCircle,
  Clock,
  Eye,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axiosInstance from "../config/axios";
import { Order } from "../types";

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "all"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Cập nhật filter khi URL thay đổi
  useEffect(() => {
    const statusFromUrl = searchParams.get("status");
    if (statusFromUrl) {
      // Normalize status về lowercase để match với order.status đã được normalize
      setStatusFilter(statusFromUrl.toLowerCase());
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Backend trả về List<OrderResponse> trực tiếp từ GET /api/orders
      console.log("🔄 Fetching orders from /orders endpoint...");

      // Thêm Accept header để đảm bảo backend trả về JSON
      const response = await axiosInstance.get("/orders", {
        headers: {
          Accept: "application/json",
        },
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response headers:", response.headers);
      console.log("📥 Response data type:", typeof response.data);
      console.log("📥 Response data:", response.data);

      // Backend trả về List<OrderResponse> - response.data là array
      let ordersData = response.data || [];

      // Kiểm tra response data
      if (!Array.isArray(ordersData)) {
        console.warn(
          "⚠️ Response data is not an array:",
          typeof ordersData,
          ordersData
        );
        // Nếu response.data là object, thử extract array
        if (ordersData && typeof ordersData === "object") {
          if (Array.isArray(ordersData.data)) {
            ordersData = ordersData.data;
          } else if (Array.isArray(ordersData.content)) {
            ordersData = ordersData.content;
          } else {
            ordersData = [];
          }
        } else {
          ordersData = [];
        }
      }

      console.log(`✅ Received ${ordersData.length} orders from backend`);

      // Backend trả về OrderResponse với format:
      // { id, userId, userName, userEmail, total, status, orderDate, address, note, items }
      // Status từ backend là UPPERCASE (PENDING, PROCESSING, etc.)
      const normalizedOrders = ordersData.map((order: any) => {
        const normalized = {
          ...order,
          // Normalize status về lowercase để đồng nhất với frontend
          status: order.status?.toLowerCase() || order.status,
          // Map totalAmount từ total
          totalAmount: order.total || order.totalAmount,
          // Map createdAt từ orderDate
          createdAt: order.orderDate || order.createdAt,
          // User info đã có sẵn trong OrderResponse (userName, userEmail)
          userName:
            order.userName || order.user?.username || order.user?.full_name,
          userEmail: order.userEmail || order.user?.email,
          // Map shippingAddress từ address
          shippingAddress: order.address || order.shippingAddress,
          // Map paymentMethod - mặc định COD (backend không có trong OrderResponse)
          paymentMethod: order.paymentMethod || "COD",
        };
        return normalized;
      });

      setOrders(normalizedOrders);
      setError(null);
    } catch (error: any) {
      console.error("❌ Lỗi khi tải đơn hàng:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
      });

      // Hiển thị thông báo lỗi chi tiết
      const errorData = error?.response?.data;
      const errorMessage =
        errorData?.message || errorData?.error || error?.message;

      if (error?.response?.status === 400) {
        // Lỗi 400 có thể do lazy loading issue hoặc validation error
        const detailedError = errorMessage
          ? `Backend trả về lỗi 400: ${errorMessage}. Có thể do lỗi lazy loading khi serialize Order entity.`
          : "Backend trả về lỗi 400. Có thể do lỗi lazy loading khi serialize Order entity (giống như lỗi BookCategory trước đó).";
        setError(detailedError);
        console.error(
          "💡 Suggestion: Backend cần fix lazy loading của Order entity (User, OrderItems, Payment)"
        );
      } else if (error?.response?.status === 500) {
        const detailedError = errorMessage
          ? `Backend trả về lỗi 500: ${errorMessage}`
          : "Backend trả về lỗi 500. Có lỗi xảy ra ở server, vui lòng kiểm tra backend logs.";
        setError(detailedError);
      } else if (
        error?.response?.status === 401 ||
        error?.response?.status === 403
      ) {
        setError("Bạn không có quyền truy cập. Vui lòng đăng nhập lại.");
      } else {
        setError(
          `Không thể tải danh sách đơn hàng. Lỗi: ${
            error?.response?.status || error?.message || "Unknown"
          }${errorMessage ? ` - ${errorMessage}` : ""}`
        );
      }

      // Set empty array để hiển thị "Không có đơn hàng nào"
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0 ₫";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Lỗi format date:", dateString, error);
      return "N/A";
    }
  };

  const getStatusInfo = (status: string) => {
    // Normalize status về lowercase để so sánh
    const normalizedStatus = status?.toLowerCase() || status;

    switch (normalizedStatus) {
      case "pending":
        return {
          label: "Chờ xác nhận",
          icon: Clock,
          color: "bg-yellow-100 text-yellow-800",
        };
      case "processing":
        return {
          label: "Đang xử lý",
          icon: Package,
          color: "bg-blue-100 text-blue-800",
        };
      case "shipping":
        return {
          label: "Đang giao",
          icon: Truck,
          color: "bg-purple-100 text-purple-800",
        };
      case "completed":
        return {
          label: "Hoàn thành",
          icon: CheckCircle,
          color: "bg-green-100 text-green-800",
        };
      case "cancelled":
        return {
          label: "Đã hủy",
          icon: XCircle,
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          label: status || "Unknown",
          icon: Clock,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-gray-600 mt-1">
            Tổng số: {orders.length} đơn hàng
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                fetchOrders();
              }}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Tất cả", count: orders.length },
            {
              value: "pending",
              label: "Chờ xác nhận",
              count: orders.filter((o) => o.status === "pending").length,
            },
            {
              value: "processing",
              label: "Đang xử lý",
              count: orders.filter((o) => o.status === "processing").length,
            },
            {
              value: "shipping",
              label: "Đang giao",
              count: orders.filter((o) => o.status === "shipping").length,
            },
            {
              value: "completed",
              label: "Hoàn thành",
              count: orders.filter((o) => o.status === "completed").length,
            },
            {
              value: "cancelled",
              label: "Đã hủy",
              count: orders.filter((o) => o.status === "cancelled").length,
            },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                // Cập nhật URL với query param
                if (filter.value === "all") {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: filter.value });
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày đặt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.userName || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.userEmail || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          <StatusIcon size={14} className="mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <Eye size={16} className="mr-1" />
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;
