# ✅ Checklist: Sửa Backend để trả về bookTitle trong ReviewResponse

## 🔍 Kiểm tra hiện tại

Mở browser console (F12) trên trang Reviews và xem log:

- Nếu thấy `hasBookTitle: false` → Backend chưa trả về bookTitle
- Nếu thấy `hasBookTitle: true` → Backend đã OK, có thể là vấn đề khác

## 📝 Các bước cần sửa Backend

### Bước 1: Kiểm tra ReviewResponse DTO

**File:** `src/main/java/iuh/fit/haitebooks_backend/dtos/response/ReviewResponse.java`

✅ **Phải có:**

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long bookId;
    private String bookTitle; // ✅ PHẢI CÓ FIELD NÀY
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    private String status;
    private String createdAt;
}
```

### Bước 2: Kiểm tra ReviewMapper (nếu có)

**File:** `src/main/java/iuh/fit/haitebooks_backend/mapper/ReviewMapper.java`

✅ **Phải có:**

```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
        review.getId(),
        review.getBook() != null ? review.getBook().getId() : null,
        review.getBook() != null ? review.getBook().getTitle() : null, // ✅ PHẢI LẤY TỪ book.getTitle()
        review.getUser() != null ? review.getUser().getId() : null,
        review.getUser() != null ? review.getUser().getFullName() : null,
        review.getRating(),
        review.getComment(),
        review.getStatus() != null ? review.getStatus() : "pending",
        review.getCreatedAt() != null ? review.getCreatedAt().toString() : null
    );
}
```

### Bước 3: Kiểm tra ReviewRepository

**File:** `src/main/java/iuh/fit/haitebooks_backend/repository/ReviewRepository.java`

✅ **Phải có @EntityGraph để load book và user:**

```java
public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findAll();

    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByBookId(Long bookId);

    @EntityGraph(attributePaths = {"book", "user"})
    List<Review> findByUserId(Long userId);
}
```

**⚠️ QUAN TRỌNG:** Nếu không có `@EntityGraph`, Hibernate sẽ không load `book` và `user` (lazy loading), dẫn đến `review.getBook()` sẽ trả về `null` hoặc gây lỗi.

### Bước 4: Kiểm tra ReviewService

**File:** `src/main/java/iuh/fit/haitebooks_backend/service/ReviewService.java`

✅ **Đảm bảo sử dụng repository method có @EntityGraph:**

```java
@Transactional(readOnly = true)
public List<ReviewResponse> getAllReviews() {
    // ✅ Sử dụng findAll() có @EntityGraph
    List<Review> reviews = reviewRepository.findAll();

    return reviews.stream()
        .map(ReviewMapper::toResponse) // hoặc review -> ReviewMapper.toResponse(review)
        .collect(Collectors.toList());
}
```

### Bước 5: Kiểm tra ReviewController

**File:** `src/main/java/iuh/fit/haitebooks_backend/controller/ReviewController.java` hoặc `AdminController.java`

✅ **Đảm bảo endpoint trả về ReviewResponse:**

```java
@GetMapping("/reviews")
public ResponseEntity<List<ReviewResponse>> getAllReviews() {
    List<ReviewResponse> reviews = reviewService.getAllReviews();
    return ResponseEntity.ok(reviews);
}
```

## 🧪 Test sau khi sửa

1. **Restart backend server**
2. **Mở browser console (F12) trên trang Reviews**
3. **Xem log:**
   ```javascript
   📋 Reviews data from API: [...]
   📖 First review sample: {
     id: 1,
     bookId: 5,
     bookTitle: "Tên sách", // ✅ Phải có giá trị
     hasBookTitle: true // ✅ Phải là true
   }
   ```
4. **Kiểm tra UI:** Tên sách phải hiển thị thay vì "Không có tên sách"

## ❌ Các lỗi thường gặp

### Lỗi 1: `bookTitle` là `null`

- **Nguyên nhân:** `@EntityGraph` chưa được thêm vào repository
- **Giải pháp:** Thêm `@EntityGraph(attributePaths = {"book", "user"})` vào các method trong `ReviewRepository`

### Lỗi 2: `LazyInitializationException`

- **Nguyên nhân:** Không có `@EntityGraph` hoặc không có `@Transactional`
- **Giải pháp:** Thêm `@EntityGraph` vào repository và `@Transactional` vào service method

### Lỗi 3: `bookTitle` không có trong response JSON

- **Nguyên nhân:** `ReviewResponse` không có field `bookTitle` hoặc `ReviewMapper` không set giá trị
- **Giải pháp:** Kiểm tra lại Bước 1 và Bước 2

## 📞 Nếu vẫn không được

1. Kiểm tra log backend khi gọi API `/api/reviews`
2. Kiểm tra xem `Review` entity có relationship với `Book` không
3. Kiểm tra xem `Book` entity có field `title` không
4. Test trực tiếp API bằng Postman/curl:
   ```bash
   GET http://localhost:8080/api/reviews
   ```
   Xem response có `bookTitle` không
