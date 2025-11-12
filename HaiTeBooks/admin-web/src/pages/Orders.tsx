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
import { Link } from "react-router-dom";
import axiosInstance from "../config/axios";
import { Order } from "../types";

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axiosInstance.get("/orders");

      // Backend có thể trả về status dạng UPPERCASE (PENDING, PROCESSING) hoặc lowercase
      // Normalize về lowercase để đồng nhất
      const normalizedOrders = (response.data || []).map((order: any) => {
        const normalized = {
          ...order,
          status: order.status?.toLowerCase() || order.status,
          totalAmount: order.total || order.totalAmount,
          createdAt: order.orderDate || order.createdAt,
          // Map user info nếu có
          userName:
            order.user?.username || order.user?.full_name || order.userName,
          userEmail: order.user?.email || order.userEmail,
        };
        return normalized;
      });

      setOrders(normalizedOrders);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
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
              onClick={() => setStatusFilter(filter.value)}
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
