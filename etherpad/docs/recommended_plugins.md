# Danh sách & Hướng dẫn Cài đặt Plugins đề xuất cho Etherpad

Tài liệu này liệt kê các plugin bổ sung phổ biến và đáng tin cậy nhất cho Etherpad, giúp nâng cấp trang soạn thảo biên bản cuộc họp thành một công cụ soạn thảo chuyên nghiệp và cộng tác nhóm mạnh mẽ tương tự Google Docs.

---

## 1. Danh sách Plugins đề xuất

| Đã Cài đặt | Tên Plugin | Tính năng & Công dụng | Đánh giá mức độ cần thiết |
| :---: | :--- | :--- | :---: |
| `[x]` | **`ep_tables4`** | Hỗ trợ chèn bảng biểu, định dạng hàng/cột và chỉnh sửa nâng cao. | **Đã có sẵn** |
| `[ ]` | **`ep_headings2`** | Bổ sung các tùy chọn định dạng Tiêu đề (H1, H2, H3, H4, H5, H6) cho văn bản. | **Rất cần thiết** |
| `[x]` | **`ep_align`** | Bổ sung các nút căn lề (Trái, Giữa, Phải, Căn đều 2 bên). | **Rất cần thiết** |
| `[ ]` | **`ep_author_hover`** | Hiển thị tên (Display Name) của người soạn thảo khi di chuột vào đoạn chữ tương ứng. Giúp theo dõi nhanh ai là người đóng góp nội dung nào trong cuộc họp. | **Khuyên dùng** |
| `[x]` | **`ep_font_size`** | Cho phép thay đổi kích thước chữ (font size). | **Cần thiết** |
| `[x]` | **`ep_font_color`** | Cho phép thay đổi màu sắc chữ và màu nền highlight (bút dạ quang). | **Cần thiết** |
| `[x]` | **`ep_font_family`** | Cho phép thay đổi kiểu chữ (Font Family) như Arial, Times New Roman, Courier... | **Tùy chọn** |
| `[ ]` | **`ep_comments_page`** | Cho phép bôi đen đoạn văn bản và tạo bình luận/thảo luận riêng ở thanh bên phải (giống Google Docs). | **Nâng cao** |
| `[ ]` | **`ep_search`** | Thêm tính năng Tìm kiếm & Thay thế (Find and Replace) văn bản. | **Cần thiết** |
| `[ ]` | **`ep_hyperlink`** | Giao diện chèn đường dẫn liên kết URL chuyên nghiệp, có hộp thoại popup thân thiện. | **Cần thiết** |
| `[ ]` | **`ep_image_upload`** | Cho phép kéo thả hoặc chèn ảnh trực tiếp vào tài liệu. | **Nâng cao** |
| `[ ]` | **`ep_subscript_superscript`** | Bổ sung tính năng viết chỉ số dưới (như $H_2O$) và chỉ số trên (như $X^2$). | **Tùy chọn** |
| `[ ]` | **`ep_markdown`** | Hỗ trợ hiển thị và nhập định dạng Markdown nhanh chóng. | **Tùy chọn** |

---

## 2. Hướng dẫn cài đặt thêm Plugin mới

Khi bạn muốn thêm một hoặc nhiều plugin từ danh sách trên vào Etherpad, hãy làm theo các bước chuẩn hóa sau:

### Bước 2.1: Chỉnh sửa Dockerfile của Etherpad
Mở tệp `Dockerfile` tại đường dẫn `/home/tmduc/docker-jitsi-meet/etherpad/Dockerfile`.
Thêm dòng lệnh cài đặt plugin vào ngay dưới phần cài đặt `ep_tables4`.

*Ví dụ: Bạn muốn cài thêm `ep_headings2` và `ep_author_hover`:*
```dockerfile
# (Các dòng trước giữ nguyên...)

# Install the table plugin
RUN pnpm run install-plugins ep_tables4

# Cài đặt thêm các plugin mong muốn:
RUN pnpm run install-plugins ep_headings2 ep_author_hover

# (Các dòng sau giữ nguyên như patch_datatables...)
```

### Bước 2.2: Build lại và khởi động lại dịch vụ
Di chuyển vào thư mục dự án và chạy các lệnh Docker để tự động build lại image sạch và khởi tạo lại container:
```bash
cd /home/tmduc/docker-jitsi-meet
docker compose build etherpad
docker compose up -d etherpad
```

### Bước 2.3: Kiểm tra
Sau khi dịch vụ khởi động lại hoàn tất:
1. Mở cuộc họp Jitsi Meet và mở Etherpad.
2. Bạn sẽ thấy các biểu tượng tính năng mới xuất hiện trên thanh công cụ soạn thảo (Toolbar) phía trên.
3. Người dùng có thể cần bấm **Ctrl + F5** hoặc xóa bộ nhớ cache trình duyệt để cập nhật giao diện nút bấm mới.

---

## 3. Cách gỡ cài đặt (Uninstall) một Plugin
Nếu sau khi dùng thử bạn thấy một plugin không còn cần thiết hoặc làm chật thanh công cụ:
1. Mở `Dockerfile` và xóa tên plugin đó khỏi dòng lệnh `pnpm run install-plugins`.
2. Tiến hành build lại và khởi động lại dịch vụ:
   ```bash
   docker compose build etherpad && docker compose up -d etherpad
   ```
3. Hệ thống sẽ tự động tạo một image mới sạch và không chứa plugin đã xóa.
