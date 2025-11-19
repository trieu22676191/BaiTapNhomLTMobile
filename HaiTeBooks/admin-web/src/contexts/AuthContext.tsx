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
          
          console.log("🔍 API User Response:", JSON.stringify(apiUser, null, 2));
          console.log("🔍 API User ID:", apiUser?.id);
          console.log("🔍 API User keys:", Object.keys(apiUser || {}));
          
          // Normalize user object từ API response
          const normalizedUser = {
            id: apiUser?.id || apiUser?.userId,
            username: apiUser?.username || "",
            email: apiUser?.email || "",
            full_name: apiUser?.fullName || apiUser?.full_name || apiUser?.username || "",
            phone: apiUser?.phone || "",
            address: apiUser?.address || "",
            role_id: (apiUser?.role?.name || apiUser?.role || "user").toString().toLowerCase().replace("role_", "") as "admin" | "user",
          };

          console.log("✅ Normalized User:", JSON.stringify(normalizedUser, null, 2));
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

      // ⭐ Xử lý nhiều format role
      const userRole = (
        userData.role_id ||
        userData.role ||
        userData.authorities?.[0]?.authority ||
        ""
      )
        .toString()
        .toUpperCase()
        .replace("ROLE_", "");

      console.log("🎭 User Role detected:", userRole);

      // ⚠️ TẠM THỜI comment để test - NHỚ BẬT LẠI SAU!
      // TODO: Backend cần trả về role field
      // if (userRole !== "ADMIN") {
      //   throw new Error(
      //     `Bạn không có quyền truy cập trang quản trị! Role: ${userRole}`
      //   );
      // }
      console.warn("⚠️ Role check đã tắt tạm thời! Role hiện tại:", userRole);

      // Tạo user object chuẩn
      const normalizedUser = {
        id: userData.id || userData.userId,
        username: userData.username,
        email: userData.email || "",
        full_name: userData.full_name || userData.fullName || userData.username,
        phone: userData.phone || "",
        address: userData.address || "",
        role_id: userRole.toLowerCase() as "admin" | "user",
      };

      console.log("✅ Normalized User:", normalizedUser);

      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      console.log("✅ Đăng nhập thành công!");
    } catch (error: any) {
      console.error("❌ Login Error:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Đăng nhập thất bại!"
      );
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
