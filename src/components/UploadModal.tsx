import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { MediaItem } from '../types';
import { translations, Lang, fill } from '../lib/i18n';
import { UNAUTHORIZED_EVENT } from '../lib/api';
import { IconButton } from './ui';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newItems: MediaItem[]) => void;
  lang: Lang;
}

type Phase = { kind: 'idle' } | { kind: 'uploading'; percent: number } | { kind: 'done'; added: number; failed: string[] } | { kind: 'error' };

/** XHR instead of fetch so the bar can show real upload progress. */
function uploadWithProgress(form: FormData, onProgress: (percent: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');
    xhr.withCredentials = true;
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`HTTP ${xhr.status}`));
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(form);
  });
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess, lang }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  if (!isOpen) return null;

  const close = () => {
    if (phase.kind === 'uploading') return;
    setPhase({ kind: 'idle' });
    onClose();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const form = new FormData();
    fileList.forEach(file => form.append('files', file));
    // Original modification times, in the same order as the files.
    fileList.forEach(file => form.append('clientDates', String(file.lastModified || Date.now())));

    setPhase({ kind: 'uploading', percent: 0 });
    try {
      const result = await uploadWithProgress(form, percent => setPhase({ kind: 'uploading', percent }));
      const items: MediaItem[] = Array.isArray(result.items) ? result.items.filter(Boolean) : [];
      if (items.length) onUploadSuccess(items);
      const failed: string[] = Array.isArray(result.failed) ? result.failed : [];
      setPhase({ kind: 'done', added: items.length, failed });
      if (!failed.length) {
        setTimeout(() => {
          setPhase({ kind: 'idle' });
          onClose();
        }, 1400);
      }
    } catch (err) {
      console.error('Upload failed', err);
      setPhase({ kind: 'error' });
    }
  };

  return (
    <div id="upload-modal-overlay" className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        className="w-full max-w-lg rounded-3xl bg-panel p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="upload-title" className="text-[22px] text-ink">{t('uploadMediaTitle')}</h2>
            <p className="text-sm text-ink-muted mt-1">{t('uploadDesc')}</p>
          </div>
          <IconButton label={t('close')} onClick={close}>
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        <div className="mt-6">
          {phase.kind === 'idle' || phase.kind === 'error' ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              className={`rounded-2xl border-2 border-dashed px-6 py-10 flex flex-col items-center text-center cursor-pointer transition-colors ${
                isDragging ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-faint bg-tile/40'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,video/*,.heic,.heif"
                onChange={e => e.target.files?.length && handleFiles(e.target.files)}
                className="hidden"
              />
              <span className="w-12 h-12 rounded-full bg-accent-container text-on-accent-container flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </span>
              <p className="text-[15px] text-ink mt-4">{t('dragAndDrop')}</p>
              <p className="text-[13px] text-ink-muted mt-1">{t('supports')}</p>
              {phase.kind === 'error' && (
                <p role="alert" className="text-sm text-[#f2a39a] mt-4">
                  {t('uploadError')}
                </p>
              )}
            </div>
          ) : phase.kind === 'uploading' ? (
            <div className="py-6" aria-live="polite">
              <p className="text-[15px] text-ink">{phase.percent < 100 ? fill(t('uploadProgress'), { p: phase.percent }) : t('uploadReading')}</p>
              <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-[width]" style={{ width: `${phase.percent}%` }} />
              </div>
            </div>
          ) : (
            <div className="py-4" aria-live="polite">
              <p className="flex items-center gap-2 text-[15px] text-ink">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                {fill(t('uploadDone'), { n: phase.added })}
              </p>
              {phase.failed.length > 0 && (
                <p className="flex items-start gap-2 text-sm text-[#f2a39a] mt-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {fill(t('uploadSomeFailed'), { names: phase.failed.join(', ') })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
