import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../config/axios';
import { Book, Category } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

const BookForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit); // ⭐ Loading khi fetch book data
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '',
    barcode: '',
    categoryId: '',
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchBook();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Lỗi khi tải danh mục:', error);
    }
  };

  const fetchBook = async () => {
    try {
      console.log('🔍 Fetching book with ID:', id);
      const response = await axiosInstance.get(`/books/${id}`);
      const book: Book = response.data;
      console.log('📖 Book data loaded:', book);
      
      setFormData({
        title: book.title,
        author: book.author || '',
        price: book.price.toString(),
        stock: book.stock.toString(),
        description: book.description || '',
        imageUrl: book.imageUrl || '',
        barcode: book.barcode || '',
        categoryId: book.categoryId?.toString() || '',
      });
    } catch (error) {
      console.error('❌ Lỗi khi tải thông tin sách:', error);
      alert('Không thể tải thông tin sách!');
      navigate('/admin/books');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookData = {
        title: formData.title,
        author: formData.author,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        description: formData.description,
        imageUrl: formData.imageUrl,
        barcode: formData.barcode,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
      };

      if (isEdit) {
        console.log('📝 Updating book:', id, bookData);
        await axiosInstance.put(`/books/${id}`, bookData);
        console.log('✅ Book updated successfully!');
        alert('Cập nhật sách thành công!');
      } else {
        console.log('➕ Creating new book:', bookData);
        await axiosInstance.post('/books', bookData);
        console.log('✅ Book created successfully!');
        alert('Thêm sách mới thành công!');
      }
      navigate('/admin/books');
    } catch (error: any) {
      console.error('❌ Lỗi khi lưu sách:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu sách!');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ Show loading khi đang fetch data
  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin sách...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/books')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Cập nhật thông tin sách' : 'Nhập thông tin sách mới'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tên sách */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên sách <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập tên sách"
            />
          </div>

          {/* Tác giả */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tác giả
            </label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập tên tác giả"
            />
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Giá */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Giá <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập giá"
            />
          </div>

          {/* Tồn kho */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số lượng tồn kho <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập số lượng"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mã vạch / ISBN
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập mã vạch"
            />
          </div>

          {/* URL hình ảnh */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              URL hình ảnh
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Mô tả */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Nhập mô tả về sách"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/books')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookForm;

