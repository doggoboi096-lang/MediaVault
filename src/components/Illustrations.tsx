import React from 'react';

/**
 * Flat two-tone illustrations for collection tiles and empty states.
 * Greys carry the shape; the accent blue marks the subject; warm yellow is used once per scene at most.
 */

export type IllustrationName =
  | 'idCard'
  | 'receipt'
  | 'payment'
  | 'note'
  | 'book'
  | 'folder'
  | 'screenshot'
  | 'people'
  | 'places'
  | 'photos'
  | 'favorites'
  | 'albums'
  | 'search'
  | 'trash'
  | 'activity';

const G = { d: '#43474c', m: '#5d6268', l: '#80858c', xl: '#b3b8be', paper: '#dde0e4' };
const A = '#7fa6f5';
const A2 = '#4f73c2';
const W = '#f2b84b';
const R = '#ec7f6d';

const scenes: Record<IllustrationName, React.ReactNode> = {
  idCard: (
    <>
      <rect x="30" y="24" width="104" height="70" rx="8" fill={A} transform="rotate(-6 82 59)" />
      <rect x="26" y="28" width="104" height="70" rx="8" fill={G.m} />
      <rect x="38" y="44" width="28" height="36" rx="4" fill={G.xl} />
      <circle cx="52" cy="57" r="7" fill={G.d} />
      <path d="M40 80c2-9 7-13 12-13s10 4 12 13z" fill={G.d} />
      <rect x="76" y="46" width="42" height="5" rx="2.5" fill={G.xl} />
      <rect x="76" y="58" width="34" height="5" rx="2.5" fill={G.xl} />
      <rect x="76" y="70" width="24" height="5" rx="2.5" fill={A} />
    </>
  ),
  receipt: (
    <>
      <rect x="62" y="14" width="56" height="80" rx="4" fill={A} />
      <path d="M44 20h60v76l-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6z" fill={G.m} />
      <text x="74" y="50" textAnchor="middle" fontSize="22" fontWeight="600" fill={G.paper} fontFamily="Be Vietnam Pro, sans-serif">₫</text>
      <rect x="56" y="60" width="36" height="4" rx="2" fill={G.xl} />
      <rect x="56" y="70" width="28" height="4" rx="2" fill={G.xl} />
      <rect x="56" y="80" width="32" height="4" rx="2" fill={G.xl} />
    </>
  ),
  payment: (
    <>
      <rect x="34" y="30" width="78" height="50" rx="7" fill={G.l} transform="rotate(-10 73 55)" />
      <rect x="50" y="46" width="78" height="50" rx="7" fill={A} />
      <rect x="50" y="56" width="78" height="9" fill={A2} />
      <rect x="60" y="74" width="16" height="11" rx="2" fill={G.paper} />
      <rect x="96" y="80" width="22" height="4" rx="2" fill={G.paper} />
    </>
  ),
  note: (
    <>
      <rect x="52" y="18" width="66" height="78" rx="4" fill={A} transform="rotate(8 85 57)" />
      <rect x="42" y="22" width="66" height="78" rx="4" fill={G.m} transform="rotate(-6 75 61)" />
      <path d="M56 50c6-8 12 8 18 0s12 8 18 0" stroke={G.paper} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M58 68h34M60 80h22" stroke={G.xl} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <rect x="34" y="76" width="92" height="16" rx="3" fill={G.m} />
      <rect x="34" y="76" width="11" height="16" rx="2" fill={A} />
      <rect x="42" y="59" width="80" height="16" rx="3" fill={G.l} />
      <rect x="111" y="59" width="11" height="16" rx="2" fill={A2} />
      <g transform="rotate(-7 80 50)">
        <rect x="38" y="41" width="84" height="16" rx="3" fill={G.m} />
        <rect x="38" y="41" width="11" height="16" rx="2" fill={A} />
        <rect x="56" y="47" width="54" height="3" rx="1.5" fill={G.xl} />
      </g>
    </>
  ),
  folder: (
    <>
      <path d="M30 34a5 5 0 0 1 5-5h26l8 9h55a5 5 0 0 1 5 5v48a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5z" fill={G.m} />
      <rect x="44" y="32" width="70" height="40" rx="3" fill={A} transform="rotate(-4 79 52)" />
      <path d="M30 52a5 5 0 0 1 5-5h89a5 5 0 0 1 5 5v39a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5z" fill={G.l} />
    </>
  ),
  screenshot: (
    <>
      <rect x="58" y="12" width="46" height="90" rx="9" fill={G.d} />
      <rect x="62" y="20" width="38" height="72" rx="3" fill={G.l} />
      <rect x="66" y="26" width="30" height="22" rx="2" fill={A} />
      <path d="M66 48l9-11 6 7 4-4 11 8z" fill={A2} />
      <rect x="66" y="54" width="26" height="4" rx="2" fill={G.xl} />
      <rect x="66" y="63" width="20" height="4" rx="2" fill={G.xl} />
      <path d="M50 30v-8h8M112 30v-8h-8M50 86v8h8M112 86v8h-8" stroke={W} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>
  ),
  people: (
    <>
      <circle cx="98" cy="48" r="14" fill={G.l} />
      <path d="M74 100c0-18 11-28 24-28s24 10 24 28z" fill={G.m} />
      <circle cx="62" cy="42" r="17" fill={G.xl} />
      <path d="M32 100c0-22 13-34 30-34s30 12 30 34z" fill={A} />
    </>
  ),
  places: (
    <>
      <circle cx="118" cy="30" r="11" fill={W} />
      <rect x="34" y="42" width="26" height="56" fill={G.m} />
      <rect x="62" y="28" width="30" height="70" fill={G.l} />
      <rect x="94" y="54" width="24" height="44" fill={G.m} />
      {[36, 48, 60, 72].map(y => (
        <React.Fragment key={y}>
          <rect x="68" y={y} width="6" height="7" fill={G.d} />
          <rect x="80" y={y} width="6" height="7" fill={G.d} />
        </React.Fragment>
      ))}
      <rect x="40" y="50" width="14" height="5" fill={A} />
      <rect x="40" y="62" width="14" height="5" fill={G.d} />
      <circle cx="130" cy="78" r="11" fill={G.l} />
      <rect x="128.5" y="84" width="3" height="14" fill={G.d} />
      <rect x="22" y="98" width="120" height="3" rx="1.5" fill={G.l} />
    </>
  ),
  photos: (
    <>
      <rect x="40" y="22" width="76" height="60" rx="5" fill={G.m} transform="rotate(-8 78 52)" />
      <rect x="46" y="34" width="80" height="62" rx="5" fill={G.xl} />
      <rect x="51" y="39" width="70" height="52" rx="3" fill={A} />
      <circle cx="104" cy="52" r="6" fill={W} />
      <path d="M51 91l22-26 14 15 9-9 25 20z" fill={A2} />
    </>
  ),
  favorites: (
    <>
      <rect x="44" y="28" width="66" height="70" rx="4" fill={G.m} />
      <circle cx="77" cy="56" r="13" fill={G.xl} />
      <path d="M52 98c2-17 12-25 25-25s23 8 25 25z" fill={A} />
      <path d="M112 14l5.4 11 12.1 1.7-8.8 8.5 2.1 12-10.8-5.7-10.8 5.7 2.1-12-8.8-8.5 12.1-1.7z" fill={W} />
    </>
  ),
  albums: (
    <>
      <rect x="20" y="98" width="124" height="3" rx="1.5" fill={G.l} />
      <path d="M38 98c-6 0-9-6-9-12 0-7 5-11 9-11s9 4 9 11c0 6-3 12-9 12z" fill={G.l} />
      <path d="M38 75V56" stroke={G.l} strokeWidth="2" />
      <circle cx="38" cy="50" r="7" fill={R} />
      <rect x="60" y="34" width="14" height="64" rx="1.5" fill={G.d} />
      <rect x="74" y="38" width="26" height="60" rx="1.5" fill={G.xl} />
      <ellipse cx="87" cy="68" rx="7" ry="17" fill="none" stroke={G.l} strokeWidth="2" />
      <rect x="100" y="42" width="12" height="56" rx="1.5" fill={G.m} />
      <rect x="114" y="46" width="12" height="54" rx="1.5" fill={A} transform="rotate(14 120 73)" />
    </>
  ),
  search: (
    <>
      <rect x="34" y="30" width="62" height="50" rx="4" fill={G.m} />
      <path d="M34 80l20-22 12 13 8-7 22 16z" fill={G.l} />
      <circle cx="90" cy="58" r="22" fill="none" stroke={A} strokeWidth="8" />
      <path d="M106 74l18 18" stroke={A} strokeWidth="9" strokeLinecap="round" />
    </>
  ),
  trash: (
    <>
      <rect x="50" y="28" width="60" height="9" rx="4" fill={G.l} />
      <rect x="70" y="20" width="20" height="9" rx="3" fill={G.l} />
      <path d="M54 40h52l-5 58a5 5 0 0 1-5 4.5H64a5 5 0 0 1-5-4.5z" fill={G.m} />
      <path d="M70 52v38M80 52v38M90 52v38" stroke={G.d} strokeWidth="4" strokeLinecap="round" />
      <rect x="96" y="14" width="26" height="20" rx="2" fill={A} transform="rotate(18 109 24)" />
    </>
  ),
  activity: (
    <>
      <rect x="36" y="20" width="88" height="80" rx="8" fill={G.m} />
      {[36, 58, 80].map((y, i) => (
        <React.Fragment key={y}>
          <circle cx="54" cy={y} r="7" fill={i === 0 ? A : G.l} />
          <rect x="68" y={y - 3} width={i === 0 ? 42 : 34} height="6" rx="3" fill={G.xl} />
        </React.Fragment>
      ))}
    </>
  ),
};

export const Illustration: React.FC<{ name: IllustrationName; className?: string }> = ({ name, className }) => (
  <svg viewBox="0 0 160 120" className={className} aria-hidden="true" focusable="false">
    {scenes[name]}
  </svg>
);
