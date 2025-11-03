import { useEffect, useState } from 'react';
import axiosInstance from '../config/axios';
import { DashboardStats } from '../types';
import {
  DollarSign,
  ShoppingCart,
  Users,
  BookOpen,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Tùy thuộc vào API backend của bạn
      const response = await axiosInstance.get('/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
      // Mock data để demo
      setStats({
        totalRevenue: 125000000,
        totalOrders: 1250,
        totalUsers: 450,
        totalBooks: 320,
        pendingOrders: 23,
        lowStockBooks: 8,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const statCards = [
    {
      title: 'Tổng doanh thu',
      value: stats ? formatCurrency(stats.totalRevenue) : '0 đ',
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Đơn hàng',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: `${stats?.pendingOrders || 0} chờ xử lý`,
    },
    {
      title: 'Người dùng',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Sách trong kho',
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Tổng quan về hoạt động của hệ thống
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bgColor} ${card.textColor} p-3 rounded-lg`}>
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
          <p className="text-sm text-gray-600 mb-4">
            Cần xử lý trong hôm nay
          </p>
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
          <p className="text-sm text-gray-600 mb-4">
            Sách sắp hết hàng
          </p>
          <a
            href="/admin/books"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Quản lý kho →
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Hoạt động gần đây
        </h2>
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Đơn hàng mới #1234 đã được đặt
              </p>
              <p className="text-xs text-gray-500">5 phút trước</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Người dùng mới đăng ký
              </p>
              <p className="text-xs text-gray-500">15 phút trước</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Sách "Đắc nhân tâm" sắp hết hàng
              </p>
              <p className="text-xs text-gray-500">1 giờ trước</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

