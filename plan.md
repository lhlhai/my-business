# Kế hoạch triển khai — Digital Twin Vựa Hải Sản

## Mục tiêu và phạm vi

Xây một web app mô phỏng vận hành vựa hải sản bằng Three.js, chạy hoàn toàn static trên GitHub Pages. Không thêm backend, framework SPA, dịch vụ trả phí hay asset 3D bên ngoài; chỉ tải Three.js/Chart.js và các addon liên quan qua CDN như yêu cầu. Dữ liệu node, tuyến, khách, tác vụ và kịch bản mẫu được tách trong `data.json`. Người dùng có thể tương tác với bản đồ, timeline 24 giờ, KPI, cảnh báo, kịch bản và khách mới ngay trên trình duyệt.

## Quyết định triển khai

- Dùng HTML/CSS/JavaScript ES modules thuần; không cần bước build. `index.html` nạp Three.js, OrbitControls, CSS2DRenderer qua import map CDN đã pin phiên bản và Chart.js qua CDN.
- `main.js` là entry point khởi tạo ứng dụng, nạp `data.json` rồi kết nối các module chuyên trách; mã chia thành `js/scene.js`, `js/nodes.js`, `js/routes.js`, `js/simulation.js`, `js/ui.js` và `js/metrics.js` để dễ bảo trì.
- Dùng `data.json` cho dữ liệu gốc. Khách mới và lựa chọn kịch bản lưu trong `localStorage`, vì không có backend; có nút xóa/khôi phục dữ liệu mẫu để quay lại trạng thái ban đầu.
- Dùng `python3 -m http.server 3000` chỉ làm máy phục vụ file tĩnh khi xem Preview/phát triển. Bản GitHub Pages không cần server runtime hoặc build.
- Tạo workflow GitHub Pages dạng deploy static artifact, tự chạy sau khi thay đổi được hợp nhất vào nhánh `main`; không thực hiện push hay merge vào `main` trong phiên này.

## Mô hình thời gian và tính toán

- Timeline là một chu kỳ vận hành 24 giờ bắt đầu lúc 14:00 và kết thúc lúc 14:00 hôm sau; nhãn trên slider luôn hiển thị giờ thực theo đồng hồ. Cách đặt mốc này giữ đủ các sự kiện 14:00–07:00 sáng hôm sau trên một chu kỳ liên tục.
- Các mốc trong `data.json`: lấy hàng Cảng A 14:00–16:00; lấy hàng Cảng B 16:00–18:00; phân loại 18:00–20:00; đóng thùng/giao thương lái 20:00–22:00; xe tỉnh rời bản đồ lúc 22:00 và đến lúc 10:00 hôm sau; nhận hàng tươi 05:00–07:00 hôm sau. Chuyến tỉnh tiếp tục hiển thị countdown trong khi các hoạt động buổi sáng diễn ra.
- Các tuyến cảng tính quãng đường khứ hồi (A: 6 km, B: 20 km) cho KPI ngày, còn route hướng đi/hướng về được vẽ và bật/tắt riêng. Node khách phát sinh tuyến giao từ vựa và tính km/chi phí theo loại khách.
- Mỗi task có `duration` phút, `workers`, `vehicle`, `cost` tách phần nhiên liệu/nhân công và `capacity` kg. KPI được tính từ task/tuyến/khách đang hoạt động thay vì hard-code.
- Cảnh báo kho lạnh dùng ngưỡng 90% công suất. Cảnh báo làm liên tục dùng ngưỡng mặc định 4 giờ và danh sách crew/task trong dữ liệu để xác định chuỗi làm việc; ngưỡng này đặt cấu hình trong `data.json`.
- Ba kịch bản: A là dữ liệu gốc; B thêm năm khách thương lái; C thêm chuyến xe sáng. Panel so sánh các chỉ số chính giữa kịch bản gốc và kịch bản đang chọn.

## Cấu trúc dự kiến

