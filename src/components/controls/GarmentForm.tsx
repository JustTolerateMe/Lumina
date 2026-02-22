import { GarmentConfig, GarmentType } from '../../types';

interface Props {
  value: GarmentConfig;
  onChange: (config: GarmentConfig) => void;
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
];

const MATERIALS = [
  'cotton', 'polyester', 'denim', 'silk', 'linen',
  'wool', 'leather', 'nylon', 'fleece', 'knit',
];

const FITS: GarmentConfig['fit'][] = ['regular', 'slim', 'fitted', 'oversized'];

const selectClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 focus:border-violet-500 focus:outline-none transition-colors`;

const inputClass = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
  text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500
  focus:outline-none transition-colors`;

export function GarmentForm({ value, onChange }: Props) {
  function update(patch: Partial<GarmentConfig>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Garment Details
      </label>

      {/* Type */}
      <select
        value={value.type}
        onChange={(e) => update({ type: e.target.value as GarmentType })}
        className={selectClass}
      >
        {GARMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

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
        <select
          value={value.material}
          onChange={(e) => update({ material: e.target.value })}
          className={selectClass}
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>

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
