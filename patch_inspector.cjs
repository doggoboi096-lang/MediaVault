const fs = require('fs');

let content = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');

// Add lucide icons if needed
if (!content.includes('RotateCcw')) {
  content = content.replace('Trash2,', 'Trash2,\n  RotateCcw,\n  AlertTriangle,');
}

// Add props
content = content.replace(
  'onDelete?: (id: string, filename: string) => void;',
  'onDelete?: (id: string, filename: string) => void;\n  onRestore?: (id: string, filename: string) => void;\n  onPermanentDelete?: (id: string, filename: string) => void;'
);

content = content.replace(
  '  onDelete,\n  onUpdateMedia,',
  '  onDelete,\n  onRestore,\n  onPermanentDelete,\n  onUpdateMedia,'
);

// Replace delete button
const deleteBtn = `{onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this item?')) {
                  onDelete(localItem.id, localItem.filename);
                }
              }}
              className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-2"
              title="Delete Media"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}`;

const newButtons = `          {localItem.isDeleted ? (
            <>
              {onRestore && (
                <button
                  onClick={() => {
                    onRestore(localItem.id, localItem.filename);
                  }}
                  className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors ml-2 flex items-center gap-1.5 px-2.5"
                  title="Restore Media"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-medium">Restore</span>
                </button>
              )}
              {onPermanentDelete && (
                <button
                  onClick={() => {
                    if (window.confirm('Permanently delete this item? This cannot be undone.')) {
                      onPermanentDelete(localItem.id, localItem.filename);
                    }
                  }}
                  className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-2 flex items-center gap-1.5 px-2.5"
                  title="Delete Permanently"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">Delete Forever</span>
                </button>
              )}
            </>
          ) : (
            onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to send this item to Trash?')) {
                    onDelete(localItem.id, localItem.filename);
                  }
                }}
                className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-2"
                title="Send to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}`;

content = content.replace(deleteBtn, newButtons);

fs.writeFileSync('src/components/MediaInspector.tsx', content);
