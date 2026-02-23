import { HardlinesProductConfig, HardlinesProductType, ProductMaterial, ProductFinish, ProductSuggestions } from '../../types';
import { Wand2 } from 'lucide-react';

interface Props {
    value: HardlinesProductConfig;
    onChange: (config: HardlinesProductConfig) => void;
    suggestions?: ProductSuggestions;
}

const HARDLINES_PRODUCT_TYPES: { value: HardlinesProductType; label: string }[] = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'tools', label: 'Tools' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'sports_equipment', label: 'Sports Equipment' },
    { value: 'other' as HardlinesProductType, label: 'Other / Custom...' },
];

const MATERIALS: string[] = [
    'metal', 'plastic', 'glass', 'concrete', 'stone', 'wood',
    'cotton', 'polyester', 'wool', 'silk', 'leather', 'ceramic', 'custom'
];

const FINISHES: string[] = [
    'matte', 'glossy', 'satin', 'brushed', 'polished', 'textured', 'distressed', 'custom'
];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function HardlinesProductForm({ value, onChange, suggestions }: Props) {
    function update(patch: Partial<HardlinesProductConfig>) {
        onChange({ ...value, ...patch });
    }

    function applySuggestions() {
        if (!suggestions) return;
        const patch: Partial<HardlinesProductConfig> = {};
        if (suggestions.type) {
            const match = HARDLINES_PRODUCT_TYPES.find(t => suggestions.type?.toLowerCase().includes(t.value.toLowerCase()));
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
                    Hardlines Product Details
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
                    value={HARDLINES_PRODUCT_TYPES.some(t => t.value === value.type) ? value.type : 'other'}
                    onChange={(e) => update({ type: e.target.value === 'other' ? '' : e.target.value as HardlinesProductType })}
                    className={selectClass}
                >
                    {HARDLINES_PRODUCT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                {(!HARDLINES_PRODUCT_TYPES.map(t => t.value).filter(v => v !== 'other').includes(value.type as any) || value.type === 'other') && (
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
                placeholder="Color (e.g. space grey with black accents)"
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
                placeholder="Dimensions (optional, e.g. 5.5 inch display)"
                className={inputClass}
            />

            {/* Branding */}
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                    type="checkbox"
                    checked={value.hasBranding}
                    onChange={(e) => update({ hasBranding: e.target.checked, brandingDescription: e.target.checked ? value.brandingDescription : undefined })}
                    className="accent-violet-600"
                />
                Visible branding / logo
            </label>

            {value.hasBranding && (
                <input
                    type="text"
                    value={value.brandingDescription ?? ''}
                    onChange={(e) => update({ brandingDescription: e.target.value })}
                    placeholder="Describe branding (e.g. silver logo on top)"
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
                    placeholder="e.g. focus on the buttons, add water droplets..."
                    className={inputClass + " resize-none"}
                />
            </div>
        </div>
    );
}
