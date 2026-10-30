import React, { useEffect, useState } from 'react';
import { ChevronDown, Folder, Check } from 'lucide-react';
import { QueueProgress, SystemHardwareStatus } from '../types';
import { translations, Lang, fill, formatBytes } from '../lib/i18n';
import { PageHeader, PillButton, TextButton } from './ui';
import { apiFetch } from '../lib/api';

interface SettingsViewProps {
  hwStatus: SystemHardwareStatus;
  currentLibraryPath: string;
  onUpdateLibraryPath: (path: string) => void;
  onTriggerScan: () => void;
  onOpenProjectInfo: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Row to open on arrival, e.g. 'hardware' from the sidebar's "Manage storage". */
  initialOpen?: RowId;
  /** Live AI queue counters from /api/events. */
  queue: QueueProgress | null;
}

interface AiQueueSettings {
  autoTag: boolean;
  onlyOnAc: boolean;
  paused: boolean;
}

type RowId = 'language' | 'ai' | 'media' | 'network' | 'database' | 'hardware';

interface AiStatus {
  stage: 'idle' | 'downloading' | 'starting' | 'ready' | 'error';
  message: string;
  progress: number;
}

const KV: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-6 py-2.5 text-sm">
    <span className="text-ink-muted">{label}</span>
    <span className="text-ink text-right">{children}</span>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block py-2">
    <span className="block text-sm text-ink-muted mb-2">{label}</span>
    {children}
  </label>
);

/** Expandable settings row; kept outside SettingsView so its inputs don't remount on every render. */
const Row: React.FC<{
  id: RowId;
  open: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, open, onToggle, title, description, aside, children }) => (
  <section id={`settings-${id}`} className="border-t border-line">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center gap-4 py-6 text-left cursor-pointer group"
    >
      <div className="flex-1 min-w-0">
        <h2 className="text-[17px] text-ink">{title}</h2>
        <p className="text-sm text-ink-muted mt-1 leading-relaxed">{description}</p>
      </div>
      {aside}
      <span className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted group-hover:bg-tile-hover flex-shrink-0">
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {open && <div className="pb-6 -mt-2 sm:pr-14">{children}</div>}
  </section>
);

