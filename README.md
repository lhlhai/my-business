# Digital twin vựa hải sản

Ứng dụng mô phỏng vận hành vựa hải sản dưới dạng static HTML/CSS và ES modules vanilla JavaScript. Three.js và Chart.js được tải từ CDN; không có backend, React/Vue, bước build hay npm.

## Chạy thử trên máy cục bộ

Tại thư mục project, chạy:

```bash
python3 -m http.server 3000 --bind 0.0.0.0
```

Mở <http://localhost:3000>. Không mở `index.html` trực tiếp bằng `file://`: trình duyệt cần HTTP để tải `data.json`.

## Dữ liệu và mô phỏng

- Chỉnh node, route và task trong `data.json`. Tọa độ dùng hệ trục x/z; một đơn vị tương ứng 200 m.
- Khách hàng và kịch bản được lưu trong `localStorage` của trình duyệt hiện tại, không đồng bộ sang trình duyệt hoặc thiết bị khác. Muốn đặt lại khách/kịch bản đã lưu, xóa dữ liệu trang của ứng dụng trong trình duyệt.
- Một chu kỳ mô phỏng kéo dài 24 giờ và bắt đầu lúc 14:00.
- Sản lượng kg/ngày được tính từ các delivery task; quãng đường km được tính từ các mapped leg; công lao động được tính bằng `duration × workers`.
- KPI, chi phí và định mức là số liệu mẫu để minh họa. Dashboard không phải dữ liệu GPS hay báo giá thực tế.

## GitHub Pages

Workflow triển khai chạy khi có push lên nhánh `main` hoặc khi được chạy thủ công bằng `workflow_dispatch`. Để bật Pages cho repository, vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**. Sau khi PR được review và merge vào `main`, workflow sẽ tải artifact từ thư mục gốc (`.`) và triển khai lên GitHub Pages. Có thể theo dõi trạng thái trong tab **Actions**.

## Đóng góp

Theo quy trình **issue → branch tạo từ `main` → pull request (PR)** để review và merge. Không push trực tiếp hoặc tự merge vào `main`.
