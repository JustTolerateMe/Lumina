import { HomeProductConfig, HomeProductType, ProductMaterial, ProductFinish } from '../../types';

interface Props {
    value: HomeProductConfig;
    onChange: (config: HomeProductConfig) => void;
}

const HOME_PRODUCT_TYPES: { value: HomeProductType; label: string }[] = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'decor', label: 'Decor' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'kitchenware', label: 'Kitchenware' },
    { value: 'tableware', label: 'Tableware' },
];

const MATERIALS: ProductMaterial[] = [
    'wood', 'metal', 'glass', 'ceramic', 'stone', 'concrete',
    'cotton', 'polyester', 'wool', 'silk', 'leather', 'plastic'
];

const FINISHES: ProductFinish[] = [
    'matte', 'glossy', 'satin', 'brushed', 'polished', 'textured', 'distressed'
];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function HomeProductForm({ value, onChange }: Props) {
    function update(patch: Partial<HomeProductConfig>) {
        onChange({ ...value, ...patch });
    }

    return (
        <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Home Product Details
            </label>

            {/* Type */}
            <select
                value={value.type}
                onChange={(e) => update({ type: e.target.value as HomeProductType })}
                className={selectClass}
            >
                {HOME_PRODUCT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                ))}
            </select>

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
                <select
                    value={value.material}
                    onChange={(e) => update({ material: e.target.value as ProductMaterial })}
                    className={selectClass}
                >
                    {MATERIALS.map((m) => (
                        <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                </select>

                <select
                    value={value.finish}
                    onChange={(e) => update({ finish: e.target.value as ProductFinish })}
                    className={selectClass}
                >
                    {FINISHES.map((f) => (
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                </select>
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
