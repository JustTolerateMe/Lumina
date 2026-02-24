import { useState } from 'react';
import { MousePointer2, Paintbrush, SendHorizonal, X } from 'lucide-react';

interface Props {
    onApply: (instruction: string) => void;
    onCancel: () => void;
    isDrawingMode: boolean;
    hasMask: boolean;
}

export function EditToolbar({ onApply, onCancel, isDrawingMode, hasMask }: Props) {
    const [instruction, setInstruction] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!instruction.trim() || !hasMask) return;
        onApply(instruction.trim());
        setInstruction('');
    };

    if (!isDrawingMode) return null;

    return (
        <form
            onSubmit={handleSubmit}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-violet-500/50 rounded-full shadow-2xl p-2 flex items-center gap-3 animate-in slide-in-from-bottom-8 w-11/12 max-w-2xl z-50 backdrop-blur-xl"
        >
            <div className="flex items-center justify-center p-2.5 bg-violet-600/20 text-violet-400 rounded-full shrink-0">
                {hasMask ? <MousePointer2 size={16} /> : <Paintbrush size={16} />}
            </div>

            <input
                type="text"
                placeholder={hasMask ? "What should we change in this area?" : "Draw on the image above to select an area..."}
                className="flex-1 bg-transparent border-none text-white text-sm outline-none placeholder:text-zinc-500"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={!hasMask}
            />

            <div className="flex gap-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
                >
                    <X size={16} />
                </button>
                <button
                    type="submit"
                    disabled={!hasMask || !instruction.trim()}
                    className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-full transition-colors shrink-0 flex items-center gap-2 font-medium text-sm px-4"
                >
                    Apply Edit <SendHorizonal size={16} />
                </button>
            </div>
        </form>
    );
}
