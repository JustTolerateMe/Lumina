import { HardlinesContext } from '../../types';
import { HARDLINES_CONTEXT_PRESETS } from '../../prompts/presets';

interface Props {
    value: HardlinesContext;
    onChange: (context: HardlinesContext) => void;
}

const CONTEXTS = Object.entries(HARDLINES_CONTEXT_PRESETS) as [
    HardlinesContext,
    (typeof HARDLINES_CONTEXT_PRESETS)[HardlinesContext]
][];

export function HardlinesContextPicker({ value, onChange }: Props) {
    return (
        <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Environment / Context
            </label>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
                {CONTEXTS.map(([key, preset]) => (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        className={`text-left px-3 py-2.5 rounded-lg transition-colors ${value === key
                                ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300'
                                : 'bg-zinc-800 border border-transparent text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        <p className="text-xs font-medium">{preset.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">{preset.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
