import { Edit, Eye, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import axiosInstance from "../config/axios";
import { Book, Category } from "../types";

const Books = () => {
  const location = useLocation(); // ⭐ Detect navigation
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(
    searchParams.get("lowStock") === "true"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    console.log("📚 Books page loaded/refreshed");
    fetchData();
  }, [location.key]); // ⭐ Fetch lại mỗi khi navigate đến trang này

  // Cập nhật filter khi URL thay đổi
  useEffect(() => {
    const lowStockFromUrl = searchParams.get("lowStock");
    if (lowStockFromUrl === "true") {
      setShowLowStockOnly(true);
    } else {
      setShowLowStockOnly(false);
    }
  }, [searchParams]);

  // Tối ưu: Gọi books và categories song song thay vì tuần tự
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("🔄 Fetching books and categories...");
      // Gọi 2 API song song để tối ưu performance
      const [booksResponse, categoriesResponse] = await Promise.all([
        axiosInstance.get("/books"),
        axiosInstance.get("/categories"),
      ]);
      
      console.log(`✅ Loaded ${booksResponse.data.length} books`);
      setBooks(booksResponse.data);
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error("❌ Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sách này?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/books/${id}`);
      setBooks(books.filter((book) => book.id !== id));
      alert("Xóa sách thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa sách:", error);
      alert("Có lỗi xảy ra khi xóa sách!");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Filter và Pagination
  const filteredBooks = books.filter((book) => {
    // Filter theo low stock (sách sắp hết hàng: stock <= 10)
    if (showLowStockOnly && (book.stock || 0) > 10) {
      return false;
    }

    // Filter theo search term
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter theo category
    let matchesCategory = false;
    if (selectedCategoryId === "all") {
      // Hiển thị tất cả sách
      matchesCategory = true;
    } else if (selectedCategoryId === "uncategorized") {
      // Chỉ hiển thị sách chưa có danh mục
      const hasNoCategory =
        (!book.categoryId ||
          book.categoryId === 0 ||
          book.categoryId === null) &&
        (!book.categoryName ||
          book.categoryName.trim() === "" ||
          book.categoryName === "-");
      matchesCategory = hasNoCategory;
    } else {
      // Hiển thị sách thuộc danh mục đã chọn
      // Tìm category được chọn từ danh sách
      const selectedCategory = categories.find(
        (cat) => cat.id.toString() === selectedCategoryId
      );

      if (selectedCategory) {
        // So sánh theo categoryId (ưu tiên) hoặc categoryName
        const matchesById =
          book.categoryId !== null &&
          book.categoryId !== undefined &&
          book.categoryId !== 0 &&
          book.categoryId === selectedCategory.id;

        const matchesByName =
          !!book.categoryName &&
          book.categoryName.trim() !== "" &&
          book.categoryName !== "-" &&
          book.categoryName === selectedCategory.name;

        matchesCategory = matchesById || matchesByName;
      } else {
        // Fallback: so sánh trực tiếp với selectedCategoryId nếu không tìm thấy category
        const selectedId = parseInt(selectedCategoryId, 10);
        if (!isNaN(selectedId)) {
          matchesCategory =
            book.categoryId === selectedId ||
            book.categoryId?.toString() === selectedCategoryId;
        } else {
          matchesCategory = false;
        }
      }
    }

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBooks = filteredBooks.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Sách</h1>
          <p className="text-gray-600 mt-1">Tổng số: {books.length} sách</p>
        </div>
        <Link
          to="/admin/books/create"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Thêm sách mới
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sách hoặc tác giả..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative sm:w-64">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white cursor-pointer"
            >
              <option value="all">Tất cả danh mục ({books.length})</option>
              <option value="uncategorized">
                Chưa phân loại (
                {
                  books.filter(
                    (book) =>
                      (!book.categoryId ||
                        book.categoryId === 0 ||
                        book.categoryId === null) &&
                      (!book.categoryName ||
                        book.categoryName.trim() === "" ||
                        book.categoryName === "-")
                  ).length
                }
                )
              </option>
              {categories.map((category) => {
                const bookCount = books.filter(
                  (book) =>
                    (book.categoryId !== null &&
                      book.categoryId !== undefined &&
                      book.categoryId !== 0 &&
                      book.categoryId === category.id) ||
                    (book.categoryName &&
                      book.categoryName.trim() !== "" &&
                      book.categoryName !== "-" &&
                      book.categoryName === category.name)
                ).length;
                return (
                  <option key={category.id} value={category.id.toString()}>
                    {category.name} ({bookCount})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Active Filters Info */}
        {(selectedCategoryId !== "all" || searchTerm || showLowStockOnly) && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
            {showLowStockOnly && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Sách sắp hết hàng
                <button
                  onClick={() => {
                    setShowLowStockOnly(false);
                    setSearchParams({});
                  }}
                  className="ml-2 hover:text-orange-900"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCategoryId !== "all" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {selectedCategoryId === "uncategorized"
                  ? "Chưa phân loại"
                  : categories.find(
                      (c) => c.id.toString() === selectedCategoryId
                    )?.name}
                <button
                  onClick={() => setSelectedCategoryId("all")}
                  className="ml-2 hover:text-primary-900"
                >
                  ×
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Tìm: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-2 hover:text-gray-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategoryId("all");
                setShowLowStockOnly(false);
                setSearchParams({});
              }}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sách
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tác giả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tồn kho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBooks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Không tìm thấy sách nào
                  </td>
                </tr>
              ) : (
                paginatedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-16 w-12 flex-shrink-0">
                          {book.imageUrl ? (
                            <img
                              src={book.imageUrl}
                              alt={book.title}
                              className="h-16 w-12 object-cover rounded"
                            />
                          ) : (
                            <div className="h-16 w-12 bg-gray-200 rounded flex items-center justify-center">
                              <Eye size={16} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {book.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {book.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {book.author || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(book.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          book.stock > 20
                            ? "bg-green-100 text-green-800"
                            : book.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {book.stock} cuốn
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {book.categoryName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/admin/books/edit/${book.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                      >
                        <Edit size={16} className="mr-1" />
                        Sửa
                      </Link>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Hiển thị {startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, filteredBooks.length)} trong
              tổng số {filteredBooks.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded-md text-sm font-medium ${
                      currentPage === page
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Books;
