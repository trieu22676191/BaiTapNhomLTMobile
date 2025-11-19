-- Migration: Thêm cột promotion_id vào bảng orders và kiểm tra cấu trúc
-- Chạy lệnh này trong MySQL để thêm cột promotion_id

USE haitebooks;  -- Thay đổi tên database nếu cần

-- Kiểm tra cấu trúc bảng orders hiện tại
DESCRIBE orders;

-- Thêm cột promotion_id nếu chưa có
ALTER TABLE orders ADD COLUMN promotion_id BIGINT NULL;

-- Kiểm tra lại cấu trúc sau khi thêm
DESCRIBE orders;

