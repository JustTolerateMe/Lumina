import { HardlinesProductConfig, HardlinesProductType, ProductMaterial, ProductFinish } from '../../types';

interface Props {
    value: HardlinesProductConfig;
    onChange: (config: HardlinesProductConfig) => void;
}

const HARDLINES_PRODUCT_TYPES: { value: HardlinesProductType; label: string }[] = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'tools', label: 'Tools' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'sports_equipment', label: 'Sports Equipment' },
];

const MATERIALS: ProductMaterial[] = [
    'metal', 'plastic', 'glass', 'concrete', 'stone', 'wood',
    'cotton', 'polyester', 'wool', 'silk', 'leather', 'ceramic'
];

const FINISHES: ProductFinish[] = [
    'matte', 'glossy', 'satin', 'brushed', 'polished', 'textured', 'distressed'
];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function HardlinesProductForm({ value, onChange }: Props) {
    function update(patch: Partial<HardlinesProductConfig>) {
        onChange({ ...value, ...patch });
    }

    return (
        <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Hardlines Product Details
            </label>

            {/* Type */}
            <select
                value={value.type}
                onChange={(e) => update({ type: e.target.value as HardlinesProductType })}
                className={selectClass}
            >
                {HARDLINES_PRODUCT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                ))}
            </select>

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
