import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
          <Sparkles size={18} className="text-violet-400" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-zinc-100">
          Lumina
        </span>
        <span className="text-xs text-zinc-500 font-medium ml-1">AI Product Photography</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-600">Powered by Gemini</span>
      </div>
    </header>
  );
}
