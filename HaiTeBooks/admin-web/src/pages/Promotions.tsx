import {
  Calendar,
  CheckCircle2,
  Edit,
  Filter,
  Hash,
  Plus,
  PowerOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import axiosInstance from "../config/axios";
import { useAuth } from "../contexts/AuthContext";
import { Promotion } from "../types";

const Promotions = () => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "deactivated"
  >("all");
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
    minimumOrderAmount: "" as string | number,
    maxDiscountAmount: "" as string | number,
  });
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
      const response = await axiosInstance.get("/promotions");
      const rawData = response.data || [];

      // Normalize data từ backend (backend có thể trả về active/approvedBy thay vì isActive/approvedByUserId)
      const promotionsData: Promotion[] = rawData.map((promo: any) => ({
        id: promo.id,
        name: promo.name,
        code: promo.code,
        discountPercent: promo.discountPercent,
        startDate: promo.startDate,
        endDate: promo.endDate,
        quantity: promo.quantity,
        minimumOrderAmount: promo.minimumOrderAmount || null,
        maxDiscountAmount: promo.maxDiscountAmount || null,
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

      setPromotions(promotionsData);
    } catch (error: any) {
      setPromotions([]);
      // Không hiển thị alert để tránh spam khi load trang
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra user ID với nhiều fallback
    const userId = user?.id || (user as any)?.userId || (user as any)?.user_id;

    if (!userId) {
      toast.error(
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
      );
      return;
    }

    setSubmitting(true);

    try {
      // Validate form
      if (!formData.name.trim()) {
        toast.error("Vui lòng nhập tên khuyến mãi");
        setSubmitting(false);
        return;
      }
      if (!formData.code.trim()) {
        toast.error("Vui lòng nhập mã khuyến mãi");
        setSubmitting(false);
        return;
      }
      if (
        !formData.discountPercent ||
        formData.discountPercent <= 0 ||
        formData.discountPercent > 100
      ) {
        toast.error("Vui lòng nhập phần trăm giảm giá từ 1 đến 100");
        setSubmitting(false);
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        toast.error("Vui lòng chọn ngày bắt đầu và kết thúc");
        setSubmitting(false);
        return;
      }
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        toast.error("Ngày kết thúc phải sau ngày bắt đầu");
        setSubmitting(false);
        return;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        toast.error("Vui lòng nhập số lượng lớn hơn 0");
        setSubmitting(false);
        return;
      }

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
        minimumOrderAmount:
          formData.minimumOrderAmount === "" ||
          formData.minimumOrderAmount === null ||
          formData.minimumOrderAmount === undefined
            ? null
            : Number(formData.minimumOrderAmount) || null,
        maxDiscountAmount:
          formData.maxDiscountAmount === "" ||
          formData.maxDiscountAmount === null ||
          formData.maxDiscountAmount === undefined
            ? null
            : Number(formData.maxDiscountAmount) || null,
      };

      try {
        if (editingPromotion) {
          // Update existing promotion
          await axiosInstance.put(
            `/promotions/update/${editingPromotion.id}`,
            promotionData
          );

          toast.success("Cập nhật khuyến mãi thành công!");
        } else {
          // Create new promotion
          const response = await axiosInstance.post(
            `/promotions/create/${userId}`,
            promotionData
          );

          // Tự động approve nếu user là admin
          const createdPromotion = response.data;
          const userRole =
            (user as any)?.role_id || user?.role?.name?.toLowerCase() || "";
          if (createdPromotion?.id && userRole === "admin") {
            try {
              await axiosInstance.put(
                `/promotions/approve/${createdPromotion.id}/${userId}`
              );
            } catch (approveError: any) {
              // Không throw error, chỉ log vì promotion đã được tạo thành công
            }
          }

          toast.success("Tạo khuyến mãi thành công!");
        }

        fetchPromotions();
        handleCloseModal();
      } catch (apiError: any) {
        throw apiError; // Re-throw để catch block xử lý
      }
    } catch (error: any) {
      const isUpdate = !!editingPromotion;

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        `Có lỗi xảy ra khi ${isUpdate ? "cập nhật" : "tạo"} khuyến mãi!`;
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = (promotionId: number) => {
    if (!user?.id) {
      toast.error("Không tìm thấy thông tin người dùng");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận duyệt khuyến mãi",
      message: "Bạn có chắc chắn muốn duyệt khuyến mãi này?",
      type: "info",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        performApprove(promotionId);
      },
    });
  };

  const performApprove = async (promotionId: number) => {
    try {
      await axiosInstance.put(`/promotions/approve/${promotionId}/${user?.id}`);
      toast.success("Duyệt khuyến mãi thành công!");
      fetchPromotions();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Có lỗi xảy ra khi duyệt khuyến mãi!";
      toast.error(errorMessage);
    }
  };

  const handleDeactivate = (promotionId: number) => {
    if (!user?.id) {
      toast.error("Không tìm thấy thông tin người dùng");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận vô hiệu hóa khuyến mãi",
      message: "Bạn có chắc chắn muốn vô hiệu hóa khuyến mãi này?",
      type: "danger",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        performDeactivate(promotionId);
      },
    });
  };

  const performDeactivate = async (promotionId: number) => {
    try {
      await axiosInstance.put(
        `/promotions/deactivate/${promotionId}/${user?.id}`
      );
      toast.success("Vô hiệu hóa khuyến mãi thành công!");
      fetchPromotions();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        "Có lỗi xảy ra khi vô hiệu hóa khuyến mãi!";
      toast.error(errorMessage);
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
      minimumOrderAmount: promotion.minimumOrderAmount || "",
      maxDiscountAmount: promotion.maxDiscountAmount || "",
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
      minimumOrderAmount: "",
      maxDiscountAmount: "",
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
      toast.error("Không tìm thấy thông tin người dùng");
      return;
    }

    const userId = user?.id || (user as any)?.userId || (user as any)?.user_id;
    if (!userId) {
      toast.error("Không tìm thấy ID người dùng");
      return;
    }

    // Nếu chọn cùng trạng thái, không làm gì
    if (newStatus === oldStatus) {
      return;
    }

    // Chỉ xử lý approved và deactivated
    if (newStatus !== "approved" && newStatus !== "deactivated") {
      return;
    }

    // Hiển thị confirm dialog dựa trên action
    let confirmMessage = "";
    let confirmTitle = "";
    let confirmType: "danger" | "warning" | "info" = "warning";

    if (newStatus === "approved") {
      confirmTitle = "Xác nhận duyệt khuyến mãi";
      confirmMessage = "Bạn có chắc chắn muốn duyệt khuyến mãi này?";
      confirmType = "info";
    } else if (newStatus === "deactivated") {
      confirmTitle = "Xác nhận vô hiệu hóa khuyến mãi";
      confirmMessage = "Bạn có chắc chắn muốn vô hiệu hóa khuyến mãi này?";
      confirmType = "danger";
    }

    if (confirmMessage) {
      setConfirmDialog({
        isOpen: true,
        title: confirmTitle,
        message: confirmMessage,
        type: confirmType,
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          performStatusChange(promotionId, newStatus, userId);
        },
      });
      return;
    }
  };

  const performStatusChange = async (
    promotionId: number,
    newStatus: string,
    userId: number
  ) => {
    try {
      if (newStatus === "approved") {
        // Tìm promotion hiện tại để kiểm tra trạng thái
        const currentPromotion = promotions.find((p) => p.id === promotionId);
        const currentStatus = currentPromotion
          ? getCurrentStatus(currentPromotion)
          : "";

        // Nếu promotion đã bị vô hiệu hóa, không thể kích hoạt lại
        if (currentStatus === "deactivated") {
          toast.error("Khuyến mãi hết hiệu lực không thể mở lại");
          return;
        }

        // Nếu chưa được approve (pending) hoặc chưa có approvedByUserId
        // → Dùng endpoint approve
        await axiosInstance.put(`/promotions/approve/${promotionId}/${userId}`);
        toast.success("Duyệt khuyến mãi thành công!");
      } else if (newStatus === "deactivated") {
        await axiosInstance.put(
          `/promotions/deactivate/${promotionId}/${userId}`
        );
        toast.success("Vô hiệu hóa khuyến mãi thành công!");
      }

      // Đợi một chút để backend xử lý xong, sau đó refresh
      await new Promise((resolve) => setTimeout(resolve, 300));
      await fetchPromotions();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Có lỗi xảy ra khi thay đổi trạng thái!";
      toast.error(errorMessage);
      // Refresh để revert UI về trạng thái cũ
      await fetchPromotions();
    }
  };

  // Filter promotions theo status
  const filteredPromotions = promotions.filter((promotion) => {
    const currentStatus = getCurrentStatus(promotion);
    // Chỉ hiển thị approved và deactivated, pending/rejected coi như deactivated
    if (statusFilter === "all") {
      return true;
    } else if (statusFilter === "approved") {
      return currentStatus === "approved";
    } else if (statusFilter === "deactivated") {
      return (
        currentStatus === "deactivated" ||
        currentStatus === "pending" ||
        currentStatus === "rejected"
      );
    }
    return false;
  });

  // Đếm số lượng promotions theo status
  const approvedCount = promotions.filter(
    (p) => getCurrentStatus(p) === "approved"
  ).length;
  const deactivatedCount = promotions.filter((p) => {
    const status = getCurrentStatus(p);
    return (
      status === "deactivated" || status === "pending" || status === "rejected"
    );
  }).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // Backend trả về LocalDateTime không có timezone
      // Parse trực tiếp và format theo "DD/MM/YYYY" - không convert timezone
      const hasTimezone =
        dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString);
      const date =
        !hasTimezone && dateString.includes("T")
          ? new Date(dateString)
          : new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "N/A";
    }
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
            {statusFilter !== "all" && (
              <span className="ml-2">
                ({filteredPromotions.length}{" "}
                {statusFilter === "approved"
                  ? "đang hoạt động"
                  : "đã vô hiệu hóa"}
                )
              </span>
            )}
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

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">
              Lọc theo trạng thái:
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tất cả ({promotions.length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                statusFilter === "approved"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                statusFilter === "approved"
                  ? {}
                  : {
                      backgroundColor: "#D1FAE5",
                      color: "#065F46",
                    }
              }
            >
              <CheckCircle2 size={16} />
              Đang hoạt động ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter("deactivated")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                statusFilter === "deactivated"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                statusFilter === "deactivated"
                  ? {}
                  : {
                      backgroundColor: "#F3F4F6",
                      color: "#374151",
                    }
              }
            >
              <PowerOff size={16} />
              Đã vô hiệu hóa ({deactivatedCount})
            </button>
          </div>
        </div>
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
                  Giá trị áp dụng
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
              {filteredPromotions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {promotions.length === 0
                      ? "Chưa có khuyến mãi nào"
                      : `Không có khuyến mãi nào với trạng thái "${
                          statusFilter === "approved"
                            ? "đang hoạt động"
                            : "đã vô hiệu hóa"
                        }"`}
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promotion) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {promotion.minimumOrderAmount
                        ? new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(promotion.minimumOrderAmount)
                        : "Không có"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={
                          getCurrentStatus(promotion) === "pending" ||
                          getCurrentStatus(promotion) === "rejected"
                            ? "deactivated"
                            : getCurrentStatus(promotion)
                        }
                        onChange={(e) =>
                          handleStatusChange(promotion.id, e.target.value)
                        }
                        className="text-xs font-semibold rounded-full px-3 py-1.5 border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer transition-colors appearance-none bg-no-repeat bg-right pr-8"
                        style={{
                          backgroundColor: getStatusColor(
                            getCurrentStatus(promotion) === "pending" ||
                              getCurrentStatus(promotion) === "rejected"
                              ? "deactivated"
                              : getCurrentStatus(promotion)
                          ).bg,
                          color: getStatusColor(
                            getCurrentStatus(promotion) === "pending" ||
                              getCurrentStatus(promotion) === "rejected"
                              ? "deactivated"
                              : getCurrentStatus(promotion)
                          ).text,
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${encodeURIComponent(
                            getStatusColor(
                              getCurrentStatus(promotion) === "pending" ||
                                getCurrentStatus(promotion) === "rejected"
                                ? "deactivated"
                                : getCurrentStatus(promotion)
                            ).text
                          )}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundPosition: "right 0.5rem center",
                        }}
                      >
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
                          <button
                            onClick={() => handleApprove(promotion.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Duyệt"
                          >
                            <CheckCircle2 size={18} />
                          </button>
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
                    Giá trị đơn hàng tối thiểu (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={
                      formData.minimumOrderAmount === "" ||
                      formData.minimumOrderAmount === null ||
                      formData.minimumOrderAmount === undefined
                        ? ""
                        : formData.minimumOrderAmount
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        minimumOrderAmount:
                          value === "" ? "" : parseInt(value) || "",
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Để trống nếu không có điều kiện"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Đơn hàng phải đạt giá trị tối thiểu này
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giảm tối đa (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={
                      formData.maxDiscountAmount === "" ||
                      formData.maxDiscountAmount === null ||
                      formData.maxDiscountAmount === undefined
                        ? ""
                        : formData.maxDiscountAmount
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        maxDiscountAmount:
                          value === "" ? "" : parseInt(value) || "",
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Để trống nếu không giới hạn"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Số tiền giảm tối đa khi áp dụng mã này
                  </p>
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

export default Promotions;
