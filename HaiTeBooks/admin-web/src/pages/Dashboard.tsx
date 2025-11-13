import {
  AlertTriangle,
  BookOpen,
  DollarSign,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../config/axios";
import { DashboardStats } from "../types";

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Gọi API từ backend
      const response = await axiosInstance.get("/admin/dashboard/stats");

      // Kiểm tra và xử lý response
      if (response.data) {
        setStats(response.data);
        console.log("Dashboard stats loaded:", response.data);
      } else {
        throw new Error("Không có dữ liệu từ server");
      }
    } catch (error: any) {
      console.error("Lỗi khi tải thống kê:", error);

      // Xử lý lỗi chi tiết
      let errorMessage = "Không thể tải dữ liệu thống kê";

      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
        } else if (status === 403) {
          errorMessage = "Bạn không có quyền truy cập trang này!";
        } else if (status >= 500) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau!";
        } else {
          errorMessage = error.response.data?.message || `Lỗi: ${status}`;
        }
      } else if (error.request) {
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!";
      }

      setError(errorMessage);

      // Không set mock data, để hiển thị lỗi cho người dùng biết
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const statCards = [
    {
      title: "Tổng doanh thu",
      value: stats ? formatCurrency(stats.totalRevenue) : "0 đ",
      icon: DollarSign,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "Đơn hàng",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      subtitle: `${stats?.pendingOrders || 0} chờ xử lý`,
    },
    {
      title: "Người dùng",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      title: "Sách trong kho",
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      subtitle: `${stats?.lowStockBooks || 0} sắp hết hàng`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Tổng quan về hoạt động của hệ thống
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Lỗi khi tải dữ liệu
              </h3>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Tổng quan về hoạt động của hệ thống
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={18}
            className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* Error Banner (nếu có lỗi nhưng vẫn có dữ liệu cũ) */}
      {error && stats && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-yellow-800 text-sm">
              ⚠️ {error} - Đang hiển thị dữ liệu cũ
            </p>
            <button
              onClick={handleRefresh}
              className="text-yellow-800 hover:text-yellow-900 text-sm font-medium"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`${card.bgColor} ${card.textColor} p-3 rounded-lg`}
              >
                <card.icon size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">
              {card.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </p>
            {card.subtitle && (
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Đơn hàng chờ xử lý
            </h2>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {stats?.pendingOrders || 0}
          </div>
          <p className="text-sm text-gray-600 mb-4">Cần xử lý trong hôm nay</p>
          <a
            href="/admin/orders"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Xem chi tiết →
          </a>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Cảnh báo tồn kho
            </h2>
            <AlertTriangle className="text-orange-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {stats?.lowStockBooks || 0}
          </div>
          <p className="text-sm text-gray-600 mb-4">Sách sắp hết hàng</p>
          <a
            href="/admin/books"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Quản lý kho →
          </a>
        </div>
      </div>

      {/* Recent Orders */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Đơn hàng gần đây
          </h2>
          <div className="space-y-3">
            {stats.recentOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div
                    className={`w-2 h-2 rounded-full mr-3 ${
                      order.status === "completed"
                        ? "bg-green-500"
                        : order.status === "pending"
                        ? "bg-yellow-500"
                        : order.status === "cancelled"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Đơn hàng #{order.id} - {order.userName || "Khách hàng"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(order.totalAmount)} •{" "}
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {order.status === "completed"
                    ? "Hoàn thành"
                    : order.status === "pending"
                    ? "Chờ xử lý"
                    : order.status === "cancelled"
                    ? "Đã hủy"
                    : order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Selling Books */}
      {stats?.topSellingBooks && stats.topSellingBooks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sách bán chạy
          </h2>
          <div className="space-y-3">
            {stats.topSellingBooks.slice(0, 5).map((book, index) => (
              <div
                key={book.bookId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center flex-1">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {book.bookTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      Đã bán: {book.totalSold} cuốn • Doanh thu:{" "}
                      {formatCurrency(book.revenue)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity (fallback nếu không có recentOrders) */}
      {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Hoạt động gần đây
          </h2>
          <div className="text-center py-8 text-gray-500">
            <p>Chưa có hoạt động nào gần đây</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
