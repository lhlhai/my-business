# TODO — Digital Twin Vựa Hải Sản

## 1. Web app tĩnh, responsive và có thể deploy GitHub Pages

- [x] Dùng HTML + CSS + JavaScript thuần (hoặc Vite + vanilla JS), dùng Three.js (ES module qua CDN hoặc npm); không dùng React/Vue để deploy GitHub Pages đơn giản.
- [x] Chạy được 100% static, deploy bằng GitHub Pages (kèm workflow `.github/workflows/deploy.yml`). Không cần backend; không phụ thuộc dịch vụ ngoài trừ CDN Three.js + Chart.js.
- [x] Responsive trên mobile; có nút “Reset view” và “Pause/Play simulation”.
- [x] Toàn bộ asset 3D dùng primitive (BoxGeometry, CylinderGeometry, PlaneGeometry...) và text label bằng CSS2DRenderer hoặc Sprite; không cần file .glb bên ngoài để tránh lỗi CORS khi deploy.
- [x] Có file `data.json` riêng chứa toàn bộ node/route/task để dễ sửa sau này mà không phải sửa code.
- [x] Cấu trúc bàn giao gồm `index.html`, `style.css`, `main.js` được chia module scene, nodes, routes, simulation, ui; `data.json`; `README.md` hướng dẫn deploy GitHub Pages; `.github/workflows/deploy.yml`; comment tiếng Việt tại các chỗ quan trọng trong code để người dùng tự sửa.

## 2. Bản đồ 3D, địa điểm, tuyến, kho lạnh và phương tiện

- [x] Bản đồ nền là Plane 100x100 đơn vị tương ứng khoảng 20 km thực tế, có grid và trục hướng Bắc.
- [x] Dựng 3 node chính, nhà vựa ở vị trí trung tâm và mặt tiền quốc lộ nông thôn; Cảng cá A cách vựa 3 km; Cảng cá B cách vựa 10 km; vẽ thêm một dải quốc lộ chạy qua nhà vựa.
- [x] Vẽ đường nối các node bằng TubeGeometry hoặc Line, dùng màu khác nhau cho chiều đi và chiều về.
- [x] Kho lạnh tại nhà vựa là một khối box có icon ❄️ và thanh bar 3D hiển thị công suất đang dùng.
- [x] Xe tải/xe máy là mô hình box nhỏ có bánh cylinder, chạy animation dọc theo route theo timeline.
- [x] Có khu đóng thùng gửi xe và mũi tên hướng ra node phụ “bến xe” ngoài rìa bản đồ.
- [x] Click vào node hiện tooltip thông tin: tên, khoảng cách tới vựa, sản lượng/ngày, khách liên quan.
- [x] Hover route hiện km, thời gian, chi phí.
- [x] Hỗ trợ xoay/zoom/pan bằng OrbitControls.
- [x] Có toggle hiện/ẩn nhãn, route đi, route về.

## 3. Timeline 24h, task và logistics chuỗi lạnh

- [x] Có timeline 24h có thể scrub (kéo slider).
- [x] Mô phỏng các mốc: 14:00–16:00 đi Cảng A (3 km) lấy hàng; 16:00–18:00 đi Cảng B (10 km); 18:00–20:00 phân loại tại vựa; 20:00–22:00 đóng thùng ướp lạnh và giao thương lái nhỏ; 22:00 gửi xe đi tỉnh (12h), xe rời khỏi map và hiện countdown “nhận hàng lúc 10:00 sáng mai”; 05:00–07:00 sáng hôm sau nhận lại hàng tươi mới (loop lại ngày).
- [x] Mỗi tác vụ gắn với `duration` (phút), `workers` (số người cần), `vehicle` (xe máy / xe tải nhỏ), `cost` (xăng + công), `capacity` (kg).
- [x] Xe và các trạng thái hoạt động hiển thị nhất quán với vị trí timeline; Pause/Play dừng/chạy mô phỏng, kéo timeline cập nhật trạng thái và countdown, Reset view chỉ khôi phục góc nhìn.

## 4. Dashboard, tải theo giờ và cảnh báo

- [x] Hiển thị dashboard overlay HTML ở góc phải.
- [x] Dashboard hiển thị tổng kg/ngày, tổng km/ngày, tổng giờ công, chi phí ước tính.
- [x] Biểu đồ cột nhỏ dùng Chart.js CDN thể hiện tải theo giờ để nhìn ra giờ nào nghẽn.
- [x] Hiện cảnh báo đỏ khi kho lạnh >90% công suất hoặc một người làm >X giờ liên tục; ngưỡng X có thể cấu hình.

## 5. Thêm khách, tăng quy mô và so sánh kịch bản

- [x] Có panel “Thêm khách mới”: người dùng chọn loại thương lái nhỏ / khách lẻ / khách tỉnh xa và nhập khối lượng trung bình/ngày.
- [x] Sau khi thêm, app tự thêm node khách lên map, cộng dồn vào dashboard và vẽ route giao.
- [x] Có các preset “Kịch bản”: A hiện tại; B thêm 5 khách sỉ; C mở thêm chuyến xe sáng; cho phép so sánh metrics giữa các kịch bản.

## 6. Dữ liệu, hướng dẫn và xuất bản

- [x] `data.json` mẫu có đầy đủ node, route, task của bối cảnh và các mốc mô phỏng nêu trên; dữ liệu dễ chỉnh mà không sửa code.
- [x] `README.md` hướng dẫn chạy local, chỉnh dữ liệu và deploy GitHub Pages.
- [x] `.github/workflows/deploy.yml` cấu hình GitHub Pages deployment cho bản static.
- [x] Mã nguồn có comment tiếng Việt tại các điểm quan trọng để người dùng tự sửa.
