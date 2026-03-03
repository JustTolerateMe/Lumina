import { X, Gift, Bug, Sparkles } from 'lucide-react';
import { changelogData } from '../../data/changelog';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <Sparkles className="text-violet-500" size={24} />
                            What's New in Lumina
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1">Latest updates, improvements, and fixes.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-12">
                        {changelogData.map((release) => (
                            <div key={release.version} className="relative pl-8 before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-zinc-800 last:before:bottom-auto last:before:h-full">
                                {/* Version Node Indicator */}
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] border-zinc-950 bg-violet-500 shadow-[0_0_0_1px_rgba(139,92,246,0.3)] z-10" />

                                <div className="flex items-baseline gap-3 mb-4">
                                    <h3 className="text-lg font-bold text-zinc-200">v{release.version}</h3>
                                    <span className="text-sm text-zinc-500 font-medium">{release.date}</span>
                                </div>

                                <ul className="space-y-3">
                                    {release.changes.map((change, idx) => {
                                        const isFix = change.type === 'bugfix';
                                        const isFeature = change.type === 'feature';

                                        return (
                                            <li key={idx} className="flex gap-3 text-sm text-zinc-300">
                                                <div className={`mt-0.5 shrink-0 ${isFix ? 'text-amber-500' : isFeature ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                    {isFix ? <Bug size={16} /> : isFeature ? <Gift size={16} /> : <Sparkles size={16} />}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1
                            ${isFix ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                            isFeature ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                                'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}
                                                    >
                                                        {change.type}
                                                    </span>
                                                    <p className="leading-relaxed">{change.description}</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 shrink-0 bg-zinc-900/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Awesome, let's go!
                    </button>
                </div>
            </div>
        </div>
    );
}
