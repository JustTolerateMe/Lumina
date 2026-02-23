import { useState } from 'react';
import { Clock, Trash2, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { HistoryEntry } from '../../types';

interface Props {
  entries: HistoryEntry[];
  loading: boolean;
  onClear: () => void;
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function modeLabel(mode: string): string {
  return mode
    .replace('home-', '')
    .replace('hardlines-', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GenerationHistory({ entries, loading, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors relative"
        title="Generation History"
      >
        <Clock size={16} className="text-zinc-400" />
        {entries.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full text-[9px] font-bold flex items-center justify-center">
            {entries.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[560px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold">Generation History</h2>
            <span className="text-[10px] text-zinc-500">({entries.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={onClear}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 size={10} />
                Clear All
              </button>
            )}
            <button onClick={() => { setOpen(false); setSelected(null); }} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && <p className="text-zinc-500 text-sm text-center py-8">Loading...</p>}
          {!loading && entries.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No generations yet</p>
          )}

          {!selected ? (
            <div className="grid grid-cols-3 gap-2">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="bg-zinc-800 rounded-lg overflow-hidden hover:ring-1 hover:ring-violet-500/50 transition-all text-left"
                >
                  {entry.thumbnailBase64 ? (
                    <img
                      src={`data:${entry.thumbnailMime};base64,${entry.thumbnailBase64}`}
                      alt=""
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-zinc-700 flex items-center justify-center">
                      <Clock size={20} className="text-zinc-500" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-[10px] font-medium text-zinc-300 truncate">{modeLabel(entry.mode)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-zinc-500">{relativeTime(entry.timestamp)}</span>
                      {entry.compositeScore != null && (
                        <span className={`text-[9px] font-bold ${
                          entry.compositeScore >= 80 ? 'text-green-400' :
                          entry.compositeScore >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {entry.compositeScore}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-violet-400 hover:text-violet-300 mb-2"
              >
                Back to list
              </button>
              <div className="flex gap-3">
                {selected.thumbnailBase64 && (
                  <img
                    src={`data:${selected.thumbnailMime};base64,${selected.thumbnailBase64}`}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{modeLabel(selected.mode)}</p>
                  <p className="text-[10px] text-zinc-500">{selected.category} · {relativeTime(selected.timestamp)}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{selected.requestSummary.colorDescription}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selected.compositeScore != null && (
                      <span className={`text-sm font-bold ${
                        selected.compositeScore >= 80 ? 'text-green-400' :
                        selected.compositeScore >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        Score: {selected.compositeScore}
                      </span>
                    )}
                    {selected.pass != null && (
                      <span className="flex items-center gap-1">
                        {selected.pass
                          ? <ShieldCheck size={12} className="text-green-400" />
                          : <ShieldAlert size={12} className="text-red-400" />}
                        <span className={`text-[10px] font-semibold ${selected.pass ? 'text-green-400' : 'text-red-400'}`}>
                          {selected.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </span>
                    )}
                    {selected.iterationCount > 1 && (
                      <span className="text-[10px] text-amber-500">{selected.iterationCount} iterations</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scores */}
              {selected.qcScores && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">QC Scores</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {Object.entries(selected.qcScores).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px]">
                        <span className="text-zinc-400">{k}</span>
                        <span className="text-zinc-300 font-mono">{v as number}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {selected.issues && selected.issues.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Issues</p>
                  <ul className="space-y-0.5">
                    {selected.issues.map((issue, i) => (
                      <li key={i} className="text-[10px] text-zinc-400">- {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Profile */}
              {selected.riskProfile && selected.riskProfile.flags.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Risk Flags</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.riskProfile.flags.map((f) => (
                      <span key={f} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
