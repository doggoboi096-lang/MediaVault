import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, Cpu, Sparkles, Plane, CheckCircle2, Loader2 } from 'lucide-react';
import { IndexingActivity, MediaItem } from '../types';
import { translations, Lang, fill } from '../lib/i18n';
import { Collection, albumCollections, documentCollections, peopleCollections, placeCollections } from '../lib/collections';
import { Chip, CollectionTile, EmptyState, IconButton, PageHeader, PillButton } from './ui';

type T = (key: keyof typeof translations.en) => string;
const useT = (lang: Lang): T => key => translations[lang][key] || key;

const TILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))]';

// ── Albums ──────────────────────────────────────────────────────────────────
type AlbumFilter = 'all' | 'location' | 'subject' | 'filetype';

export const AlbumsView: React.FC<{
  media: MediaItem[];
  lang: Lang;
  onOpen: (c: Collection) => void;
  onUpload: () => void;
}> = ({ media, lang, onOpen, onUpload }) => {
  const t = useT(lang);
  const [filter, setFilter] = useState<AlbumFilter>('all');
  const albums = albumCollections(media, lang);
  const visible = albums.filter(a => filter === 'all' || a.kind === filter);

  // Give each album its own cover where the library allows it.
  const usedCovers = new Set<string>();
  const covers = new Map<string, MediaItem>();
  for (const a of visible) {
    const cover = a.items.find(i => !usedCovers.has(i.id)) || a.items[0];
    if (cover) {
      usedCovers.add(cover.id);
      covers.set(a.id, cover);
    }
  }

  const chips: [AlbumFilter, string][] = [
    ['all', t('all')],
    ['location', t('albumsPlaces')],
    ['subject', t('albumsSubjects')],
    ['filetype', t('albumsFileTypes')],
  ];

  return (
    <>
      <PageHeader title={t('navAlbums')} />
      <div className="px-4 sm:px-6 py-6">
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {chips
              .filter(([f]) => f === 'all' || albums.some(a => a.kind === f))
              .map(([f, label]) => (
                <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
                  {label}
                </Chip>
              ))}
          </div>
        )}
        {visible.length > 0 ? (
          <div className={`${TILE_GRID} gap-x-4 gap-y-6`}>
            {visible.map(a => (
              <CollectionTile
                key={a.id}
                title={a.title}
                count={fill(t('itemsN'), { n: a.items.length })}
                cover={covers.get(a.id)}
                illustration={a.illustration}
                onClick={() => onOpen(a)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            illustration="albums"
            title={t('albumsEmptyTitle')}
            description={t('albumsEmptyDesc')}
            action={<PillButton variant="filled" onClick={onUpload}>{t('uploadPhotos')}</PillButton>}
          />
        )}
      </div>
    </>
  );
};

// ── Documents ───────────────────────────────────────────────────────────────
export const DocumentsView: React.FC<{ media: MediaItem[]; lang: Lang; onOpen: (c: Collection) => void }> = ({
  media,
  lang,
  onOpen,
}) => {
  const t = useT(lang);
  const categories = documentCollections(media, lang);
  return (
    <>
      <PageHeader title={t('navDocuments')} />
      <div className={`${TILE_GRID} gap-1.5 px-4 sm:px-6 py-6`}>
        {categories.map(c => (
          <CollectionTile
            key={c.id}
            title={c.title}
            count={c.items.length ? fill(t('itemsN'), { n: c.items.length }) : undefined}
            illustration={c.illustration}
            onClick={() => onOpen(c)}
            labelInside
          />
        ))}
      </div>
    </>
  );
};

// ── People & pets / Places ──────────────────────────────────────────────────
const CoverGrid: React.FC<{ collections: Collection[]; lang: Lang; onOpen: (c: Collection) => void }> = ({
  collections,
  lang,
  onOpen,
}) => {
  const t = useT(lang);
  return (
    <div className={`${TILE_GRID} gap-1.5 px-4 sm:px-6 py-6`}>
      {collections.map(c => (
        <CollectionTile
          key={c.id}
          title={c.title}
          count={fill(t('itemsN'), { n: c.items.length })}
          cover={c.items[0]}
          illustration={c.illustration}
          onClick={() => onOpen(c)}
          labelInside
        />
      ))}
    </div>
  );
};

export const PeopleView: React.FC<{ media: MediaItem[]; lang: Lang; onOpen: (c: Collection) => void }> = ({
  media,
  lang,
  onOpen,
}) => {
  const t = useT(lang);
  const groups = peopleCollections(media, lang);
  return (
    <>
      <PageHeader title={t('navPeople')} />
      {groups.length ? (
        <CoverGrid collections={groups} lang={lang} onOpen={onOpen} />
      ) : (
        <EmptyState illustration="people" title={t('peopleEmptyTitle')} description={t('peopleEmptyDesc')} />
      )}
    </>
  );
};

export const PlacesView: React.FC<{ media: MediaItem[]; lang: Lang; onOpen: (c: Collection) => void }> = ({
  media,
  lang,
  onOpen,
}) => {
  const t = useT(lang);
  const places = placeCollections(media);
  return (
    <>
      <PageHeader title={t('navPlaces')} />
      {places.length ? (
        <CoverGrid collections={places} lang={lang} onOpen={onOpen} />
      ) : (
        <EmptyState illustration="places" title={t('placesEmptyTitle')} description={t('placesEmptyDesc')} />
      )}
    </>
  );
};

// ── Collection detail (big title page) ──────────────────────────────────────
export const CollectionDetail: React.FC<{
  title: string;
  badge?: string;
  onBack?: () => void;
  lang: Lang;
  children: React.ReactNode;
}> = ({ title, badge, onBack, lang, children }) => {
  const t = useT(lang);
  return (
    <>
      <div className="h-16 px-2 sm:px-3 flex items-center flex-shrink-0">
        {onBack && (
          <IconButton label={t('back')} onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </IconButton>
        )}
      </div>
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <h1 className="text-[34px] sm:text-[52px] leading-[1.15] font-light text-ink tracking-tight">{title}</h1>
        {badge && <span className="inline-block mt-4 px-2.5 py-1 rounded-md bg-tile text-[13px] text-ink">{badge}</span>}
      </div>
      {children}
    </>
  );
};

// ── Activity ────────────────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, React.ElementType> = { Upload, FileText, Cpu, Sparkles, Plane };

export const ActivityView: React.FC<{ activities: IndexingActivity[]; lang: Lang }> = ({ activities, lang }) => {
  const t = useT(lang);
  return (
    <>
      <PageHeader title={t('navActivity')} />
      {activities.length ? (
        <ul className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-4">
          {activities.map(act => {
            const Icon = ACTIVITY_ICONS[act.icon] || Sparkles;
            return (
              <li key={act.id} className="flex items-start gap-4 py-4 border-b border-line last:border-0">
                <span className="w-10 h-10 rounded-full bg-tile flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-ink">{act.title}</p>
                  <p className="text-sm text-ink-muted mt-0.5">{act.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-ink-muted flex-shrink-0 pt-0.5">
                  {act.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  )}
                  <span>{act.timeAgo}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState illustration="activity" title={t('activityEmptyTitle')} description={t('activityEmptyDesc')} />
      )}
    </>
  );
};
