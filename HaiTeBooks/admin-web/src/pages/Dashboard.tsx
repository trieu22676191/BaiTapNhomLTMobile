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

      // Gọi các API song song để lấy dữ liệu
      const [statsResponse, ordersResponse, booksResponse, usersResponse] =
        await Promise.allSettled([
          axiosInstance.get("/statistics/overview").catch(() => null), // API tổng quan (nếu có)
          axiosInstance.get("/orders"), // Lấy đơn hàng
          axiosInstance.get("/books"), // Lấy sách
          axiosInstance
            .get("/admin/users")
            .catch(() => axiosInstance.get("/users")), // Lấy người dùng
        ]);

      // Xử lý dữ liệu từ các API
      let statsData: DashboardStats = {
        totalRevenue: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalBooks: 0,
        pendingOrders: 0,
        lowStockBooks: 0,
        recentOrders: [],
        topSellingBooks: [],
      };

      // Nếu có API statistics/overview, sử dụng dữ liệu từ đó
      if (statsResponse.status === "fulfilled" && statsResponse.value?.data) {
        const overviewData = statsResponse.value.data;
        statsData = {
          totalRevenue: overviewData.totalRevenue || 0,
          totalOrders: overviewData.totalOrders || 0,
          totalUsers: overviewData.totalUsers || 0,
          totalBooks: overviewData.totalBooks || 0,
          pendingOrders: overviewData.pendingOrders || 0,
          lowStockBooks: overviewData.lowStockBooks || 0,
          recentOrders: overviewData.recentOrders || [],
          topSellingBooks: overviewData.topSellingBooks || [],
        };
      }

      // Xử lý Orders
      if (ordersResponse.status === "fulfilled" && ordersResponse.value?.data) {
        const orders = ordersResponse.value.data || [];

        // Normalize orders
        const normalizedOrders = orders.map((order: any) => ({
          ...order,
          status: order.status?.toLowerCase() || order.status,
          totalAmount: order.total || order.totalAmount || 0,
          createdAt: order.orderDate || order.createdAt,
          userName:
            order.user?.username || order.user?.fullName || order.userName,
          userEmail: order.user?.email || order.userEmail,
        }));

        // Tính toán từ orders nếu chưa có từ statistics API
        if (!statsData.totalOrders) {
          statsData.totalOrders = normalizedOrders.length;
        }
        if (!statsData.pendingOrders) {
          statsData.pendingOrders = normalizedOrders.filter(
            (o: any) => o.status === "pending"
          ).length;
        }
        if (!statsData.totalRevenue) {
          statsData.totalRevenue = normalizedOrders
            .filter(
              (o: any) => o.status === "completed" || o.status === "shipping"
            )
            .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
        }
        if (!statsData.recentOrders || statsData.recentOrders.length === 0) {
          // Lấy 5 đơn hàng gần nhất
          statsData.recentOrders = normalizedOrders
            .sort((a: any, b: any) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
            })
            .slice(0, 5);
        }

        // Tính topSellingBooks từ order items nếu chưa có
        if (
          !statsData.topSellingBooks ||
          statsData.topSellingBooks.length === 0
        ) {
          const bookSalesMap = new Map<
            number,
            {
              bookId: number;
              bookTitle: string;
              totalSold: number;
              revenue: number;
            }
          >();

          // Duyệt qua tất cả orders và items
          normalizedOrders.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const bookId = item.bookId;
                const quantity = item.quantity || 0;
                const price = item.price || 0;
                const revenue = quantity * price;

                if (bookSalesMap.has(bookId)) {
                  const existing = bookSalesMap.get(bookId)!;
                  existing.totalSold += quantity;
                  existing.revenue += revenue;
                } else {
                  bookSalesMap.set(bookId, {
                    bookId,
                    bookTitle: item.bookTitle || `Sách #${bookId}`,
                    totalSold: quantity,
                    revenue,
                  });
                }
              });
            }
          });

          // Sắp xếp theo doanh thu và lấy top 5
          statsData.topSellingBooks = Array.from(bookSalesMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        }
      }

      // Xử lý Books
      if (booksResponse.status === "fulfilled" && booksResponse.value?.data) {
        const books = booksResponse.value.data || [];

        if (!statsData.totalBooks) {
          statsData.totalBooks = books.length;
        }

        // Sách có stock <= 10 được coi là sắp hết hàng
        const lowStockBooksList = books
          .filter((book: any) => (book.stock || 0) <= 10)
          .map((book: any) => ({
            id: book.id,
            title: book.title,
            stock: book.stock || 0,
            categoryName: book.categoryName,
          }))
          .sort(
            (a: { stock: number }, b: { stock: number }) => a.stock - b.stock
          ); // Sắp xếp theo stock tăng dần

        if (!statsData.lowStockBooks) {
          statsData.lowStockBooks = lowStockBooksList.length;
        }
        if (
          !statsData.lowStockBooksList ||
          statsData.lowStockBooksList.length === 0
        ) {
          statsData.lowStockBooksList = lowStockBooksList;
        }
      }

      // Xử lý Users
      if (usersResponse.status === "fulfilled" && usersResponse.value?.data) {
        const users = usersResponse.value.data || [];
        if (!statsData.totalUsers) {
          statsData.totalUsers = users.length;
        }
      }

      setStats(statsData);
      console.log("Dashboard stats loaded:", statsData);
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

      {/* Low Stock Books List */}
      {stats?.lowStockBooksList && stats.lowStockBooksList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Sách sắp hết hàng
            </h2>
            <AlertTriangle className="text-orange-600" size={20} />
          </div>
          <div className="space-y-3">
            {stats.lowStockBooksList.slice(0, 10).map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <div className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${
                      book.stock === 0
                        ? "bg-red-100 text-red-600"
                        : book.stock <= 5
                        ? "bg-orange-100 text-orange-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {book.stock}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {book.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {book.categoryName || "Không có danh mục"} • Còn{" "}
                      {book.stock} cuốn
                    </p>
                  </div>
                </div>
                <a
                  href={`/admin/books/edit/${book.id}`}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Xem →
                </a>
              </div>
            ))}
          </div>
          {stats.lowStockBooksList.length > 10 && (
            <div className="mt-4 text-center">
              <a
                href="/admin/books"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Xem tất cả {stats.lowStockBooksList.length} sách sắp hết hàng →
              </a>
            </div>
          )}
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
