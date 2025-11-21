import { Clock, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import axiosInstance from "../config/axios";
import { useConfirm } from "../hooks/useConfirm";
import { Review } from "../types";

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"user" | "book" | "all">("all");
  const [inputId, setInputId] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { confirm, confirmState, handleCancel, handleConfirm } = useConfirm();

  // Tự động load dữ liệu khi component mount
  useEffect(() => {
    const loadInitialReviews = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/reviews`);
        const reviewsData = response.data || [];
        setReviews(reviewsData);
      } catch (error) {
        console.error("Lỗi khi tải đánh giá:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    loadInitialReviews();
  }, []);

  const fetchReviews = async () => {
    if (!inputId && viewMode !== "all") {
      toast.error("Vui lòng nhập ID!");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (viewMode === "user") {
        response = await axiosInstance.get(`/reviews/user/${inputId}`);
      } else if (viewMode === "book") {
        response = await axiosInstance.get(`/reviews/book/${inputId}`);
      } else {
        // "all" - lấy tất cả đánh giá
        response = await axiosInstance.get(`/reviews`);
      }
      const reviewsData = response.data || [];
      setReviews(reviewsData);
    } catch (error) {
      console.error("Lỗi khi tải đánh giá:", error);
      setReviews([]);
      toast.error("Không tìm thấy đánh giá!");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // Backend trả về LocalDateTime không có timezone
      // Parse trực tiếp và format theo "HH:mm DD/MM/YYYY" - không convert timezone
      const hasTimezone =
        dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString);
      const date =
        !hasTimezone && dateString.includes("T")
          ? new Date(dateString)
          : new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return "N/A";
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    const confirmed = await confirm({
      title: "Xóa đánh giá",
      message: "Bạn có chắc chắn muốn xóa đánh giá này?",
      confirmText: "Xóa",
      cancelText: "Hủy",
      type: "danger",
    });

    if (!confirmed) {
      return;
    }

    setDeletingId(reviewId);
    try {
      await axiosInstance.delete(`/reviews/${reviewId}`);
      toast.success("Xóa đánh giá thành công!");
      // Cập nhật danh sách sau khi xóa
      setReviews(reviews.filter((review) => review.id !== reviewId));
    } catch (error: any) {
      console.error("Lỗi khi xóa đánh giá:", error);
      toast.error(error?.response?.data?.message || "Không thể xóa đánh giá!");
    } finally {
      setDeletingId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá</h1>
        <p className="text-gray-600 mt-1">Tổng số: {reviews.length} đánh giá</p>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={async () => {
              setViewMode("all");
              setReviews([]);
              setInputId("");
              // Tự động load tất cả đánh giá khi chọn mode "all"
              setLoading(true);
              try {
                const response = await axiosInstance.get(`/reviews`);
                setReviews(response.data || []);
              } catch (error) {
                setReviews([]);
                toast.error("Không tìm thấy đánh giá!");
              } finally {
                setLoading(false);
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🌐 Tất cả
          </button>
          <button
            onClick={() => {
              setViewMode("book");
              setReviews([]);
              setInputId("");
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "book"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📚 Theo Sách
          </button>
          <button
            onClick={() => {
              setViewMode("user");
              setReviews([]);
              setInputId("");
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "user"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            👤 Theo User
          </button>
        </div>

        {/* Input và Search */}
        <div className="flex gap-3">
          <input
            type="number"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder={
              viewMode === "all"
                ? "Chế độ xem tất cả - không cần nhập ID"
                : viewMode === "book"
                ? "Nhập Book ID..."
                : "Nhập User ID..."
            }
            disabled={viewMode === "all"}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              viewMode === "all" ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
          />
          <button
            onClick={fetchReviews}
            disabled={loading || (!inputId && viewMode !== "all")}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Đang tải..."
              : viewMode === "all"
              ? "🔄 Tải lại"
              : "🔍 Tìm kiếm"}
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            <p className="text-lg mb-2">📋 Chưa có dữ liệu</p>
            <p className="text-sm">
              {viewMode === "all"
                ? "Nhấn 'Tải lại' để xem tất cả đánh giá"
                : viewMode === "book"
                ? "Nhập Book ID và nhấn Tìm kiếm để xem đánh giá"
                : "Nhập User ID và nhấn Tìm kiếm để xem đánh giá"}
            </p>
          </div>
        ) : (
          reviews.map((review) => {
            return (
              <div
                key={review.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    {/* Tên sách - nổi bật */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {review.bookTitle || "Không có tên sách"}
                    </h3>

                    {/* Thông tin đánh giá */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < review.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }
                          />
                        ))}
                      </div>
                      <span>•</span>
                      <span className="font-medium">{review.userName}</span>
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 text-base leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                  {/* Nút xóa */}
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    disabled={deletingId === review.id}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Xóa đánh giá"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title || "Xác nhận"}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default Reviews;
