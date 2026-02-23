import { GarmentConfig, GarmentType, ProductSuggestions } from '../../types';
import { Wand2 } from 'lucide-react';

interface Props {
  value: GarmentConfig;
  onChange: (config: GarmentConfig) => void;
  suggestions?: ProductSuggestions;
}

const GARMENT_TYPES: { value: GarmentType; label: string }[] = [
  { value: 't-shirt', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'sweatshirt', label: 'Sweatshirt' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'coat', label: 'Coat' },
  { value: 'dress', label: 'Dress' },
  { value: 'skirt', label: 'Skirt' },
  { value: 'pants', label: 'Pants' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'jeans', label: 'Jeans' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'button-up', label: 'Button-Up' },
  { value: 'polo', label: 'Polo' },
  { value: 'vest', label: 'Vest' },
  { value: 'cardigan', label: 'Cardigan' },
  { value: 'other' as GarmentType, label: 'Other / Custom...' },
];

const MATERIALS = [
  'cotton', 'polyester', 'denim', 'silk', 'linen',
  'wool', 'leather', 'nylon', 'fleece', 'knit', 'custom',
];

const FITS: GarmentConfig['fit'][] = ['regular', 'slim', 'fitted', 'oversized'];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function GarmentForm({ value, onChange, suggestions }: Props) {
  function update(patch: Partial<GarmentConfig>) {
    onChange({ ...value, ...patch });
  }

  function applySuggestions() {
    if (!suggestions) return;
    const patch: Partial<GarmentConfig> = {};
    if (suggestions.type) {
      const match = GARMENT_TYPES.find(t => suggestions.type?.toLowerCase().includes(t.value.toLowerCase()));
      patch.type = match ? match.value : 'other' as GarmentType;
    }
    if (suggestions.colorDescription) patch.colorDescription = suggestions.colorDescription;
    if (suggestions.material) patch.material = suggestions.material;
    update(patch);
  }

  const showApply = suggestions && (suggestions.colorDescription || suggestions.material);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Garment Details
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
          value={GARMENT_TYPES.some(t => t.value === value.type) ? value.type : 'other'}
          onChange={(e) => update({ type: e.target.value === 'other' ? '' : e.target.value as GarmentType })}
          className={selectClass}
        >
          {GARMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(!GARMENT_TYPES.map(t => t.value).filter(v => v !== 'other').includes(value.type as any) || value.type === 'other') && (
          <input
            type="text"
            value={value.type === 'other' ? '' : value.type}
            onChange={(e) => update({ type: e.target.value })}
            placeholder="Enter custom garment type..."
            className={inputClass + " h-9"}
          />
        )}
      </div>

      {/* Color Description */}
      <input
        type="text"
        value={value.colorDescription}
        onChange={(e) => update({ colorDescription: e.target.value })}
        placeholder="Color (e.g. navy blue with white chest logo)"
        className={inputClass}
      />

      {/* Material & Fit row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <select
            value={MATERIALS.includes(value.material) ? value.material : 'custom'}
            onChange={(e) => update({ material: e.target.value === 'custom' ? '' : e.target.value })}
            className={selectClass}
          >
            {MATERIALS.map((m) => (
              <option key={m} value={m}>{m === 'custom' ? 'Other / Custom...' : m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          {!MATERIALS.includes(value.material) && (
            <input
              type="text"
              value={value.material}
              onChange={(e) => update({ material: e.target.value })}
              placeholder="Enter material..."
              className={inputClass + " h-9"}
            />
          )}
        </div>

        <select
          value={value.fit}
          onChange={(e) => update({ fit: e.target.value as GarmentConfig['fit'] })}
          className={selectClass}
        >
          {FITS.map((f) => (
            <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Logo */}
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={value.hasLogo}
          onChange={(e) => update({ hasLogo: e.target.checked, logoDescription: e.target.checked ? value.logoDescription : undefined })}
          className="accent-violet-600"
        />
        Has logo / graphic
      </label>

      {value.hasLogo && (
        <input
          type="text"
          value={value.logoDescription ?? ''}
          onChange={(e) => update({ logoDescription: e.target.value })}
          placeholder="Describe logo (e.g. white Nike swoosh, center chest)"
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
          placeholder="e.g. keep the jacket open, roll up the sleeves..."
          className={inputClass + " resize-none"}
        />
      </div>
    </div>
  );
}
