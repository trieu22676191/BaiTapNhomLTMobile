# Hướng dẫn sửa Backend - Thêm bookTitle vào ReviewResponse

## Vấn đề

Frontend cần hiển thị tên sách (`bookTitle`) trong mỗi đánh giá, nhưng backend hiện tại không trả về thông tin này vì `Review` entity có `@JsonIgnore` trên field `book`.

## Giải pháp

### 1. Kiểm tra ReviewResponse DTO

**File:** `src/main/java/iuh/fit/haitebooks_backend/dtos/response/ReviewResponse.java`

Đảm bảo `ReviewResponse` có field `bookTitle`:

```java
package iuh.fit.haitebooks_backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long bookId;
    private String bookTitle; // ✅ Thêm field này
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    private String status; // "pending", "approved", "rejected"
    private String createdAt;
}
```

### 2. Cập nhật ReviewMapper (nếu có)

**File:** `src/main/java/iuh/fit/haitebooks_backend/mapper/ReviewMapper.java`

Nếu có `ReviewMapper`, cập nhật method `toResponse()`:

```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
        review.getId(),
        review.getBook() != null ? review.getBook().getId() : null,
        review.getBook() != null ? review.getBook().getTitle() : null, // ✅ Thêm bookTitle
        review.getUser() != null ? review.getUser().getId() : null,
        review.getUser() != null ? review.getUser().getFullName() : null,
        review.getRating(),
        review.getComment(),
        review.getStatus() != null ? review.getStatus() : "pending",
        review.getCreatedAt() != null ? review.getCreatedAt().toString() : null
    );
}
```

### 3. Kiểm tra ReviewService hoặc ReviewController

**File:** `src/main/java/iuh/fit/haitebooks_backend/service/ReviewService.java` hoặc `ReviewController.java`

Đảm bảo khi trả về `ReviewResponse`, cần load `book` và `user` để lấy thông tin:

```java
@Transactional(readOnly = true)
public List<ReviewResponse> getAllReviews() {
    List<Review> reviews = reviewRepository.findAll();
    
    return reviews.stream()
        .map(review -> {
            // Đảm bảo load lazy relationships
            if (review.getBook() != null) {
                review.getBook().getTitle(); // Trigger load
            }
            if (review.getUser() != null) {
                review.getUser().getFullName(); // Trigger load
            }
            return ReviewMapper.toResponse(review);
        })
        .collect(Collectors.toList());
}
```

Hoặc nếu dùng `@EntityGraph`:

```java
@EntityGraph(attributePaths = {"book", "user"})
List<Review> findAll();
```

### 4. Cập nhật ReviewRepository (nếu cần)

**File:** `src/main/java/iuh/fit/haitebooks_backend/repository/ReviewRepository.java`

Có thể thêm method với `@EntityGraph` để load book và user:

```java
package iuh.fit.haitebooks_backend.repository;

import iuh.fit.haitebooks_backend.model.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findAll();
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByBookId(Long bookId);
    
    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByUserId(Long userId);
}
```

## Kiểm tra lại

Sau khi sửa, test API:

```bash
GET /api/reviews
```

Response phải có dạng:
```json
[
  {
    "id": 1,
    "bookId": 5,
    "bookTitle": "Tên sách", // ✅ Phải có field này
    "userId": 2,
    "userName": "Nguyen Van A",
    "rating": 5,
    "comment": "Sách cực hay, đáng đọc!",
    "status": "approved",
    "createdAt": "2025-11-20T14:31:00"
  }
]
```

## Lưu ý

- Nếu `Review` entity không có field `status`, cần thêm vào
- Đảm bảo `@JsonIgnore` trên `book` và `user` trong `Review` entity không ảnh hưởng đến việc load dữ liệu trong service layer
- Có thể cần thêm `@JsonIgnoreProperties` thay vì `@JsonIgnore` nếu muốn kiểm soát tốt hơn

