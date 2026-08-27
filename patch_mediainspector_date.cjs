const fs = require('fs');
let content = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');

const importReplacement = `  FileText,
  Cpu,
  Layers,
  X,
  Trash2,
  Edit2,
  Save`;
content = content.replace(`  FileText, 
  Cpu, 
  Layers,
  X,
  Trash2`, importReplacement);

const stateReplacement = `  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editTimeValue, setEditTimeValue] = useState<string>('');
  
  // To update MediaItem in memory without propagating completely to backend for now, or calling a prop
  // Wait, "Add a save button that updates the MediaItem state". We don't have onUpdateMedia prop yet, let's just update local state or add it.
  const [localItem, setLocalItem] = useState(item);
  
  // sync localItem if item changes
  React.useEffect(() => {
    setLocalItem(item);
  }, [item]);
`;

content = content.replace("  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);", stateReplacement);

// Need to update all uses of `item` to `localItem` in the rendering part? 
// No, I can just replace `item.exif?.camera` with `localItem.exif?.camera` or replace all `item.` with `localItem.`?
// It's easier to just do `const displayItem = localItem;` and use `displayItem`.
// Actually, let's just replace `item.` with `localItem.` where it makes sense, but `item.` is used a lot.
content = content.replace(/item\./g, "localItem.");
// But wait, the destructuring `const { item } = props` is still there. So `localItem` shouldn't clash.

const editDateUi = `
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Date & Time</span>
                  {isEditingDate ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="date" 
                        value={editDateValue} 
                        onChange={e => setEditDateValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px]"
                      />
                      <input 
                        type="time" 
                        step="1"
                        value={editTimeValue} 
                        onChange={e => setEditTimeValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px]"
                      />
                      <button 
                        onClick={() => {
                          const newDateTime = \`\${editDateValue} \${editTimeValue}\`;
                          setLocalItem(prev => ({
                            ...prev,
                            date: editDateValue,
                            dateFormatted: new Date(editDateValue).toLocaleDateString(),
                            exif: {
                              ...prev.exif,
                              dateTaken: newDateTime
                            }
                          }));
                          setIsEditingDate(false);
                        }}
                        className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setIsEditingDate(false)}
                        className="p-1 hover:bg-zinc-700 text-zinc-400 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/edit">
                      <span className="text-zinc-300 font-mono">{localItem.exif?.dateTaken || localItem.date}</span>
                      <button 
                        onClick={() => {
                          const dt = localItem.exif?.dateTaken || localItem.date || '';
                          const [d, t] = dt.split(' ');
                          setEditDateValue(d || '');
                          setEditTimeValue(t || '00:00:00');
                          setIsEditingDate(true);
                        }}
                        className="opacity-0 group-hover/edit:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                        title="Edit Date/Time"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
`;

// Insert after EXIF & Media Info
content = content.replace(
  `<div className="space-y-1.5 text-xs">`,
  `<div className="space-y-1.5 text-xs">\n${editDateUi}`
);

// We need to fix the `item.` replacements that were wrong (like props destructuring)
content = content.replace("export const MediaInspector: React.FC<MediaInspectorProps> = ({", "export const MediaInspector: React.FC<MediaInspectorProps> = (props) => {\n  const { item, onBack, onPrev, onNext, onToggleFavorite, onAddTag, onDelete, lang } = props;");
content = content.replace("  localItem,\n  onBack,", ""); // remove the destructured localItem if it was replaced

fs.writeFileSync('src/components/MediaInspector.tsx', content);
