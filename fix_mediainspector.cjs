const fs = require('fs');
let content = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');

// The file currently has:
// export const MediaInspector: React.FC<MediaInspectorProps> = (props) => {
//   const { item, onBack, onPrev, onNext, onToggleFavorite, onAddTag, onDelete, lang } = props;
//   item,
//   onBack,
//   ...
//   lang
// }) => {

// Let's replace from export const... to }) => {

const regex = /export const MediaInspector[\s\S]*?\}\) => \{/;
content = content.replace(regex, `export const MediaInspector: React.FC<MediaInspectorProps> = ({
  item,
  onBack,
  onPrev,
  onNext,
  onToggleFavorite,
  onAddTag,
  onDelete,
  lang
}) => {`);

fs.writeFileSync('src/components/MediaInspector.tsx', content);
