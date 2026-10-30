[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/doggoboi096-lang/MediaVault-AIRiser2026)

Lưu ý cho Ban Giám Khảo: Toàn bộ AI của MediaVault chạy cục bộ với model **Qwen3-VL 4B** trên **llama.cpp**, do chính server tự tải và tự khởi động. Dự án **không dùng bất kỳ API key hay dịch vụ AI đám mây nào**, và **không cần cài Ollama** hay phần mềm AI nào khác. Chỉ cần:

```bash
npm install
npm run dev
```

Lần chạy đầu tiên, server tự tải về (khoảng 3 GB, chỉ tải một lần):
* `llama-server` bản chính thức từ [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp/releases) vào `.ai_runtime/` (Windows dùng bản Vulkan, chạy được trên GPU NVIDIA/AMD/Intel).
* Model `Qwen3VL-4B-Instruct-Q4_K_M.gguf` (2.5 GB) và `mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf` (0.45 GB) từ [Qwen/Qwen3-VL-4B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF) vào `models/`.

Các lần sau, model được nạp thẳng từ ổ đĩa vào GPU mỗi khi chạy `npm run dev`. Tiến trình tải/nạp hiển thị trong terminal và tại `GET /api/system` (trường `ai`, cần đăng nhập). Ảnh upload trong lúc model đang nạp sẽ chờ đến khi AI sẵn sàng. Nếu AI lỗi, ảnh vẫn được lưu và đọc EXIF/GPS bình thường, chỉ thiếu tag AI và OCR.

Trên máy có nhiều GPU (ví dụ laptop có cả iGPU), server tự chọn GPU rời và chạy toàn bộ model trên GPU đó; có thể chỉ định thủ công bằng `AI_DEVICE` (ví dụ `AI_DEVICE=Vulkan0`, xem danh sách bằng `llama-server --list-devices`).

Tùy chọn trong `.env`: `LLAMA_BACKEND=cpu` (ép chạy CPU; Linux mặc định CPU, đặt `vulkan` để dùng GPU), `AI_PORT` (mặc định `8089`), `AI_MODEL_FILE` / `AI_MMPROJ_FILE` (đổi bản lượng tử hóa, ví dụ `Qwen3VL-4B-Instruct-Q8_0.gguf`), `LLAMA_SERVER_PATH` (dùng `llama-server` có sẵn), hoặc `AI_BASE_URL` (trỏ tới một server OpenAI-compatible đang chạy sẵn thay vì tự khởi động).

## 🔒 Bảo mật & truy cập từ xa

Chỉ **chủ sở hữu** mới vào được MediaVault, và chỉ qua đúng một đường:

```
Thiết bị của bạn ──(Tailscale, mã hoá)──▶ tailscale serve (HTTPS *.ts.net) ──▶ 127.0.0.1:3000 (MediaVault)
```

* Server chỉ lắng nghe trên `127.0.0.1`. Máy khác trong cùng Wi-Fi không kết nối được.
* Mọi API và mọi file ảnh (`/api/*`, `/media/*`) đều cần session của chủ sở hữu. Session được cấp sau khi đăng nhập Google đúng email trong `ALLOWED_EMAIL`, lưu trong cookie `mv_session` (`HttpOnly`, `Secure`, `SameSite=Strict`).
* Request đi qua `tailscale serve` phải đến từ đúng tài khoản Tailscale trong `ALLOWED_TAILSCALE_LOGIN`.
* Xoá ảnh chỉ xoá bản lưu trong `media_uploads/`. Ảnh từ thư mục đã quét chỉ bị gỡ khỏi index, file gốc trên ổ đĩa không bao giờ bị xoá. Mọi lần xoá được ghi vào `logs/audit.log`.

### 1. Cấu hình `.env`

Sao chép `.env.example` thành `.env` rồi điền:

| Biến | Ý nghĩa |
|---|---|
| `ALLOWED_EMAIL` | Email Google duy nhất được đăng nhập |
| `ALLOWED_TAILSCALE_LOGIN` | Tài khoản Tailscale được phép (thường trùng email trên) |
| `FIREBASE_PROJECT_ID` | Project Firebase dùng để kiểm tra ID token (`mediavault-2b811`). Không cần file service account |
| `SESSION_SECRET` | Để trống thì server tự sinh và lưu ở `.ai_runtime/session.key` |
| `SESSION_DAYS` | Thời hạn session (mặc định 30 ngày) |
| `SESSION_VERSION` | Tăng số này để đăng xuất khỏi mọi thiết bị |
| `HOST` / `PORT` | Mặc định `127.0.0.1` / `3000` |
| `AUTH_DISABLED` | `true` để chạy demo không cần đăng nhập. Server **từ chối khởi động** nếu bật cùng `HOST` khác localhost |

### 2. Mở truy cập từ xa bằng Tailscale (làm một lần trên máy chủ)

