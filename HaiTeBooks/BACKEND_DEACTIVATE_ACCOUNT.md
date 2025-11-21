# Backend Code để vô hiệu hóa tài khoản (set enabled = false)

## 1. Tạo DTO Request (nếu chưa có)

**File: `iuh.fit.haitebooks_backend.dtos.request.DeleteAccountRequest.java`**

```java
package iuh.fit.haitebooks_backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeleteAccountRequest {
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
```

## 2. Thêm method vào UserService

**File: `iuh.fit.haitebooks_backend.service.UserService.java`**

Thêm method này vào class `UserService` (sau method `changePassword`):

```java
// ✅ Vô hiệu hóa tài khoản hiện tại (set enabled = false)
@Transactional
public void deactivateCurrentUser(String username, String password) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new BadRequestException("User not found: " + username));

    // ✅ Xác thực mật khẩu trước khi vô hiệu hóa
    if (!passwordEncoder.matches(password, user.getPassword())) {
        throw new UnauthorizedException("Mật khẩu không đúng");
    }

    // ✅ Vô hiệu hóa tài khoản (set enabled = false) thay vì xóa
    user.setEnabled(false);
    userRepository.save(user);
}
```

**Import cần thêm (nếu chưa có):**

```java
import iuh.fit.haitebooks_backend.exception.BadRequestException;
import iuh.fit.haitebooks_backend.exception.UnauthorizedException;
```

## 3. Thêm endpoint vào UserController

**File: `iuh.fit.haitebooks_backend.controller.UserController.java`**

Thêm endpoint này vào class `UserController` (sau endpoint `changePassword`):

```java
// ✅ Vô hiệu hóa tài khoản hiện tại (set enabled = false)
@DeleteMapping("/me")
public ResponseEntity<Map<String, String>> deactivateCurrentUser(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody DeleteAccountRequest request) {

    userService.deactivateCurrentUser(userDetails.getUsername(), request.getPassword());

    return ResponseEntity.ok(Map.of("message", "Tài khoản đã được vô hiệu hóa thành công"));
}
```

**Import cần thêm:**

```java
import iuh.fit.haitebooks_backend.dtos.request.DeleteAccountRequest;
```

## 4. Cập nhật SecurityConfig (nếu cần)

**File: `iuh.fit.haitebooks_backend.config.SecurityConfig.java`**

Đảm bảo endpoint `/api/users/me` với method DELETE được cho phép:

```java
.requestMatchers("/api/users/me", "/api/users/me/**").authenticated()
```

Hoặc nếu đã có rule này rồi thì không cần sửa.

## 5. Cập nhật AuthController/UserDetailsService (nếu cần)

**Quan trọng**: Đảm bảo khi login, chỉ cho phép user có `enabled = true` đăng nhập.

Trong `AppUserDetailsService` hoặc `AuthController`, kiểm tra:

```java
// Khi load user để login
User user = userRepository.findByUsername(username)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));

// Kiểm tra user có enabled không
if (!user.isEnabled()) {
    throw new DisabledException("Tài khoản đã bị vô hiệu hóa");
}
```

## Lưu ý:

1. **Không xóa dữ liệu**: Tài khoản vẫn tồn tại trong database, chỉ bị vô hiệu hóa
2. **Không thể đăng nhập**: User với `enabled = false` sẽ không thể đăng nhập
3. **Có thể khôi phục**: Admin có thể set `enabled = true` lại nếu cần
4. **Dữ liệu được giữ lại**: Orders, reviews, etc. vẫn được giữ lại

## Code đầy đủ UserService (tham khảo)

```java
// ✅ Vô hiệu hóa tài khoản hiện tại (set enabled = false)
@Transactional
public void deactivateCurrentUser(String username, String password) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new BadRequestException("User not found: " + username));

    // ✅ Xác thực mật khẩu trước khi vô hiệu hóa
    if (!passwordEncoder.matches(password, user.getPassword())) {
        throw new UnauthorizedException("Mật khẩu không đúng");
    }

    // ✅ Vô hiệu hóa tài khoản (set enabled = false) thay vì xóa
    user.setEnabled(false);
    userRepository.save(user);
}
```

## Code đầy đủ UserController (tham khảo)

```java
// ✅ Vô hiệu hóa tài khoản hiện tại (set enabled = false)
@DeleteMapping("/me")
public ResponseEntity<Map<String, String>> deactivateCurrentUser(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody DeleteAccountRequest request) {

    userService.deactivateCurrentUser(userDetails.getUsername(), request.getPassword());

    return ResponseEntity.ok(Map.of("message", "Tài khoản đã được vô hiệu hóa thành công"));
}
```
