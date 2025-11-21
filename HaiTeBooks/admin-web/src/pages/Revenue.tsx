import { Calendar, DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../config/axios";

type PeriodType = "day" | "month" | "year";

interface RevenueData {
  period: string;
  revenue: number;
  orderCount: number;
}

const Revenue = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("day");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [showCompare, setShowCompare] = useState(false);
  const [compareDate, setCompareDate] = useState<string>("");
  const [compareMonth, setCompareMonth] = useState<string>("");
  const [compareYear, setCompareYear] = useState<string>("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/orders");
      const ordersData = response.data || [];
      
      // Chỉ lấy các đơn hàng đã hoàn thành
      const completedOrders = ordersData.filter(
        (order: any) =>
          order.status?.toLowerCase() === "completed" ||
          order.status === "COMPLETED"
      );
      
      setOrders(completedOrders);
    } catch (error) {
      console.error("❌ Lỗi khi tải đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const calculateRevenue = (periodType: PeriodType, dateValue?: string, monthValue?: string, yearValue?: string): RevenueData[] => {
    const revenueMap = new Map<string, { revenue: number; orderCount: number }>();
    const date = dateValue || selectedDate;
    const month = monthValue || selectedMonth;
    const year = yearValue || selectedYear;

    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      let periodKey = "";

      if (periodType === "day") {
        // Lọc theo ngày đã chọn
        const selected = new Date(date);
        if (
          orderDate.getDate() === selected.getDate() &&
          orderDate.getMonth() === selected.getMonth() &&
          orderDate.getFullYear() === selected.getFullYear()
        ) {
          periodKey = date;
        } else {
          return; // Bỏ qua nếu không khớp ngày
        }
      } else if (periodType === "month") {
        // Lọc theo tháng đã chọn
        const [yearStr, monthStr] = month.split("-");
        if (
          orderDate.getFullYear() === parseInt(yearStr) &&
          orderDate.getMonth() + 1 === parseInt(monthStr)
        ) {
          periodKey = `${orderDate.getDate()}/${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`;
        } else {
          return; // Bỏ qua nếu không khớp tháng
        }
      } else if (periodType === "year") {
        // Lọc theo năm đã chọn
        if (orderDate.getFullYear() === parseInt(year)) {
          const monthKey = `${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`;
          periodKey = monthKey;
        } else {
          return; // Bỏ qua nếu không khớp năm
        }
      }

      if (periodKey) {
        const total = order.total || order.totalAmount || 0;
        if (revenueMap.has(periodKey)) {
          const existing = revenueMap.get(periodKey)!;
          existing.revenue += total;
          existing.orderCount += 1;
        } else {
          revenueMap.set(periodKey, {
            revenue: total,
            orderCount: 1,
          });
        }
      }
    });

    // Sắp xếp theo thời gian
    return Array.from(revenueMap.entries())
      .map(([period, data]) => ({
        period,
        ...data,
      }))
      .sort((a, b) => {
        // Sắp xếp theo thứ tự thời gian
        if (periodType === "day") {
          return 0; // Chỉ có 1 ngày
        } else if (periodType === "month") {
          // Sắp xếp theo ngày trong tháng
          const dayA = parseInt(a.period.split("/")[0]);
          const dayB = parseInt(b.period.split("/")[0]);
          return dayA - dayB;
        } else {
          // Sắp xếp theo tháng trong năm
          const monthA = parseInt(a.period.split("/")[0]);
          const monthB = parseInt(b.period.split("/")[0]);
          return monthA - monthB;
        }
      });
  };

  // Tính tổng doanh thu cho một kỳ
  const getTotalRevenue = (periodType: PeriodType, dateValue?: string, monthValue?: string, yearValue?: string): { revenue: number; orderCount: number } => {
    const data = calculateRevenue(periodType, dateValue, monthValue, yearValue);
    return {
      revenue: data.reduce((sum, item) => sum + item.revenue, 0),
      orderCount: data.reduce((sum, item) => sum + item.orderCount, 0),
    };
  };

  const revenueData = calculateRevenue(selectedPeriod);
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + item.orderCount, 0);

  // Tính toán so sánh
  const compareData = showCompare
    ? getTotalRevenue(
        selectedPeriod,
        selectedPeriod === "day" ? compareDate : undefined,
        selectedPeriod === "month" ? compareMonth : undefined,
        selectedPeriod === "year" ? compareYear : undefined
      )
    : null;

  const revenueDiff = compareData ? totalRevenue - compareData.revenue : 0;
  const revenuePercentChange = compareData && compareData.revenue > 0
    ? ((revenueDiff / compareData.revenue) * 100).toFixed(1)
    : compareData && compareData.revenue === 0 && totalRevenue > 0
    ? "100"
    : "0";
  const orderDiff = compareData ? totalOrders - compareData.orderCount : 0;

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
        <h1 className="text-2xl font-bold text-gray-900">Doanh thu</h1>
        <p className="text-gray-600 mt-1">Theo dõi doanh thu từ các đơn hàng đã hoàn thành</p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Left: Period Type & Date Selection */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-500" size={20} />
              <span className="text-sm font-medium text-gray-700">Chọn kỳ:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedPeriod("day");
                  setShowCompare(false);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === "day"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Theo ngày
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("month");
                  setShowCompare(false);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === "month"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Theo tháng
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("year");
                  setShowCompare(false);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === "year"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Theo năm
              </button>
            </div>

            {/* Date/Month/Year Input */}
            <div className="sm:max-w-xs w-full sm:w-auto">
              {selectedPeriod === "day" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
              {selectedPeriod === "month" && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
              {selectedPeriod === "year" && (
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  min="2020"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>
          </div>

          {/* Right: Compare Toggle & Input */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4 lg:ml-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-gray-500" size={18} />
              <span className="text-sm font-medium text-gray-700">So sánh:</span>
            </div>
            <button
              onClick={() => {
                setShowCompare(!showCompare);
                if (!showCompare) {
                  // Set default compare values
                  if (selectedPeriod === "day") {
                    const yesterday = new Date(selectedDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    setCompareDate(yesterday.toISOString().split("T")[0]);
                  } else if (selectedPeriod === "month") {
                    const prevMonth = new Date(selectedMonth + "-01");
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    setCompareMonth(
                      `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`
                    );
                  } else {
                    setCompareYear(String(parseInt(selectedYear) - 1));
                  }
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                showCompare
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {showCompare ? "Tắt" : "Bật"}
            </button>
            {showCompare && (
              <div className="sm:max-w-xs w-full sm:w-auto">
                {selectedPeriod === "day" && (
                  <input
                    type="date"
                    value={compareDate}
                    onChange={(e) => setCompareDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
                {selectedPeriod === "month" && (
                  <input
                    type="month"
                    value={compareMonth}
                    onChange={(e) => setCompareMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
                {selectedPeriod === "year" && (
                  <input
                    type="number"
                    value={compareYear}
                    onChange={(e) => setCompareYear(e.target.value)}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalRevenue)}
              </p>
              {showCompare && compareData && (
                <div className="flex items-center gap-2 mt-2">
                  {revenueDiff >= 0 ? (
                    <TrendingUp className="text-green-600" size={16} />
                  ) : (
                    <TrendingDown className="text-red-600" size={16} />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      revenueDiff >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {revenueDiff >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(revenueDiff))} ({revenuePercentChange}%)
                  </span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Số đơn hàng</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {totalOrders}
              </p>
              {showCompare && compareData && (
                <div className="flex items-center gap-2 mt-2">
                  {orderDiff >= 0 ? (
                    <TrendingUp className="text-green-600" size={16} />
                  ) : (
                    <TrendingDown className="text-red-600" size={16} />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      orderDiff >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {orderDiff >= 0 ? "+" : ""}
                    {orderDiff} đơn
                  </span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Trung bình/đơn</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {totalOrders > 0
                  ? formatCurrency(totalRevenue / totalOrders)
                  : formatCurrency(0)}
              </p>
              {showCompare && compareData && compareData.orderCount > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Kỳ trước: {formatCurrency(compareData.revenue / compareData.orderCount)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Compare Section */}
      {showCompare && compareData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            So sánh doanh thu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Period */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                {selectedPeriod === "day"
                  ? `Ngày ${formatDate(selectedDate)}`
                  : selectedPeriod === "month"
                  ? `Tháng ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`
                  : `Năm ${selectedYear}`}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {totalOrders} đơn hàng
              </p>
            </div>

            {/* Compare Period */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                {selectedPeriod === "day"
                  ? `Ngày ${formatDate(compareDate)}`
                  : selectedPeriod === "month"
                  ? `Tháng ${compareMonth.split("-")[1]}/${compareMonth.split("-")[0]}`
                  : `Năm ${compareYear}`}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(compareData.revenue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {compareData.orderCount} đơn hàng
              </p>
            </div>
          </div>

          {/* Comparison Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Chênh lệch doanh thu</p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    revenueDiff >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {revenueDiff >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(revenueDiff))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">% thay đổi</p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    parseFloat(revenuePercentChange) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {parseFloat(revenuePercentChange) >= 0 ? "+" : ""}
                  {revenuePercentChange}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Chênh lệch đơn hàng</p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    orderDiff >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {orderDiff >= 0 ? "+" : ""}
                  {orderDiff} đơn
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Chi tiết doanh thu
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {selectedPeriod === "day"
                    ? "Thời gian"
                    : selectedPeriod === "month"
                    ? "Ngày"
                    : "Tháng"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số đơn hàng
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doanh thu
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueData.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Không có dữ liệu doanh thu cho kỳ đã chọn
                  </td>
                </tr>
              ) : (
                revenueData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.period}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.orderCount} đơn
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.revenue)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Revenue;

