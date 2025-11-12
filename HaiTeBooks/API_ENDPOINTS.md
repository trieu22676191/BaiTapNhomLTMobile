# HaiTeBooks API Endpoints Documentation

Tài liệu tổng hợp tất cả API endpoints của hệ thống HaiTeBooks.

## 📚 Book Controller

| Method | Endpoint                    | Mô tả                           |
| ------ | --------------------------- | ------------------------------- |
| GET    | `/api/books`                | Lấy danh sách tất cả sách       |
| GET    | `/api/books/{id}`           | Lấy thông tin sách theo ID      |
| GET    | `/api/books/barcode/{code}` | Lấy thông tin sách theo barcode |
| POST   | `/api/books`                | Tạo sách mới                    |
| PUT    | `/api/books/{id}`           | Cập nhật thông tin sách         |
| DELETE | `/api/books/{id}`           | Xóa sách                        |

## 🛒 Cart Controller

| Method | Endpoint                  | Mô tả                                     |
| ------ | ------------------------- | ----------------------------------------- |
| GET    | `/api/cart/user/{userId}` | Lấy danh sách cart items của user         |
| POST   | `/api/cart/add`           | Thêm sản phẩm vào giỏ hàng                |
| PUT    | `/api/cart/update/{id}`   | Cập nhật số lượng sản phẩm trong giỏ hàng |
| DELETE | `/api/cart/remove/{id}`   | Xóa sản phẩm khỏi giỏ hàng                |

## 📝 Review Controller

| Method | Endpoint                     | Mô tả                 |
| ------ | ---------------------------- | --------------------- |
| GET    | `/api/reviews`               | Lấy tất cả đánh giá   |
| GET    | `/api/reviews/user/{userId}` | Lấy đánh giá của user |
| GET    | `/api/reviews/book/{bookId}` | Lấy đánh giá của sách |
| POST   | `/api/reviews`               | Tạo đánh giá mới      |

## 📂 Category Controller

| Method | Endpoint               | Mô tả                          |
| ------ | ---------------------- | ------------------------------ |
| GET    | `/api/categories`      | Lấy danh sách tất cả danh mục  |
| GET    | `/api/categories/{id}` | Lấy thông tin danh mục theo ID |
| POST   | `/api/categories`      | Tạo danh mục mới               |
| PUT    | `/api/categories/{id}` | Cập nhật danh mục              |
| DELETE | `/api/categories/{id}` | Xóa danh mục                   |

## 👤 User Controller

| Method | Endpoint          | Mô tả                            |
| ------ | ----------------- | -------------------------------- |
| GET    | `/api/users/me`   | Lấy thông tin user hiện tại      |
| PUT    | `/api/users/me`   | Cập nhật thông tin user hiện tại |
| GET    | `/api/users/{id}` | Lấy thông tin user theo ID       |
| PUT    | `/api/users/{id}` | Cập nhật thông tin user          |
| DELETE | `/api/users/{id}` | Xóa user                         |
| GET    | `/api/users/all`  | Lấy danh sách tất cả users       |

## 📦 Order Controller

| Method | Endpoint                    | Mô tả                           |
| ------ | --------------------------- | ------------------------------- |
| GET    | `/api/orders/{id}`          | Lấy thông tin đơn hàng theo ID  |
| GET    | `/api/orders/user/{userId}` | Lấy danh sách đơn hàng của user |
| POST   | `/api/orders`               | Tạo đơn hàng mới                |
| PUT    | `/api/orders/{id}`          | Cập nhật đơn hàng               |
| DELETE | `/api/orders/{id}`          | Xóa đơn hàng                    |

## 🔐 Auth Controller

| Method | Endpoint             | Mô tả                 |
| ------ | -------------------- | --------------------- |
| POST   | `/api/auth/register` | Đăng ký tài khoản mới |
| POST   | `/api/auth/login`    | Đăng nhập             |

## 💳 Payment Controller

| Method | Endpoint                        | Mô tả                                 |
| ------ | ------------------------------- | ------------------------------------- |
| POST   | `/api/payments`                 | Tạo thanh toán                        |
| GET    | `/api/payments/order/{orderId}` | Lấy thông tin thanh toán của đơn hàng |

## 🤖 AI Controller

| Method | Endpoint                      | Mô tả                      |
| ------ | ----------------------------- | -------------------------- |
| POST   | `/api/ai/generate-embeddings` | Tạo embeddings cho AI      |
| GET    | `/api/ai/search`              | Tìm kiếm bằng AI           |
| GET    | `/api/ai/recommend/{bookId}`  | Gợi ý sách dựa trên bookId |

## 📊 Statistic Controller

| Method | Endpoint                   | Mô tả                  |
| ------ | -------------------------- | ---------------------- |
| GET    | `/api/statistics/overview` | Lấy thống kê tổng quan |

## 👨‍💼 Admin Controller

| Method | Endpoint                         | Mô tả                               |
| ------ | -------------------------------- | ----------------------------------- |
| GET    | `/api/admin/users`               | Lấy danh sách users (admin only)    |
| GET    | `/api/admin/statistics/overview` | Lấy thống kê tổng quan (admin only) |

---

## 🔑 Authentication

Hầu hết các API endpoints (trừ `/api/auth/*`) yêu cầu authentication token trong header:

```
Authorization: Bearer {token}
```

## 📝 Notes

- Tất cả endpoints trả về JSON format
- Base URL: `http://192.168.1.5:8080/api`
- Timeout: 10 giây
- Error responses: 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error)
