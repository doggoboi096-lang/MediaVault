const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

const targetBtn = `<button
            id="nav-settings"`;
const newBtn = `<button
            id="nav-trash"
            onClick={() => onViewChange('trash')}
            className={\`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors \${
              currentView === 'trash'
                ? 'bg-zinc-800 text-red-400 font-semibold'
                : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
            }\`}
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Recently Deleted</span>
          </button>
          <button
            id="nav-settings"`;

content = content.replace(targetBtn, newBtn);
fs.writeFileSync('src/components/Sidebar.tsx', content);
