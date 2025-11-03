# HaiTeBooks Admin Panel

Web Admin cho hệ thống quản lý sách HaiTeBooks - Giao diện quản trị hiện đại được xây dựng với React + Vite + TypeScript + Tailwind CSS.

## 🚀 Tính năng

### ✅ Đã hoàn thành

- **Xác thực & Phân quyền**
  - Đăng nhập cho Admin
  - Protected Routes
  - Auth Context quản lý session

- **Dashboard**
  - Thống kê tổng quan (Doanh thu, Đơn hàng, Người dùng, Sách)
  - Cảnh báo tồn kho
  - Hoạt động gần đây

- **Quản lý Sách (CRUD)**
  - Danh sách sách với tìm kiếm & phân trang
  - Thêm/Sửa/Xóa sách
  - Upload hình ảnh
  - Quản lý tồn kho

- **Quản lý Đơn hàng**
  - Danh sách đơn hàng
  - Chi tiết đơn hàng
  - Cập nhật trạng thái đơn hàng
  - Lọc theo trạng thái

- **Quản lý Người dùng**
  - Danh sách người dùng
  - Tìm kiếm người dùng
  - Phân quyền Admin/User

- **Quản lý Danh mục**
  - Thêm/Sửa/Xóa danh mục
  - Giao diện card đẹp mắt

- **Quản lý Đánh giá**
  - Xem tất cả đánh giá
  - Duyệt/Từ chối đánh giá
  - Lọc theo trạng thái

## 🛠️ Công nghệ sử dụng

- **React 18** - Library UI
- **TypeScript** - Type safety
- **Vite** - Build tool siêu nhanh
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Recharts** - Charts & Graphs

## 📦 Cài đặt

### Yêu cầu hệ thống

- Node.js >= 16
- npm hoặc yarn

### Các bước cài đặt

1. **Di chuyển vào thư mục admin-web**
```bash
cd admin-web
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình API Backend**

Mở file `src/config/axios.ts` và thay đổi URL backend:

```typescript
const API_BASE_URL = 'http://localhost:8080/api'; // Thay đổi URL này
```

4. **Chạy development server**
```bash
npm run dev
```

Web admin sẽ chạy tại: `http://localhost:3001`

## 🔐 Đăng nhập

Để truy cập Web Admin, bạn cần đăng nhập với tài khoản có `role_id = "admin"`.

**Tài khoản demo:** (Thay đổi theo database của bạn)
- Username: `admin`
- Password: `admin123`

## 📁 Cấu trúc thư mục

```
admin-web/
├── src/
│   ├── components/          # Reusable components
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── layouts/            # Layout components
│   │   └── AdminLayout.tsx
│   ├── pages/              # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Books.tsx
│   │   ├── BookForm.tsx
│   │   ├── Orders.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── Users.tsx
│   │   ├── Categories.tsx
│   │   └── Reviews.tsx
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── config/             # Configuration files
│   │   └── axios.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🎨 Màu sắc Brand

Tailwind config đã được cấu hình với màu brand của HaiTeBooks:

```javascript
colors: {
  primary: {
    600: '#C92127', // Brand color
    // ... other shades
  }
}
```

## 🔗 API Endpoints

Web Admin cần các API endpoints sau từ backend:

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `GET /api/users/me` - Verify token

### Books
- `GET /api/books` - Lấy danh sách sách
- `GET /api/books/:id` - Lấy chi tiết sách
- `POST /api/books` - Tạo sách mới
- `PUT /api/books/:id` - Cập nhật sách
- `DELETE /api/books/:id` - Xóa sách

### Categories
- `GET /api/categories` - Lấy danh sách danh mục
- `POST /api/categories` - Tạo danh mục
- `PUT /api/categories/:id` - Cập nhật danh mục
- `DELETE /api/categories/:id` - Xóa danh mục

### Orders
- `GET /api/orders` - Lấy danh sách đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `PATCH /api/orders/:id/status` - Cập nhật trạng thái

### Users
- `GET /api/users` - Lấy danh sách người dùng

### Reviews
- `GET /api/reviews` - Lấy danh sách đánh giá
- `PATCH /api/reviews/:id/status` - Cập nhật trạng thái

### Dashboard
- `GET /api/admin/dashboard/stats` - Lấy thống kê

## 📝 Scripts

```bash
# Development
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## 🚀 Deployment

### Build production

```bash
npm run build
```

Thư mục `dist/` sẽ chứa các file đã build, sẵn sàng deploy lên:
- Vercel
- Netlify
- GitHub Pages
- Hoặc bất kỳ static hosting nào

### Environment Variables

Nếu cần cấu hình cho nhiều môi trường (dev/prod), tạo file `.env`:

```env
VITE_API_BASE_URL=https://api.haitebooks.com
```

Sau đó sử dụng trong code:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```

## 🐛 Troubleshooting

### Lỗi CORS

Nếu gặp lỗi CORS khi gọi API, cần cấu hình backend cho phép origin `http://localhost:3001`.

### Token không hợp lệ

Kiểm tra xem backend có trả về token đúng format không. Token sẽ được lưu trong localStorage với key `admin_token`.

### API không hoạt động

Kiểm tra lại URL trong `src/config/axios.ts` và đảm bảo backend đang chạy.

## 📱 Responsive Design

Web Admin đã được tối ưu cho:
- 💻 Desktop (≥1024px)
- 📱 Tablet (768px - 1023px)
- 📱 Mobile (< 768px)

## 🔒 Bảo mật

- ✅ Token-based authentication
- ✅ Protected routes
- ✅ Auto redirect khi token hết hạn
- ✅ Role-based access (chỉ admin)

## 📄 License

© 2025 HaiTeBooks. All rights reserved.

## 👥 Đóng góp

Được phát triển bởi nhóm HaiTeBooks.

---

**Happy Coding! 🚀**

