**Tiêu đề:** Levels — Hệ thống EXP và cấp độ cho Flarum 2.0

Chào mọi người! Mình xin chia sẻ extension đầu tiên của mình: **Levels**.

## Chức năng

Extension này thêm hệ thống EXP và cấp độ vào diễn đàn Flarum 2.0 của bạn. Thành viên nhận EXP khi tạo chủ đề, trả lời bài viết và truy cập mỗi ngày. Huy hiệu cấp độ cạnh tên giúp mọi người thấy họ đã tiến xa đến đâu. Mọi thứ đều chỉnh được trong trang quản trị: EXP cho từng hành động, bảng cấp độ, tên, icon và màu sắc.

## Tính năng

- **EXP theo hoạt động** — số EXP riêng, chỉnh được cho việc tạo chủ đề, trả lời bài và lần truy cập đầu tiên mỗi ngày (mặc định 10 / 5 / 2)
- **Điểm danh hằng ngày** — chỉ cộng một lần mỗi ngày theo múi giờ bạn chọn (mặc định `Asia/Ho_Chi_Minh`); nhiều request cùng lúc cũng không cộng trùng
- **Bảng cấp độ chỉnh sửa hoàn toàn** — thêm, sửa, xóa cấp, mỗi cấp có tên, EXP tối thiểu, icon FontAwesome và màu
- **10 cấp mặc định** — tên cấp theo ngôn ngữ của người xem; tên do admin nhập sẽ thay thế ở mọi ngôn ngữ
- **Huy hiệu cấp độ trên bài viết** — hiện cạnh tên tác giả, rê chuột hoặc chạm vào để xem tiến độ và số EXP còn thiếu để lên cấp
- **Hiệu ứng nổi bật** — huy hiệu ánh kim cho cấp cao nhất hoặc cấp nào bạn đánh dấu "Nổi bật" (tôn trọng `prefers-reduced-motion`)
- **Thanh tiến độ trên thẻ thành viên** — hiện cấp, EXP và thanh tiến độ
- **Công cụ cho admin** — chỉnh EXP của thành viên ngay từ hồ sơ (menu quản trị → "Chỉnh cấp độ"), nhập EXP hoặc chọn theo cấp
- **Bật/tắt icon** — ẩn toàn bộ icon bằng một công tắc, hoặc để trống icon của riêng một cấp
- **Thiết kế an toàn** — bài viết và chủ đề đang chờ duyệt (hoặc bị ẩn) không được cộng EXP, và ngưỡng EXP giữa các cấp luôn tăng chặt
- **Đa ngôn ngữ** — có sẵn tiếng Anh và tiếng Việt, ngôn ngữ khác dùng tiếng Anh
- **Không cần Node.js** — JS đã build sẵn trong `js/dist`

## Cách hoạt động

**Với thành viên:**
- Nhận EXP khi đăng bài và khi truy cập mỗi ngày
- Thấy huy hiệu cấp độ trên mọi bài viết và tiến độ trên thẻ thành viên

**Với admin:**
1. Bật extension sau khi cài
2. Vào **Admin → Extensions → Levels**, đặt EXP cho từng hành động và múi giờ
3. Chỉnh bảng cấp độ theo ý bạn rồi bấm Lưu thay đổi
4. (Tùy chọn) Chỉnh EXP của bất kỳ thành viên nào từ hồ sơ của họ

## Cài đặt

```
composer require kuma-develop/level:"*"
php flarum migrate
php flarum cache:clear
```

Sau đó bật extension trong trang quản trị.

## Yêu cầu

- Flarum 2.0+

## Lưu ý

- Đây là bản phát hành đầu tiên (v1.0.0), nếu gặp lỗi mong mọi người báo lại.
- EXP được lưu trong hai cột mới của bảng `users` (`exp`, `exp_daily_at`). Khi Purge extension, hai cột này bị xóa và toàn bộ EXP cũng mất theo.
- EXP không bị trừ khi bài viết bị xóa sau đó.

## Giấy phép

MIT

## Liên kết

📦 [Packagist](https://packagist.org/packages/kuma-develop/level)
💻 [GitHub](https://github.com/kuma-develop/Level)

Mọi góp ý và báo lỗi đều được hoan nghênh — bạn có thể trả lời ngay tại đây hoặc mở issue trên GitHub.