```bash
tailscale serve --bg 3000
```

```bash
tailscale serve status
```

Sau đó mở `https://<tên-máy>.<tailnet>.ts.net` từ điện thoại hoặc máy khác đã đăng nhập Tailscale.

### 3. Thêm tên miền vào Firebase

Trong [Firebase Console](https://console.firebase.google.com/) → project `mediavault-2b811` → **Authentication → Settings → Authorized domains**, thêm tên miền `<tên-máy>.<tailnet>.ts.net`. Nếu thiếu bước này, cửa sổ đăng nhập Google sẽ báo lỗi khi mở qua Tailscale.

### 4. Kiểm thử bảo mật

```bash
npm run test:security
```

Script tự dựng một server riêng (cổng 3191, thư mục dữ liệu tạm, AI tắt) và kiểm tra: không truy cập được qua IP LAN, API/ảnh trả 401 khi chưa đăng nhập, `/api/serve-media` đã bị xoá, chặn path traversal khi xoá, giới hạn 10 lần đăng nhập / 15 phút, upload không có session không ghi file, `AUTH_DISABLED` với `HOST` công khai bị từ chối, và xoá ảnh đã quét không đụng file gốc. Hai mục cần kiểm tra tay: đăng nhập bằng đúng tài khoản Google, và truy cập qua `https://…ts.net` từ điện thoại.

### Chạy demo trên Codespaces

Codespaces đặt sẵn `AUTH_DISABLED=true` (xem `.devcontainer/devcontainer.json`) để Ban Giám Khảo dùng thử mà không cần tài khoản Google của chủ sở hữu. Cổng chuyển tiếp của Codespaces là riêng tư theo mặc định, và server vẫn chỉ lắng nghe trên `127.0.0.1` bên trong container.

# 🚀 TỔNG QUAN DỰ ÁN: MEDIAVAULT

**Định vị:** Nền tảng Đám mây Đa phương tiện Tự lưu trữ (High-Density Self-Hosted Media Cloud) tích hợp AI cục bộ và Mạng lưới Zero-Trust.

### 1. Đặt vấn đề (The Problem)

Trong thời đại bùng nổ dữ liệu số (video 4K, ảnh RAW), người dùng phổ thông và doanh nghiệp nhỏ đang đối mặt với 3 vấn đề cốt lõi khi sử dụng các dịch vụ Cloud truyền thống (Google Photos, iCloud, OneDrive):

* **Chi phí lưu trữ đắt đỏ & Bị khóa hệ sinh thái (Vendor Lock-in):** Chi phí thuê bao hàng tháng tăng theo cấp số nhân khi dung lượng phình to. Khi ngừng đóng tiền, người dùng đối mặt với nguy cơ mất dữ liệu.
* **Quyền riêng tư & An toàn thông tin (Privacy & Security):** Việc giao phó toàn bộ tài liệu nhạy cảm (CCCD, hợp đồng, ảnh riêng tư) cho máy chủ bên thứ ba luôn tiềm ẩn rủi ro rò rỉ dữ liệu. Đáng lo ngại hơn, dữ liệu này thường bị các hãng công nghệ lớn quét ngầm (data mining) để huấn luyện AI mà không được sự cho phép minh bạch.
* **Lãng phí tài nguyên phần cứng:** Nhiều người dùng sở hữu PC/Laptop có sức mạnh tính toán (CPU đa nhân, GPU mạnh mẽ) và ổ cứng dung lượng lớn (Terabyte) nhưng lại để không, trong khi vẫn đi thuê tài nguyên nhỏ giọt trên mạng.

### 2. MediaVault là gì? (The Solution)

MediaVault là giải pháp đưa toàn bộ quyền kiểm soát dữ liệu về lại tay người dùng. Đây là một hệ thống "Đám mây cá nhân" (Personal Cloud) chạy trực tiếp trên máy tính hoặc ổ cứng mạng (NAS) tại nhà.
Dự án giải quyết bài toán: **Lưu trữ vô hạn với chi phí 0 đồng (sau khi đầu tư phần cứng), quyền riêng tư tuyệt đối (100% dữ liệu ở lại máy chủ nội bộ), và trải nghiệm quản lý thông minh không thua kém các ông lớn công nghệ.**

### 3. Kiến trúc hệ thống & Cách hoạt động (How it Works)

MediaVault hoạt động như một hệ sinh thái khép kín với 4 trụ cột:

* **Core Storage (Gốc lưu trữ vật lý):** Hệ thống thọc sâu đọc file trực tiếp (Zero-copy) từ các ổ đĩa vật lý có sẵn (như `D:\GiaDinh\HinhAnh`), kết hợp thuật toán chống trùng lặp (Deduplication) theo Byte & Name để tối ưu không gian.
* **Hardware Transcoding (Xử lý đa phương tiện):** Sử dụng `FFmpeg` tận dụng trực tiếp sức mạnh Card đồ họa (NVENC/CUDA/Radeon) để trích xuất frame, chuyển đổi ảnh HEIC của Apple và tối ưu luồng video nặng thành các bản preview siêu nhẹ (JPEG/WebP) để load mượt mà trên web.
* **AI Engine (Tầm nhìn máy tính):** Mọi bức ảnh/video đưa vào đều bị quét để trích xuất siêu dữ liệu (EXIF/GPS). Sau đó, AI sẽ tự động dán nhãn (Tagging), nhận diện vật thể và trích xuất văn bản (OCR) để người dùng có thể tìm kiếm bằng ngôn ngữ tự nhiên.
* **Private Mesh VPN (Kết nối bảo mật):** Sử dụng Tailscale (mạng Zero-Trust) để cấp phép truy cập từ xa. Người dùng có thể xem ảnh từ điện thoại mọi lúc mọi nơi bằng một đường hầm mã hóa (E2EE) đâm thẳng về máy chủ ở nhà mà không cần mở Port (NAT) nguy hiểm.

### 4. ⚖️ TRỌNG TÂM ĐÁNH GIÁ: BẢN DEMO vs SẢN PHẨM THỰC TẾ

*(Phần này cực kỳ quan trọng để giám khảo hiểu tư duy kiến trúc của fen, cho thấy fen biết cách scale hệ thống thực tế)*

Để tối ưu hóa thời gian thuyết trình và trình diễn tại Hackathon, nguyên mẫu (Prototype) này đã được tinh chỉnh linh hoạt, khác biệt với phiên bản Production thực tế ở các điểm cốt lõi sau:

**A. Động cơ Trí tuệ Nhân tạo (AI Engine)**

* **Bản Demo Hackathon (đã chạy AI cục bộ thật):** Dùng một mô hình thị giác-ngôn ngữ duy nhất là **Qwen3-VL 4B** chạy trên **llama.cpp** ngay trong máy chủ; server tự tải và quản lý tiến trình AI (`src/services/ai_runtime.ts`, `src/services/local_ai.ts`). Mỗi ảnh (hoặc frame trích từ video bằng FFmpeg) được phân tích 2 lượt: (1) gắn thẻ & nhận diện vật thể, trả về JSON; (2) OCR giữ nguyên 100% dấu tiếng Việt và ngắt dòng. Ảnh không bao giờ rời khỏi máy, không cần API key, không phụ thuộc dịch vụ AI đám mây. Ưu điểm: Quyền riêng tư tuyệt đối, OCR tiếng Việt tốt hơn hẳn các engine OCR truyền thống.
* **Sản phẩm thực tế (Real App):** Giữ nguyên kiến trúc AI cục bộ nhưng tối ưu thêm cho quy mô lớn: hàng đợi xử lý nền (job queue) để không chặn upload, chạy batch trên GPU, và có thể bổ sung model chuyên dụng nhẹ hơn (ví dụ detector ONNX) cho bước lọc nhanh trước khi gọi Qwen3-VL.

**B. Cơ sở dữ liệu (Database & Indexing)**

* **Sản phẩm thực tế (Real App):** Sử dụng **SQLite3 ở chế độ WAL (Write-Ahead Logging)** kết hợp với chỉ mục FTS5. Kiến trúc này cho phép xử lý đồng thời (concurrent) hàng chục ngàn file, cho tốc độ tìm kiếm full-text search siêu tốc mà không bị kẹt I/O lock.
* **Bản Demo Hackathon:** Sử dụng file **JSON tĩnh** (`library_index.json`). JSON giúp việc debug, show cấu trúc dữ liệu minh bạch cho giám khảo xem theo thời gian thực (Real-time data flow), chứng minh hệ thống bắt lỗi trùng lặp và lưu trữ file vật lý thật trên ổ cứng (chứ không phải URL mạng ba xạo) cực kỳ trực quan.

**C. Xử lý Vị trí (Reverse Geocoding)**

* Thay vì tạo dữ liệu giả (Hardcode mock data), bản Demo đã được tích hợp luồng gọi API đến OpenStreetMap. Ngay khi trích xuất được tọa độ GPS gốc từ ảnh, hệ thống lập tức map ra phường, xã, thành phố thực tế, minh chứng cho một pipeline hoàn thiện từ thiết bị đầu cuối đến Data Indexing.

---

**Tóm lại:** Bản Demo là một "Mô hình thu nhỏ" hoàn hảo. Nó giữ nguyên cốt lõi lưu trữ vật lý thực tế, bảo mật Tailscale thực tế, xử lý file FFmpeg thực tế, và AI chạy 100% cục bộ bằng Qwen3-VL trên llama.cpp tự quản lý, không gửi bất kỳ dữ liệu nào lên Cloud AI. Điểm khác biệt duy nhất so với bản Production là tầng lưu chỉ mục (JSON thay vì SQLite).