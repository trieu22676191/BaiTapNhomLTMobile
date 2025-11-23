import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import axiosInstance from "../config/axios";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra xem có token trong localStorage không
    const checkAuth = async () => {
      const token = localStorage.getItem("admin_token");
      const savedUser = localStorage.getItem("admin_user");

      if (token && savedUser) {
        try {
          // Fetch lại user từ API để đảm bảo có đầy đủ thông tin, đặc biệt là id
          const response = await axiosInstance.get("/users/me");
          const apiUser = response.data;

          console.log(
            "🔍 API User Response:",
            JSON.stringify(apiUser, null, 2)
          );
          console.log("🔍 API User ID:", apiUser?.id);
          console.log("🔍 API User keys:", Object.keys(apiUser || {}));

          // Normalize user object từ API response
          const roleName = (apiUser?.role?.name || apiUser?.role || "user")
            .toString()
            .toLowerCase()
            .replace("role_", "");

          // ✅ KIỂM TRA ROLE KHI RESTORE SESSION - Chỉ cho phép ADMIN
          const roleNameUpper = roleName.toUpperCase();
          if (roleNameUpper !== "ADMIN") {
            console.warn("⚠️ User không phải admin, đăng xuất...");
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
            setUser(null);
            setIsLoading(false);
            return;
          }

          const normalizedUser: User = {
            id: apiUser?.id || apiUser?.userId,
            username: apiUser?.username || "",
            email: apiUser?.email || "",
            fullName:
              apiUser?.fullName ||
              apiUser?.full_name ||
              apiUser?.username ||
              "",
            phone: apiUser?.phone || "",
            address: apiUser?.address || "",
            enabled: apiUser?.enabled ?? true,
            role: {
              id: apiUser?.role?.id || (roleName === "admin" ? 1 : 2),
              name: apiUser?.role?.name || roleName,
            },
          };

          console.log(
            "✅ Normalized User:",
            JSON.stringify(normalizedUser, null, 2)
          );
          console.log("✅ Normalized User ID:", normalizedUser.id);

          // Cập nhật localStorage với user đầy đủ thông tin
          localStorage.setItem("admin_user", JSON.stringify(normalizedUser));
          setUser(normalizedUser);
        } catch (error) {
          // Token không hợp lệ
          console.error("❌ Auth check failed:", error);
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axiosInstance.post("/auth/login", {
        username,
        password,
      });

      // ⭐ LOG để debug
      console.log("🔐 Login Response:", response.data);

      // ⭐ Backend có thể trả về nhiều format:
      // Format 1: { token, user: {...} }
      // Format 2: { token, username, role, ... }
      const token = response.data.token;
      const userData = response.data.user || response.data; // Nếu không có user object, dùng chính response.data

      console.log("👤 User Data:", userData);
      console.log("🔑 Token:", token ? "✅ Có" : "❌ Không có");

      if (!token) {
        throw new Error("Backend không trả về token!");
      }

      // ✅ Lưu token tạm thời để fetch user info
      // Interceptor trong axios.ts sẽ tự động thêm token vào header
      localStorage.setItem("admin_token", token);

      // ✅ Fetch thông tin user đầy đủ từ API để lấy role
      let apiUser;
      try {
        const userResponse = await axiosInstance.get("/users/me");
        apiUser = userResponse.data;
        console.log("👤 API User Response:", JSON.stringify(apiUser, null, 2));
      } catch (error) {
        // Nếu không fetch được user info, xóa token và throw error
        localStorage.removeItem("admin_token");
        throw new Error(
          "Tên đăng nhập hoặc mật khẩu không đúng, vui lòng kiểm tra lại"
        );
      }

      // ⭐ Xử lý nhiều format role từ API response
      const roleName = (
        apiUser?.role?.name ||
        apiUser?.role ||
        apiUser?.role_id ||
        apiUser?.authorities?.[0]?.authority ||
        "user"
      )
        .toString()
        .toLowerCase()
        .replace("role_", "");

      const userRole = roleName.toUpperCase();

      console.log("🎭 User Role detected:", userRole);

      // ✅ KIỂM TRA ROLE - Chỉ cho phép ADMIN đăng nhập
      // Hiển thị thông báo chung để bảo mật (không tiết lộ tài khoản tồn tại nhưng không có quyền)
      if (userRole !== "ADMIN") {
        localStorage.removeItem("admin_token");
        throw new Error(
          "Tên đăng nhập hoặc mật khẩu không đúng, vui lòng kiểm tra lại"
        );
      }

      // Tạo user object chuẩn từ API response
      const normalizedUser: User = {
        id: apiUser?.id || apiUser?.userId,
        username: apiUser?.username || userData.username,
        email: apiUser?.email || "",
        fullName:
          apiUser?.fullName || apiUser?.full_name || apiUser?.username || "",
        phone: apiUser?.phone || "",
        address: apiUser?.address || "",
        enabled: apiUser?.enabled ?? true,
        role: {
          id: apiUser?.role?.id || (roleName === "admin" ? 1 : 2),
          name: apiUser?.role?.name || roleName,
        },
      };

      console.log("✅ Normalized User:", normalizedUser);

      localStorage.setItem("admin_user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      console.log("✅ Đăng nhập thành công!");
    } catch (error: any) {
      console.error("❌ Login Error:", error);

      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message || "";

      // ✅ Xử lý các lỗi liên quan đến authentication
      // 400 (Bad Request) - thường là mật khẩu sai hoặc request không hợp lệ
      // 401 (Unauthorized) - không được xác thực
      // 403 (Forbidden) - không có quyền
      if (status === 400 || status === 401 || status === 403) {
        throw new Error(
          "Tên đăng nhập hoặc mật khẩu không đúng, vui lòng kiểm tra lại"
        );
      }

      // ✅ Lỗi 500 (Server Error) - có thể là lỗi server hoặc lỗi auth từ backend
      if (status === 500) {
        // Kiểm tra xem có phải lỗi liên quan đến authentication không
        const isAuthError =
          errorMessage.toLowerCase().includes("user") ||
          errorMessage.toLowerCase().includes("password") ||
          errorMessage.toLowerCase().includes("account") ||
          errorMessage.toLowerCase().includes("authentication") ||
          errorMessage.toLowerCase().includes("credentials") ||
          errorMessage.toLowerCase().includes("not found");

        if (isAuthError) {
          // Nếu là lỗi liên quan đến auth, hiển thị thông báo chung
          throw new Error(
            "Tên đăng nhập hoặc mật khẩu không đúng, vui lòng kiểm tra lại"
          );
        } else {
          // Lỗi server thực sự
          throw new Error(
            "Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên."
          );
        }
      }

      // ✅ Các lỗi khác - hiển thị message từ backend hoặc message mặc định
      throw new Error(errorMessage || "Đăng nhập thất bại. Vui lòng thử lại!");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
