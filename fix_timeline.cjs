const fs = require('fs');
let content = fs.readFileSync('src/components/TimelineView.tsx', 'utf-8');

const regex = /export const TimelineView: React\.FC<TimelineViewProps> = \(\{[\s\S]*?lang\n\}\) => \{/;
content = content.replace(regex, `export const TimelineView: React.FC<TimelineViewProps> = ({
  media,
  onSelectMedia,
  onToggleFavorite,
  hwStatus,
  lang,
  currentView,
  onTrash,
  onRestore,
  onPermanentDelete
}) => {`);

fs.writeFileSync('src/components/TimelineView.tsx', content);
