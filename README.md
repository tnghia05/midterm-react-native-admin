# Bài giữa kỳ đa nền tảng — React Native

Ứng dụng quản trị sản phẩm chạy bằng Expo/React Native, có bản Web và dùng chung API Node.js + MongoDB.

## Chức năng

- Đăng nhập quản trị.
- Hiển thị, tìm kiếm, thêm, sửa và xóa sản phẩm.
- Chọn ảnh từ thiết bị và hiển thị ảnh trong danh sách.
- MongoDB chỉ lưu đúng bốn trường theo đề: `name`, `price`, `soluong`, `image` (ngoài `_id` mặc định của MongoDB).
- Giao diện responsive chạy trên Web, Android và iOS.

## Cấu trúc

```text
apps/api       Express + MongoDB + JWT
apps/mobile    Expo + React Native + TypeScript
```

## Cài đặt bằng pnpm

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Khởi động MongoDB trước, sau đó mở hai terminal:

```powershell
pnpm dev:api
pnpm web
```

Mở `http://localhost:8081`. Tài khoản mặc định trong `.env.example`:

- Email: `admin@example.com`
- Mật khẩu: `Admin@12345`

## Chạy trên điện thoại

Điện thoại và máy tính phải cùng Wi‑Fi. Đổi `apps/mobile/.env` thành IP LAN của máy tính, ví dụ:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001/api
```

Chạy `pnpm dev:mobile`, sau đó quét QR bằng Expo Go.

## File cơ sở dữ liệu nộp kèm

Mẫu JSON nằm tại `apps/api/data/products.json`. Xuất dữ liệu MongoDB thực tế:

```powershell
mongoexport --uri="mongodb://127.0.0.1:27017/midterm_product_admin" --collection=products --out=products.json --jsonArray
```

## Kiểm tra trước khi nộp

```powershell
pnpm typecheck
pnpm build
```

Sau khi demo, thay `ADMIN_PASSWORD` và `JWT_SECRET` trong `apps/api/.env`.
