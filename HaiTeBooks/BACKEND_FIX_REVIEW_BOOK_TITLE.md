# 🔧 Sửa Backend để trả về bookTitle và userName

## ❌ Các vấn đề phát hiện:

1. **ReviewResponse.java** - Thiếu `bookTitle` và `userName`
2. **ReviewMapper.java** - Không lấy `bookTitle` và `userName` từ entity
3. **ReviewService.java** - `loadLazyRelationships()` chỉ load `getId()`, không load `getTitle()` và `getFullName()`
4. **ReviewRepository.java** - Thiếu `@EntityGraph` để load lazy relationships

## ✅ Các file cần sửa:

### 1. ReviewResponse.java

**File:** `src/main/java/iuh/fit/haitebooks_backend/dtos/response/ReviewResponse.java`

**Sửa từ:**
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private Long bookId;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
```

**Sửa thành:**
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private String userName; // ✅ THÊM FIELD NÀY
    private Long bookId;
    private String bookTitle; // ✅ THÊM FIELD NÀY
    private int rating;
    private String comment;
    private String status; // ✅ THÊM FIELD NÀY (nếu có trong Review entity)
    private LocalDateTime createdAt;
}
```

### 2. ReviewMapper.java

**File:** `src/main/java/iuh/fit/haitebooks_backend/mapper/ReviewMapper.java`

**Sửa từ:**
```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
            review.getId(),
            review.getUser() != null ? review.getUser().getId() : null,
            review.getBook() != null ? review.getBook().getId() : null,
            review.getRating(),
            review.getComment(),
            review.getCreatedAt()
    );
}
```

**Sửa thành:**
```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
            review.getId(),
            review.getUser() != null ? review.getUser().getId() : null,
            review.getUser() != null ? review.getUser().getFullName() : null, // ✅ THÊM userName
            review.getBook() != null ? review.getBook().getId() : null,
            review.getBook() != null ? review.getBook().getTitle() : null, // ✅ THÊM bookTitle
            review.getRating(),
            review.getComment(),
            review.getStatus() != null ? review.getStatus() : "pending", // ✅ THÊM status (nếu có)
            review.getCreatedAt()
    );
}
```

### 3. ReviewService.java

**File:** `src/main/java/iuh/fit/haitebooks_backend/service/ReviewService.java`

**Sửa method `loadLazyRelationships()` từ:**
```java
private void loadLazyRelationships(Review review) {
    if (review.getUser() != null) {
        review.getUser().getId();
    }
    if (review.getBook() != null) {
        review.getBook().getId();
    }
}
```

**Sửa thành:**
```java
private void loadLazyRelationships(Review review) {
    if (review.getUser() != null) {
        review.getUser().getId(); // Trigger load user
        review.getUser().getFullName(); // ✅ THÊM: Trigger load để lấy userName
    }
    if (review.getBook() != null) {
        review.getBook().getId(); // Trigger load book
        review.getBook().getTitle(); // ✅ THÊM: Trigger load để lấy bookTitle
    }
}
```

### 4. ReviewRepository.java (QUAN TRỌNG)

**File:** `src/main/java/iuh/fit/haitebooks_backend/repository/ReviewRepository.java`

**Sửa từ:**
```java
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByUserId(Long userId);
    List<Review> findByBookId(Long bookId);
    boolean existsByUserIdAndBookId(Long userId, Long bookId);
}
```

**Sửa thành:**
```java
package iuh.fit.haitebooks_backend.repository;

import iuh.fit.haitebooks_backend.model.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    // ✅ THÊM @EntityGraph để load book và user
    @EntityGraph(attributePaths = {"book", "user"})
    @Override
    List<Review> findAll();
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByUserId(Long userId);
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByBookId(Long bookId);
    
    boolean existsByUserIdAndBookId(Long userId, Long bookId);
}
```

## ⚠️ LƯU Ý QUAN TRỌNG:

### Nếu Review entity không có field `status`:

1. **Bỏ `status` khỏi ReviewResponse** (nếu không cần)
2. **Hoặc thêm field `status` vào Review entity** nếu cần quản lý trạng thái (pending, approved, rejected)

### Kiểm tra User entity có method `getFullName()`:

- Nếu User entity có field `fullName` → dùng `getFullName()`
- Nếu User entity chỉ có `firstName` và `lastName` → cần nối chuỗi: `user.getFirstName() + " " + user.getLastName()`
- Nếu User entity có field `name` → dùng `getName()`

### Kiểm tra Book entity có method `getTitle()`:

- Đảm bảo Book entity có field `title` và method `getTitle()`

## 🧪 Test sau khi sửa:

1. **Restart backend server**
2. **Test API:**
   ```bash
   GET http://localhost:8080/api/reviews
   ```
3. **Kiểm tra response có:**
   ```json
   [
     {
       "id": 1,
       "userId": 2,
       "userName": "Nguyen Van A", // ✅ Phải có
       "bookId": 5,
       "bookTitle": "Tên sách", // ✅ Phải có
       "rating": 5,
       "comment": "Sách hay",
       "status": "approved", // ✅ Nếu có
       "createdAt": "2025-11-21T10:00:00"
     }
   ]
   ```

## 📝 Tóm tắt thay đổi:

1. ✅ Thêm `bookTitle` và `userName` vào `ReviewResponse`
2. ✅ Cập nhật `ReviewMapper.toResponse()` để lấy `bookTitle` và `userName`
3. ✅ Cập nhật `loadLazyRelationships()` để trigger load `getTitle()` và `getFullName()`
4. ✅ Thêm `@EntityGraph` vào `ReviewRepository` để load lazy relationships

Sau khi sửa xong, frontend sẽ tự động nhận được `bookTitle` và hiển thị tên sách!

