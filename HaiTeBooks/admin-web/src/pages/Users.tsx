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
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

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
        // Debug: Log raw data từ backend
        console.log("🔍 Raw users data from API:", JSON.stringify(response.data, null, 2));
        
        // Normalize user data từ API response
        const normalizedUsers: User[] = response.data.map((user: any) => {
          // Debug: Log từng user để xem format
          console.log(`🔍 User ${user.id} raw data:`, {
            role: user.role,
            role_id: user.role_id,
            username: user.username,
          });
          // Xử lý role - backend có thể trả về role object, role string, hoặc role_id
          let roleObj;
          
          // Hàm helper để normalize role name
          const normalizeRoleName = (roleValue: any): string => {
            if (!roleValue) return "user";
            const roleStr = typeof roleValue === "string" 
              ? roleValue 
              : roleValue.toString();
            // Xử lý các format: "ROLE_ADMIN", "ADMIN", "admin", "role_admin"
            return roleStr
              .toLowerCase()
              .replace(/^role_/, "")
              .trim();
          };
          
          // Kiểm tra xem role là object hay string
          console.log(`🔍 User ${user.id} - role type:`, typeof user.role, "value:", user.role);
          
          if (user.role && typeof user.role === "object" && user.role !== null) {
            // Backend trả về role object
            console.log(`  → Processing as object:`, user.role);
            const roleName = normalizeRoleName(user.role.name || user.role);
            const isAdmin = roleName === "admin";
            roleObj = {
              id: user.role.id || (isAdmin ? 1 : 2),
              name: isAdmin ? "admin" : "user",
            };
            console.log(`  → Normalized role object:`, roleObj);
          } else if (user.role && typeof user.role === "string") {
            // Backend trả về role là string (ví dụ: "ADMIN", "admin", "ROLE_ADMIN")
            console.log(`  → Processing as string: "${user.role}"`);
            const roleName = normalizeRoleName(user.role);
            const isAdmin = roleName === "admin";
            roleObj = {
              id: isAdmin ? 1 : 2,
              name: isAdmin ? "admin" : "user",
            };
            console.log(`  → Normalized role from string:`, roleObj);
          } else if (user.role_id !== undefined && user.role_id !== null) {
            // Backend trả về role_id (string hoặc number)
            console.log(`  → Processing role_id:`, user.role_id);
            const roleName = normalizeRoleName(user.role_id);
            const isAdmin = roleName === "admin" || user.role_id === 1 || user.role_id === "1";
            roleObj = {
              id: isAdmin ? 1 : 2,
              name: isAdmin ? "admin" : "user",
            };
            console.log(`  → Normalized role from role_id:`, roleObj);
          } else {
            // Mặc định là user
            console.log(`  → No role found, defaulting to user`);
            roleObj = {
              id: 2,
              name: "user",
            };
          }

          const normalizedUser = {
            id: user.id,
            username: user.username || "",
            email: user.email || "",
            fullName: user.fullName || user.full_name || user.username || "",
            phone: user.phone || "",
            address: user.address || "",
            enabled: user.enabled ?? true,
            role: roleObj,
            createdAt: user.createdAt || user.created_at,
          };
          
          // Debug: Log normalized user
          console.log(`✅ User ${normalizedUser.id} normalized:`, {
            username: normalizedUser.username,
            role: normalizedUser.role,
          });
          
          return normalizedUser;
        });
        
        setUsers(normalizedUsers);
        console.log("✅ All users normalized:", normalizedUsers);
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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      // Backend trả về LocalDateTime không có timezone
      // Parse trực tiếp và format theo "HH:mm DD/MM/YYYY" - không convert timezone
      const hasTimezone = dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString);
      const date = !hasTimezone && dateString.includes("T") 
        ? new Date(dateString) 
        : new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleToggleUserStatus = (user: User) => {
    const action = user.enabled ? "khóa" : "mở khóa";
    const confirmMessage = `Bạn có chắc muốn ${action} người dùng "${
      user.fullName || user.username
    }"?`;

    // Hiển thị confirm dialog
    setConfirmDialog({
      isOpen: true,
      title: `Xác nhận ${action} người dùng`,
      message: confirmMessage,
      type: user.enabled ? "danger" : "warning",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        performToggleUserStatus(user);
      },
    });
  };

  const performToggleUserStatus = async (user: User) => {
    const action = user.enabled ? "khóa" : "mở khóa";

    try {
      // Thử gọi API với chỉ field enabled trước
      // Nếu backend yêu cầu đầy đủ thông tin, sẽ gửi toàn bộ
      const response = await axiosInstance.put(`/admin/users/${user.id}`, {
        enabled: !user.enabled,
      });

      if (response.data) {
        // Cập nhật trạng thái người dùng trong danh sách
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === user.id ? { ...u, enabled: !u.enabled } : u
          )
        );

        // Nếu đang xem chi tiết người dùng này, cập nhật luôn
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, enabled: !selectedUser.enabled });
        }

        toast.success(`Đã ${action} người dùng thành công!`);
      }
    } catch (error: any) {
      console.error("Lỗi khi cập nhật trạng thái người dùng:", error);

      // Nếu lỗi 400 (Bad Request), thử lại với đầy đủ thông tin
      if (error.response?.status === 400) {
        try {
          const response = await axiosInstance.put(`/admin/users/${user.id}`, {
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || "",
            address: user.address || "",
            roleName: user.role?.name,
            enabled: !user.enabled,
          });

          if (response.data) {
            setUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.id === user.id ? { ...u, enabled: !u.enabled } : u
              )
            );

            if (selectedUser && selectedUser.id === user.id) {
              setSelectedUser({
                ...selectedUser,
                enabled: !selectedUser.enabled,
              });
            }

            toast.success(`Đã ${action} người dùng thành công!`);
            return;
          }
        } catch (retryError: any) {
          console.error("Lỗi khi thử lại với đầy đủ thông tin:", retryError);
        }
      }

      let errorMessage = `Không thể ${action} người dùng. Vui lòng thử lại.`;

      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;

        if (status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
        } else if (status === 403) {
          errorMessage = "Bạn không có quyền thực hiện thao tác này!";
        } else if (status === 400) {
          errorMessage =
            responseData?.message ||
            "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
        } else if (status >= 500) {
          errorMessage =
            responseData?.message || "Lỗi server. Vui lòng thử lại sau!";
          console.error("Server error details:", responseData);
        } else {
          errorMessage = responseData?.message || errorMessage;
        }
      }

      toast.error(errorMessage);
    }
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
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên hệ
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi tiết
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khóa/Mở khóa
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "Không tìm thấy người dùng nào"
                      : "Chưa có người dùng nào"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {user.fullName?.[0] || user.username?.[0] || "U"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.fullName || user.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.phone || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                      >
                        <Check size={16} className="mr-1.5" />
                        Xem
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          user.enabled
                            ? "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300"
                            : "text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300"
                        }`}
                      >
                        {user.enabled ? (
                          <>
                            <Ban size={16} className="mr-1.5" />
                            Khóa
                          </>
                        ) : (
                          <>
                            <Check size={16} className="mr-1.5" />
                            Mở khóa
                          </>
                        )}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

export default Users;
