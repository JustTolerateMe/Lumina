import { Download, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { GenerationState } from '../../types';
import { downloadImage } from '../../services/imageUtils';
import { FidelityPanel } from './FidelityPanel';

interface Props {
  state: GenerationState;
  onReset: () => void;
}

export function GenerationCanvas({ state, onReset }: Props) {

  function handleDownload() {
    if (!state.result) return;
    downloadImage(
      state.result.imageBase64,
      state.result.mimeType,
      `lumina-${state.result.request.mode}-${state.result.id.slice(0, 8)}.png`
    );
  }

  // Idle state
  if (state.status === 'idle') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center
            justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">Your generation will appear here</p>
          <p className="text-zinc-600 text-sm mt-1">Upload a product photo and click Generate</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.status === 'generating' || state.status === 'analyzing' || state.status === 'checking') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-violet-600
            border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-zinc-300 font-medium">{state.progress ?? 'Generating...'}</p>
          <p className="text-zinc-500 text-sm mt-1">This takes 10-30 seconds</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 font-medium mb-2">Generation failed</p>
          <p className="text-zinc-500 text-sm mb-4">{state.error}</p>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg
              text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Result
  if (state.status === 'done' && state.result) {
    const r = state.result;
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <p className="text-sm text-zinc-400">
            {r.request.mode} · {r.request.aspectRatio}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg
                text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              New
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg
                text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Download size={13} />
              Download
            </button>
          </div>
        </div>

        {/* Safety Valve Warning */}
        {r.validationWarning && (
          <div className={`px-4 py-2 flex items-center gap-3 border-b border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-300
            ${r.validationWarning.severity === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-xs font-medium leading-relaxed">
              {r.validationWarning.message}
            </p>
          </div>
        )}

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <img
            src={`data:${r.mimeType};base64,${r.imageBase64}`}
            alt="Generated product photo"
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          />
        </div>

        {/* Fidelity Panel */}
        {r.qcScores && (
          <FidelityPanel
            semanticScores={r.qcScores}
            pixelScores={r.pixelQCScores}
            compositeScore={r.compositeScore}
            pass={r.qcPass}
            issues={r.qcIssues}
            riskProfile={r.riskProfile}
            iterationCount={r.iterationCount}
            mode={r.request.mode}
          />
        )}
      </div>
    );
  }

  return null;
}
