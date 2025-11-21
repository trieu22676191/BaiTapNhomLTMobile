# 🔧 Sửa Backend để trả về userName trong ReviewResponse cho Mobile App

## ❌ Vấn đề

Mobile app gọi API `/api/reviews/book/{bookId}` để lấy đánh giá, nhưng backend không trả về `userName` trong response, dẫn đến hiển thị "Người dùng ẩn danh".

## ✅ Giải pháp

Backend cần sửa giống như đã làm cho admin panel. Các file cần sửa:

### 1. ReviewResponse.java
**File:** `src/main/java/iuh/fit/haitebooks_backend/dtos/response/ReviewResponse.java`

✅ **Phải có field `userName`:**
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private String userName;        // ✅ PHẢI CÓ
    private Long bookId;
    private String bookTitle;       // ✅ PHẢI CÓ (nếu cần)
    private int rating;
    private String comment;
    private String status;
    private LocalDateTime createdAt;
}
```

### 2. ReviewMapper.java
**File:** `src/main/java/iuh/fit/haitebooks_backend/mapper/ReviewMapper.java`

✅ **Phải lấy `userName` từ `user.getFullName()`:**
```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
        review.getId(),
        review.getUser() != null ? review.getUser().getId() : null,
        review.getUser() != null ? review.getUser().getFullName() : null, // ✅ THÊM userName
        review.getBook() != null ? review.getBook().getId() : null,
        review.getBook() != null ? review.getBook().getTitle() : null,   // ✅ THÊM bookTitle (nếu cần)
        review.getRating(),
        review.getComment(),
        review.getStatus() != null ? review.getStatus() : "pending",
        review.getCreatedAt()
    );
}
```

### 3. ReviewService.java
**File:** `src/main/java/iuh/fit/haitebooks_backend/service/ReviewService.java`

✅ **Phải trigger load `getFullName()` trong `loadLazyRelationships()`:**
```java
private void loadLazyRelationships(Review review) {
    if (review.getUser() != null) {
        review.getUser().getId();
        review.getUser().getFullName(); // ✅ THÊM: Trigger load để lấy userName
    }
    if (review.getBook() != null) {
        review.getBook().getId();
        review.getBook().getTitle(); // ✅ THÊM: Trigger load để lấy bookTitle
    }
}
```

### 4. ReviewRepository.java
**File:** `src/main/java/iuh/fit/haitebooks_backend/repository/ReviewRepository.java`

✅ **Phải có `@EntityGraph` để load user và book:**
```java
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    @EntityGraph(attributePaths = {"book", "user"})
    @Override
    List<Review> findAll();
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByBookId(Long bookId); // ✅ QUAN TRỌNG: API này được mobile app sử dụng
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByUserId(Long userId);
    
    boolean existsByUserIdAndBookId(Long userId, Long bookId);
}
```

## 🧪 Test sau khi sửa

1. **Restart backend server**
2. **Mở mobile app và vào chi tiết sách**
3. **Xem console log:**
   ```javascript
   📋 Reviews from API: [...]
   👤 First review sample: {
     id: 1,
     userId: 2,
     userName: "Nguyen Van A", // ✅ Phải có giá trị
     hasUserName: true // ✅ Phải là true
   }
   ```
4. **Kiểm tra UI:** Tên người dùng phải hiển thị thay vì "Người dùng ẩn danh"

## 📝 Lưu ý

- **QUAN TRỌNG:** Phải thêm `@EntityGraph(attributePaths = {"book", "user"})` vào method `findByBookId()` vì đây là API được mobile app sử dụng
- Nếu User entity không có `getFullName()`, cần kiểm tra và dùng method phù hợp (có thể là `getFirstName() + " " + getLastName()`)
- Đảm bảo tất cả các endpoint reviews đều trả về `userName`:
  - `GET /api/reviews` (admin panel)
  - `GET /api/reviews/book/{bookId}` (mobile app) ✅ QUAN TRỌNG
  - `GET /api/reviews/user/{userId}` (nếu có)

## 🔍 Kiểm tra hiện tại

Sau khi sửa backend, mở mobile app và:
1. Vào chi tiết một cuốn sách có đánh giá
2. Mở console log (React Native Debugger hoặc Metro bundler)
3. Xem log có `hasUserName: true` không
4. Kiểm tra UI có hiển thị tên người dùng không