```text
vuatwin/
├── index.html                    # Khung trang, import map và CDN
├── style.css                     # Dashboard desktop/mobile, trạng thái và overlay
├── main.js                       # Entry point, tải dữ liệu và nối các module
├── data.json                     # Node, route, task, khách mẫu và tham số mô phỏng
├── manus-routes.json             # Khai báo route trang `/` cho Preview
├── js/
│   ├── scene.js                  # Three.js renderer, camera, ánh sáng, lưới, OrbitControls
│   ├── nodes.js                  # Primitive 3D, nhãn, click/tooltip node
│   ├── routes.js                 # Route, hover tooltip, hướng đi/về và xe chuyển động
│   ├── simulation.js             # Chu kỳ thời gian, scrub, pause/play, chuyển động, countdown
│   ├── metrics.js                # KPI, tải theo giờ, cảnh báo, tính toán kịch bản
│   └── ui.js                     # Điều khiển dashboard, biểu đồ, form khách, toggles/reset
├── README.md                     # Chạy local, chỉnh data và deploy GitHub Pages
├── .github/workflows/deploy.yml  # Xuất bản GitHub Pages
└── favicon.svg                   # Dấu hiệu thương hiệu dạng vector nhỏ
```

## Hướng thiết kế

Ba hướng được cân nhắc (xác suất chọn thấp, mỗi hướng < 0,10):
1. **Bản đồ hải trình kiểu atlas** (0,07): nền sáng như hải đồ, nét mảnh và dấu tọa độ.
2. **Bảng điều khiển cảng đêm** (0,04): giao diện tối, màu cảnh báo rực và nhiều hiệu ứng radar.
3. **Coastal Operations Console** (0,06): bản đồ vận hành tối giản, nền đại dương xanh đậm, thẻ dashboard màu cát sáng và teal.

**Chọn: Coastal Operations Console.**

- **Design Movement:** Bảng điều khiển điều độ hàng hải đương đại, lấy cảm hứng từ hải đồ và thiết bị logistics.
- **Nguyên tắc cốt lõi:** Bản đồ 3D là trọng tâm; chỉ số quan trọng đọc nhanh; cảnh báo dùng màu có chủ đích; thông tin chi tiết mở theo tương tác.
- **Triết lý màu:** Xanh biển đậm tạo nền tập trung và chiều sâu; teal biểu thị luồng hàng lạnh; màu cát giúp dashboard dễ đọc; cam/đỏ chỉ dùng cho cảnh báo và nút hành động.
- **Bố cục:** Canvas bản đồ chiếm phần lớn bên trái; dashboard dạng cột neo bên phải; timeline thành thanh điều độ phía dưới. Trên mobile, bản đồ chiếm lớp nền và dashboard chuyển thành panel cuộn ở đáy.
- **Motif:** Đường route hai chiều có vệt sáng; vòng tọa độ/compass Bắc; nhãn node dạng thẻ điều độ.
- **Tương tác:** Kéo timeline để xem trạng thái tại thời điểm đó; click node để mở thông tin tại chỗ; hover route để xem chi phí và thời gian; toggle thay đổi trực quan tức thời.
- **Chuyển động:** Xe chạy theo tiến độ route; trạng thái hoạt động có nhịp chuyển nhẹ; không dùng hiệu ứng nhấp nháy liên tục. Tôn trọng `prefers-reduced-motion`.
- **Typography:** Dùng system font sans-serif cho tiêu đề/nội dung và monospace sẵn có cho thời gian/số liệu; không tải font từ dịch vụ ngoài.
- **Brand essence:** Bản đồ điều độ cho vựa hải sản nhỏ muốn vận hành rõ ràng và mở rộng bền vững — thực dụng, tin cậy, sắc nét.
- **Brand voice:** Ngắn gọn, cụ thể, hướng hành động. Ví dụ: “Luồng hàng đang chạy đúng nhịp.” / “Kho lạnh sắp chạm ngưỡng 90%.”
- **Wordmark/logo:** Chữ “VỰA / TWIN” đi cùng biểu tượng sóng biển cách điệu thành mũi tên luân chuyển.
- **Màu thương hiệu:** Teal lạnh riêng, dùng nhất quán cho kho lạnh và tuyến vận chuyển.

## Giới hạn và bàn giao

Mô phỏng, chi phí và sản lượng là số liệu mẫu có thể chỉnh trong `data.json`, không phải dữ liệu GPS hoặc báo giá thời gian thực. Dữ liệu do người dùng thêm được lưu ở trình duyệt hiện tại. Hoàn tất bằng mã nguồn, README, workflow GitHub Pages và kiểm tra cú pháp/dữ liệu cùng khả năng phục vụ tĩnh. Việc tạo issue/PR/merge sẽ không được giả định nếu chưa có repo GitHub do người dùng chỉ định; mọi thay đổi mã nguồn control cần tuân thủ quy trình issue → branch → PR và để người dùng/người được chỉ định review, merge.
