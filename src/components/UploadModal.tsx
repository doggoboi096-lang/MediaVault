import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Sparkles, Film, Image as ImageIcon, FileText, Loader2, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MediaItem } from '../types';
import { translations, Lang } from '../lib/i18n';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newItems: MediaItem[]) => void;
  lang: Lang;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  lang
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      const messages = [
        '[SYS] Initiating secure upload...',
        '[SYS] Extracting EXIF metadata...',
        '[AI] Spawning vision pipeline...',
        '[AI] Running multimodal inference...'
      ];
      let msgIndex = 0;
      setTerminalLines([]);
      interval = setInterval(() => {
        if (msgIndex < messages.length) {
          setTerminalLines(prev => [...prev, messages[msgIndex]]);
          msgIndex++;
        }
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  if (!isOpen) return null;

  const handleFileProcess = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStep(`Uploading & AI analyzing ${fileList.length} files...`);

    const formData = new FormData();
    const clientDates: number[] = [];
    
    fileList.forEach(file => {
      formData.append('files', file);
      clientDates.push(file.lastModified || Date.now());
    });
    
    clientDates.forEach(date => {
      formData.append('clientDates', date.toString());
    });

    try {
      const response = await fetch('/api/analyze-media', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setUploadProgress(90);

      if (result._tempLogs && Array.isArray(result._tempLogs)) {
        setTerminalLines(prev => [...prev, ...result._tempLogs]);
      }

      if (result.success && result.items && Array.isArray(result.items)) {
        onUploadSuccess(result.items);
      } else if (result.id && result.filename) {
        onUploadSuccess([result]);
      }
    } catch (err) {
      console.error(`Bulk upload error:`, err);
    }

    setUploadProgress(100);
    setUploadStep('Upload & AI processing complete!');

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    setTimeout(() => {
      setIsUploading(false);
      onClose();
    }, 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files);
    }
  };

  return (
    <div
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono">{t('uploadMediaTitle')}</h3>
              <p className="text-[11px] text-zinc-400">{t('uploadDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="py-4">
          {!isUploading ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isDragging
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-zinc-700 hover:border-emerald-500/60 bg-zinc-950'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files);
                  }
                }}
                className="hidden"
              />

              <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-2.5">
                <Upload className="w-5 h-5" />
              </div>

              <h4 className="text-xs font-semibold text-zinc-200">
                {t('dragAndDrop')}
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs font-mono">
                {t('supports')}
              </p>

              <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  {t('yoloInference')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-sky-400">
                  <Film className="w-3 h-3" />
                  {t('hwTranscoding')}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#0C0C0C] font-mono text-[13px] text-gray-300 p-4 rounded text-left overflow-y-auto h-40 w-full">
              <div>
                <span className="text-green-500">user@DESKTOP-9K3BEP7</span>:<span className="text-blue-400">/mnt/c/Users/user/Desktop/mediavault</span>$ Attempting AI analysis with model: gemini-3.7-flash
              </div>
              {terminalLines.map((line, idx) => (
                <div key={idx} className="mt-1">{line}</div>
              ))}
              <div className="mt-1">
                <span className="text-green-500">user@DESKTOP-9K3BEP7</span>:<span className="text-blue-400">/mnt/c/Users/user/Desktop/mediavault</span>$
                <div className="w-2 h-4 bg-gray-300 animate-pulse inline-block align-middle ml-1" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
