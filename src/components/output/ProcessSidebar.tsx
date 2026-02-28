import { GenerationState } from '../../types';
import { Bot, CheckCircle2, Loader2, Sparkles, ShieldAlert, Palette, LayoutTemplate, Activity, Zap } from 'lucide-react';

interface Props {
    state: GenerationState;
    isOpen: boolean;
    onClose: () => void;
}

export function ProcessSidebar({ state, isOpen, onClose }: Props) {
    if (!isOpen) return null;

    const r = state.result;
    const isGenerating = state.status === 'analyzing' || state.status === 'generating' || state.status === 'checking';
    const isDone = state.status === 'done' && r;

    // Try to parse the analysis JSON
    let analysis: Record<string, any> = {};
    if (r?.analysisText) {
        try {
            analysis = JSON.parse(r.analysisText);
        } catch {
            // ignore
        }
    }

    const wasCached = !!r?.request.cachedAnalysisText;

    return (
        <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-[calc(100vh-64px)] overflow-y-auto shrink-0 animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-violet-400" />
                    <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">AI Process</h2>
                </div>
                <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                    &times;
                </button>
            </div>

            <div className="p-5 flex flex-col gap-8">

                {/* State 1: Idle */}
                {state.status === 'idle' && (
                    <div className="text-center py-10">
                        <Bot size={32} className="text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">Waiting for generation to start...</p>
                    </div>
                )}

                {/* State 2: Generating Live Feed */}
                {isGenerating && (
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} /> Live Feed
                        </h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-violet-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-violet-600/20 overflow-hidden">
                                <div className="w-1/2 h-full bg-violet-500 animate-[move_2s_linear_infinite]"
                                    style={{ transform: 'translateX(-100%)', ['@keyframes move' as any]: '{ 100% { transform: "translateX(200%)" } }' }}
                                />
                            </div>
                            <div className="flex items-start gap-2">
                                <Loader2 size={14} className="animate-spin shrink-0 mt-0.5" />
                                <span className="leading-snug">{state.progress || 'Processing...'}</span>
                            </div>
                        </div>
                        {wasCached && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded w-fit">
                                <Zap size={12} /> Analysis Loaded From Cache
                            </div>
                        )}
                    </div>
                )}

                {/* State 3: Done - AI Brain & QC Report */}
                {isDone && (
                    <>
                        {/* Efficiency Indicator */}
                        {wasCached && (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded-lg">
                                <Zap size={14} />
                                <span>Product analysis skipped (Loaded from local cache)</span>
                            </div>
                        )}

                        {/* AI Brain */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <LayoutTemplate size={14} />
                                AI's Brain
                            </h3>

                            <div className="flex flex-col gap-3">
                                {/* Extracted Colors */}
                                {r.request.extractedColors?.colors && r.request.extractedColors.colors.length > 0 && (
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                                        <p className="text-[10px] text-zinc-500 mb-2 font-medium flex items-center gap-1">
                                            <Palette size={12} /> EXACT COLORS LOCKED
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {r.request.extractedColors.colors.map(c => (
                                                <div key={c.hex} className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                                                    <span className="text-[10px] text-zinc-400 font-mono">{c.hex}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Risk Flags */}
                                {r.riskProfile && r.riskProfile.flags.length > 0 && (
                                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                                        <p className="text-[10px] text-amber-500/80 mb-2 font-medium flex items-center gap-1">
                                            <ShieldAlert size={12} /> RISKS IDENTIFIED
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            {r.riskProfile.flags.map(flag => (
                                                <div key={flag} className="text-xs text-zinc-300">
                                                    <span className="text-amber-400 font-mono">{flag}</span>
                                                    <span className="text-zinc-500 block text-[10px] mt-0.5">{r.riskProfile?.descriptions?.[flag]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Structural Details */}
                                {Object.keys(analysis).length > 0 && (
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                                        <p className="text-[10px] text-zinc-500 mb-2 font-medium flex items-center gap-1">
                                            <Sparkles size={12} /> STRUCTURAL BLUEPRINT
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {Object.entries(analysis).map(([key, value]) => {
                                                // Skip arrays or objects
                                                if (typeof value !== 'string' && typeof value !== 'number') return null;
                                                if (!value) return null;

                                                return (
                                                    <div key={key} className="flex items-end justify-between border-b border-zinc-800/50 pb-1">
                                                        <span className="text-[10px] text-zinc-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                        <span className="text-[11px] text-zinc-300 text-right max-w-[160px] truncate" title={String(value)}>
                                                            {String(value)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {/* Components List */}
                                            {analysis.components && Array.isArray(analysis.components) && analysis.components.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                                    <span className="text-[10px] text-zinc-500 uppercase mb-1.5 block">Detected Components ({analysis.components.length})</span>
                                                    <ul className="flex flex-col gap-1">
                                                        {analysis.components.map((comp: string, i: number) => (
                                                            <li key={i} className="text-[11px] text-zinc-400 pl-2 border-l border-zinc-700/50 py-0.5">
                                                                {comp}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Graphic Elements */}
                                            {analysis.graphicElements && Array.isArray(analysis.graphicElements) && analysis.graphicElements.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                                    <span className="text-[10px] text-zinc-500 uppercase mb-1.5 block">Graphic Elements ({analysis.graphicElements.length})</span>
                                                    <div className="flex flex-col gap-2">
                                                        {analysis.graphicElements.map((graphic: any, i: number) => (
                                                            <div key={i} className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-[10px] font-medium text-zinc-300">{graphic.type || 'Graphic'}</span>
                                                                    <span className="text-[9px] text-zinc-500">{graphic.position}</span>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-400 leading-snug">{graphic.description}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Structural Decorative Elements */}
                                            {analysis.structuralDecorativeElements && Array.isArray(analysis.structuralDecorativeElements) && analysis.structuralDecorativeElements.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-zinc-800/50">
                                                    <span className="text-[10px] text-zinc-500 uppercase mb-1.5 block">Decorative Elements ({analysis.structuralDecorativeElements.length})</span>
                                                    <div className="flex flex-col gap-2">
                                                        {analysis.structuralDecorativeElements.map((elem: any, i: number) => (
                                                            <div key={i} className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-[10px] font-medium text-zinc-300">{elem.type || 'Element'}</span>
                                                                    <span className="text-[9px] text-zinc-500">{elem.position}</span>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-400 leading-snug">{elem.description}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QC Report */}
                        {r.qcScores && (
                            <div className="flex flex-col gap-4 mt-2">
                                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 size={14} className={r.qcPass ? "text-emerald-500" : "text-amber-500"} />
                                    QC Report
                                </h3>

                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 flex flex-col gap-3">
                                    {Object.entries(r.qcScores).map(([key, value]) => {
                                        if (typeof value !== 'number') return null;
                                        const isPass = value >= 7;
                                        return (
                                            <div key={key} className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <span className={isPass ? 'text-zinc-300' : 'text-amber-500 font-medium'}>{value}/10</span>
                                                </div>
                                                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${isPass ? 'bg-violet-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${(value / 10) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {r.iterationCount && r.iterationCount > 1 && (
                                        <div className="mt-2 pt-2 border-t border-zinc-800/50 text-xs text-zinc-400">
                                            Auto-refined {r.iterationCount - 1} time(s) to hit passing quality threshold.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}
