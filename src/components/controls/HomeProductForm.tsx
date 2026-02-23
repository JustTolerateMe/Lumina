import { HomeProductConfig, HomeProductType, ProductMaterial, ProductFinish, ProductSuggestions } from '../../types';
import { Wand2 } from 'lucide-react';

interface Props {
    value: HomeProductConfig;
    onChange: (config: HomeProductConfig) => void;
    suggestions?: ProductSuggestions;
}

const HOME_PRODUCT_TYPES: { value: HomeProductType; label: string }[] = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'decor', label: 'Decor' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'kitchenware', label: 'Kitchenware' },
    { value: 'tableware', label: 'Tableware' },
    { value: 'other' as HomeProductType, label: 'Other / Custom...' },
];

const MATERIALS: string[] = [
    'wood', 'metal', 'glass', 'ceramic', 'stone', 'concrete',
    'cotton', 'polyester', 'wool', 'silk', 'leather', 'plastic', 'custom'
];

const FINISHES: string[] = [
    'matte', 'glossy', 'satin', 'brushed', 'polished', 'textured', 'distressed', 'custom'
];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function HomeProductForm({ value, onChange, suggestions }: Props) {
    function update(patch: Partial<HomeProductConfig>) {
        onChange({ ...value, ...patch });
    }

    function applySuggestions() {
        if (!suggestions) return;
        const patch: Partial<HomeProductConfig> = {};
        if (suggestions.type) {
            const match = HOME_PRODUCT_TYPES.find(t => suggestions.type?.toLowerCase().includes(t.value.toLowerCase()));
            if (match) patch.type = match.value;
        }
        if (suggestions.colorDescription) patch.colorDescription = suggestions.colorDescription;
        if (suggestions.material) patch.material = suggestions.material;
        if (suggestions.finish) patch.finish = suggestions.finish;
        update(patch);
    }

    const showApply = suggestions && (suggestions.colorDescription || suggestions.material || suggestions.finish);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Home Product Details
                </label>
                {showApply && (
                    <button
                        onClick={applySuggestions}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-600/20 
                            text-[10px] font-bold text-violet-400 border border-violet-500/30 
                            hover:bg-violet-600/30 transition-all animate-pulse"
                    >
                        <Wand2 size={10} />
                        Apply AI Suggestions
                    </button>
                )}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1">
                <select
                    value={HOME_PRODUCT_TYPES.some(t => t.value === value.type) ? value.type : 'other'}
                    onChange={(e) => update({ type: e.target.value === 'other' ? '' : e.target.value as HomeProductType })}
                    className={selectClass}
                >
                    {HOME_PRODUCT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                {(!HOME_PRODUCT_TYPES.map(t => t.value).filter(v => v !== 'other').includes(value.type as any) || value.type === 'other') && (
                    <input
                        type="text"
                        value={value.type === 'other' ? '' : value.type}
                        onChange={(e) => update({ type: e.target.value })}
                        placeholder="Enter custom product type..."
                        className={inputClass + " h-9"}
                    />
                )}
            </div>

            {/* Color Description */}
            <input
                type="text"
                value={value.colorDescription}
                onChange={(e) => update({ colorDescription: e.target.value })}
                placeholder="Color (e.g. emerald green velvet)"
                className={inputClass}
            />

            {/* Material & Finish row */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                    <select
                        value={MATERIALS.includes(value.material as any) ? value.material : 'custom'}
                        onChange={(e) => update({ material: e.target.value === 'custom' ? '' : e.target.value })}
                        className={selectClass}
                    >
                        {MATERIALS.map((m) => (
                            <option key={m} value={m}>{m === 'custom' ? 'Other / Custom...' : m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                    </select>
                    {!MATERIALS.includes(value.material as any) && (
                        <input
                            type="text"
                            value={value.material}
                            onChange={(e) => update({ material: e.target.value })}
                            placeholder="Enter material..."
                            className={inputClass + " h-9"}
                        />
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <select
                        value={FINISHES.includes(value.finish as any) ? value.finish : 'custom'}
                        onChange={(e) => update({ finish: e.target.value === 'custom' ? '' : e.target.value })}
                        className={selectClass}
                    >
                        {FINISHES.map((f) => (
                            <option key={f} value={f}>{f === 'custom' ? 'Other / Custom...' : f.charAt(0).toUpperCase() + f.slice(1)}</option>
                        ))}
                    </select>
                    {!FINISHES.includes(value.finish as any) && (
                        <input
                            type="text"
                            value={value.finish}
                            onChange={(e) => update({ finish: e.target.value })}
                            placeholder="Enter finish..."
                            className={inputClass + " h-9"}
                        />
                    )}
                </div>
            </div>

            {/* Dimensions */}
            <input
                type="text"
                value={value.dimensions ?? ''}
                onChange={(e) => update({ dimensions: e.target.value })}
                placeholder="Dimensions (optional, e.g. 120cm x 60cm)"
                className={inputClass}
            />

            {/* Pattern */}
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                    type="checkbox"
                    checked={value.hasPattern}
                    onChange={(e) => update({ hasPattern: e.target.checked, patternDescription: e.target.checked ? value.patternDescription : undefined })}
                    className="accent-violet-600"
                />
                Visible pattern / texture
            </label>

            {value.hasPattern && (
                <input
                    type="text"
                    value={value.patternDescription ?? ''}
                    onChange={(e) => update({ patternDescription: e.target.value })}
                    placeholder="Describe pattern (e.g. geometric herringbone)"
                    className={inputClass}
                />
            )}
            {/* Custom Instructions */}
            <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
                    Styling Notes (Optional)
                </label>
                <textarea
                    rows={2}
                    value={value.customInstructions ?? ''}
                    onChange={(e) => update({ customInstructions: e.target.value })}
                    placeholder="e.g. place on a wooden table, add a warm candle light..."
                    className={inputClass + " resize-none"}
                />
            </div>
        </div>
    );
}
