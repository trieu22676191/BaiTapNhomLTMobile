import { Edit, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "../config/axios";
import { Category } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingCategory) {
        await axiosInstance.put(`/categories/${editingCategory.id}`, formData);
        toast.success("Cập nhật danh mục thành công!");
      } else {
        // Gọi API POST để tạo danh mục mới
        console.log("Đang gửi request POST /categories với dữ liệu:", formData);
        const response = await axiosInstance.post("/categories", formData);
        console.log("Danh mục mới đã được tạo:", response.data);
        toast.success("Thêm danh mục mới thành công!");
      }
      fetchCategories();
      handleCloseModal();
    } catch (error: any) {
      console.error("Lỗi khi lưu danh mục:", error);

      // Xử lý lỗi chi tiết hơn
      let errorMessage = "Có lỗi xảy ra khi lưu danh mục!";

      if (error.response) {
        // Lỗi từ server
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          errorMessage =
            data.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!";
        } else if (status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
        } else if (status === 403) {
          errorMessage =
            "Bạn không có quyền thực hiện thao tác này! Vui lòng kiểm tra lại cấu hình quyền truy cập trên server.";
          console.error("403 Forbidden - Chi tiết lỗi:", {
            status,
            data,
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          });
        } else if (status === 409) {
          errorMessage = data.message || "Danh mục này đã tồn tại!";
        } else if (status >= 500) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau!";
        } else {
          errorMessage = data.message || `Lỗi: ${status}`;
        }
      } else if (error.request) {
        // Không nhận được response từ server
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!";
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa danh mục",
      message: "Bạn có chắc chắn muốn xóa danh mục này?",
      type: "danger",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        performDelete(id);
      },
    });
  };

  const performDelete = async (id: number) => {
    try {
      await axiosInstance.delete(`/categories/${id}`);
      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success("Xóa danh mục thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa danh mục:", error);
      toast.error("Có lỗi xảy ra!");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
          <p className="text-gray-600 mt-1">
            Tổng số: {categories.length} danh mục
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Thêm danh mục
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <FolderOpen className="text-primary-600" size={24} />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  {category.bookCount !== undefined && (
                    <p className="text-sm text-gray-500">
                      {category.bookCount} sách
                    </p>
                  )}
                </div>
              </div>
            </div>
            {category.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {category.description}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(category)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center justify-center"
              >
                <Edit size={16} className="mr-1" />
                Sửa
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center justify-center"
              >
                <Trash2 size={16} className="mr-1" />
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nhập tên danh mục"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nhập mô tả"
                />
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
                  ) : editingCategory ? (
                    "Cập nhật"
                  ) : (
                    "Thêm mới"
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

export default Categories;
