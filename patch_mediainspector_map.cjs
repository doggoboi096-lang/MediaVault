const fs = require('fs');

let content = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');

const targetMapCode = `<div className="h-28 w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                    <svg className="w-full h-full opacity-20 absolute inset-0" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="mapgrid-dense" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10b981" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mapgrid-dense)" />
                      <circle cx="50%" cy="50%" r="35" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx="50%" cy="50%" r="15" fill="none" stroke="#10b981" strokeWidth="1" />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-900 shadow relative z-10" />
                    </div>
                  </div>`;

const newMapCode = `{localItem.location.latitude && localItem.location.longitude ? (
                    <div className="h-28 w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                      <iframe
                        src={\`https://maps.google.com/maps?q=\${localItem.location.latitude},\${localItem.location.longitude}&z=15&output=embed\`}
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                      <svg className="w-full h-full opacity-20 absolute inset-0" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="mapgrid-dense" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10b981" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#mapgrid-dense)" />
                        <circle cx="50%" cy="50%" r="35" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx="50%" cy="50%" r="15" fill="none" stroke="#10b981" strokeWidth="1" />
                      </svg>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-900 shadow relative z-10" />
                      </div>
                    </div>
                  )}`;

content = content.replace(targetMapCode, newMapCode);
fs.writeFileSync('src/components/MediaInspector.tsx', content);