/** On/off setting with its own label and description. */
const SwitchRow: React.FC<{ label: string; description: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <div className="flex items-center gap-4 py-3">
    <div className="flex-1 min-w-0">
      <p className="text-[15px] text-ink">{label}</p>
      <p className="text-sm text-ink-muted mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-[52px] h-8 rounded-full flex-shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
        checked ? 'bg-accent' : 'bg-tile border-2 border-ink-faint'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${
          checked ? 'left-[24px] w-6 h-6 bg-on-accent' : 'left-[6px] w-4 h-4 bg-ink-muted'
        }`}
      />
    </button>
  </div>
);

const selectClass =
  'w-full h-11 rounded-lg bg-tile border border-line px-3 text-sm text-ink outline-none focus:border-accent cursor-pointer';

export const SettingsView: React.FC<SettingsViewProps> = ({
  hwStatus,
  currentLibraryPath,
  onUpdateLibraryPath,
  onTriggerScan,
  onOpenProjectInfo,
  lang,
  setLang,
  initialOpen,
  queue,
}) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;
  const [libraryInput, setLibraryInput] = useState(currentLibraryPath);
  const [isSaved, setIsSaved] = useState(false);
  const [hwEngine, setHwEngine] = useState<string>(hwStatus.hwAccelEngine);
  const [confidence, setConfidence] = useState<number>(65);
  const [vpnMesh, setVpnMesh] = useState<string>(hwStatus.vpnMesh.provider);
  const [openRows, setOpenRows] = useState<RowId[]>(initialOpen ? [initialOpen] : []);
  const [ai, setAi] = useState<AiStatus | null>(null);

  useEffect(() => {
    if (initialOpen) setOpenRows(rows => (rows.includes(initialOpen) ? rows : [...rows, initialOpen]));
  }, [initialOpen]);

  // Live local-AI runtime status (part of the authenticated /api/system response)
  useEffect(() => {
    let alive = true;
    const poll = () =>
      apiFetch('/api/system')
        .then(r => r.json())
        .then(d => alive && setAi(d.data?.ai || null))
        .catch(() => alive && setAi(null));
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Background tagging controls
  const [aiSettings, setAiSettings] = useState<AiQueueSettings | null>(null);
  const [onAcPower, setOnAcPower] = useState<boolean | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/settings/ai')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        setAiSettings(d.settings);
        setOnAcPower(d.onAcPower);
      })
      .catch(() => {});
  }, []);

  const changeAiSetting = async (patch: Partial<AiQueueSettings>) => {
    if (!aiSettings) return;
    setAiSettings({ ...aiSettings, ...patch });
    setSavingSetting(true);
    try {
      const d = await (await apiFetch('/api/settings/ai', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })).json();
      if (d.success) {
        setAiSettings(d.settings);
        setOnAcPower(d.onAcPower);
      }
    } finally {
      setSavingSetting(false);
    }
  };

  const runBackfill = async () => {
    const d = await (await apiFetch('/api/queue/backfill', { method: 'POST' })).json();
    if (d.success) setBackfillMsg(fill(t('aiBackfillQueued'), { n: d.queued }));
  };

  const toggle = (id: RowId) => setOpenRows(rows => (rows.includes(id) ? rows.filter(r => r !== id) : [...rows, id]));

  const saveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLibraryPath(libraryInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const aiLabel = !ai
    ? t('aiStatusUnknown')
    : ai.stage === 'ready'
      ? t('aiStatusReady')
      : ai.stage === 'downloading'
        ? fill(t('aiStatusDownloading'), { p: ai.progress })
        : ai.stage === 'error'
          ? t('aiStatusError')
          : t('aiStatusStarting');
  const aiDot = ai?.stage === 'ready' ? 'bg-[#7ed3a4]' : ai?.stage === 'error' ? 'bg-[#f2a39a]' : 'bg-[#f2b84b]';

  const watcherStatus = t('activeLatency').toLowerCase();
  const rowProps = (id: RowId) => ({ id, open: openRows.includes(id), onToggle: () => toggle(id) });

  return (
    <>
      <PageHeader title={t('settingsTitle')} />
      <div id="settings-container" className="max-w-[880px] w-full mx-auto px-6 py-8">
        {/* Library folder */}
        <form onSubmit={saveFolder} className="pb-8">
          <h2 className="text-sm font-medium text-ink">{t('libraryFolder')}</h2>
          <p className="text-sm text-ink-muted mt-1">{t('libraryFolderDesc')}</p>
          <div className="mt-4 h-12 rounded-lg border border-ink-faint focus-within:border-accent flex items-center gap-3 px-4 transition-colors">
            <Folder className="w-5 h-5 text-ink-muted flex-shrink-0" />
            <input
              type="text"
              value={libraryInput}
              onChange={e => setLibraryInput(e.target.value)}
              aria-label={t('libraryFolder')}
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-ink outline-none"
            />
          </div>
          <p className="text-[13px] text-ink-muted mt-2">
            {t('dirWatcher')}: {watcherStatus.charAt(0).toUpperCase() + watcherStatus.slice(1)}
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <PillButton type="submit" variant="filled">
              <span className="flex items-center gap-2">
                {isSaved && <Check className="w-4 h-4" />}
                {isSaved ? t('saved') : t('saveFolder')}
              </span>
            </PillButton>
            <PillButton onClick={onTriggerScan}>{t('rescanFolder')}</PillButton>
          </div>
        </form>

        <Row {...rowProps('language')} title={t('languageRow')} description={t('languageDesc')}>
          <div role="radiogroup" aria-label={t('languageRow')} className="space-y-1">
            {(
              [
                ['vi', 'Tiếng Việt'],
                ['en', 'English'],
              ] as [Lang, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-4 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="lang"
                  checked={lang === value}
                  onChange={() => setLang(value)}
                  className="w-5 h-5 accent-[#a8c3ff] cursor-pointer"
                />
                <span className="text-[15px] text-ink">{label}</span>
              </label>
            ))}
          </div>
        </Row>

        <Row
          {...rowProps('ai')}
          title={t('aiRow')}
          description={t('aiRowDesc')}
          aside={
            <span className="hidden sm:flex items-center gap-2 text-sm text-ink-muted flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${aiDot}`} />
              {aiLabel}
            </span>
          }
        >
          {aiSettings && (
            <div className="pb-3 mb-2 border-b border-line">
              <SwitchRow
                label={t('aiAutoTag')}
                description={t('aiAutoTagDesc')}
                checked={aiSettings.autoTag}
                disabled={savingSetting}
                onChange={v => changeAiSetting({ autoTag: v })}
              />
              <SwitchRow
                label={t('aiOnlyOnAc')}
                description={t('aiOnlyOnAcDesc')}
                checked={aiSettings.onlyOnAc}
                disabled={savingSetting}
                onChange={v => changeAiSetting({ onlyOnAc: v })}
              />
              <SwitchRow
                label={t('aiPause')}
                description={t('aiPauseDesc')}
                checked={aiSettings.paused}
                disabled={savingSetting}
                onChange={v => changeAiSetting({ paused: v })}
              />
            </div>
          )}
          {queue && (
            <KV label={t('aiQueueLabel')}>
              {fill(t('aiQueueValue'), { pending: queue.pending, processing: queue.processing, failed: queue.failed })}
            </KV>
          )}
          {onAcPower !== null && <KV label={t('aiPowerLabel')}>{onAcPower ? t('powerAc') : t('powerBattery')}</KV>}
          <div className="py-3 flex flex-wrap items-center gap-3">
            <PillButton onClick={runBackfill}>
              {queue?.unqueued ? fill(t('aiBackfill'), { n: queue.unqueued }) : t('aiBackfillNone')}
            </PillButton>
            {backfillMsg && (
              <span className="text-sm text-ink-muted" role="status">
                {backfillMsg}
              </span>
            )}
          </div>
          <KV label={t('aiStatus')}>{ai?.message || aiLabel}</KV>
          <KV label={t('modelArch')}>Qwen3-VL 4B (llama.cpp)</KV>
          <KV label={t('ocrPipeline')}>Qwen3-VL Native OCR</KV>
          <KV label={t('avgLatency')}>{hwStatus.yoloInferenceAvgMs} ms / frame</KV>
          <Field label={`${t('confidenceCutoff')}: ${confidence}%`}>
            <input
              type="range"
              min="40"
              max="95"
              value={confidence}
              onChange={e => setConfidence(Number(e.target.value))}
              className="w-full accent-[#a8c3ff] cursor-pointer"
            />
          </Field>
        </Row>

        <Row {...rowProps('media')} title={t('mediaProcessing')} description={t('mediaProcessingDesc')}>
          <Field label={t('hwAccelEngine')}>
            <select value={hwEngine} onChange={e => setHwEngine(e.target.value)} className={selectClass}>
              <option value="NVIDIA NVENC (CUDA 12.4)">NVIDIA NVENC (CUDA 12.4)</option>
              <option value="Intel QuickSync (VAAPI)">Intel QuickSync (VAAPI / QSV)</option>
              <option value="Apple VideoToolbox">Apple VideoToolbox (M-Series)</option>
              <option value="CPU (libx265)">CPU (libx264 / libx265)</option>
            </select>
          </Field>
          <KV label={t('processorThreads')}>
            {hwStatus.cpuCores} threads, {hwStatus.cpuModel}
          </KV>
          <KV label={t('thumbnailCache')}>{t('webpOnthefly')}</KV>
        </Row>

        <Row {...rowProps('network')} title={t('meshVpnProxy')} description={t('meshVpnDesc')}>
          <Field label={t('vpnMeshLabel')}>
            <select value={vpnMesh} onChange={e => setVpnMesh(e.target.value)} className={selectClass}>
              <option value="Tailscale">Tailscale (node 100.84.192.42)</option>
              <option value="WireGuard">WireGuard (direct peer 51820)</option>
              <option value="Cloudflare WARP">Cloudflare WARP tunnel</option>
            </select>
          </Field>
          <KV label={t('reverseProxy')}>Nginx 1.25 (HTTP/3 QUIC)</KV>
          <KV label={t('sslCert')}>Let's Encrypt, auto-renewal</KV>
          <KV label={t('lanOrigin')}>192.168.1.105:3000</KV>
        </Row>

        <Row
          {...rowProps('database')}
          title={t('dbEngineMetrics')}
          description={t('dbEngineDesc')}
          aside={<span className="hidden sm:inline text-sm text-ink-muted flex-shrink-0">{t('simulatedJson')}</span>}
        >
          <KV label={t('totalRecordsLabel')}>{hwStatus.dbStats.records.toLocaleString()}</KV>
          <KV label={t('dbSizeLabel')}>{hwStatus.dbStats.dbSize}</KV>
          <KV label={t('cacheHitLabel')}>{hwStatus.dbStats.cacheHitRatio}</KV>
          <KV label={t('ramCacheLabel')}>256 MB</KV>
          <KV label="WAL">{t('dbHealthy')}</KV>
        </Row>

        <Row {...rowProps('hardware')} title={t('hardwareRow')} description={t('hardwareDesc')}>
          <KV label="CPU">
            {hwStatus.cpuModel} ({hwStatus.cpuCores} threads)
          </KV>
          <KV label="GPU">{hwStatus.gpuName || hwStatus.gpuModel}</KV>
          <KV label={t('hwAccelEngine')}>{hwStatus.hwAccelEngine}</KV>
          {hwStatus.drives?.length > 0 && (
            <div className="pt-3">
              <span className="block text-sm text-ink-muted mb-3">{t('drivesLabel')}</span>
              <div className="space-y-4">
                {hwStatus.drives.map(d => (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink">{d.name}</span>
                      <span className="text-ink-muted">
                        {fill(t('storageUsedOf'), { used: formatBytes(d.usedBytes), total: formatBytes(d.totalBytes) })}
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(d.percentage || 0, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Row>

        <section className="border-t border-line flex items-center gap-4 py-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] text-ink">{t('projectInfoForJudges')}</h2>
            <p className="text-sm text-ink-muted mt-1">{t('projectInfoDesc')}</p>
          </div>
          <TextButton onClick={onOpenProjectInfo}>{t('view')}</TextButton>
        </section>
      </div>
    </>
  );
};
