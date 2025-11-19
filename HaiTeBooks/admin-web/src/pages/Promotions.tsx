import {
  Calendar,
  CheckCircle2,
  Edit,
  Hash,
  Percent,
  Plus,
  PowerOff,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../config/axios";
import { useAuth } from "../contexts/AuthContext";
import { Promotion } from "../types";

const Promotions = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discountPercent: 0,
    startDate: "",
    endDate: "",
    quantity: 0,
  });

  // Helper function để xác định status hiện tại
  const getCurrentStatus = (promotion: Promotion): string => {
    // Nếu có status từ backend, dùng status
    if (promotion.status) {
      return promotion.status;
    }

    // Nếu không có status, dựa vào isActive và approvedByUserId
    if (!promotion.isActive) {
      return "deactivated";
    }

    if (!promotion.approvedByUserId) {
      return "pending";
    }

    return "approved";
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      console.log("🔄 Fetching promotions...");
      const response = await axiosInstance.get("/promotions");
      console.log("✅ Promotions loaded:", response.data);
      const rawData = response.data || [];
      console.log("📊 Raw promotions data:", JSON.stringify(rawData, null, 2));

      // Normalize data từ backend (backend có thể trả về active/approvedBy thay vì isActive/approvedByUserId)
      const promotionsData: Promotion[] = rawData.map((promo: any) => ({
        id: promo.id,
        name: promo.name,
        code: promo.code,
        discountPercent: promo.discountPercent,
        startDate: promo.startDate,
        endDate: promo.endDate,
        quantity: promo.quantity,
        isActive:
          promo.isActive !== undefined
            ? promo.isActive
            : promo.active !== undefined
            ? promo.active
            : true,
        createdByUserId: promo.createdByUserId || promo.createdBy,
        approvedByUserId: promo.approvedByUserId || promo.approvedBy,
        status: promo.status,
        createdAt: promo.createdAt,
      }));

      // Log từng promotion sau khi normalize
      promotionsData.forEach((promo: Promotion) => {
        console.log(`📌 Promotion ${promo.id} (normalized):`, {
          id: promo.id,
          code: promo.code,
          isActive: promo.isActive,
          approvedByUserId: promo.approvedByUserId,
          status: promo.status,
          currentStatus: getCurrentStatus(promo),
        });
      });

      setPromotions(promotionsData);
    } catch (error: any) {
      console.error("❌ Lỗi khi tải khuyến mãi:", error);
      console.error("❌ Error status:", error?.response?.status);
      console.error("❌ Error data:", error?.response?.data);
      setPromotions([]);
      // Không hiển thị alert để tránh spam khi load trang
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 Form submitted");
    console.log("📝 Form data:", formData);
    console.log("👤 User:", user);
    console.log("👤 User ID:", user?.id);
    console.log("👤 User keys:", user ? Object.keys(user) : "null");

    // Kiểm tra user ID với nhiều fallback
    const userId = user?.id || (user as any)?.userId || (user as any)?.user_id;

    if (!userId) {
      console.error("❌ User ID không tồn tại:", {
        user,
        id: user?.id,
        userId: (user as any)?.userId,
        user_id: (user as any)?.user_id,
      });
      alert("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      return;
    }

    console.log("✅ User ID found:", userId);

    setSubmitting(true);

    try {
      console.log("✅ Validation started");

      // Validate form
      if (!formData.name.trim()) {
        console.log("❌ Validation failed: name is empty");
        alert("Vui lòng nhập tên khuyến mãi");
        setSubmitting(false);
        return;
      }
      if (!formData.code.trim()) {
        console.log("❌ Validation failed: code is empty");
        alert("Vui lòng nhập mã khuyến mãi");
        setSubmitting(false);
        return;
      }
      if (
        !formData.discountPercent ||
        formData.discountPercent <= 0 ||
        formData.discountPercent > 100
      ) {
        console.log(
          "❌ Validation failed: discountPercent invalid",
          formData.discountPercent
        );
        alert("Vui lòng nhập phần trăm giảm giá từ 1 đến 100");
        setSubmitting(false);
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        console.log("❌ Validation failed: dates missing", {
          startDate: formData.startDate,
          endDate: formData.endDate,
        });
        alert("Vui lòng chọn ngày bắt đầu và kết thúc");
        setSubmitting(false);
        return;
      }
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        console.log("❌ Validation failed: endDate must be after startDate");
        alert("Ngày kết thúc phải sau ngày bắt đầu");
        setSubmitting(false);
        return;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        console.log(
          "❌ Validation failed: quantity invalid",
          formData.quantity
        );
        alert("Vui lòng nhập số lượng lớn hơn 0");
        setSubmitting(false);
        return;
      }

      console.log("✅ All validations passed");

      // Đảm bảo format date đúng (YYYY-MM-DD)
      const startDate = formData.startDate.split("T")[0]; // Lấy phần date nếu có time
      const endDate = formData.endDate.split("T")[0];

      const promotionData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        discountPercent: formData.discountPercent,
        startDate: startDate,
        endDate: endDate,
        quantity: formData.quantity,
      };

      console.log(
        "📦 Sending promotion data:",
        JSON.stringify(promotionData, null, 2)
      );
      console.log("👤 User ID:", userId);

      try {
        if (editingPromotion) {
          // Update existing promotion
          console.log("🔄 Updating promotion:", editingPromotion.id);
          console.log(
            "🔗 URL:",
            `/api/promotions/update/${editingPromotion.id}`
          );
          console.log(
            "📦 Update data:",
            JSON.stringify(promotionData, null, 2)
          );

          const response = await axiosInstance.put(
            `/promotions/update/${editingPromotion.id}`,
            promotionData
          );

          console.log("✅ Update response:", response.data);
          console.log("✅ Promotion updated successfully!");
          alert("Cập nhật khuyến mãi thành công!");
        } else {
          // Create new promotion
          console.log("🔗 URL:", `/promotions/create/${userId}`);
          const response = await axiosInstance.post(
            `/promotions/create/${userId}`,
            promotionData
          );

          console.log("✅ Response:", response.data);
          console.log("✅ Promotion created successfully!");

          // Tự động approve nếu user là admin
          const createdPromotion = response.data;
          const userRole =
            (user as any)?.role_id || user?.role?.name?.toLowerCase() || "";
          if (createdPromotion?.id && userRole === "admin") {
            try {
              console.log("🔄 Auto-approving promotion...");
              await axiosInstance.put(
                `/promotions/approve/${createdPromotion.id}/${userId}`
              );
              console.log("✅ Promotion auto-approved!");
            } catch (approveError: any) {
              console.error("⚠️ Failed to auto-approve:", approveError);
              // Không throw error, chỉ log vì promotion đã được tạo thành công
            }
          }

          alert("Tạo khuyến mãi thành công!");
        }

        fetchPromotions();
        handleCloseModal();
      } catch (apiError: any) {
        console.error("❌ API Error:", apiError);
        throw apiError; // Re-throw để catch block xử lý
      }
    } catch (error: any) {
      const isUpdate = !!editingPromotion;
      console.error(
        `❌ Lỗi khi ${isUpdate ? "cập nhật" : "tạo"} khuyến mãi:`,
        error
      );
      console.error("❌ Error status:", error?.response?.status);
      console.error("❌ Error data:", error?.response?.data);
      console.error("❌ Error message:", error?.message);
      console.error(
        "❌ Full error:",
        JSON.stringify(error?.response?.data, null, 2)
      );

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        `Có lỗi xảy ra khi ${isUpdate ? "cập nhật" : "tạo"} khuyến mãi!`;
      alert(`Lỗi: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (promotionId: number) => {
    if (!user?.id) {
      alert("Không tìm thấy thông tin người dùng");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn duyệt khuyến mãi này?")) {
      return;
    }

    try {
      await axiosInstance.put(`/promotions/approve/${promotionId}/${user.id}`);
      alert("Duyệt khuyến mãi thành công!");
      fetchPromotions();
    } catch (error: any) {
      console.error("Lỗi khi duyệt khuyến mãi:", error);
      const errorMessage =
        error?.response?.data?.message || "Có lỗi xảy ra khi duyệt khuyến mãi!";
      alert(errorMessage);
    }
  };

  const handleReject = async (promotionId: number) => {
    if (!user?.id) {
      alert("Không tìm thấy thông tin người dùng");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn từ chối khuyến mãi này?")) {
      return;
    }

    try {
      await axiosInstance.put(`/promotions/reject/${promotionId}/${user.id}`);
      alert("Từ chối khuyến mãi thành công!");
      fetchPromotions();
    } catch (error: any) {
      console.error("Lỗi khi từ chối khuyến mãi:", error);
      const errorMessage =
        error?.response?.data?.message ||
        "Có lỗi xảy ra khi từ chối khuyến mãi!";
      alert(errorMessage);
    }
  };

  const handleDeactivate = async (promotionId: number) => {
    if (!user?.id) {
      alert("Không tìm thấy thông tin người dùng");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn vô hiệu hóa khuyến mãi này?")) {
      return;
    }

    try {
      await axiosInstance.put(
        `/promotions/deactivate/${promotionId}/${user.id}`
      );
      alert("Vô hiệu hóa khuyến mãi thành công!");
      fetchPromotions();
    } catch (error: any) {
      console.error("Lỗi khi vô hiệu hóa khuyến mãi:", error);
      const errorMessage =
        error?.response?.data?.message ||
        "Có lỗi xảy ra khi vô hiệu hóa khuyến mãi!";
      alert(errorMessage);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      code: promotion.code,
      discountPercent: promotion.discountPercent,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      quantity: promotion.quantity,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    setFormData({
      name: "",
      code: "",
      discountPercent: 0,
      startDate: "",
      endDate: "",
      quantity: 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "#D1FAE5", text: "#065F46" }; // green-100, green-700
      case "pending":
        return { bg: "#FEF3C7", text: "#92400E" }; // yellow-100, yellow-700
      case "rejected":
        return { bg: "#FEE2E2", text: "#991B1B" }; // red-100, red-700
      case "deactivated":
        return { bg: "#F3F4F6", text: "#374151" }; // gray-100, gray-700
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  const handleStatusChange = async (promotionId: number, newStatus: string) => {
    // Lưu trạng thái cũ để revert nếu cần
    const currentPromotion = promotions.find((p) => p.id === promotionId);
    const oldStatus = currentPromotion
      ? getCurrentStatus(currentPromotion)
      : "";

    if (!user?.id) {
      alert("Không tìm thấy thông tin người dùng");
      return;
    }

    const userId = user?.id || (user as any)?.userId || (user as any)?.user_id;
    if (!userId) {
      alert("Không tìm thấy ID người dùng");
      return;
    }

    // Nếu chọn cùng trạng thái, không làm gì
    if (newStatus === oldStatus) {
      return;
    }

    try {
      if (newStatus === "approved") {
        if (!window.confirm("Bạn có chắc chắn muốn duyệt khuyến mãi này?")) {
          return; // Không cần refresh vì chưa thay đổi
        }
        console.log(`🔄 Approving promotion ${promotionId}...`);
        const response = await axiosInstance.put(
          `/promotions/approve/${promotionId}/${userId}`
        );
        console.log("✅ Approve response:", response.data);
        alert("Duyệt khuyến mãi thành công!");
      } else if (newStatus === "rejected") {
        if (!window.confirm("Bạn có chắc chắn muốn từ chối khuyến mãi này?")) {
          return;
        }
        console.log(`🔄 Rejecting promotion ${promotionId}...`);
        const response = await axiosInstance.put(
          `/promotions/reject/${promotionId}/${userId}`
        );
        console.log("✅ Reject response:", response.data);
        alert("Từ chối khuyến mãi thành công!");
      } else if (newStatus === "deactivated") {
        if (
          !window.confirm("Bạn có chắc chắn muốn vô hiệu hóa khuyến mãi này?")
        ) {
          return;
        }
        console.log(`🔄 Deactivating promotion ${promotionId}...`);
        const response = await axiosInstance.put(
          `/promotions/deactivate/${promotionId}/${userId}`
        );
        console.log("✅ Deactivate response:", response.data);
        alert("Vô hiệu hóa khuyến mãi thành công!");
      } else if (newStatus === "pending") {
        // Để chuyển về pending, cần reactivate và remove approval
        if (
          !window.confirm(
            "Bạn có chắc chắn muốn chuyển khuyến mãi về trạng thái chờ duyệt?"
          )
        ) {
          return;
        }
        // Note: Backend có thể cần thêm endpoint để reactivate
        // Tạm thời chỉ thông báo
        alert(
          "Tính năng này đang được phát triển. Vui lòng sử dụng các nút thao tác."
        );
        return;
      }

      // Đợi một chút để backend xử lý xong, sau đó refresh
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log("🔄 Refreshing promotions list...");
      await fetchPromotions();
      console.log("✅ Promotions refreshed");
    } catch (error: any) {
      console.error("❌ Lỗi khi thay đổi trạng thái:", error);
      console.error("❌ Error response:", error?.response?.data);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Có lỗi xảy ra khi thay đổi trạng thái!";
      alert(`Lỗi: ${errorMessage}`);
      // Refresh để revert UI về trạng thái cũ
      await fetchPromotions();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý Khuyến mãi
          </h1>
          <p className="text-gray-600 mt-1">
            Tổng số: {promotions.length} khuyến mãi
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Tạo khuyến mãi
        </button>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảm giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
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
              {promotions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Chưa có khuyến mãi nào
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Hash size={16} className="text-gray-400 mr-1" />
                        <span className="text-sm font-semibold text-gray-900">
                          {promotion.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {promotion.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-primary-600 font-semibold">
                        <Percent size={16} className="mr-1" />
                        {promotion.discountPercent}%
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center mb-1">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(promotion.startDate)}
                        </div>
                        <div className="text-xs text-gray-400">
                          đến {formatDate(promotion.endDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promotion.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={getCurrentStatus(promotion)}
                        onChange={(e) =>
                          handleStatusChange(promotion.id, e.target.value)
                        }
                        className="text-xs font-semibold rounded-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer transition-colors appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundColor: getStatusColor(
                            getCurrentStatus(promotion)
                          ).bg,
                          color: getStatusColor(getCurrentStatus(promotion))
                            .text,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${encodeURIComponent(
                            getStatusColor(getCurrentStatus(promotion)).text
                          )}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundPosition: "right 0.5rem center",
                        }}
                      >
                        <option
                          value="pending"
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                          }}
                        >
                          Chờ duyệt
                        </option>
                        <option
                          value="approved"
                          style={{
                            backgroundColor: "#D1FAE5",
                            color: "#065F46",
                          }}
                        >
                          Đang hoạt động
                        </option>
                        <option
                          value="rejected"
                          style={{
                            backgroundColor: "#FEE2E2",
                            color: "#991B1B",
                          }}
                        >
                          Đã từ chối
                        </option>
                        <option
                          value="deactivated"
                          style={{
                            backgroundColor: "#F3F4F6",
                            color: "#374151",
                          }}
                        >
                          Đã vô hiệu hóa
                        </option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit size={18} />
                        </button>
                        {promotion.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(promotion.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Duyệt"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(promotion.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        {promotion.isActive &&
                          promotion.status === "approved" && (
                            <button
                              onClick={() => handleDeactivate(promotion.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Vô hiệu hóa"
                            >
                              <PowerOff size={18} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingPromotion ? "Sửa khuyến mãi" : "Tạo khuyến mãi mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên khuyến mãi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ví dụ: Giảm 20% tháng 12"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mã khuyến mãi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  required
                  maxLength={20}
                  disabled={!!editingPromotion}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Ví dụ: SALE20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingPromotion
                    ? "Mã khuyến mãi không thể thay đổi"
                    : "Mã sẽ tự động chuyển thành chữ hoa"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phần trăm giảm giá (%){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={
                      formData.discountPercent > 0
                        ? formData.discountPercent
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        discountPercent:
                          value === "" ? 0 : parseInt(value) || 0,
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nhập phần trăm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity > 0 ? formData.quantity : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        quantity: value === "" ? 0 : parseInt(value) || 0,
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nhập số lượng"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                    min={formData.startDate}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang xử lý...
                    </span>
                  ) : editingPromotion ? (
                    "Cập nhật"
                  ) : (
                    "Tạo khuyến mãi"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotions;
