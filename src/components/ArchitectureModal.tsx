import React from 'react';
import {
  Layers,
  X,
  Cpu,
  Sparkles,
  Database,
  ShieldCheck,
  Film,
  Network,
  Server,
  HardDrive,
  Code,
  CheckCircle2,
  Info,
  Zap,
  ArrowRight,
  Boxes
} from 'lucide-react';
import { Lang } from '../lib/i18n';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Lang;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  lang = 'vi'
}) => {
  if (!isOpen) return null;

  const isVi = lang === 'vi';

  return (
    <div
      id="architecture-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  {isVi ? 'Thông tin Dự án cho Giám khảo' : 'Project Info for Judges & Evaluation'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  HACKATHON DEMO
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {isVi
                  ? 'Ghi chú kiến trúc hệ thống, phạm vi triển khai & thiết lập bản demo'
                  : 'System Architecture Blueprint, Scope & Live Pitch Demonstration Notes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted Judge Note: Prototype vs Real App Comparison */}
        <div className="rounded-lg bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 p-4 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{isVi ? 'Ghi chú Trình diễn: Bản Thực tế vs. Bản Demo Prototype' : 'Evaluation Note: Production Architecture vs. Demo Prototype'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Real App Column */}
            <div className="p-3.5 rounded-md bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {isVi ? 'Bản Thực tế (Production Node)' : 'Production Architecture (Real Node)'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Edge / Local</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span><strong>AI Edge Inference:</strong> {isVi ? 'Chạy mô hình YOLOv8-nano 100% cục bộ trên ONNX Runtime (~14ms/khung hình), không gửi dữ liệu ra ngoài.' : 'Runs YOLOv8-nano 100% locally on-device via ONNX Runtime (~14ms/frame) with zero cloud dependency.'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span><strong>Database & FTS:</strong> {isVi ? 'SQLite 3 ở chế độ WAL Mode với bảng ảo FTS5 phục vụ tìm kiếm văn bản toàn văn cực nhanh.' : 'SQLite 3 in WAL Mode with FTS5 virtual tables for lightning-fast local text & tag search.'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span><strong>OCR:</strong> {isVi ? 'Mô hình PaddleOCR / Tesseract nhúng trực tiếp trên máy chủ cục bộ.' : 'Embedded PaddleOCR / Tesseract running directly on host CPU/NPU.'}</span>
                </li>
              </ul>
            </div>

            {/* Prototype Column */}
            <div className="p-3.5 rounded-md bg-zinc-950/80 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {isVi ? 'Bản Demo Prototype (Dành cho Pitch)' : 'This Demo Prototype (Pitch Ready)'}
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono font-semibold">Gemini + JSON Sim</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong>Simulated AI Vision:</strong> {isVi ? 'Sử dụng Google Gemini API (Structured Schema) để mô phỏng đường ống nhận diện vật thể & OCR mà không đòi hỏi GPU nặng khi chấm thi.' : 'Uses Google Gemini API structured output to simulate the AI vision & OCR pipeline smoothly without heavy local GPU requirements during pitching.'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong>Simulated Database:</strong> {isVi ? 'Lưu trữ chỉ mục qua tệp JSON cục bộ (library_index.json) giúp triển khai tức thì, không cần cài đặt SQLite C-bindings.' : 'Stores metadata index in local JSON files (library_index.json) for instant, dependency-free evaluation.'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong>Live Telemetry:</strong> {isVi ? 'Đọc thông số phần cứng thật của máy (CPU, RAM, GPU, Ổ đĩa) qua Node.js & PowerShell.' : 'Real-time telemetry queries live host CPU, RAM, GPU and Disk usage via Node.js OS APIs.'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Diagram Flow Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            <Boxes className="w-4 h-4 text-emerald-400" />
            <span>{isVi ? 'Kiến trúc Tổng thể Hệ thống' : 'Full Architecture & Tech Stack Overview'}</span>
          </div>

          {/* Architecture Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Client / Frontend Tier */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-sky-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Code className="w-3.5 h-3.5" />
                <span>1. Frontend & Client</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">React 19 + Tailwind CSS</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? 'Giao diện tối ưu hóa cho Media Cloud với pan/zoom mượt mà, khung bounding box AI thời gian thực, chuyển đổi đa ngôn ngữ EN/VI.'
                  : 'Virtualized grid handling smooth pan/zoom, interactive bounding boxes, HEIC browser conversion, and responsive dark UI.'}
              </p>
              <div className="pt-2 text-[10px] font-mono text-sky-400 space-y-0.5 border-t border-zinc-900">
                <p>• Server-side HEIC & Video extraction</p>
                <p>• Web Workers EXIF extractor</p>
                <p>• Full-bleed dark room viewer</p>
              </div>
            </div>

            {/* 2. Media Engine & Transcoder */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Film className="w-3.5 h-3.5" />
                <span>2. Hardware Transcoding</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">FFmpeg & GPU Acceleration</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? 'Tăng tốc phần cứng (NVIDIA NVENC, Intel QuickSync, Apple VideoToolbox) để giải mã video 4K HEVC và tạo thumbnail WebP tức thì.'
                  : 'Hardware hooks (NVIDIA NVENC, Intel QuickSync VAAPI, Apple VideoToolbox) for on-the-fly HEVC 4K decoding.'}
              </p>
              <div className="pt-2 text-[10px] font-mono text-rose-400 space-y-0.5 border-t border-zinc-900">
                <p>• NVENC / QuickSync zero-copy</p>
                <p>• On-the-fly WebP thumbnailing</p>
                <p>• EXIF/GPS geotag parsing</p>
              </div>
            </div>

            {/* 3. AI Inference & OCR */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3. AI Vision Pipeline</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">YOLOv8 + OCR Vision Engine</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? 'Nhận diện đối tượng, phân loại tài liệu/ảnh chụp, trích xuất hóa đơn bằng OCR và gắn thẻ tự động vào siêu dữ liệu.'
                  : 'Automatic object categorization, document/receipt classification, OCR text extraction, and smart semantic tagging.'}
              </p>
              <div className="pt-2 text-[10px] font-mono text-emerald-400 space-y-0.5 border-t border-zinc-900">
                <p>• Multimodal Object Tagging</p>
                <p>• OCR Full-Text Extraction</p>
                <p>• Automated Smart Collections</p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Database & Networking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 4. Backend & Database */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Database className="w-3.5 h-3.5" />
                <span>4. Backend Storage & Index</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">Node.js Express + Zero-Copy I/O</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? 'Đường ống xử lý đa luồng, hỗ trợ tải lên nguyên bản (tránh trùng lặp), chỉ mục tìm kiếm tức thì và phát trực tiếp không cần trung gian.'
                  : 'High-throughput stream I/O, clean in-place file overwrite on duplicate upload, and fast JSON/SQLite indexing.'}
              </p>
              <div className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-zinc-300 space-y-0.5 border border-zinc-800">
                <p className="text-emerald-400">POST /api/analyze-media (AI Ingestion)</p>
                <p className="text-emerald-400">GET /api/system (Real Telemetry)</p>
                <p className="text-amber-400">PATCH /api/media (Instant Tag & Date Edit)</p>
              </div>
            </div>

            {/* 5. Networking & Reverse Proxy */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>5. Private Mesh & Zero-Trust Security</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200">Nginx + Tailscale WireGuard</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? 'Bảo mật 100% dữ liệu trên thiết bị cá nhân. Truy cập từ xa bảo mật qua mạng lưới ảo Tailscale mà không cần mở port modem.'
                  : 'Protected with zero open inbound ports. Direct encrypted streaming over Tailscale Zero-Trust WireGuard mesh network.'}
              </p>
              <div className="p-2.5 rounded bg-zinc-900 font-mono text-[10px] text-zinc-300 space-y-0.5 border border-zinc-800">
                <p className="text-sky-400">Zero Inbound Port Forwarding</p>
                <p className="text-emerald-400">Tailscale Encrypted Mesh: 100.84.192.42</p>
                <p className="text-emerald-400">Firebase Auth Access Control</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">MediaVault v2.4.0 • Hackathon Evaluation Blueprint</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            {isVi ? 'Đóng thông tin' : 'Close Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
