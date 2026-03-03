import { Sparkles } from 'lucide-react';
import { ReactNode, useState, useEffect } from 'react';
import { ChangelogModal } from '../ui/ChangelogModal';
import { changelogData } from '../../data/changelog';

interface Props {
  children?: ReactNode;
}

export function Header({ children }: Props) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);
  const latestVersion = changelogData[0]?.version || '1.0.0';

  useEffect(() => {
    const lastSeen = localStorage.getItem('lumina_last_seen_version');
    if (lastSeen !== latestVersion) {
      setHasUnseen(true);
    }
  }, [latestVersion]);

  const openChangelog = () => {
    setShowChangelog(true);
    setHasUnseen(false);
    localStorage.setItem('lumina_last_seen_version', latestVersion);
  };

  return (
    <>
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Sparkles size={18} className="text-violet-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-100">
            Lumina
          </span>
          <span className="text-xs text-zinc-500 font-medium ml-1">AI Product Photography</span>

          <div className="w-px h-4 bg-zinc-800 mx-2" />

          <button
            onClick={openChangelog}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors relative"
          >
            v{latestVersion}
            {hasUnseen && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)] animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {children}
          <span className="text-xs text-zinc-600">Powered by Gemini</span>
        </div>
      </header>

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </>
  );
}
