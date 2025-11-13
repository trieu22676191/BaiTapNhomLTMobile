import {
  Ban,
  Calendar,
  Check,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../config/axios";
import { User } from "../types";

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await axiosInstance.get("/admin/users");

      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
        console.log("Users loaded:", response.data);
      } else {
        throw new Error("Dữ liệu không hợp lệ từ server");
      }
    } catch (error: any) {
      console.error("Lỗi khi tải người dùng:", error);

      let errorMessage = "Không thể tải danh sách người dùng";

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
    fetchUsers(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý Người dùng
          </h1>
          <p className="text-gray-600 mt-1">Tổng số: 0 người dùng</p>
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
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý Người dùng
          </h1>
          <p className="text-gray-600 mt-1">
            Tổng số: {users.length} người dùng
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

      {/* Error Banner */}
      {error && users.length > 0 && (
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

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên hệ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày đăng ký
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "Không tìm thấy người dùng nào"
                      : "Chưa có người dùng nào"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {user.fullName?.[0] || user.username?.[0] || "U"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName || user.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.phone || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role?.name?.toUpperCase() === "ADMIN" ||
                      user.role?.name?.toLowerCase() === "admin" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Shield size={14} className="mr-1" />
                          {user.role.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <UserIcon size={14} className="mr-1" />
                          {user.role?.name || "User"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.enabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check size={14} className="mr-1" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Ban size={14} className="mr-1" />
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                      >
                        <Check size={16} className="mr-1" />
                        Xem
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement toggle user enabled status
                          if (
                            window.confirm(
                              `Bạn có chắc muốn ${
                                user.enabled ? "khóa" : "mở khóa"
                              } người dùng này?`
                            )
                          ) {
                            console.log(
                              "Toggle user enabled:",
                              user.id,
                              !user.enabled
                            );
                          }
                        }}
                        className={`${
                          user.enabled
                            ? "text-red-600 hover:text-red-900"
                            : "text-green-600 hover:text-green-900"
                        } inline-flex items-center`}
                      >
                        <Ban size={16} className="mr-1" />
                        {user.enabled ? "Khóa" : "Mở khóa"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết người dùng
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* User Avatar & Basic Info */}
              <div className="flex items-start gap-6">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold text-2xl">
                    {selectedUser.fullName?.[0] ||
                      selectedUser.username?.[0] ||
                      "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedUser.fullName || selectedUser.username}
                  </h3>
                  <p className="text-gray-600 mb-3">@{selectedUser.username}</p>
                  <div className="flex gap-2">
                    {selectedUser.role?.name?.toUpperCase() === "ADMIN" ||
                    selectedUser.role?.name?.toLowerCase() === "admin" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        <Shield size={16} className="mr-1" />
                        {selectedUser.role.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        <UserIcon size={16} className="mr-1" />
                        {selectedUser.role?.name || "User"}
                      </span>
                    )}
                    {selectedUser.enabled ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Check size={16} className="mr-1" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <Ban size={16} className="mr-1" />
                        Đã khóa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ID */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-gray-500 text-sm font-medium">
                      ID người dùng
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    #{selectedUser.id}
                  </p>
                </div>

                {/* Email */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Mail size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 text-sm font-medium">
                      Email
                    </span>
                  </div>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>

                {/* Phone */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Phone size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 text-sm font-medium">
                      Số điện thoại
                    </span>
                  </div>
                  <p className="text-gray-900">{selectedUser.phone || "-"}</p>
                </div>

                {/* Address */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 text-sm font-medium">
                      Địa chỉ
                    </span>
                  </div>
                  <p className="text-gray-900">{selectedUser.address || "-"}</p>
                </div>

                {/* Created Date */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 text-sm font-medium">
                      Ngày đăng ký
                    </span>
                  </div>
                  <p className="text-gray-900">
                    {formatDateTime(selectedUser.createdAt)}
                  </p>
                </div>

                {/* Role Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Shield size={16} className="text-gray-400 mr-2" />
                    <span className="text-gray-500 text-sm font-medium">
                      Vai trò
                    </span>
                  </div>
                  <p className="text-gray-900">
                    {selectedUser.role?.name || "User"} (ID:{" "}
                    {selectedUser.role?.id || "-"})
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
