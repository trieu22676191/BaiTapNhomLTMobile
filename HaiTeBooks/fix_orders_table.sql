-- Script kiểm tra và sửa bảng orders
-- Chạy lệnh này trong MySQL

USE haitebooks;  -- Thay đổi tên database nếu cần

-- Bước 1: Kiểm tra cấu trúc bảng orders hiện tại
DESCRIBE orders;

-- Bước 2: Thêm cột promotion_id nếu chưa có
-- Kiểm tra xem cột đã tồn tại chưa trước khi thêm
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'promotion_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT "Column promotion_id already exists" AS result;',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' BIGINT NULL;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Bước 3: Kiểm tra và sửa cột order_status
-- Nếu cột là 'status' thì đổi tên thành 'order_status'
-- Hoặc nếu không có thì thêm mới
SET @columnname2 = 'order_status';
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname2)
  ) > 0,
  'SELECT "Column order_status already exists" AS result;',
  (SELECT IF(
    (
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE
        (TABLE_SCHEMA = @dbname)
        AND (TABLE_NAME = @tablename)
        AND (COLUMN_NAME = 'status')
    ) > 0,
    'ALTER TABLE orders CHANGE COLUMN status order_status VARCHAR(50);',
    'ALTER TABLE orders ADD COLUMN order_status VARCHAR(50) DEFAULT "PENDING";'
  ))
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;

-- Bước 4: Kiểm tra lại cấu trúc sau khi sửa
DESCRIBE orders;

