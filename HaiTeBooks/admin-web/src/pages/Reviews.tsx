import { CheckCircle, Clock, Star, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "../config/axios";
import { Review } from "../types";

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"user" | "book" | "all">("all");
  const [inputId, setInputId] = useState("");

  // Tự động load dữ liệu khi component mount
  useEffect(() => {
    const loadInitialReviews = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/reviews`);
        const reviewsData = response.data || [];
        console.log("📋 Reviews data from API:", reviewsData);
        // Debug: Kiểm tra xem có bookTitle không
        if (reviewsData.length > 0) {
          console.log("📖 First review sample:", {
            id: reviewsData[0].id,
            bookId: reviewsData[0].bookId,
            bookTitle: reviewsData[0].bookTitle,
            hasBookTitle: !!reviewsData[0].bookTitle,
          });
        }
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
      console.log("📋 Reviews data from API:", reviewsData);
      // Debug: Kiểm tra xem có bookTitle không
      if (reviewsData.length > 0) {
        console.log("📖 First review sample:", {
          id: reviewsData[0].id,
          bookId: reviewsData[0].bookId,
          bookTitle: reviewsData[0].bookTitle,
          hasBookTitle: !!reviewsData[0].bookTitle,
        });
      }
      setReviews(reviewsData);
    } catch (error) {
      console.error("Lỗi khi tải đánh giá:", error);
      setReviews([]);
      toast.error("Không tìm thấy đánh giá!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await axiosInstance.patch(`/reviews/${id}/status`, { status });
      setReviews(
        reviews.map((review) =>
          review.id === id ? { ...review, status: status as any } : review
        )
      );
      toast.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      toast.error("Có lỗi xảy ra!");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Chờ duyệt",
          icon: Clock,
          color: "bg-yellow-100 text-yellow-800",
        };
      case "approved":
        return {
          label: "Đã duyệt",
          icon: CheckCircle,
          color: "bg-green-100 text-green-800",
        };
      case "rejected":
        return {
          label: "Từ chối",
          icon: XCircle,
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          label: status,
          icon: Clock,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  // Hiển thị tất cả reviews (không filter)
  const filteredReviews = reviews;

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
                console.error("Lỗi khi tải đánh giá:", error);
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
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Không có đánh giá nào phù hợp với bộ lọc
          </div>
        ) : (
          filteredReviews.map((review) => {
            const statusInfo = getStatusInfo(review.status);
            const StatusIcon = statusInfo.icon;
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

                    {/* Status badge */}
                    <div className="mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                      >
                        <StatusIcon size={14} className="mr-1" />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 text-base leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                </div>
                {review.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleUpdateStatus(review.id, "approved")}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors inline-flex items-center"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(review.id, "rejected")}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center"
                    >
                      <XCircle size={18} className="mr-2" />
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reviews;
