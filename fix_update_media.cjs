const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
const handleUpdateMedia = `
  const handleUpdateMedia = (updatedItem: MediaItem) => {
    setMediaList(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    setSelectedMedia(updatedItem);
  };
`;
app = app.replace("const handleAddTag = (id: string, newTag: string) => {", handleUpdateMedia + "\n  const handleAddTag = (id: string, newTag: string) => {");

app = app.replace(
  "onDelete={handleDeleteMedia}\n          lang={lang}\n        />",
  "onDelete={handleDeleteMedia}\n          onUpdateMedia={handleUpdateMedia}\n          lang={lang}\n        />"
);
fs.writeFileSync('src/App.tsx', app);

let mi = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');
mi = mi.replace("onDelete?: (id: string, filename: string) => void;", "onDelete?: (id: string, filename: string) => void;\n  onUpdateMedia?: (item: MediaItem) => void;");
mi = mi.replace("onDelete,\n  lang\n})", "onDelete,\n  onUpdateMedia,\n  lang\n})");

const oldSave = `                      <button 
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
                        }}`;

const newSave = `                      <button 
                        onClick={() => {
                          const newDateTime = \`\${editDateValue} \${editTimeValue}\`;
                          const updated = {
                            ...localItem,
                            date: editDateValue,
                            dateFormatted: new Date(editDateValue).toLocaleDateString(),
                            exif: {
                              ...localItem.exif,
                              dateTaken: newDateTime
                            }
                          };
                          setLocalItem(updated);
                          if (onUpdateMedia) onUpdateMedia(updated);
                          setIsEditingDate(false);
                        }}`;
mi = mi.replace(oldSave, newSave);

fs.writeFileSync('src/components/MediaInspector.tsx', mi);
