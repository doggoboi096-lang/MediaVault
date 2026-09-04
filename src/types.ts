export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  box: {
    ymin: number; // percentage 0-100
    xmin: number;
    ymax: number;
    xmax: number;
  };
  category: 'object' | 'person' | 'document' | 'vehicle' | 'nature' | 'text';
}

export interface ExifData {
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: number;
  focalLength: string;
  dimensions: string;
  width: number;
  height: number;
  size: string;
  sizeBytes: number;
  colorSpace?: string;
  dateTaken: string;
  format: string;
}

export interface LocationInfo {
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  altitude?: string;
}

export interface VideoMetadata {
  duration: string; // e.g. "0:15"
  durationSeconds: number;
  codec: string; // "HEVC (H.265)" | "H.264" | "AV1"
  bitrate: string; // "48.2 Mbps"
  frameRate: number; // 60 or 24
  audioCodec: string; // "AAC 320kbps 5.1"
  hwTranscode: 'Direct Play' | 'NVENC Active' | 'VAAPI Active' | 'Apple VideoToolbox';
}

export interface DocumentOcrData {
  documentType: 'Passport' | 'Driver License' | 'Invoice' | 'Receipt' | 'Contract' | 'Note';
  extractedText: string[];
  docId?: string;
  issueDate?: string;
  totalAmount?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  url: string;
  thumbnailUrl: string;
  previewUrl?: string;
  type: 'image' | 'video' | 'document' | 'id_card';
  date: string; // YYYY-MM-DD
  dateFormatted: string; // "Today", "Yesterday", "July 14, 2023"
  exif: ExifData;
  location?: LocationInfo;
  tags: string[];
  detectedObjects: DetectedObject[];
  videoMeta?: VideoMetadata;
  ocrData?: DocumentOcrData;
  ocrText?: string;
  ocr?: string;
  isFavorite?: boolean;
  collection?: string;
  isDeleted?: boolean;
  originalHeicUrl?: string;
  description?: string;
  originalSize?: number;
}

export interface SmartCollection {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  itemsCount: number;
  storageSize: string;
  storageBytes: number;
  filterType: 'id_card' | 'document' | 'video' | 'location' | 'favorites' | 'nature' | 'urban';
  coverImages: string[];
}

export interface IndexingActivity {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  timestamp: number;
  icon: string;
  status: 'completed' | 'processing' | 'queued';
  details: {
    itemsCount: number;
    extractedLocations?: number;
    ocrCount?: number;
    transcodedCount?: number;
  };
}

export interface SystemHardwareStatus {
  gpuModel: string;
  gpuUsage: number;
  gpuMemory: string;
  hwAccelEngine: string;
  cpuModel: string;
  cpuUsage: number;
  cpuUsagePercent?: string;
  cpuCores: number;
  gpuName: string;
  drives: Array<{ name: string, usedBytes: number, totalBytes: number, percentage: number }>;
  ramAppBytes?: number;
  ramSystemUsedBytes?: number;
  ramSystemTotalBytes?: number;
  storageDrive?: string;
  storageTotal?: number;
  storageUsed?: number;
  storagePercent?: number;
  activeWorkers: number;
  ffmpegStatus: 'HW_ACCELERATED' | 'READY' | 'IDLE';
  yoloEngine: 'YOLOv8-nano (ONNX Runtime Local)' | 'YOLOv8-small';
  yoloInferenceAvgMs: number;
  vpnMesh: {
    provider: 'Tailscale' | 'WireGuard' | 'Cloudflare WARP';
    status: 'Connected' | 'Standby';
    virtualIp: string;
    peers: number;
  };
  reverseProxy: {
    type: 'Nginx' | 'Traefik';
    ssl: boolean;
    domain: string;
    forwardedIp: string;
  };
  dbStats: {
    engine: 'SQLite 3 (WAL Mode)' | 'PostgreSQL 16';
    records: number;
    dbSize: string;
    cacheHitRatio: string;
  };
}

export interface LibraryScanProgress {
  isScanning: boolean;
  stage: 'idle' | 'discovering' | 'exif_parsing' | 'yolo_inference' | 'ffmpeg_transcoding' | 'sqlite_indexing' | 'completed';
  currentFile: string;
  scannedCount: number;
  totalFiles: number;
  percentage: number;
  logMessages: string[];
}
