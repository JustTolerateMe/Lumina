import { FlatlayStyle } from '../../types';

interface Props {
  value: FlatlayStyle;
  onChange: (style: FlatlayStyle) => void;
}

const SURFACES: { key: FlatlayStyle; label: string; preview: string }[] = [
  { key: 'pure_white', label: 'White', preview: '#FFFFFF' },
  { key: 'warm_linen', label: 'Linen', preview: '#F5F0E8' },
  { key: 'light_wood', label: 'Light Wood', preview: '#D4B896' },
  { key: 'dark_wood', label: 'Dark Wood', preview: '#5C3A1E' },
  { key: 'marble', label: 'Marble', preview: '#E8E4E0' },
  { key: 'concrete', label: 'Concrete', preview: '#B0B0B0' },
];

export function FlatlayPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Surface
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {SURFACES.map(({ key, label, preview }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[11px] font-medium
              transition-colors ${value === key
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
          >
            <div
              className="w-4 h-4 rounded-full border border-zinc-600 shrink-0"
              style={{ backgroundColor: preview }}
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
