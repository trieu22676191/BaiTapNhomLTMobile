# 📋 Tóm tắt: Sửa Backend để hiển thị tên sách trong đánh giá

## 🎯 Mục tiêu
Backend cần trả về `bookTitle` và `userName` trong API response để frontend hiển thị.

---

## ✅ 4 File cần sửa:

### 1️⃣ ReviewResponse.java
**Thêm 2 field:**
- `private String userName;`
- `private String bookTitle;`

**Vị trí:** `src/main/java/iuh/fit/haitebooks_backend/dtos/response/ReviewResponse.java`

---

### 2️⃣ ReviewMapper.java
**Sửa method `toResponse()`:**
- Thêm `review.getUser().getFullName()` → `userName`
- Thêm `review.getBook().getTitle()` → `bookTitle`

**Vị trí:** `src/main/java/iuh/fit/haitebooks_backend/mapper/ReviewMapper.java`

---

### 3️⃣ ReviewService.java
**Sửa method `loadLazyRelationships()`:**
- Thêm `review.getUser().getFullName();` (để trigger load)
- Thêm `review.getBook().getTitle();` (để trigger load)

**Vị trí:** `src/main/java/iuh/fit/haitebooks_backend/service/ReviewService.java`

---

### 4️⃣ ReviewRepository.java
**Thêm `@EntityGraph` vào các method:**
```java
@EntityGraph(attributePaths = {"book", "user"})
```

**Áp dụng cho:**
- `findAll()`
- `findByUserId()`
- `findByBookId()`

**Vị trí:** `src/main/java/iuh/fit/haitebooks_backend/repository/ReviewRepository.java`

---

## 🔍 Kiểm tra trước khi sửa:

1. **User entity có method `getFullName()` không?**
   - Nếu có → dùng `getFullName()`
   - Nếu không → dùng `getFirstName() + " " + getLastName()`

2. **Book entity có method `getTitle()` không?**
   - Phải có → dùng `getTitle()`

3. **Review entity có field `status` không?**
   - Nếu có → thêm `status` vào `ReviewResponse`
   - Nếu không → bỏ qua

---

## 📝 Code mẫu từng file:

### ReviewResponse.java
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long userId;
    private String userName;        // ✅ THÊM
    private Long bookId;
    private String bookTitle;       // ✅ THÊM
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
```

### ReviewMapper.java
```java
public static ReviewResponse toResponse(Review review) {
    if (review == null) return null;

    return new ReviewResponse(
            review.getId(),
            review.getUser() != null ? review.getUser().getId() : null,
            review.getUser() != null ? review.getUser().getFullName() : null, // ✅ THÊM
            review.getBook() != null ? review.getBook().getId() : null,
            review.getBook() != null ? review.getBook().getTitle() : null,   // ✅ THÊM
            review.getRating(),
            review.getComment(),
            review.getCreatedAt()
    );
}
```

### ReviewService.java
```java
private void loadLazyRelationships(Review review) {
    if (review.getUser() != null) {
        review.getUser().getId();
        review.getUser().getFullName(); // ✅ THÊM
    }
    if (review.getBook() != null) {
        review.getBook().getId();
        review.getBook().getTitle(); // ✅ THÊM
    }
}
```

### ReviewRepository.java
```java
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    @EntityGraph(attributePaths = {"book", "user"}) // ✅ THÊM
    @Override
    List<Review> findAll();
    
    @EntityGraph(attributePaths = {"book", "user"}) // ✅ THÊM
    List<Review> findByUserId(Long userId);
    
    @EntityGraph(attributePaths = {"book", "user"}) // ✅ THÊM
    List<Review> findByBookId(Long bookId);
    
    boolean existsByUserIdAndBookId(Long userId, Long bookId);
}
```

---

## ✅ Sau khi sửa:

1. **Restart backend server**
2. **Test API:** `GET /api/reviews`
3. **Kiểm tra response có `bookTitle` và `userName`**
4. **Refresh trang Reviews trong admin panel**

---

## 🚨 Lưu ý:

- **QUAN TRỌNG:** Phải thêm `@EntityGraph` vào Repository, nếu không sẽ bị lỗi `LazyInitializationException`
- Nếu User không có `getFullName()`, cần kiểm tra và dùng method phù hợp
- Đảm bảo tất cả thay đổi được lưu và compile thành công

